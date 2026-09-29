import { Link, useNavigate } from "react-router-dom";
import {
  formatAmenityLabel,
  formatDistanceLabel,
  formatListingPrice,
  getListingMapPath,
  normalizeListing,
} from "../utils/listingUtils";
import MessageHostButton from "./MessageHostButton";

function ListingCard({ listing, isFavorited, onToggleFavorite }) {
  const normalizedListing = normalizeListing(listing);
  const lId = normalizedListing.id;
  const activeAmenities = Object.entries(normalizedListing.amenities)
    .filter(([, value]) => value)
    .map(([key]) => formatAmenityLabel(key));

  const availRange =
  normalizedListing.available_from && normalizedListing.available_to
    ? `${formatDate(normalizedListing.available_from)} – ${formatDate(normalizedListing.available_to)}`
    : null;
  const distanceLabel = formatDistanceLabel(normalizedListing);

  const navigate = useNavigate();
  const mapPath = getListingMapPath(normalizedListing);

  // The whole card is a link, so stop the click reaching it.
  const handleMapClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(mapPath);
  };

  const handleFavoriteClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleFavorite(normalizedListing.id);
  };

  return (
    <Link to={`/listings/${lId}`}>
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="relative">
          <img
            src={normalizedListing.image}
            alt={normalizedListing.title}
            className="h-56 w-full object-cover"
          />

          <div className="absolute left-4 top-4 rounded-full bg-red-600 px-4 py-2 text-lg font-semibold text-white shadow">
            {formatListingPrice(normalizedListing)}
          </div>

          <button
            type="button"
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            onClick={handleFavoriteClick}
            className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow"
          >
            {isFavorited ? "♥" : "♡"}
          </button>

          {mapPath && (
            <button
              type="button"
              onClick={handleMapClick}
              className="absolute bottom-4 right-4 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-800 shadow transition hover:text-red-600"
            >
              View on map
            </button>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                {normalizedListing.title}
              </h2>
              {normalizedListing.isImported && normalizedListing.sourceName && (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {normalizedListing.sourceName}
                </p>
              )}
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium capitalize text-slate-700">
              {normalizedListing.propertyType}
            </span>
          </div>

          {normalizedListing.address && (
            <p className="mt-3 text-base text-slate-600">
              {normalizedListing.address}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-base text-slate-700 sm:text-lg">
            <span>{normalizedListing.beds} beds</span>
            {normalizedListing.baths > 0 && (
              <span>{normalizedListing.baths} baths</span>
            )}
            {distanceLabel && <span>{distanceLabel}</span>}
          </div>

          {activeAmenities.length > 0 && (
            <p className="mt-4 text-sm text-slate-500">
              {activeAmenities.join(" • ")}
            </p>
          )}

          {(availRange || normalizedListing.landlordEmail || normalizedListing.sourceName) && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm">
              <span className="truncate text-slate-600">
                {normalizedListing.landlordEmail ||
                  normalizedListing.sourceName ||
                  "Contact info available in details"}
              </span>
              {availRange && (
                <span className="font-medium text-red-600">
                  {availRange}
                </span>
              )}
            </div>
          )}

          {normalizedListing.host_id && (
            <MessageHostButton
              listing={normalizedListing}
              stopPropagation
              className="mt-5 w-full rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-white"
            />
          )}
        </div>
      </div>
    </Link>
  );
}
function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default ListingCard;

// function ListingCard({ listing, isFavorited, onToggleFavorite }) {
//   const lId = listing.id
//   const availRange =
//     listing.available_from && listing.available_to
//       ? `${formatDate(listing.available_from)} – ${formatDate(listing.available_to)}`
//       : null;

//   return (
//     <Link to={`/listings/${lId}`}>
//       <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
//         <div className="relative bg-gradient-to-br from-red-500 to-red-700 px-6 py-8">
//           <div className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-2 text-lg font-semibold text-red-600 shadow">
//             ${listing.price}/mo
//           </div>

//           <button
//             onClick={() => onToggleFavorite(listing.id)}
//             className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow"
//           >
//             {isFavorited ? "♥" : "♡"}
//           </button>
//         </div>

//         <div className="p-5">
//           <h2 className="text-3xl font-semibold text-slate-900">
//             {listing.title}
//           </h2>

//           <p className="mt-3 text-xl text-slate-600">
//             {listing.address}{listing.city ? `, ${listing.city}` : ""}
//           </p>

//           {listing.description && (
//             <p className="mt-2 text-base text-slate-500">{listing.description}</p>
//           )}

//           <div className="mt-4 flex flex-wrap gap-6 text-lg text-slate-700">
//             <span>{listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed${listing.bedrooms > 1 ? "s" : ""}`}</span>
//             <span>{listing.bathrooms} bath{listing.bathrooms > 1 ? "s" : ""}</span>
//             {listing.campus && (
//               <span className="rounded-full bg-red-50 px-3 py-0.5 text-base font-medium text-red-600">
//                 {listing.campus}
//               </span>
//             )}
//           </div>

//           {availRange && (
//             <div className="mt-5 border-t pt-4 text-lg">
//               <span className="font-medium text-red-600">{availRange}</span>
//             </div>
//           )}
//         </div>
//       </div>
//     </Link>
//   );
// }

// function formatDate(dateStr) {
//   const d = new Date(dateStr + "T00:00:00");
//   return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
// }

// export default ListingCard;
