// The listing form appends contact details to the description it sends.
// Strip that block when loading a listing back into the form so saving
// again doesn't stack a second copy.
const CONTACT_MARKER = /\n*— Contact —\n[\s\S]*$/;

export const LISTING_AMENITY_KEYS = ["Parking", "Laundry", "Pet_Friendly", "Furnished"];

export function listingToFormData(listing = {}) {
  const amenities = listing.amenities || {};
  const images = Array.isArray(listing.images) && listing.images.length > 0
    ? listing.images
    : [listing.image_url || listing.image].filter(Boolean);

  return {
    title: listing.title || "",
    address: listing.address || "",
    price: listing.price != null && Number(listing.price) > 0 ? String(listing.price) : "",
    beds: listing.beds != null ? String(listing.beds) : "",
    baths: listing.baths != null ? String(listing.baths) : "",
    propertyType: (listing.propertyType || listing.property_type || "apartment").toLowerCase(),
    available_from: (listing.available_from || "").slice(0, 10),
    available_to: (listing.available_to || "").slice(0, 10),
    landlordNum: listing.landlordNum || listing.landlord_phone || "",
    landlordEmail: listing.landlordEmail || listing.landlord_email || "",
    description: String(listing.description || "").replace(CONTACT_MARKER, "").trim(),
    images: images
      .map((image, index) =>
        typeof image === "string"
          ? { id: `image-${index}`, name: `Image ${index + 1}`, url: image }
          : image && image.url
            ? { id: image.id || `image-${index}`, name: image.name || `Image ${index + 1}`, url: image.url }
            : null
      )
      .filter(Boolean),
    amenities: Object.fromEntries(
      LISTING_AMENITY_KEYS.map((key) => [
        key,
        Boolean(amenities[key] ?? amenities[key.toLowerCase()]),
      ])
    ),
  };
}

export const LISTING_STATUS_LABELS = {
  active: "Active",
  paused: "Paused",
  taken: "Taken",
};
