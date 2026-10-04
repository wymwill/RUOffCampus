import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { isRutgersEmail } from "../utils/rutgersEmail";
import Icon from "./ui/Icon";

const NAV_LINKS = [
  { to: "/listings", label: "Listings", end: true },
  { to: "/map", label: "Map View" },
  { to: "/favorites", label: "Favorites" },
  { to: "/inbox", label: "Inbox" },
];

function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-scarlet text-white shadow-scarlet">
        <Icon name="home" filled className="text-[22px]" />
      </span>
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-lg font-semibold text-midnight">RU Off-Campus</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">
          New Brunswick Living
        </span>
      </span>
    </Link>
  );
}

function Navbar() {
  const { user, isConfigured } = useAuth();
  const links = user ? [...NAV_LINKS, { to: "/my-listings", label: "My listings" }] : NAV_LINKS;

  const linkClass = ({ isActive }) =>
    `shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
      isActive
        ? "bg-midnight font-bold text-white"
        : "font-semibold text-slate-500 hover:text-midnight"
    }`;

  const nav = (
    <nav
      aria-label="Main"
      className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-surface-low p-1 shadow-card"
    >
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 h-[var(--header-h)] bg-canvas/95 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 md:h-20 md:px-8">
        <Brand />

        <div className="hidden min-w-0 flex-1 justify-center md:flex">{nav}</div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <Link
            to="/listings/new"
            className="rounded-full bg-scarlet px-4 py-2 text-sm font-semibold text-white shadow-scarlet transition hover:bg-scarlet-dark md:px-6"
          >
            Post Sublet
          </Link>
          {user && (
            <span
              title={user.email}
              className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] lg:inline-flex ${
                isRutgersEmail(user.email) && user.email_confirmed_at
                  ? "bg-verified-soft text-verified"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              <Icon
                name={isRutgersEmail(user.email) && user.email_confirmed_at ? "verified" : "person"}
                filled
                className="text-[14px]"
              />
              {isRutgersEmail(user.email)
                ? user.email_confirmed_at
                  ? "Rutgers account"
                  : "Rutgers, unconfirmed"
                : "Non-Rutgers account"}
            </span>
          )}
          {user ? (
            <button
              type="button"
              title={user.email}
              onClick={async () => {
                if (!isConfigured || !supabase) return;
                await supabase.auth.signOut();
              }}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-midnight shadow-card transition hover:bg-surface-low md:px-4"
            >
              <Icon name="logout" className="text-[18px] text-slate-500" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-midnight shadow-card transition hover:bg-surface-low md:px-4"
            >
              <Icon name="account_circle" className="text-[18px] text-slate-500" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>
      </div>

      <div className="flex h-12 items-center px-4 md:hidden">{nav}</div>
    </header>
  );
}

export default Navbar;
