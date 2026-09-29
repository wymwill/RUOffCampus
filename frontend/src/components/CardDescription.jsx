import { formatAmenityLabel, formatDistanceLabel } from "../utils/listingUtils";

const CardDescription = ({ foundListing }) => {
  const activeAmenities = Object.entries(foundListing.amenities ?? {})
    .filter(([, value]) => value)
    .map(([key]) => formatAmenityLabel(key));
  const distanceLabel = formatDistanceLabel(foundListing);

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-6 flex flex-col gap-6 border-b border-gray-200 pb-8">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">{foundListing.title}</h1>
          {foundListing.address && (
            <h3 className="text-lg text-gray-600">{foundListing.address}</h3>
          )}
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-red-600">
            {foundListing.propertyType}
          </p>
        </div>

        <div>
          <h3 className="text-lg text-slate-700">
            {foundListing.beds} bedroom{foundListing.beds === 1 ? "" : "s"}
            {foundListing.baths > 0 && ` | ${foundListing.baths} bathroom${foundListing.baths === 1 ? "" : "s"}`}
            {distanceLabel ? ` | ${distanceLabel}` : ""}
          </h3>
        </div>

        {foundListing.available_from && foundListing.available_to && (
          <div>
            <h3 className="text-lg text-slate-700">
              Available {foundListing.available_from} to {foundListing.available_to}
            </h3>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold text-gray-900">About this Property</h2>
        <p className="text-slate-700">{foundListing.description}</p>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Amenities</h2>
        {activeAmenities.length === 0 ? (
          <p className="text-slate-600">No amenities were added for this listing.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {activeAmenities.map((amenity) => (
              <li
                key={amenity}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
              >
                {amenity}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CardDescription
