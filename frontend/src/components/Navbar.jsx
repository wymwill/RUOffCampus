import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { isRutgersEmail } from "../utils/rutgersEmail";
import AccountBadge from "./AccountBadge";
import Avatar from "./ui/Avatar";
import Icon from "./ui/Icon";
import LogoMark from "./ui/LogoMark";

const NAV_LINKS = [
  { to: "/listings", label: "Listings", end: true },
  { to: "/map", label: "Map View" },
  { to: "/favorites", label: "Favorites" },
  { to: "/inbox", label: "Inbox" },
];

function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-scarlet shadow-scarlet">
        <LogoMark className="h-8 w-8 text-white" />
      </span>
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-lg font-semibold text-midnight">
          <span className="text-scarlet">Scarlet</span>Sublet
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">
          New Brunswick Living
        </span>
      </span>
    </Link>
  );
}

function accountStatus(user) {
  if (!isRutgersEmail(user.email)) return { label: "Non-Rutgers account", verified: false };
  return user.email_confirmed_at
    ? { label: "Rutgers account", verified: true }
    : { label: "Rutgers, unconfirmed", verified: false };
}

// Avatar button whose menu holds the account status and Sign out, so the
// header keeps its room for the main tabs.
function AccountMenu({ user, profile, isAdmin, onSignOut }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const status = accountStatus(user);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold uppercase text-midnight shadow-card transition hover:bg-surface-low"
      >
        <Avatar
          src={profile?.avatarUrl}
          name={profile?.name}
          email={user.email}
          className={`h-full w-full text-sm ${isAdmin ? "ring-2 ring-midnight ring-offset-2 ring-offset-canvas" : ""}`}
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-canvas ${
            status.verified ? "bg-verified text-white" : "bg-amber-400 text-white"
          }`}
        >
          <Icon name={status.verified ? "check" : "person"} className="text-[11px]" />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-lift"
        >
          <div className="px-3 py-2">
            {profile?.name && (
              <p className="truncate text-sm font-bold text-midnight">{profile.name}</p>
            )}
            <p className="truncate text-sm font-semibold text-slate-600">{user.email}</p>
            <p
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] ${
                status.verified ? "bg-verified-soft text-verified" : "bg-amber-50 text-amber-800"
              }`}
            >
              <Icon name={status.verified ? "verified" : "person"} filled className="text-[14px]" />
              {status.label}
            </p>
            {isAdmin && (
              <div className="mt-1.5">
                <AccountBadge isAdmin />
              </div>
            )}
          </div>
          <Link
            role="menuitem"
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-midnight hover:bg-surface-low"
          >
            <Icon name="account_circle" className="text-[18px] text-slate-600" />
            Profile
          </Link>
          <Link
            role="menuitem"
            to="/my-listings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-midnight hover:bg-surface-low"
          >
            <Icon name="home_work" className="text-[18px] text-slate-600" />
            My listings
          </Link>
          {isAdmin && (
            <Link
              role="menuitem"
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-midnight hover:bg-surface-low"
            >
              <Icon name="admin_panel_settings" className="text-[18px] text-slate-600" />
              Admin
            </Link>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-midnight hover:bg-surface-low"
          >
            <Icon name="logout" className="text-[18px] text-slate-600" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Navbar() {
  const { user, profile, isAdmin, isConfigured } = useAuth();
  const signOut = async () => {
    if (!isConfigured || !supabase) return;
    await supabase.auth.signOut();
  };
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
          {user ? (
            <AccountMenu user={user} profile={profile} isAdmin={isAdmin} onSignOut={signOut} />
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
