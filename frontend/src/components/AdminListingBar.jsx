import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteAdminListing, updateAdminListing } from "../api/adminApi";
import { useAuth } from "../context/AuthContext";
import { useListings } from "../context/ListingsContext";
import Icon from "./ui/Icon";

/** Edit, pause and delete controls on any listing, shown only to admins. */
function AdminListingBar({ listing }) {
  const { isAdmin, session } = useAuth();
  const { refreshListings } = useListings();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isAdmin) return null;

  const options = { accessToken: session?.access_token };
  const isActive = (listing.status || "active") === "active";

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  };

  const button =
    "rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-60";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-midnight px-4 py-3 text-white">
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon name="admin_panel_settings" className="text-[18px]" />
        Admin
      </span>
      <div className="flex flex-1 flex-wrap justify-end gap-2">
        <Link to={`/listings/${listing.id}/edit`} className={button}>
          Edit
        </Link>
        <button
          type="button"
          disabled={busy}
          className={button}
          onClick={() =>
            run(async () => {
              await updateAdminListing(listing.id, { status: isActive ? "paused" : "active" }, options);
              await refreshListings();
              if (isActive) navigate("/admin");
            })
          }
        >
          {isActive ? "Pause" : "Activate"}
        </button>
        <button
          type="button"
          disabled={busy}
          className={`${button} border-red-300/60 text-red-200`}
          onClick={() => {
            if (!window.confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
            run(async () => {
              await deleteAdminListing(listing.id, options);
              await refreshListings();
              navigate("/listings");
            });
          }}
        >
          Delete
        </button>
      </div>
      {error && <p className="w-full text-xs text-red-200">{error}</p>}
    </div>
  );
}

export default AdminListingBar;
