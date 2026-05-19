/** Bangladesh approximate bounding box */
export const BD_BOUNDS = {
  minLat: 20.5,
  maxLat: 26.7,
  minLon: 88.0,
  maxLon: 92.7,
};

export const BD_CENTER = { latitude: 23.685, longitude: 90.3563 };

export function isInBangladesh(lat: number, lon: number): boolean {
  return (
    lat >= BD_BOUNDS.minLat &&
    lat <= BD_BOUNDS.maxLat &&
    lon >= BD_BOUNDS.minLon &&
    lon <= BD_BOUNDS.maxLon
  );
}

/** Haversine distance in kilometres */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export type Relevance = "bangladesh" | "near_you" | "regional";

export function assessRelevance(
  eventLat: number,
  eventLon: number,
  userLat: number,
  userLon: number,
  distanceToUserKm: number
): Relevance {
  if (isInBangladesh(eventLat, eventLon)) return "bangladesh";
  if (distanceToUserKm <= 350) return "near_you";
  if (distanceKm(userLat, userLon, BD_CENTER.latitude, BD_CENTER.longitude) <= 800) {
    const distToBd = distanceKm(eventLat, eventLon, BD_CENTER.latitude, BD_CENTER.longitude);
    if (distToBd <= 600) return "regional";
  }
  return "regional";
}

export function isRelevantToUser(
  relevance: Relevance,
  distanceToUserKm: number
): boolean {
  if (relevance === "bangladesh") return true;
  if (relevance === "near_you" && distanceToUserKm <= 400) return true;
  if (relevance === "regional" && distanceToUserKm <= 550) return true;
  return false;
}
