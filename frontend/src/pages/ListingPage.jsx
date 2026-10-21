import { useMemo } from "react";
import FilterBar from "../components/FilterBar";
import ListingGrid from "../components/ListingGrid";
import Icon from "../components/ui/Icon";
import { useFavorites } from "../context/FavoritesContext";
import { useFilters } from "../context/FiltersContext";
import { useListings } from "../context/ListingsContext";
import applyFilters from "../utils/applyFilters";
import { SORT_OPTIONS, sortListings } from "../utils/listingSort";

function ListingPage() {
  const { listings, isLoading, error, refreshListings } = useListings();
  const { favorites, toggleFavorite } = useFavorites();
  const { filters, setFilters } = useFilters();

  const filteredListings = useMemo(
    () => sortListings(applyFilters(listings, filters), filters.sort),
    [listings, filters]
  );
  const campusLabel = filters.campus === "all" ? "Rutgers New Brunswick" : filters.campus;

  return (
    <div className="min-h-screen bg-canvas">
      <FilterBar view="list" resultCount={isLoading ? null : filteredListings.length} />

      <main className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">
              Available housing · {campusLabel}
            </p>
            <h1 className="mt-1 text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight md:text-[32px] md:leading-10 md:tracking-[-0.02em]">
              {isLoading
                ? "Loading listings..."
                : `${filteredListings.length} ${filteredListings.length === 1 ? "listing" : "listings"} near campus`}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Student sublets and Rutgers Off-Campus Marketplace listings.
            </p>
          </div>

          <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-600">
            <Icon name="sort" className="text-[18px]" />
            Sort by
            <select
              value={filters.sort ?? "newest"}
              onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
              className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-midnight shadow-sm outline-none focus:ring-2 focus:ring-midnight"
            >
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            <p className="font-semibold">Could not load listings.</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={refreshListings}
              className="mt-3 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold transition hover:border-red-400"
            >
              Try again
            </button>
          </div>
        )}

        {isLoading && !error ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-card">
            Loading Rutgers listings...
          </div>
        ) : (
          <ListingGrid
            key={JSON.stringify(filters)}
            listings={filteredListings}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>
    </div>
  );
}

export default ListingPage;
