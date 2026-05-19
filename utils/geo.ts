/** Bangladesh approximate bounding box (reference only) */
export const BD_BOUNDS = {
  minLat: 20.5,
  maxLat: 26.7,
  minLon: 88.0,
  maxLon: 92.7,
};

export const BD_CENTER = { latitude: 23.685, longitude: 90.3563 };

/** Live disaster warnings & citizen notifications use this radius */
export const DISASTER_ALERT_RADIUS_KM = 100;

export function isInBangladesh(lat: number, lon: number): boolean {
  return (
    lat >= BD_BOUNDS.minLat &&
    lat <= BD_BOUNDS.maxLat &&
    lon >= BD_BOUNDS.minLon &&
    lon <= BD_BOUNDS.maxLon
  );
}

export function isWithinDisasterAlertRange(distanceKm: number): boolean {
  return distanceKm <= DISASTER_ALERT_RADIUS_KM;
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

export type Relevance = "near_you";

export function assessRelevance(distanceToUserKm: number): Relevance | null {
  return isWithinDisasterAlertRange(distanceToUserKm) ? "near_you" : null;
}
