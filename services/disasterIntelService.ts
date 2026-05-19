import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { BD_SHELTER_LOCATIONS } from "../constants/bdShelters";
import {
  mapEventToPreparednessType,
  type PreparednessDisasterType,
} from "../constants/disasterPreparedness";
import {
  assessRelevance,
  BD_CENTER,
  DISASTER_ALERT_RADIUS_KM,
  distanceKm,
  formatDistance,
  isWithinDisasterAlertRange,
} from "../utils/geo";
import { db } from "./firebase";

export type LiveDisasterAlert = {
  id: string;
  source: "gdacs" | "usgs" | "openweather";
  eventType: string;
  preparednessType: PreparednessDisasterType;
  title: string;
  description: string;
  severity: "green" | "orange" | "red" | "moderate" | "high";
  latitude: number;
  longitude: number;
  distanceKm: number;
  relevance: "near_you";
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
  const preparednessType = mapEventToPreparednessType(partial.eventType, partial.title);
  if (!preparednessType) return null;

  const dist = distanceKm(userLat, userLon, partial.latitude, partial.longitude);
  if (!isWithinDisasterAlertRange(dist)) return null;
  if (!assessRelevance(dist)) return null;

  return {
    ...partial,
    distanceKm: dist,
    relevance: "near_you",
    preparednessType,
  };
}

async function fetchGdacsAlerts(userLat: number, userLon: number): Promise<LiveDisasterAlert[]> {
  try {
    const res = await fetch(
      "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL&limit=30",
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const alerts: LiveDisasterAlert[] = [];

    for (const f of data?.features ?? []) {
      const coords = f?.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);
      const p = f?.properties ?? {};

      const alert = buildAlert(
        {
          id: `gdacs-${p.eventid ?? f.id ?? `${lat}-${lon}`}`,
          source: "gdacs",
          eventType: String(p.eventtype ?? "OT"),
          title: String(p.name ?? p.eventname ?? "Disaster alert"),
          description: String(
            p.description ??
              `${p.eventtype ?? "Event"} — Alert level: ${p.alertlevel ?? "Unknown"}`
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

      const alert = buildAlert(
        {
          id: `usgs-${f.id}`,
          source: "usgs",
          eventType: "EQ",
          title: `Earthquake M${mag.toFixed(1)} — ${f.properties?.place ?? "Unknown"}`,
          description: `Magnitude ${mag} earthquake within ${DISASTER_ALERT_RADIUS_KM} km of you.`,
          severity: severityFromMagnitude(mag),
          latitude: Number(coords[1]),
          longitude: Number(coords[0]),
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
          source: "openweather",
          eventType: a.event ?? "Weather",
          title: String(a.event ?? "Weather alert"),
          description: String(a.description ?? a.tag ?? "Weather warning in your area"),
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
  const [gdacs, usgs, owm] = await Promise.all([
    fetchGdacsAlerts(userLat, userLon),
    fetchUsgsEarthquakes(userLat, userLon),
    fetchOpenWeatherAlerts(userLat, userLon),
  ]);

  const byId = new Map<string, LiveDisasterAlert>();
  for (const a of [...gdacs, ...usgs, ...owm]) byId.set(a.id, a);

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
  radiusM = 50000
): Promise<ShelterLocation[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="shelter"](around:${radiusM},${userLat},${userLon});
      node["emergency"="assembly_point"](around:${radiusM},${userLat},${userLon});
      node["emergency"="shelter"](around:${radiusM},${userLat},${userLon});
      way["amenity"="shelter"](around:${radiusM},${userLat},${userLon});
    );
    out center 20;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const shelters: ShelterLocation[] = [];

    for (const el of data?.elements ?? []) {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) continue;
      const s = toShelter(
        {
          id: `osm-${el.id}`,
          name: String(
            el.tags?.name ?? el.tags?.["name:en"] ?? el.tags?.["addr:full"] ?? "Emergency shelter"
          ),
          latitude: lat,
          longitude: lon,
          address: el.tags?.["addr:city"] ?? el.tags?.["addr:district"],
          source: "osm",
        },
        userLat,
        userLon
      );
      if (isWithinDisasterAlertRange(s.distanceKm)) shelters.push(s);
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
  limit = 15
): Promise<ShelterLocation[]> {
  const osm = await fetchOsmShelters(userLat, userLon);
  const fallback = BD_SHELTER_LOCATIONS.map((s) =>
    toShelter(
      {
        id: s.id,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        address: s.address,
        source: "fallback",
      },
      userLat,
      userLon
    )
  ).filter((s) => isWithinDisasterAlertRange(s.distanceKm));

  const unique = new Map<string, ShelterLocation>();
  for (const s of [...osm, ...fallback]) {
    const key = `${s.latitude.toFixed(3)}-${s.longitude.toFixed(3)}`;
    const existing = unique.get(key);
    if (!existing || s.distanceKm < existing.distanceKm) unique.set(key, s);
  }

  return Array.from(unique.values())
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

const SEEN_ALERTS_KEY = (uid: string) => `disaster_warnings_seen_${uid}`;

/** Notify citizen only for threats within 100 km */
export async function pushDisasterWarningNotifications(
  uid: string,
  alerts: LiveDisasterAlert[]
): Promise<number> {
  if (!uid || alerts.length === 0) return 0;

  const nearby = alerts.filter((a) => a.distanceKm <= DISASTER_ALERT_RADIUS_KM);
  if (nearby.length === 0) return 0;

  const raw = await AsyncStorage.getItem(SEEN_ALERTS_KEY(uid));
  const seen: string[] = raw ? JSON.parse(raw) : [];
  let pushed = 0;

  for (const alert of nearby.slice(0, 5)) {
    if (seen.includes(alert.id)) continue;

    await addDoc(collection(db, "notifications"), {
      type: "disasterWarning",
      forUid: uid,
      title: `🌩️ ${alert.title}`,
      body: `${alert.description.slice(0, 100)}… — ${formatDistance(alert.distanceKm)} from you. Open Disaster Alert for guidance.`,
      disasterType: alert.preparednessType,
      externalAlertId: alert.id,
      severity: alert.severity,
      location: {
        latitude: alert.latitude,
        longitude: alert.longitude,
        address: `Within ${formatDistance(alert.distanceKm)} of your location`,
        mapsLink: `https://maps.google.com/?q=${alert.latitude},${alert.longitude}`,
      },
      read: false,
      createdAt: serverTimestamp(),
    });

    seen.push(alert.id);
    pushed++;
  }

  await AsyncStorage.setItem(SEEN_ALERTS_KEY(uid), JSON.stringify(seen.slice(-80)));
  return pushed;
}

/** Notify all operators when a citizen submits a disaster report */
export async function notifyOperatorsOfCitizenDisasterReport(params: {
  reportId: string;
  reportedBy: string;
  reportedByUid: string;
  disasterType: string;
  urgency: string;
  description: string;
  contactNumber: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    mapsLink: string;
  };
}): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    type: "disasterAlert",
    reportId: params.reportId,
    title: "🌩️ Citizen Disaster Report",
    body: `${params.reportedBy} reported ${params.disasterType} (${params.urgency}) at ${params.location.address}`,
    reportedBy: params.reportedBy,
    reportedByUid: params.reportedByUid,
    disasterType: params.disasterType,
    urgency: params.urgency,
    contactNumber: params.contactNumber,
    description: params.description,
    location: params.location,
    severity: params.urgency === "Critical" ? "high" : "normal",
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function getDefaultUserCoordinates(): { latitude: number; longitude: number } {
  return { ...BD_CENTER };
}
