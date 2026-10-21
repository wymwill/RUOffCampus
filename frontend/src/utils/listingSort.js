// Listing order for the listings grid.

export const SORT_OPTIONS = [
  ["newest", "Newest"],
  ["popular", "Most requested"],
  ["soonest", "Available soonest"],
  ["price-asc", "Price, low to high"],
  ["price-desc", "Price, high to low"],
  ["closest", "Closest to campus"],
];

function addedTime(listing) {
  const time = Date.parse(listing.created_at);
  return Number.isNaN(time) ? -Infinity : time;
}

// Listings without a value sort last in either direction.
function byValue(getValue, direction = 1) {
  return (a, b) => {
    const left = getValue(a);
    const right = getValue(b);
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return (left - right) * direction;
  };
}

const priceOf = (listing) => (Number(listing.price) > 0 ? Number(listing.price) : null);
const distanceOf = (listing) =>
  typeof listing.distance === "number" && Number.isFinite(listing.distance) ? listing.distance : null;
// Undated listings count as available now, after the ones with a past start date.
const startOf = (listing) => {
  const time = Date.parse(String(listing.available_from || "").slice(0, 10));
  return Number.isNaN(time) ? 0 : time;
};

// Same weights as the API's HOT score: a message counts 2, a save counts 1.
export function interestScore(listing) {
  const saves = Number(listing.interest?.saves) || 0;
  const messages = Number(listing.interest?.messages) || 0;
  return saves + messages * 2;
}

/** Sorts by one of SORT_OPTIONS, newest breaking ties. Defaults to newest. */
export function sortListings(listings, sort = "newest") {
  const byNewest = (a, b) => addedTime(b) - addedTime(a);
  const primary = {
    popular: (a, b) => interestScore(b) - interestScore(a),
    soonest: byValue(startOf),
    "price-asc": byValue(priceOf),
    "price-desc": byValue(priceOf, -1),
    closest: byValue(distanceOf),
  }[sort];
  const compare = primary ? (a, b) => primary(a, b) || byNewest(a, b) : byNewest;
  return [...listings].sort(compare);
}
