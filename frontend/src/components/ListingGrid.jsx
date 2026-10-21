import { useState } from "react";
import ListingCard from "./ListingCard";

const PAGE_SIZE = 24;

// Shows PAGE_SIZE cards at a time. The page passes a key built from the
// filters, so changing a filter starts again from the first page.
function ListingGrid({ listings, favorites, onToggleFavorite }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h2 className="text-lg font-semibold text-midnight">No listings found</h2>
        <p className="mt-2 text-slate-600">
          Try changing your filters to see more results.
        </p>
      </div>
    );
  }

  const remaining = listings.length - visibleCount;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {listings.slice(0, visibleCount).map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            isFavorited={favorites.has(listing.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
      {remaining > 0 && (
        <div className="mt-10 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-midnight shadow-card transition hover:bg-surface-low"
          >
            Load {Math.min(PAGE_SIZE, remaining)} more
          </button>
          <p className="text-xs text-slate-600">
            Showing {visibleCount} of {listings.length}
          </p>
        </div>
      )}
    </>
  );
}

export default ListingGrid;
