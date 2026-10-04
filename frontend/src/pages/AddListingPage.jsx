import { Link, useNavigate } from "react-router-dom";
import AddListingForm from "../components/AddListingForm";
import { useListings } from "../context/ListingsContext";
import { useAuth } from "../context/AuthContext";

function AddListingPage() {
  const navigate = useNavigate();
  const { addListing } = useListings();
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="mx-auto max-w-[1800px] px-6 py-10">
        <p className="text-slate-500">Checking authentication status...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-[1800px] px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-600">
            Sign in required
          </p>
          <h1 className="mt-4 text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight md:text-[32px] md:leading-10">
            You must sign in with email before creating a listing.
          </h1>
          <p className="mt-4 text-slate-600">
            Once signed in, you can create a listing and edit it later from this account.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Sign in or create account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1800px] px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">Post your sublet</p>
          <h1 className="text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight md:text-[32px] md:leading-10">
            Post your student sublet
          </h1>
        </div>

        <Link
          to="/"
          className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        >
          Cancel
        </Link>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-slate-600">
        Posting uses your Rutgers account and lets interested students message you. It does not
        verify your lease or confirm the sublet is approved by your landlord. Check your lease
        and get any required permission before posting.
      </p>
      <AddListingForm
        onCreated={(listing) => {
          addListing(listing);
          navigate("/");
        }}
      />
    </div>
  );
}

export default AddListingPage;
