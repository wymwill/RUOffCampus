import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMyListings } from "../api/listingsApi";
import AddListingForm from "../components/AddListingForm";
import SignInRequired from "../components/SignInRequired";
import { useAuth } from "../context/AuthContext";
import { useListings } from "../context/ListingsContext";

function EditListingPage() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { user, session, isReady } = useAuth();
  const { refreshListings } = useListings();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  const accessToken = session?.access_token;

  // Load through /listings/mine so only the host can open the editor,
  // and paused or taken listings can still be edited.
  useEffect(() => {
    if (!accessToken) return undefined;
    let cancelled = false;
    getMyListings({ accessToken })
      .then((mine) => {
        if (cancelled) return;
        const found = mine.find((item) => String(item.id) === String(listingId));
        if (found) setListing(found);
        else setError("This listing doesn't exist or isn't yours to edit.");
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || "Could not load listing.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, listingId]);

  if (!isReady) {
    return (
      <div className="mx-auto max-w-[1800px] px-6 py-10">
        <p className="text-slate-500">Checking authentication status...</p>
      </div>
    );
  }

  if (!user) {
    return <SignInRequired message="Sign in to edit your listing." />;
  }

  return (
    <div className="mx-auto max-w-[1800px] px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-red-600">Edit your sublet</p>
          <h1 className="text-3xl font-semibold text-slate-900">
            {listing ? listing.title : "Edit listing"}
          </h1>
        </div>
        <Link
          to="/my-listings"
          className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>

      {error ? (
        <p role="alert" className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </p>
      ) : !listing ? (
        <p className="text-slate-500">Loading listing...</p>
      ) : (
        <AddListingForm
          key={listing.id}
          initialListing={listing}
          onSaved={() => {
            refreshListings();
            navigate("/my-listings");
          }}
        />
      )}
    </div>
  );
}

export default EditListingPage;
