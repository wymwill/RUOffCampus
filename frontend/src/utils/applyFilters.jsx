import { listingMatchesDates } from "./dateRange";

export default function applyFilters(listings, filters) {
  return listings.filter((listing) => {
    const [minPrice, maxPrice] = filters.price;
    const listingBeds = Number(listing.beds ?? listing.bedrooms ?? 0);
    const listingPropertyType = (listing.propertyType || "").toLowerCase();

    if (listing.price < minPrice || listing.price > maxPrice) return false;

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
