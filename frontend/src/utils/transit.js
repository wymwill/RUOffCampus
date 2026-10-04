// Walking estimates to the nearest Rutgers bus stop. Straight line distance
// times a detour factor for streets, at 3 mph. Rough, but consistent.
const WALK_MINUTES_PER_MILE = 20;
const STREET_DETOUR_FACTOR = 1.25;

export const NEAR_TRANSIT_MINUTES = 5;

/** Nearest stop as { name, miles, walkMinutes }, or null without coordinates. */
export function findNearestStop(latitude, longitude, stops) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (latitude == null || longitude == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  let nearest = null;
  for (const stop of stops) {
    const miles = haversineMiles(lat, lng, stop.lat, stop.lng);
    if (!nearest || miles < nearest.miles) nearest = { name: stop.name, miles };
  }
  if (!nearest) return null;

  return {
    name: nearest.name,
    miles: Number(nearest.miles.toFixed(2)),
    walkMinutes: Math.max(1, Math.round(nearest.miles * STREET_DETOUR_FACTOR * WALK_MINUTES_PER_MILE)),
  };
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
