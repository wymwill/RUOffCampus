import { Link, useParams } from "react-router-dom";
import ErrorPage from "./ErrorPage";
import CardDescription from "../components/CardDescription";
import Sidebar from "../components/Sidebar";
import ListingImageGallery from "../components/ListingImageGallery";
import Icon from "../components/ui/Icon";
import { useListings } from "../context/ListingsContext";

const CardInfo = () => {
  const params = useParams();
  const { getListingById } = useListings();
  const foundListing = getListingById(params.listingId);

  if (foundListing) {
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
