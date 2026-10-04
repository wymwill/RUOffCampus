import { listingMatchesDates } from "./dateRange";
import { NEAR_TRANSIT_MINUTES } from "./transit";

function matchesSearch(listing, search) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [listing.title, listing.address, listing.campus, listing.nearestStop?.name]
    .filter(Boolean)
    .some((text) => text.toLowerCase().includes(query));
}

// Separates Rutgers verified hosts, non-Rutgers hosts and imported listings.
export function matchesPostedBy(listing, postedBy = "all") {
  switch (postedBy) {
    case "rutgers":
      return !listing.isImported && listing.hostIsRutgers === true;
    case "non-rutgers":
      return !listing.isImported && listing.hostIsRutgers === false;
    case "marketplace":
      return Boolean(listing.isImported);
    default:
      return true;
  }
}

export default function applyFilters(listings, filters) {
  return listings.filter((listing) => {
    if (!matchesSearch(listing, filters.search ?? "")) return false;
    if (!matchesPostedBy(listing, filters.postedBy)) return false;
    if (
      filters.nearTransit &&
      !(listing.nearestStop && listing.nearestStop.walkMinutes <= NEAR_TRANSIT_MINUTES)
    ) {
      return false;
    }

    const [minPrice, maxPrice] = filters.price;
    const listingBeds = Number(listing.beds ?? listing.bedrooms ?? 0);
    const listingPropertyType = (listing.propertyType || "").toLowerCase();

    if (listing.price < minPrice) return false;
    if (maxPrice != null && listing.price > maxPrice) return false;

    if (filters.beds !== "any") {
      if (filters.beds === 3) {
        if (listingBeds < 3) return false;
      } else if (listingBeds !== filters.beds) {
        return false;
      }
    }

    if (
      filters.propertyType !== "all" &&
      listingPropertyType !== filters.propertyType
    ) {
      return false;
    }

    if (filters.campus && filters.campus !== "all") {
      const listingCampus = (listing.campus || "").trim();
      if (listingCampus !== filters.campus) return false;
    }

    if (!listingMatchesDates(listing, filters.dates)) return false;

    const selectedAmenities = Object.entries(filters.amenities || {})
      .filter(([, selected]) => selected)
      .map(([name]) => name);

    if (selectedAmenities.length > 0) {
      const listingAmenities = listing.amenities || {};
      for (const amenity of selectedAmenities) {
        if (!listingAmenities[amenity]) return false;
      }
    }

    return true;
  });
}
