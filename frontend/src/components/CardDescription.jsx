import { isAvailableNow, termBadge } from "../utils/listingBadges";
import { formatAmenityLabel } from "../utils/listingUtils";
import ListingTrust from "./ListingTrust";
import Icon from "./ui/Icon";

function formatDate(dateStr) {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Fact({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-low px-4 py-3">
      <Icon name={icon} className="text-[22px] text-scarlet" />
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-midnight">{value}</p>
      </div>
    </div>
  );
}

const CardDescription = ({ foundListing }) => {
  const activeAmenities = Object.entries(foundListing.amenities ?? {})
    .filter(([, value]) => value)
    .map(([key]) => formatAmenityLabel(key));
  const stop = foundListing.nearestStop;
  const term = termBadge(foundListing.available_from);
  const availability = foundListing.available_from
    ? isAvailableNow(foundListing.available_from)
      ? foundListing.available_to
        ? `Now to ${formatDate(foundListing.available_to)}`
        : "Available now"
      : foundListing.available_to
        ? `${formatDate(foundListing.available_from)} to ${formatDate(foundListing.available_to)}`
        : `From ${formatDate(foundListing.available_from)}`
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">
              {[foundListing.campus, foundListing.propertyType].filter(Boolean).join(" · ")}
            </span>
            {term && (
              <span className="rounded-full bg-scarlet px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                {term}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight md:text-[32px] md:leading-10">
            {foundListing.title}
          </h1>
          {foundListing.address && (
            <p className="mt-1 text-base text-slate-500">{foundListing.address}</p>
          )}
          <div className="mt-3">
            <ListingTrust listing={foundListing} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Fact
            icon="bed"
            label="Bedrooms"
            value={foundListing.beds === 0 ? "Studio" : `${foundListing.beds} bed${foundListing.beds === 1 ? "" : "s"}`}
          />
          {foundListing.baths > 0 && (
            <Fact
              icon="bathtub"
              label="Bathrooms"
              value={`${foundListing.baths} bath${foundListing.baths === 1 ? "" : "s"}`}
            />
          )}
          {typeof foundListing.distance === "number" && (
            <Fact
              icon="school"
              label="To campus"
              value={
                foundListing.nearestStudentCenter
                  ? `${foundListing.distance} mi to ${foundListing.nearestStudentCenter}`
                  : `${foundListing.distance} mi from campus`
              }
            />
          )}
          {stop && (
            <Fact icon="directions_bus" label="Nearest bus stop" value={`${stop.walkMinutes} min walk to ${stop.name}`} />
          )}
          {availability && <Fact icon="calendar_month" label="Available" value={availability} />}
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-[22px] font-bold leading-7 tracking-[-0.01em] text-midnight">
          About this place
        </h2>
        <p className="whitespace-pre-line text-base leading-[26px] text-slate-600">
          {foundListing.description}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-[22px] font-bold leading-7 tracking-[-0.01em] text-midnight">
          Amenities
        </h2>
        {activeAmenities.length === 0 ? (
          <p className="text-slate-500">No amenities were added for this listing.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {activeAmenities.map((amenity) => (
              <li
                key={amenity}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-midnight shadow-card"
              >
                <Icon name="check_circle" className="text-[18px] text-verified" />
                {amenity}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default CardDescription;
