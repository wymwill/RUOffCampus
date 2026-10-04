// Small derived labels shown on listing cards and map popups.

const TERMS = [
  { label: "Spring", months: [0, 1, 2, 3] },
  { label: "Summer", months: [4, 5, 6, 7] },
  { label: "Fall", months: [8, 9, 10, 11] },
];

/** Today as YYYY-MM-DD in local time. */
export function todayKey(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** True when the listing's start date is today or already past. */
export function isAvailableNow(availableFrom, today = todayKey()) {
  const key = String(availableFrom || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && key <= today;
}

/**
 * "Fall '27" from an upcoming available from date. Null when the date is
 * missing or already past, since those listings are available now.
 */
export function termBadge(availableFrom, today = todayKey()) {
  const match = /^(\d{4})-(\d{2})/.exec(String(availableFrom || ""));
  if (!match || isAvailableNow(availableFrom, today)) return null;
  const month = Number(match[2]) - 1;
  const term = TERMS.find((entry) => entry.months.includes(month));
  return term ? `${term.label} '${match[1].slice(2)}` : null;
}

/**
 * "$990 / bedroom" for whole unit prices split across 2 or more bedrooms.
 * Skips per person and range prices, which are already per person or vague.
 */
export function pricePerBedroom(listing) {
  const price = Number(listing?.price);
  const beds = Number(listing?.beds);
  const label = String(listing?.priceLabel || "");
  if (!(price > 0) || !(beds >= 2) || /person|-/.test(label)) return null;
  return `$${Math.round(price / beds).toLocaleString("en-US")} / bedroom`;
}
