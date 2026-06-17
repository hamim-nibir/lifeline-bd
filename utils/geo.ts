/** Haversine distance in kilometers between two WGS84 points. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Offset lat/lng by roughly `distanceKm` north-east (simple demo path). */
export function offsetLatLng(
  lat: number,
  lng: number,
  distanceKm: number,
  bearingDeg: number
): { latitude: number; longitude: number } {
  const R = 6371;
  const RAD_TO_DEG = 57.29577951308232;
  const br = (bearingDeg * Math.PI) / 180;
  const d = distanceKm / R;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { latitude: lat2 * RAD_TO_DEG, longitude: lng2 * RAD_TO_DEG };
}

/** Move point `from` toward `to` by fraction 0–1 of the straight-line chord (good enough for short distances). */
export function interpolateToward(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  fraction: number
): { latitude: number; longitude: number } {
  const t = Math.min(1, Math.max(0, fraction));
  return {
    latitude: fromLat + (toLat - fromLat) * t,
    longitude: fromLng + (toLng - fromLng) * t,
  };
}
