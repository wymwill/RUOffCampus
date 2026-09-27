import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

function Navbar() {
  const { user, isConfigured } = useAuth();

  const linkClass = ({ isActive }) =>
    `px-1.5 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
      isActive ? "text-red-600" : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-1 sm:gap-8">
          {!user ? (
            <NavLink to="/login" className={linkClass}>
              Login
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={async () => {
                if (!isConfigured || !supabase) return;
                await supabase.auth.signOut();
              }}
              className="px-1.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 sm:px-3 sm:text-sm"
            >
              Logout
            </button>
          )}
          <NavLink to="/" end className={linkClass}>
            Listings
          </NavLink>
          <NavLink to="/map" className={linkClass}>
            Map
          </NavLink>
          <NavLink to="/favorites" className={linkClass}>
            Favorites
          </NavLink>
          <NavLink to="/inbox" className={linkClass}>
            Inbox
          </NavLink>
          {user && (
            <NavLink to="/my-listings" className={linkClass}>
              My listings
            </NavLink>
          )}
        </div>

        <Link
          to="/"
          className="whitespace-nowrap text-sm font-semibold text-slate-900 sm:text-lg"
        >
          Sublet Finder
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
