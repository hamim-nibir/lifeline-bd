import Constants from "expo-constants";

export type FireStationCandidate = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  source: "google_places" | "verified_directory";
};

const env = (k: string) =>
  (process.env[k] as string | undefined) ||
  ((Constants.expoConfig?.extra as Record<string, string> | undefined)?.[k.replace("EXPO_PUBLIC_", "").toLowerCase()] as
    | string
    | undefined);

const GOOGLE_KEY = env("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY");

export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

/** Major FSCD / fire service points (approx.) for fallback when Places API is unavailable */
const BD_FIRE_DIRECTORY: Omit<FireStationCandidate, "distanceKm" | "source">[] = [
  { id: "bd-sadar", name: "Fire Service & Civil Defence, Dhaka HQ", address: "Sadarghat, Dhaka", latitude: 23.7104, longitude: 90.4074 },
  { id: "bd-tejgaon", name: "Tejgaon Fire Station", address: "Tejgaon Industrial Area, Dhaka", latitude: 23.7626, longitude: 90.4054 },
  { id: "bd-mirpur", name: "Mirpur Fire Station", address: "Mirpur, Dhaka", latitude: 23.8069, longitude: 90.3685 },
  { id: "bd-gulshan", name: "Gulshan Fire Station", address: "Gulshan, Dhaka", latitude: 23.7801, longitude: 90.4196 },
  { id: "bd-dhanmondi", name: "Dhanmondi Fire Station", address: "Dhanmondi, Dhaka", latitude: 23.7456, longitude: 90.3760 },
  { id: "bd-motijheel", name: "Motijheel Fire Station", address: "Motijheel, Dhaka", latitude: 23.7330, longitude: 90.4172 },
  { id: "bd-uttara", name: "Uttara Fire Station", address: "Uttara, Dhaka", latitude: 23.8759, longitude: 90.3795 },
  { id: "bd-chittagong", name: "Chattogram Fire Station (Kotwali)", address: "Agrabad / central area, Chattogram", latitude: 22.3411, longitude: 91.8132 },
  { id: "bd-khulna", name: "Khulna Fire Station", address: "Khulna Sadar", latitude: 22.8456, longitude: 89.5403 },
];

async function fetchGoogleNearbyFireStations(
  lat: number,
  lng: number,
  radiusM: number
): Promise<FireStationCandidate[]> {
  if (!GOOGLE_KEY) return [];
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusM}&type=fire_station&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    status: string;
    results?: {
      place_id: string;
      name: string;
      vicinity?: string;
      geometry?: { location?: { lat: number; lng: number } };
    }[];
  };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return [];
  const user = { latitude: lat, longitude: lng };
  return (data.results || [])
    .map((r) => {
      const la = r.geometry?.location?.lat;
      const lo = r.geometry?.location?.lng;
      if (la == null || lo == null) return null;
      return {
        id: `gp-${r.place_id}`,
        name: r.name,
        address: r.vicinity || "Fire station",
        latitude: la,
        longitude: lo,
        distanceKm: distanceKm(user, { latitude: la, longitude: lo }),
        source: "google_places" as const,
      };
    })
    .filter(Boolean) as FireStationCandidate[];
}

function fallbackStations(lat: number, lng: number): FireStationCandidate[] {
  const user = { latitude: lat, longitude: lng };
  return BD_FIRE_DIRECTORY.map((s) => ({
    ...s,
    distanceKm: distanceKm(user, { latitude: s.latitude, longitude: s.longitude }),
    source: "verified_directory" as const,
  })).sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Nearest fire stations: Google Places when key is set; otherwise curated BD directory sorted by distance */
export async function fetchNearbyFireStations(
  latitude: number,
  longitude: number,
  options?: { radiusM?: number; limit?: number }
): Promise<FireStationCandidate[]> {
  const radiusM = options?.radiusM ?? 25_000;
  const limit = options?.limit ?? 12;

  try {
    const google = await fetchGoogleNearbyFireStations(latitude, longitude, radiusM);
    if (google.length > 0) {
      return google.slice(0, limit).sort((a, b) => a.distanceKm - b.distanceKm);
    }
  } catch {
    /* fall through */
  }

  return fallbackStations(latitude, longitude).slice(0, limit);
}

export function mapsDirectionsUrl(originLat: number, originLng: number, destLat: number, destLng: number): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
}

export function mapsSearchFireStationsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/fire+station/@${lat},${lng},13z`;
}

export function etaRangeFromDistanceKm(km: number): string {
  const low = Math.max(5, Math.round(6 + km * 1.8));
  const high = Math.max(low + 2, Math.round(low + 4 + km * 0.6));
  return `${low}–${high} min`;
}
