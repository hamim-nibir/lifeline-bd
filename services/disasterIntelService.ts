import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  assessRelevance,
  BD_CENTER,
  distanceKm,
  formatDistance,
  isInBangladesh,
  isRelevantToUser,
  type Relevance,
} from "../utils/geo";
import {
  mapEventToPreparednessType,
  type PreparednessDisasterType,
} from "../constants/disasterPreparedness";
import { db } from "./firebase";

export type LiveDisasterAlert = {
  id: string;
  source: "gdacs" | "usgs" | "eonet";
  eventType: string;
  preparednessType: PreparednessDisasterType;
  title: string;
  description: string;
  severity: "green" | "orange" | "red" | "moderate" | "high";
  latitude: number;
  longitude: number;
  distanceKm: number;
  relevance: Relevance;
  url?: string;
  startedAt?: string;
};

export type ShelterLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  address?: string;
  source: "osm" | "fallback";
  mapsLink: string;
};

/** Known cyclone / flood shelters in major Bangladesh cities (fallback when OSM has few results) */
const BD_FALLBACK_SHELTERS: Omit<ShelterLocation, "distanceKm" | "mapsLink">[] = [
  { id: "dhaka-1", name: "Mohammadpur Cyclone Shelter", latitude: 23.7562, longitude: 90.3544, address: "Dhaka", source: "fallback" },
  { id: "dhaka-2", name: "Dhanmondi Govt Shelter Centre", latitude: 23.7461, longitude: 90.3742, address: "Dhaka", source: "fallback" },
  { id: "dhaka-3", name: "Mirpur Section-10 Shelter", latitude: 23.8067, longitude: 90.3683, address: "Dhaka", source: "fallback" },
  { id: "ctg-1", name: "Chittagong Double Mooring Shelter", latitude: 22.3382, longitude: 91.8312, address: "Chittagong", source: "fallback" },
  { id: "ctg-2", name: "Agrabad Emergency Shelter", latitude: 22.3245, longitude: 91.8145, address: "Chittagong", source: "fallback" },
  { id: "cox-1", name: "Cox's Bazar Cyclone Shelter", latitude: 21.4272, longitude: 91.9688, address: "Cox's Bazar", source: "fallback" },
  { id: "syl-1", name: "Sylhet City Corporation Shelter", latitude: 24.8949, longitude: 91.8687, address: "Sylhet", source: "fallback" },
  { id: "raj-1", name: "Rajshahi Disaster Management Shelter", latitude: 24.3745, longitude: 88.6042, address: "Rajshahi", source: "fallback" },
  { id: "khu-1", name: "Khulna Cyclone Shelter", latitude: 22.8456, longitude: 89.5403, address: "Khulna", source: "fallback" },
  { id: "bar-1", name: "Barishal Sadar Shelter", latitude: 22.701, longitude: 90.3535, address: "Barishal", source: "fallback" },
];

function severityFromGdacs(level: string): LiveDisasterAlert["severity"] {
  const l = level?.toLowerCase() ?? "";
  if (l.includes("red")) return "red";
  if (l.includes("orange")) return "orange";
  return "green";
}

function severityFromMagnitude(mag: number): LiveDisasterAlert["severity"] {
  if (mag >= 6) return "red";
  if (mag >= 5) return "orange";
  return "moderate";
}

function buildAlert(
  partial: Omit<LiveDisasterAlert, "distanceKm" | "relevance" | "preparednessType"> & {
    eventType: string;
  },
  userLat: number,
  userLon: number
): LiveDisasterAlert | null {
  const distance = distanceKm(userLat, userLon, partial.latitude, partial.longitude);
  const relevance = assessRelevance(
    partial.latitude,
    partial.longitude,
    userLat,
    userLon,
    distance
  );
  if (!isRelevantToUser(relevance, distance)) return null;

  return {
    ...partial,
    distanceKm: distance,
    relevance,
    preparednessType: mapEventToPreparednessType(partial.eventType, partial.title),
  };
}

