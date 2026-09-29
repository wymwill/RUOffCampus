import { Link } from "react-router-dom";
import { formatListingPrice, getListingMapPath } from "../utils/listingUtils";
import MessageHostButton from "./MessageHostButton";

const Sidebar = ({ foundListing }) => {
  const hasPhone = Boolean(foundListing.landlordNum);
  const hasEmail = Boolean(foundListing.landlordEmail);
  const hasSourceUrl = Boolean(foundListing.sourceUrl);
  const mapPath = getListingMapPath(foundListing);

  return (
    <div className="sticky top-24 h-fit rounded-2xl bg-gray-100 p-6">
        <h2 className="mb-6 text-3xl font-bold text-[#cc0033]">
            {formatListingPrice(foundListing, "/month")}
        </h2>
        <div>
            <h2 className="font-bold">
                Contact Landlord
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
        <div className="flex flex-col gap-5 pt-5">
            {hasSourceUrl ? (
              <a
                href={foundListing.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mb-3 block w-full rounded-lg bg-[#cc0033] py-3 text-center font-medium text-white transition-colors hover:bg-[#a80029]"
              >
                View Original Listing
              </a>
            ) : (
              <button className="mb-3 w-full rounded-lg bg-[#cc0033] py-3 font-medium text-white transition-colors hover:bg-[#a80029]">
                Request Tour
              </button>
            )}
            {hasSourceUrl ? (
              <a
                href={foundListing.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-lg border border-[#cc0033] py-3 text-center font-medium text-[#cc0033] transition-colors hover:bg-[#cc0033] hover:text-white"
              >
                Open Source Page
              </a>
            ) : (
              <MessageHostButton
                listing={foundListing}
                className="w-full rounded-lg border border-[#cc0033] py-3 font-medium text-[#cc0033] transition-colors hover:bg-[#cc0033] hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent"
              />
            )}
            {mapPath && (
              <Link
                to={mapPath}
                className="block w-full rounded-lg border border-slate-300 bg-white py-3 text-center font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
              >
                View on map
              </Link>
            )}
        </div>
    </div>
  )
}

export default Sidebar
