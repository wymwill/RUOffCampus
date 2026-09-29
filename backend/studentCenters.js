// Rutgers New Brunswick student centers, geocoded from OpenStreetMap.
// Keep in sync with frontend/src/utils/locationUtils.jsx.
export const STUDENT_CENTERS = [
  { campus: 'College Ave', name: 'College Avenue Student Center', latitude: 40.502632, longitude: -74.452505 },
  { campus: 'Busch', name: 'Busch Student Center', latitude: 40.52333, longitude: -74.458861 },
  { campus: 'Livingston', name: 'Livingston Student Center', latitude: 40.523578, longitude: -74.437217 },
  { campus: 'Cook/Douglass', name: 'Cook Student Center', latitude: 40.479127, longitude: -74.431473 },
  { campus: 'Cook/Douglass', name: 'Douglass Student Center', latitude: 40.484699, longitude: -74.436666 },
]

/**
 * Nearest student center to a point, by straight line distance in miles
 * rounded to 0.1. Returns null when the coordinates are missing.
 */
export function nearestStudentCenter(latitude, longitude) {
  const lat = toCoordinate(latitude)
  const lng = toCoordinate(longitude)
  if (lat == null || lng == null) return null

  let nearest = null
  for (const center of STUDENT_CENTERS) {
    const miles = haversineMiles(lat, lng, center.latitude, center.longitude)
    if (!nearest || miles < nearest.miles) nearest = { center, miles }
  }

  return {
    campus: nearest.center.campus,
    studentCenter: nearest.center.name,
    distance: Number(nearest.miles.toFixed(1)),
  }
}

/**
 * Replace a listing's campus and distance with the nearest student center
 * when it has coordinates. Listings without coordinates keep what they had.
 */
export function withNearestStudentCenter(listing) {
  const nearest = nearestStudentCenter(listing.latitude, listing.longitude)
  if (!nearest) return { ...listing, nearestStudentCenter: null }
  return {
    ...listing,
    campus: nearest.campus,
    campus_location: nearest.campus,
    distance: nearest.distance,
    nearestStudentCenter: nearest.studentCenter,
  }
}

function toCoordinate(value) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const earthRadiusMiles = 3958.8
  const deltaLat = toRadians(lat2 - lat1)
  const deltaLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
