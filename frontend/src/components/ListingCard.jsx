import { Link, useNavigate } from "react-router-dom";
import { isAvailableNow, termBadge } from "../utils/listingBadges";
import {
  formatAmenityLabel,
  formatListingPrice,
  getListingMapPath,
  normalizeListing,
} from "../utils/listingUtils";
import ListingTrust from "./ListingTrust";
import MessageHostButton from "./MessageHostButton";
import Icon from "./ui/Icon";

function formatDate(dateStr) {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ListingCard({ listing, isFavorited, onToggleFavorite }) {
  const normalizedListing = normalizeListing(listing);
  const navigate = useNavigate();
  const mapPath = getListingMapPath(normalizedListing);
  const term = termBadge(normalizedListing.available_from);
  const stop = normalizedListing.nearestStop;
  const activeAmenities = Object.entries(normalizedListing.amenities)
    .filter(([, value]) => value)
    .map(([key]) => formatAmenityLabel(key));
  const availRange = normalizedListing.available_from
    ? isAvailableNow(normalizedListing.available_from)
      ? normalizedListing.available_to
        ? `Available now to ${formatDate(normalizedListing.available_to)}`
        : "Available now"
      : normalizedListing.available_to
      ? `${formatDate(normalizedListing.available_from)} to ${formatDate(normalizedListing.available_to)}`
      : `From ${formatDate(normalizedListing.available_from)}`
    : null;

  const specs = [
    normalizedListing.beds === 0 ? "Studio" : `${normalizedListing.beds} Bed`,
    normalizedListing.baths > 0 ? `${normalizedListing.baths} Bath` : null,
    typeof normalizedListing.distance === "number" && normalizedListing.nearestStudentCenter
      ? `${normalizedListing.distance} mi to ${normalizedListing.nearestStudentCenter}`
      : typeof normalizedListing.distance === "number"
        ? `${normalizedListing.distance} mi from campus`
        : null,
  ].filter(Boolean);

  // The whole card is a link, so the buttons on it stop the click reaching it.
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
    <Link to={`/listings/${normalizedListing.id}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lift">
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-high">
          <img
            src={normalizedListing.image}
            alt={normalizedListing.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />

          <span className="absolute left-4 top-4 rounded-full bg-scarlet px-3.5 py-1.5 text-sm font-bold text-white shadow-scarlet">
            {formatListingPrice(normalizedListing)}
          </span>

          <button
            type="button"
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorited}
            onClick={handleFavoriteClick}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur-sm transition hover:scale-105"
          >
            <Icon
              name="favorite"
              filled={isFavorited}
              className={`text-[22px] ${isFavorited ? "text-scarlet" : "text-midnight"}`}
            />
          </button>

          {term && (
            <span className="absolute bottom-4 left-4 rounded-full bg-midnight/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur-sm">
              {term}
            </span>
          )}

          {mapPath && (
            <button
              type="button"
              onClick={handleMapClick}
              className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-midnight shadow backdrop-blur-sm transition hover:bg-white"
            >
              <Icon name="location_on" className="text-[16px]" />
              View on map
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold leading-6 text-midnight">
              {normalizedListing.title}
            </h2>
            <span className="shrink-0 rounded-full bg-surface-low px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-600">
              {normalizedListing.propertyType}
            </span>
          </div>

          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
            {[normalizedListing.campus, normalizedListing.address].filter(Boolean).join(" · ")}
          </p>

          <p className="mt-3 text-sm text-slate-600">{specs.join(" • ")}</p>

          {stop && (
            <p className="mt-1.5 flex items-center gap-1 text-sm text-slate-600">
              <Icon name="directions_bus" className="text-[16px] text-scarlet" />
              {stop.walkMinutes} min walk to {stop.name}
            </p>
          )}

          {activeAmenities.length > 0 && (
            <p className="mt-3 text-sm text-slate-500">{activeAmenities.join(" • ")}</p>
          )}

          <div className="min-h-5 flex-1" />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <ListingTrust listing={normalizedListing} />
            {availRange && (
              <span className="text-xs font-semibold text-scarlet">{availRange}</span>
            )}
          </div>

          {normalizedListing.host_id && !normalizedListing.isImported && (
            <MessageHostButton
              listing={normalizedListing}
              stopPropagation
              className="mt-4 w-full rounded-full border border-scarlet px-4 py-2 text-sm font-semibold text-scarlet transition hover:bg-scarlet hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-white"
            />
          )}
        </div>
      </article>
    </Link>
  );
}

export default ListingCard;
