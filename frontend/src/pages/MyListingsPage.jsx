import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteListing, getMyListings, updateListing } from "../api/listingsApi";
import SignInRequired from "../components/SignInRequired";
import { useAuth } from "../context/AuthContext";
import { useListings } from "../context/ListingsContext";
import { LISTING_STATUS_LABELS } from "../utils/listingForm";
import { formatListingPrice, normalizeListing } from "../utils/listingUtils";

const STATUS_BADGE_CLASSES = {
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  taken: "bg-slate-100 text-slate-600",
};

function formatDates(listing) {
  const from = listing.available_from?.slice(0, 10);
  const to = listing.available_to?.slice(0, 10);
  if (from && to) return `${from} to ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "No dates set";
}

function MyListingsPage() {
  const { user, session, isReady } = useAuth();
  const { refreshListings } = useListings();
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const accessToken = session?.access_token;

  const loadListings = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError("");
    try {
      const mine = await getMyListings({ accessToken });
      setListings(mine.map(normalizeListing));
    } catch (loadError) {
      setError(loadError.message || "Could not load your listings.");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const runAction = async (listingId, action) => {
    setBusyId(listingId);
    setError("");
    try {
      await action();
      refreshListings();
    } catch (actionError) {
      setError(actionError.message || "Could not update your listing.");
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = (listing, status) =>
    runAction(listing.id, async () => {
      const updated = normalizeListing(await updateListing(listing.id, { status }, { accessToken }));
      setListings((prev) => prev.map((item) => (item.id === listing.id ? updated : item)));
    });

  const removeListing = (listing) => {
    if (!window.confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
    runAction(listing.id, async () => {
      await deleteListing(listing.id, { accessToken });
      setListings((prev) => prev.filter((item) => item.id !== listing.id));
    });
  };

  if (!isReady) {
    return (
      <div className="mx-auto max-w-[1600px] px-6 py-10">
        <p className="text-slate-500">Checking authentication status...</p>
      </div>
    );
  }

  if (!user) {
    return <SignInRequired message="Sign in to see and manage your listings." />;
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-red-600">Your sublets</p>
          <h1 className="text-3xl font-semibold text-slate-900">My listings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Paused and taken listings are hidden from search. You can relist them anytime.
          </p>
        </div>
        <Link
          to="/listings/new"
          className="inline-flex shrink-0 items-center rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
        >
          Post your sublet
        </Link>
      </div>

      {error && (
        <p role="alert" className="mb-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-600">
          Loading your listings...
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-600">
          You haven't posted a sublet yet.
        </div>
      ) : (
        <ul className="grid gap-4">
          {listings.map((listing) => {
            const status = listing.status || "active";
            const isBusy = busyId === listing.id;
            return (
              <li
                key={listing.id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                <img
                  src={listing.image}
                  alt=""
                  className={`h-28 w-full rounded-2xl object-cover sm:w-40 ${status === "active" ? "" : "opacity-60"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-slate-900">{listing.title}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}>
                      {LISTING_STATUS_LABELS[status] || status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-600">{listing.address || "No address"}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatListingPrice(listing)} · {formatDates(listing)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {status === "active" && (
                    <Link
                      to={`/listings/${listing.id}`}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                    >
                      View
                    </Link>
                  )}
                  <Link
                    to={`/listings/${listing.id}/edit`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
                  >
                    Edit
                  </Link>
                  {status === "active" && (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setStatus(listing, "paused")}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:opacity-50"
                      >
                        Pause
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setStatus(listing, "taken")}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:opacity-50"
                      >
                        Mark taken
                      </button>
                    </>
                  )}
                  {status !== "active" && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setStatus(listing, "active")}
                      className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Relist
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => removeListing(listing)}
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:border-red-400 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default MyListingsPage;