async function fetchGdacsAlerts(userLat: number, userLon: number): Promise<LiveDisasterAlert[]> {
  try {
    const res = await fetch(
      "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL,VO,DR,WF&limit=25",
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const features = data?.features ?? [];
    const alerts: LiveDisasterAlert[] = [];

    for (const f of features) {
      const coords = f?.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);
      const p = f?.properties ?? {};
      const country = String(p.country ?? p.affectedcountries ?? "");
      const inBd =
        isInBangladesh(lat, lon) ||
        country.toLowerCase().includes("bangladesh") ||
        country.toLowerCase().includes("bgd");

      const alert = buildAlert(
        {
          id: `gdacs-${p.eventid ?? f.id ?? `${lat}-${lon}`}`,
          source: "gdacs",
          eventType: String(p.eventtype ?? "OT"),
          title: String(p.name ?? p.eventname ?? "Disaster alert"),
          description: String(
            p.description ??
              `${p.eventtype ?? "Event"} — Alert level: ${p.alertlevel ?? "Unknown"}${inBd ? " (Bangladesh affected)" : ""}`
          ),
          severity: severityFromGdacs(String(p.alertlevel ?? "")),
          latitude: lat,
          longitude: lon,
          url: p.url ? String(p.url) : `https://www.gdacs.org/report.aspx?eventid=${p.eventid}`,
          startedAt: p.fromdate ? String(p.fromdate) : undefined,
        },
        userLat,
        userLon
      );
      if (alert) alerts.push(alert);
    }
    return alerts;
  } catch (e) {
    console.warn("GDACS fetch failed:", e);
    return [];
  }
}

async function fetchUsgsEarthquakes(userLat: number, userLon: number): Promise<LiveDisasterAlert[]> {
  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"
    );
    if (!res.ok) return [];
    const data = await res.json();
    const alerts: LiveDisasterAlert[] = [];

    for (const f of data?.features ?? []) {
      const mag = Number(f?.properties?.mag ?? 0);
      if (mag < 4.5) continue;
      const coords = f?.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);

      const alert = buildAlert(
        {
          id: `usgs-${f.id}`,
          source: "usgs",
          eventType: "EQ",
          title: `Earthquake M${mag.toFixed(1)} — ${f.properties?.place ?? "Unknown"}`,
          description: `Magnitude ${mag} earthquake detected. Depth ${coords[2] ?? "?"} km.`,
          severity: severityFromMagnitude(mag),
          latitude: lat,
          longitude: lon,
          url: f.properties?.url,
          startedAt: f.properties?.time
            ? new Date(f.properties.time).toISOString()
            : undefined,
        },
        userLat,
        userLon
      );
      if (alert) alerts.push(alert);
    }
    return alerts;
  } catch (e) {
    console.warn("USGS fetch failed:", e);
    return [];
  }
}

async function fetchEonetAlerts(userLat: number, userLon: number): Promise<LiveDisasterAlert[]> {
  try {
    const res = await fetch(
      "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=15"
    );
    if (!res.ok) return [];
    const data = await res.json();
    const alerts: LiveDisasterAlert[] = [];

    for (const ev of data?.events ?? []) {
      const cat = ev.categories?.[0]?.title ?? "Event";
      const geom = ev.geometry?.[ev.geometry.length - 1];
      if (!geom?.coordinates) continue;
      const lon = Number(geom.coordinates[0]);
      const lat = Number(geom.coordinates[1]);

      const alert = buildAlert(
        {
          id: `eonet-${ev.id}`,
          source: "eonet",
          eventType: cat,
          title: String(ev.title ?? cat),
          description: `${cat} event tracked near your region. Stay alert for official updates.`,
          severity: "moderate",
          latitude: lat,
          longitude: lon,
          url: ev.sources?.[0]?.url,
          startedAt: geom.date,
        },
        userLat,
        userLon
      );
      if (alert) alerts.push(alert);
    }
    return alerts;
  } catch (e) {
    console.warn("EONET fetch failed:", e);
    return [];
  }
}

/** OpenWeather government alerts (One Call 3.0) — optional if key supports it */
async function fetchOpenWeatherAlerts(
  userLat: number,
  userLon: number
): Promise<LiveDisasterAlert[]> {
  const key = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${userLat}&lon=${userLon}&exclude=minutely,hourly,daily&appid=${key}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const alerts: LiveDisasterAlert[] = [];

    for (const a of data?.alerts ?? []) {
      const alert = buildAlert(
        {
          id: `owm-${a.event}-${a.start}`,
          source: "gdacs",
          eventType: a.event ?? "Weather",
          title: String(a.event ?? "Weather alert"),
          description: String(a.description ?? a.tag ?? "Weather warning for your area"),
          severity: "orange",
          latitude: userLat,
          longitude: userLon,
          startedAt: a.start ? new Date(a.start * 1000).toISOString() : undefined,
        },
        userLat,
        userLon
      );
      if (alert) alerts.push(alert);
    }
    return alerts;
  } catch {
    return [];
  }
}

