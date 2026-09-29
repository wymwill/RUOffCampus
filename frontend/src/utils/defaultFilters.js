export function createDefaultFilters() {
  return {
    // [min, max]. A null max means no upper limit.
    price: [0, null],
    beds: "any",
    propertyType: "all",
    campus: "all",
    dates: {
      moveIn: "",
      moveOut: "",
      includeUndated: true,
    },
    amenities: {
      Parking: false,
      Laundry: false,
      Pet_Friendly: false,
      Furnished: false,
    },
  };
}

// Filters shown behind "More filters" so the bar stays one row.
export function countMoreFilters(filters) {
  const defaults = createDefaultFilters();
  let count = 0;
  if (filters.propertyType !== defaults.propertyType) count += 1;
  if (filters.dates.includeUndated !== defaults.dates.includeUndated) count += 1;
  count += Object.values(filters.amenities).filter(Boolean).length;
  return count;
}

export function hasActiveFilters(filters) {
  const defaults = createDefaultFilters();
  return (
    countMoreFilters(filters) > 0 ||
    filters.beds !== defaults.beds ||
    filters.campus !== defaults.campus ||
    filters.price[0] !== defaults.price[0] ||
    filters.price[1] !== defaults.price[1] ||
    Boolean(filters.dates.moveIn || filters.dates.moveOut)
  );
}
