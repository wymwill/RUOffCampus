import { Link } from "react-router-dom";
import { formatListingPrice, getListingMapPath } from "../utils/listingUtils";
import MessageHostButton from "./MessageHostButton";
import Icon from "./ui/Icon";

const Sidebar = ({ foundListing }) => {
  const hasPhone = Boolean(foundListing.landlordNum);
  const hasEmail = Boolean(foundListing.landlordEmail);
  const hasSourceUrl = Boolean(foundListing.sourceUrl);
  const mapPath = getListingMapPath(foundListing);

  return (
    <div className="sticky top-[calc(var(--header-h)+1.5rem)] h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Rent</p>
        <h2 className="mb-6 text-[32px] font-extrabold leading-10 tracking-[-0.02em] text-scarlet">
            {formatListingPrice(foundListing, "/month")}
        </h2>
        <div>
            <h2 className="font-bold text-midnight">
                Contact
            </h2>
        </div>
        <div>
            {hasPhone ? (
              <a className="break-all hover:underline" href={`tel:${foundListing.landlordNum}`}>
                {foundListing.landlordNum}
              </a>
            ) : (
              <span className="text-slate-500">Phone not provided</span>
            )}
        </div>
        <div>
            {hasEmail ? (
              <a className="break-all hover:underline" href={`mailto:${foundListing.landlordEmail}`}>
                {foundListing.landlordEmail}
              </a>
            ) : (
              <span className="text-slate-500">
                {hasSourceUrl
                  ? "Contact details live on the original listing."
                  : "Email not provided"}
              </span>
            )}
        </div>
        {!foundListing.isImported && foundListing.hostIsRutgers === false && (
            <p className="mt-5 flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
              <Icon name="info" className="mt-0.5 text-[16px]" />
              Posted by a non-Rutgers account. See the place before paying and never send a deposit
              by gift card, wire or crypto.
            </p>
        )}
        <div className="flex flex-col gap-3 pt-6">
            {/* Imported listings are contacted on their source site. Student
                listings are contacted through in-app messages. */}
            {hasSourceUrl ? (
              <a
                href={foundListing.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-scarlet py-3 text-center font-semibold text-white shadow-scarlet transition-colors hover:bg-scarlet-dark"
              >
                View original listing
                <Icon name="open_in_new" className="text-[18px]" />
              </a>
            ) : (
              <MessageHostButton
                listing={foundListing}
                className="w-full rounded-full bg-scarlet py-3 font-semibold text-white shadow-scarlet transition-colors hover:bg-scarlet-dark disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              />
            )}
            {mapPath && (
              <Link
                to={mapPath}
                className="flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white py-3 text-center font-semibold text-midnight shadow-card transition-colors hover:bg-surface-low"
              >
                <Icon name="location_on" className="text-[18px]" />
                View on map
              </Link>
            )}
        </div>
    </div>
  )
}

export default Sidebar