export async function fetchLiveDisasterAlerts(
  userLat: number,
  userLon: number
): Promise<LiveDisasterAlert[]> {
  const [gdacs, usgs, eonet, owm] = await Promise.all([
    fetchGdacsAlerts(userLat, userLon),
    fetchUsgsEarthquakes(userLat, userLon),
    fetchEonetAlerts(userLat, userLon),
    fetchOpenWeatherAlerts(userLat, userLon),
  ]);

  const merged = [...gdacs, ...usgs, ...eonet, ...owm];
  const byId = new Map<string, LiveDisasterAlert>();
  for (const a of merged) byId.set(a.id, a);

  return Array.from(byId.values()).sort((a, b) => a.distanceKm - b.distanceKm);
}

function toShelter(
  item: Omit<ShelterLocation, "distanceKm" | "mapsLink">,
  userLat: number,
  userLon: number
): ShelterLocation {
  const d = distanceKm(userLat, userLon, item.latitude, item.longitude);
  return {
    ...item,
    distanceKm: d,
    mapsLink: `https://maps.google.com/?q=${item.latitude},${item.longitude}`,
  };
}

async function fetchOsmShelters(
  userLat: number,
  userLon: number,
  radiusM = 35000
): Promise<ShelterLocation[]> {
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"="shelter"](around:${radiusM},${userLat},${userLon});
      node["emergency"="assembly_point"](around:${radiusM},${userLat},${userLon});
      node["building"="civic"]["shelter"="yes"](around:${radiusM},${userLat},${userLon});
      way["amenity"="shelter"](around:${radiusM},${userLat},${userLon});
    );
    out center 12;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const elements = data?.elements ?? [];
    const shelters: ShelterLocation[] = [];

    for (const el of elements) {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) continue;
      const name =
        el.tags?.name ??
        el.tags?.["name:en"] ??
        el.tags?.["addr:full"] ??
        "Emergency shelter";
      shelters.push(
        toShelter(
          {
            id: `osm-${el.id}`,
            name: String(name),
            latitude: lat,
            longitude: lon,
            address: el.tags?.["addr:city"] ?? el.tags?.["addr:district"],
            source: "osm",
          },
          userLat,
          userLon
        )
      );
    }
    return shelters;
  } catch (e) {
    console.warn("Overpass shelter fetch failed:", e);
    return [];
  }
}

export async function fetchNearbyShelters(
  userLat: number,
  userLon: number,
  limit = 8
): Promise<ShelterLocation[]> {
  const osm = await fetchOsmShelters(userLat, userLon);
  const fallback = BD_FALLBACK_SHELTERS.map((s) => toShelter(s, userLat, userLon));

  const combined = [...osm, ...fallback];
  const unique = new Map<string, ShelterLocation>();
  for (const s of combined) {
    const key = `${s.latitude.toFixed(3)}-${s.longitude.toFixed(3)}`;
    const existing = unique.get(key);
    if (!existing || s.distanceKm < existing.distanceKm) unique.set(key, s);
  }

  return Array.from(unique.values())
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

const SEEN_ALERTS_KEY = (uid: string) => `disaster_warnings_seen_${uid}`;

/** Write in-app notifications for new relevant disaster warnings */
export async function pushDisasterWarningNotifications(
  uid: string,
  alerts: LiveDisasterAlert[]
): Promise<number> {
  if (!uid || alerts.length === 0) return 0;

  const relevant = alerts.filter(
    (a) => a.relevance === "bangladesh" || a.relevance === "near_you"
  );
  if (relevant.length === 0) return 0;

  const raw = await AsyncStorage.getItem(SEEN_ALERTS_KEY(uid));
  const seen: string[] = raw ? JSON.parse(raw) : [];
  let pushed = 0;

  for (const alert of relevant.slice(0, 5)) {
    if (seen.includes(alert.id)) continue;

    await addDoc(collection(db, "notifications"), {
      type: "disasterWarning",
      forUid: uid,
      title: `🌩️ ${alert.title}`,
      body: `${alert.description.slice(0, 120)}… — ${formatDistance(alert.distanceKm)} from you. Open Disaster Alert for shelters & kit list.`,
      disasterType: alert.preparednessType,
      externalAlertId: alert.id,
      severity: alert.severity,
      location: {
        latitude: alert.latitude,
        longitude: alert.longitude,
        address: alert.relevance === "bangladesh" ? "Bangladesh / nearby" : "Near your location",
        mapsLink: `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`,
      },
      read: false,
      createdAt: serverTimestamp(),
    });

    seen.push(alert.id);
    pushed++;
  }

  await AsyncStorage.setItem(
    SEEN_ALERTS_KEY(uid),
    JSON.stringify(seen.slice(-80))
  );
  return pushed;
}

export function getDefaultUserCoordinates(): { latitude: number; longitude: number } {
  return { ...BD_CENTER };
}
