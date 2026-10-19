import { Link, useParams } from "react-router-dom";
import ErrorPage from "./ErrorPage";
import CardDescription from "../components/CardDescription";
import Sidebar from "../components/Sidebar";
import ListingImageGallery from "../components/ListingImageGallery";
import Icon from "../components/ui/Icon";
import { useListings } from "../context/ListingsContext";
import { getListingDetailState } from "../utils/listingDetailState";

const CardInfo = () => {
  const params = useParams();
  const { getListingById, isLoading, error, refreshListings } = useListings();
  const foundListing = getListingById(params.listingId);

  const state = getListingDetailState({ listing: foundListing, isLoading, error });

  if (state === "loading" || state === "error") {
    return (
      <main className="mx-auto max-w-[1600px] px-4 py-12 md:px-8">
        <div
          role={state === "error" ? "alert" : "status"}
          className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600 shadow-card"
        >
          <h1 className="text-xl font-bold text-midnight">
            {state === "loading" ? "Loading listing..." : "Could not load this listing."}
          </h1>
          {state === "error" && (
            <>
              <p className="mt-2">{error}</p>
              <button
                type="button"
                onClick={refreshListings}
                className="mt-4 rounded-full bg-scarlet px-5 py-2 font-semibold text-white hover:bg-scarlet-dark"
              >
                Try again
              </button>
            </>
          )}
          <Link to="/listings" className="mt-4 block text-sm font-semibold text-scarlet hover:underline">
            Back to listings
          </Link>
        </div>
      </main>
    );
  }

  if (state === "ready") {
    return (
      <div className="bg-canvas">
        <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
          <div className="grid grid-cols-1 gap-8">
            <Link
              to="/listings"
              className="flex w-fit items-center gap-1 text-sm font-semibold text-scarlet hover:text-scarlet-dark"
            >
              <Icon name="arrow_back" className="text-[18px]" />
              Back to listings
            </Link>

            <div className="w-full">
              <ListingImageGallery images={foundListing.images} title={foundListing.title} />
            </div>

            <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
              <CardDescription foundListing={foundListing} />
              <Sidebar foundListing={foundListing} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ErrorPage />;
};

export default CardInfo
