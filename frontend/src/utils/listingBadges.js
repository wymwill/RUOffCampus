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

function formatDay(key, today) {
  const date = new Date(`${key}T00:00:00`);
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * Availability in one format for every card: "Available now", "Available now
 * to Aug 31", "From Jun 1, 2027" or "Jun 1 to Aug 31, 2027". Listings
 * without dates say so, so every card has the same footer line.
 */
export function formatAvailability(availableFrom, availableTo, today = todayKey()) {
  const from = String(availableFrom || "").slice(0, 10);
  const to = String(availableTo || "").slice(0, 10);
  const valid = (key) => /^\d{4}-\d{2}-\d{2}$/.test(key);
  if (!valid(from)) return valid(to) ? `Until ${formatDay(to, today)}` : "Dates not listed";
  if (isAvailableNow(from, today)) {
    return valid(to) ? `Available now to ${formatDay(to, today)}` : "Available now";
  }
  return valid(to) ? `${formatDay(from, today)} to ${formatDay(to, today)}` : `From ${formatDay(from, today)}`;
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

export const NEW_LISTING_DAYS = 7;

/**
 * When a listing was added, as { date: "Oct 3, 2026", relative: "2 days ago",
 * isNew }. isNew means added within NEW_LISTING_DAYS. Null without a date.
 */
export function formatAdded(createdAt, now = new Date()) {
  const added = new Date(createdAt);
  if (!createdAt || Number.isNaN(added.getTime())) return null;

  const days = Math.max(0, Math.floor((now - added) / 86400000));
  let relative;
  if (days === 0) relative = "today";
  else if (days === 1) relative = "yesterday";
  else if (days < 14) relative = `${days} days ago`;
  else if (days < 60) relative = `${Math.floor(days / 7)} weeks ago`;
  else if (days < 730) relative = `${Math.floor(days / 30)} months ago`;
  else relative = `${Math.floor(days / 365)} years ago`;

  return {
    date: added.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    relative,
    isNew: days < NEW_LISTING_DAYS,
  };
}
