export const DEFAULT_LISTING_IMAGE =
  "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1200&q=80";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeListing(listing) {
  if (!listing) return null;

  const amenities = listing.amenities ?? {};
  const rawImages =
    Array.isArray(listing.images) && listing.images.length > 0
      ? listing.images
      : [listing.image].filter(Boolean);
  const beds = toNumber(listing.beds ?? listing.bedrooms, 0);
  const baths = toNumber(listing.baths ?? listing.bathrooms, 0);
  const images = rawImages
    .map((image, index) => normalizeImageEntry(image, index))
    .filter(Boolean);
  const primaryImage = images[0]?.url || listing.image?.trim() || DEFAULT_LISTING_IMAGE;

  return {
    ...listing,
    id: listing.id,
    title: listing.title?.trim() || "Untitled listing",
    address: listing.address?.trim() || "",
    campus: listing.campus?.trim() || "",
    price: toNumber(listing.price, 0),
    priceLabel: listing.priceLabel?.trim?.() || listing.price_label?.trim?.() || "",
    beds,
    bedrooms: beds,
    baths,
    bathrooms: baths,
    propertyType: (listing.propertyType || "apartment").toLowerCase(),
    distance: toNullableNumber(listing.distance),
    description: listing.description?.trim() || "No description has been added for this listing yet.",
    landlordNum: listing.landlordNum?.trim() || "",
    landlordEmail: listing.landlordEmail?.trim() || "",
    available_from: listing.available_from || "",
    available_to: listing.available_to || "",
    latitude: listing.latitude ? toNumber(listing.latitude) : null,
    longitude: listing.longitude ? toNumber(listing.longitude) : null,
    images,
    image: primaryImage,
    sourceName: listing.sourceName?.trim?.() || "",
    sourceUrl: listing.sourceUrl?.trim?.() || "",
    isImported: Boolean(listing.isImported),
    amenities: {
      Parking: Boolean(amenities.Parking ?? amenities.parking),
      Laundry: Boolean(amenities.Laundry ?? amenities.laundry),
      Pet_Friendly: Boolean(amenities.Pet_Friendly ?? amenities.petFriendly),
      Furnished: Boolean(amenities.Furnished ?? amenities.furnished),
    },
  };
}

export function normalizeListings(listings = []) {
  return listings
    .map((listing) => normalizeListing(listing))
    .filter(Boolean);
}

export function getNextListingId(listings = []) {
  const numericIds = listings
    .map((listing) => Number(listing.id))
    .filter((id) => Number.isFinite(id));

  return numericIds.length === 0 ? 1 : Math.max(...numericIds) + 1;
}

export function formatAmenityLabel(key) {
  return key.replaceAll("_", " ");
}

export function formatListingPrice(listing, suffix = "/mo") {
  const normalized = normalizeListing(listing);
  if (!normalized) return "Price unavailable";

  if (normalized.priceLabel) {
    return normalized.priceLabel === "Ask"
      ? "Ask"
      : normalized.priceLabel.includes("/")
        ? normalized.priceLabel
        : `${normalized.priceLabel}${suffix}`;
  }

  return normalized.price > 0 ? `$${normalized.price}${suffix}` : "Price unavailable";
}

function normalizeImageEntry(image, index) {
  if (!image) return null;

  if (typeof image === "string") {
    const trimmedImage = image.trim();
    if (!trimmedImage) return null;

    return {
      id: `image-${index}-${trimmedImage.slice(-10)}`,
      name: `Image ${index + 1}`,
      url: trimmedImage,
    };
  }

  if (typeof image === "object" && typeof image.url === "string") {
    const trimmedUrl = image.url.trim();
    if (!trimmedUrl) return null;

    return {
      id: image.id || `image-${index}-${trimmedUrl.slice(-10)}`,
      name: image.name?.trim() || `Image ${index + 1}`,
      url: trimmedUrl,
    };
  }

  return null;
}

/** "College Ave · 0.4 mi to College Avenue Student Center" style distance text. */
export function formatDistanceLabel(listing) {
  if (!listing || typeof listing.distance !== "number") return null;
  if (listing.nearestStudentCenter) {
    return `${listing.campus} · ${listing.distance} mi to ${listing.nearestStudentCenter}`;
  }
  return listing.campus
    ? `${listing.distance} miles from ${listing.campus}`
    : `${listing.distance} miles from Rutgers`;
}

/** Map page link that zooms to one listing, or null when it has no coordinates. */
export function getListingMapPath(listing) {
  if (!Number.isFinite(listing?.latitude) || !Number.isFinite(listing?.longitude)) return null;
  return `/map?listing=${encodeURIComponent(listing.id)}`;
}
