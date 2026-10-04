import ListingGrid from "../components/ListingGrid";
import { useFavorites } from "../context/FavoritesContext";
import { useListings } from "../context/ListingsContext";

function FavoritesPage() {
  const { favorites, toggleFavorite } = useFavorites();
  const { listings } = useListings();
  const favoriteListings = listings.filter((listing) =>
    favorites.has(listing.id)
  );

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">Saved Listings</p>
        <h1 className="text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight md:text-[32px] md:leading-10">
          {favoriteListings.length === 0
            ? "No favorites yet"
            : `${favoriteListings.length} favorite listing${
                favoriteListings.length === 1 ? "" : "s"
              }`}
        </h1>
      </div>

      {favoriteListings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-600">
          Favorite listings from the Listings page will show up here.
        </div>
      ) : (
        <ListingGrid
          listings={favoriteListings}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </div>
  );
}

export default FavoritesPage;
