import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import FilterSidebar from "../components/FilterSidebar";
import ListingGrid from "../components/ListingGrid";
import applyFilters from "../utils/applyFilters";
import { createDefaultFilters } from "../utils/defaultFilters";
import { useFavorites } from "../context/FavoritesContext";
import { useListings } from "../context/ListingsContext";

function ListingPage() {
  const { listings, isLoading, error, refreshListings } = useListings();
  const { favorites, toggleFavorite } = useFavorites();
  const [filters, setFilters] = useState(createDefaultFilters);

  const filteredListings = useMemo(() => {
    return applyFilters(listings, filters);
  }, [listings, filters]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <FilterSidebar filters={filters} setFilters={setFilters} />

        <main className="flex-1">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-red-600">Available Housing</p>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                {isLoading
                  ? "Loading listings..."
                  : `Showing ${filteredListings.length} listings`}
              </h1>
            </div>

            <Link
              to="/listings/new"
              className="inline-flex shrink-0 items-center rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              Post your sublet
            </Link>
          </div>

          {error && (
            <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
              <p className="font-medium">Could not load listings.</p>
              <p className="mt-1 text-sm">{error}</p>
              <button
                type="button"
                onClick={refreshListings}
                className="mt-3 rounded-full border border-red-300 px-4 py-2 text-sm font-medium transition hover:border-red-400"
              >
                Try again
              </button>
            </div>
          )}

          {isLoading && !error ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-600">
              Pulling Rutgers listings from the local backend cache...
            </div>
          ) : (
          <ListingGrid
            listings={filteredListings}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
          )}
        </main>
      </div>
    </div>
  );
}

export default ListingPage;
