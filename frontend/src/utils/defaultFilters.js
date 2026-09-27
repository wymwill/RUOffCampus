export function createDefaultFilters() {
  return {
    price: [0, 5000],
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
