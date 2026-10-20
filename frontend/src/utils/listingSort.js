// Listing order for the listings grid.

function addedTime(listing) {
  const time = Date.parse(listing.created_at);
  return Number.isNaN(time) ? -Infinity : time;
}

// Same weights as the API's HOT score: a message counts 2, a save counts 1.
export function interestScore(listing) {
  const saves = Number(listing.interest?.saves) || 0;
  const messages = Number(listing.interest?.messages) || 0;
  return saves + messages * 2;
}

/** "newest" (default) or "popular" (most requested, then newest). */
export function sortListings(listings, sort = "newest") {
  const byNewest = (a, b) => addedTime(b) - addedTime(a);
  const compare =
    sort === "popular"
      ? (a, b) => interestScore(b) - interestScore(a) || byNewest(a, b)
      : byNewest;
  return [...listings].sort(compare);
}
