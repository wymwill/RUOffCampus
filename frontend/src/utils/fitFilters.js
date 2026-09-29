/**
 * Pick which bar filters fit in the available width. Items are in priority
 * order and keep that order. An item that doesn't fit is skipped, but later,
 * narrower ones can still fit. Returns the keys that stay in the bar.
 */
export function fitFilters(items, availableWidth, gap = 8) {
  const visible = [];
  let used = 0;
  for (const { key, width } of items) {
    const needed = (visible.length > 0 ? gap : 0) + width;
    if (used + needed <= availableWidth) {
      visible.push(key);
      used += needed;
    }
  }
  return visible;
}
