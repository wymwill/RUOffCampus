// Numbers and picks for the landing page, all computed from real listings.
import { termBadge } from "./listingBadges.js";
import { NEAR_TRANSIT_MINUTES } from "./transit.js";

export const CAMPUSES = ["College Ave", "Busch", "Livingston", "Cook/Douglass"];

function hasRealImage(listing, placeholder) {
  return Boolean(listing.image) && listing.image !== placeholder;
}

export function computeHomeStats(listings, placeholderImage = "") {
  const prices = listings
    .map((listing) => Number(listing.price))
    .filter((price) => price > 0)
    .sort((a, b) => a - b);
  const middle = Math.floor(prices.length / 2);
  const medianRent =
    prices.length === 0
      ? null
      : prices.length % 2
        ? prices[middle]
        : Math.round((prices[middle - 1] + prices[middle]) / 2);

  const campuses = Object.fromEntries(
    CAMPUSES.map((campus) => {
      const inCampus = listings.filter((listing) => listing.campus === campus);
      const withImage = inCampus.find((listing) => hasRealImage(listing, placeholderImage));
      return [campus, { count: inCampus.length, image: withImage?.image ?? null }];
    })
  );

  return {
    total: listings.length,
    nearTransit: listings.filter(
      (listing) => listing.nearestStop && listing.nearestStop.walkMinutes <= NEAR_TRANSIT_MINUTES
    ).length,
    medianRent,
    campuses,
  };
}

/**
 * Up to `count` listings to feature: upcoming term listings with a price and
 * a real photo first, soonest start date first, then any others with photos.
 */
export function pickFeatured(listings, count = 3, placeholderImage = "", today) {
  const eligible = listings.filter(
    (listing) => Number(listing.price) > 0 && hasRealImage(listing, placeholderImage)
  );
  const upcoming = eligible
    .filter((listing) => termBadge(listing.available_from, today))
    .sort((a, b) => String(a.available_from).localeCompare(String(b.available_from)));
  const rest = eligible.filter((listing) => !upcoming.includes(listing));
  return [...upcoming, ...rest].slice(0, count);
}
