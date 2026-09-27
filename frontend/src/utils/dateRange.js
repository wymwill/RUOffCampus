/**
 * Sublet date matching. Dates are compared as YYYY-MM-DD strings.
 *
 * A listing matches when its availability overlaps the renter's stay, so a
 * sublet that starts a few days late still shows up. Open-ended availability
 * (only a start or only an end date) counts as open on the missing side.
 * Listings with no dates at all match only when includeUndated is true.
 */
export function listingMatchesDates(listing, { moveIn = "", moveOut = "", includeUndated = true } = {}) {
  if (!moveIn && !moveOut) return true;

  const availableFrom = toDateKey(listing?.available_from);
  const availableTo = toDateKey(listing?.available_to);

  if (!availableFrom && !availableTo) return includeUndated;
  if (moveOut && availableFrom && availableFrom > moveOut) return false;
  if (moveIn && availableTo && availableTo < moveIn) return false;
  return true;
}

function toDateKey(value) {
  if (!value) return "";
  const key = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : "";
}
