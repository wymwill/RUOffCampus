import { createContext, useContext, useMemo, useState } from "react";
import { createDefaultFilters } from "../utils/defaultFilters";

// Search filters shared by the Listings and Map pages, so switching views
// keeps what the student picked.
const FiltersContext = createContext(null);

export function FiltersProvider({ children }) {
  const [filters, setFilters] = useState(createDefaultFilters);
  const value = useMemo(() => ({ filters, setFilters }), [filters]);
  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFilters() {
  const context = useContext(FiltersContext);
  if (!context) throw new Error("useFilters must be used inside FiltersProvider");
  return context;
}
