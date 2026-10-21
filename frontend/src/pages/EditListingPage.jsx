import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getAdminListing } from "../api/adminApi";
import { getMyListings } from "../api/listingsApi";
import AddListingForm from "../components/AddListingForm";
import SignInRequired from "../components/SignInRequired";
import { useAuth } from "../context/AuthContext";
import { useListings } from "../context/ListingsContext";

function EditListingPage() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { user, session, isAdmin, isReady } = useAuth();
  const { refreshListings } = useListings();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  const accessToken = session?.access_token;

  // Load through /listings/mine so only the host can open the editor,
  // and paused or taken listings can still be edited. Admins can open any
  // listing, and the API checks that again when saving.
  useEffect(() => {
    if (!accessToken) return undefined;
    let cancelled = false;
    getMyListings({ accessToken })
      .then(async (mine) => {
        const found =
          mine.find((item) => String(item.id) === String(listingId)) ??
          (isAdmin ? await getAdminListing(listingId, { accessToken }) : null);
        if (cancelled) return;
        if (found) setListing(found);
        else setError("This listing doesn't exist or isn't yours to edit.");
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || "Could not load listing.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAdmin, listingId]);

  // Admins editing someone else's listing go back to the admin page.
  const backPath =
    isAdmin && listing && String(listing.host_id) !== String(user?.id) ? "/admin" : "/my-listings";

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
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">Edit your sublet</p>
          <h1 className="text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight md:text-[32px] md:leading-10">
            {listing ? listing.title : "Edit listing"}
          </h1>
        </div>
        <Link
          to={backPath}
          className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>

      {error ? (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
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
            navigate(backPath);
          }}
        />
      )}
    </div>
  );
}

export default EditListingPage;
