import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, Polyline, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import ListingCard from "../components/ListingCard";
import Icon from "../components/ui/Icon";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useFilters } from "../context/FiltersContext";
import { useListings } from "../context/ListingsContext";
import busData from "../data/busRoutes.json";
import { CAMPUSES, computeHomeStats, pickFeatured } from "../utils/homeStats";
import { DEFAULT_LISTING_IMAGE } from "../utils/listingUtils";
import { NEAR_TRANSIT_MINUTES } from "../utils/transit";

// Short, factual descriptions of each New Brunswick campus.
const CAMPUS_BLURBS = {
  "College Ave": {
    tag: "Historic campus · Easton Ave",
    text: "The historic heart of Rutgers, next to Easton Ave and downtown New Brunswick.",
  },
  Busch: {
    tag: "Science and engineering",
    text: "Science, engineering and pharmacy buildings across the river in Piscataway.",
  },
  Livingston: {
    tag: "Apartments · Livingston Plaza",
    text: "Newer apartments, the Livingston Plaza shops and the business school.",
  },
  "Cook/Douglass": {
    tag: "Quieter · green space",
    text: "Quieter campuses with gardens, farms and the Douglass Library.",
  },
};

// Other places students search for that aren't campuses.
const POPULAR_SEARCHES = ["Easton Ave", "Hamilton St", "Highland Park", "Somerset St"];

const tileClass =
  "flex flex-col gap-1 rounded-xl bg-surface-low px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-midnight hover:bg-surface";
const tileLabel = "text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500";
const tileInput = "w-full bg-transparent text-sm font-semibold text-midnight outline-none [color-scheme:light]";

function formatMoney(value) {
  return `$${Number(value).toLocaleString("en-US")}`;
}

function SearchDeck({ total }) {
  const navigate = useNavigate();
  const { filters, setFilters } = useFilters();
  const [search, setSearch] = useState(filters.search);
  const [campus, setCampus] = useState(filters.campus);
  const [maxRent, setMaxRent] = useState(filters.price[1] ?? "");
  const [beds, setBeds] = useState(String(filters.beds));
  const [moveIn, setMoveIn] = useState(filters.dates.moveIn);

  // Apply the hero choices to the shared filters, then open a view.
  const go = (path, overrides = {}) => {
    setFilters((prev) => ({
      ...prev,
      search: overrides.search ?? search,
      campus: overrides.campus ?? campus,
      beds: beds === "any" ? "any" : Number(beds),
      price: [prev.price[0], maxRent === "" ? null : Math.max(0, Number(maxRent))],
      dates: { ...prev.dates, moveIn },
    }));
    navigate(path);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        go("/listings");
      }}
      className="mt-10 w-full max-w-5xl rounded-2xl bg-white p-4 text-left shadow-[0_20px_25px_-5px_rgba(15,23,42,0.12)]"
    >
      <div className="flex flex-col items-stretch gap-2 rounded-xl bg-surface-low p-1.5 lg:flex-row lg:items-center">
        <label className="flex flex-1 items-center gap-2 px-3 py-2">
          <Icon name="location_on" className="text-[22px] text-scarlet" />
          <span className="sr-only">Search listings</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by street, area or bus stop (e.g. Easton Ave, Hamilton St)"
            className="w-full bg-transparent text-sm text-midnight outline-none placeholder:text-slate-500"
          />
        </label>
        <div className="flex gap-2 px-1 pb-1 lg:p-0">
          <button
            type="submit"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-scarlet px-6 py-3 text-sm font-semibold text-white shadow-scarlet transition hover:bg-scarlet-dark lg:flex-none"
          >
            <Icon name="search" className="text-[18px]" />
            {total ? `Browse ${total} listings` : "Browse listings"}
          </button>
          <button
            type="button"
            onClick={() => go("/map")}
            className="flex items-center justify-center gap-1.5 rounded-full bg-white px-4 py-3 text-sm font-semibold text-midnight shadow-sm transition hover:bg-surface"
          >
            <Icon name="map" className="text-[18px] text-scarlet" />
            <span className="hidden sm:inline">Explore map</span>
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <label className={tileClass}>
          <span className={tileLabel}>Rutgers campus</span>
          <select value={campus} onChange={(event) => setCampus(event.target.value)} className={`${tileInput} cursor-pointer`}>
            <option value="all">Any campus</option>
            {CAMPUSES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className={tileClass}>
          <span className={tileLabel}>Max rent / month</span>
          <span className="flex items-center gap-1 text-sm font-semibold text-midnight">
            $
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={maxRent}
              onChange={(event) => setMaxRent(event.target.value)}
              placeholder="No limit"
              className={`${tileInput} placeholder:font-normal placeholder:text-slate-400`}
            />
          </span>
        </label>
        <label className={tileClass}>
          <span className={tileLabel}>Bedrooms</span>
          <select value={beds} onChange={(event) => setBeds(event.target.value)} className={`${tileInput} cursor-pointer`}>
            <option value="any">Any</option>
            <option value="0">Studio</option>
            <option value="1">1 bed</option>
            <option value="2">2 beds</option>
            <option value="3">3+ beds</option>
          </select>
        </label>
        <label className={tileClass}>
          <span className={tileLabel}>Move in</span>
          <input
            type="date"
            value={moveIn}
            onChange={(event) => setMoveIn(event.target.value)}
            className={`${tileInput} text-scarlet`}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
          Popular:
        </span>
        {CAMPUSES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => go("/listings", { campus: name, search: "" })}
            className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-midnight transition hover:bg-midnight hover:text-white"
          >
            {name}
          </button>
        ))}
        {POPULAR_SEARCHES.map((place) => (
          <button
            key={place}
            type="button"
            onClick={() => go("/listings", { search: place, campus: "all" })}
            className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-midnight transition hover:bg-midnight hover:text-white"
          >
            {place}
          </button>
        ))}
      </div>
    </form>
  );
}

function Stat({ icon, tone, value, label }) {
  return (
    <div className="flex items-center gap-4">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-inner ${tone}`}>
        <Icon name={icon} className="text-[24px]" />
      </span>
      <div>
        <p className="text-[22px] font-bold leading-7 tracking-[-0.01em] text-midnight">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, icon, title, action }) {
  return (
    <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
      <div>
        <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">
          {icon && <Icon name={icon} className="text-[16px]" />}
          {eyebrow}
        </p>
        <h2 className="mt-1 text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight md:text-[32px] md:leading-10 md:tracking-[-0.02em]">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function CommuteMap() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/map")}
      aria-label="Open the map with Rutgers bus routes"
      className="group relative block h-80 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-lift md:h-96"
    >
      <MapContainer
        center={[40.5045, -74.4505]}
        zoom={13}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        attributionControl={false}
        className="pointer-events-none h-full w-full"
      >
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}" />
        {busData.routes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.points}
            pathOptions={{ color: route.color, weight: 3, opacity: 0.7, dashArray: "8 6" }}
          />
        ))}
      </MapContainer>
      <span className="absolute bottom-4 left-4 z-[500] flex items-center gap-1.5 rounded-full bg-midnight px-4 py-2 text-xs font-bold text-white shadow-lift transition group-hover:bg-slate-800">
        <Icon name="map" className="text-[16px] text-emerald-300" />
        Open the interactive map
      </span>
      <span className="absolute bottom-4 right-4 z-[500] text-[10px] text-slate-500">
        © OpenStreetMap contributors © Esri
      </span>
    </button>
  );
}

const SAFETY_POINTS = [
  {
    icon: "verified",
    tone: "bg-verified-soft text-verified",
    title: "Rutgers verified badges",
    text: "Accounts with a confirmed Rutgers email are labeled on every listing and message. Everyone else is labeled too.",
    link: { to: "/login", label: "Create an account" },
  },
  {
    icon: "directions_bus",
    tone: "bg-surface-high text-midnight",
    title: "Transit and campus distances",
    text: "Each listing shows the walk to the nearest Rutgers bus stop and the distance to the nearest student center.",
    link: { to: "/map", label: "See bus routes" },
  },
  {
    icon: "forum",
    tone: "bg-red-100 text-scarlet",
    title: "Message in the app",
    text: "Contact hosts without sharing your phone number. Never send a deposit before you've seen the place.",
    link: { to: "/inbox", label: "Go to inbox" },
  },
  {
    icon: "add_home",
    tone: "bg-amber-50 text-amber-800",
    title: "Post a sublet in minutes",
    text: "Studying abroad or graduating early? Paste your post, check the draft and publish. Renters message you here.",
    link: { to: "/listings/new", label: "List your room" },
  },
];

function HomePage() {
  const { listings, isLoading } = useListings();
  const { favorites, toggleFavorite } = useFavorites();
  const { setFilters } = useFilters();
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = useMemo(() => computeHomeStats(listings, DEFAULT_LISTING_IMAGE), [listings]);
  const featured = useMemo(() => pickFeatured(listings, 3, DEFAULT_LISTING_IMAGE), [listings]);

  const openCampus = (campus) => {
    setFilters((prev) => ({ ...prev, campus, search: "" }));
    navigate("/listings");
  };

  return (
    <div className="bg-canvas">
      {/* Hero and search */}
      <section className="relative overflow-hidden bg-surface-low px-4 py-14 md:px-8 md:py-20">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-scarlet/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center text-center">
          <p className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-sm">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-midnight">
              Sublets and listings near Rutgers
            </span>
            <span className="text-xs font-bold text-scarlet">
              {isLoading ? "Loading..." : `${stats.total} available now`}
            </span>
          </p>
          <h1 className="mt-5 max-w-4xl text-[34px] font-extrabold leading-[42px] tracking-[-0.02em] text-midnight md:text-[48px] md:leading-[56px]">
            Find your home on the{" "}
            <span className="relative inline-block text-scarlet">
              Banks of the Raritan
              <svg
                aria-hidden="true"
                viewBox="0 0 300 12"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-3 w-full text-scarlet/40"
              >
                <path d="M2 9 C 80 2, 220 2, 298 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-[26px] text-slate-500">
            Student sublets and off-campus listings around Rutgers New Brunswick in one place, with
            bus stop walk times, campus distances and Rutgers verified badges.
          </p>
          <SearchDeck total={isLoading ? null : stats.total} />
        </div>
      </section>

      {/* Live numbers */}
      <section className="bg-white px-4 py-6 shadow-[0_2px_12px_rgba(15,23,42,0.03)] md:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 min-[420px]:grid-cols-2 md:grid-cols-4">
          <Stat icon="apartment" tone="bg-red-100 text-scarlet" value={isLoading ? "…" : stats.total} label="Listings near campus" />
          <Stat
            icon="directions_bus"
            tone="bg-surface-high text-midnight"
            value={isLoading ? "…" : stats.nearTransit}
            label={`Within ${NEAR_TRANSIT_MINUTES} min of a bus stop`}
          />
          <Stat
            icon="payments"
            tone="bg-verified-soft text-verified"
            value={isLoading || stats.medianRent == null ? "…" : formatMoney(stats.medianRent)}
            label="Median listed rent"
          />
          <Stat icon="route" tone="bg-amber-50 text-amber-800" value={busData.routes.length} label="Rutgers bus routes mapped" />
        </div>
      </section>

      {/* Featured listings */}
      <section className="px-4 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Coming up next"
            icon="local_fire_department"
            title="Available soon in New Brunswick"
            action={
              <Link
                to="/listings"
                className="inline-flex items-center gap-1 text-sm font-semibold text-scarlet hover:text-scarlet-dark"
              >
                View all {isLoading ? "" : stats.total} listings
                <Icon name="arrow_forward" className="text-[18px]" />
              </Link>
            }
          />
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoading
              ? [0, 1, 2].map((key) => (
                  <div key={key} className="h-96 animate-pulse rounded-2xl bg-white shadow-card" />
                ))
              : featured.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isFavorited={favorites.has(listing.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
          </div>
        </div>
      </section>

      {/* Commute */}
      <section className="bg-surface-low px-4 py-14 md:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-1 rounded-full bg-surface-high px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-midnight">
              <Icon name="route" className="text-[14px]" />
              Rutgers bus routes
            </p>
            <h2 className="mt-4 text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight md:text-[32px] md:leading-10">
              Know your commute before you sign.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-[26px] text-slate-500">
              Every listing with a location shows the walk to the nearest bus stop and the distance to the
              nearest student center. Turn routes on and off on the map to see what serves each street.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {busData.routes.map((route) => (
                <span
                  key={route.id}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-midnight shadow-sm"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: route.color }} />
                  {route.name}
                </span>
              ))}
            </div>
            <Link
              to="/map"
              className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-midnight px-5 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-slate-800"
            >
              <Icon name="near_me" className="text-[18px] text-emerald-300" />
              Launch the transit map
            </Link>
            <p className="mt-3 text-xs text-slate-500">
              Route and stop locations only. Check Rutgers Transportation for live bus times.
            </p>
          </div>
          <CommuteMap />
        </div>
      </section>

      {/* Safety */}
      <section className="px-4 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">Sublet with confidence</p>
            <h2 className="mt-1 text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight md:text-[32px] md:leading-10">
              Safer than a group chat or Craigslist
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
              Know who you're talking to and what's near the place before you send anyone money.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SAFETY_POINTS.map((point) => (
              <div key={point.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${point.tone}`}>
                  <Icon name={point.icon} filled className="text-[24px]" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-midnight">{point.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-[22px] text-slate-500">{point.text}</p>
                <Link
                  to={point.link.to}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-scarlet hover:text-scarlet-dark"
                >
                  {point.link.label}
                  <Icon name="chevron_right" className="text-[18px]" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campuses */}
      <section className="bg-surface-low px-4 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Explore New Brunswick" title="Find the campus that fits your routine" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAMPUSES.map((campus) => {
              const info = stats.campuses[campus];
              return (
                <button
                  key={campus}
                  type="button"
                  onClick={() => openCampus(campus)}
                  className="group relative flex h-72 flex-col justify-end overflow-hidden rounded-2xl bg-midnight p-5 text-left shadow-card"
                >
                  {info?.image && (
                    <img
                      src={info.image}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/60 to-transparent" />
                  <span className="relative">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-300">
                      {CAMPUS_BLURBS[campus].tag}
                    </span>
                    <span className="mt-1 block text-[22px] font-bold leading-7 text-white">{campus}</span>
                    <span className="mt-1 block text-xs leading-[18px] text-slate-200">
                      {CAMPUS_BLURBS[campus].text}
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white">
                      Explore {isLoading ? "" : info?.count ?? 0} listings
                      <Icon name="arrow_forward" className="text-[16px]" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Post CTA */}
      <section className="px-4 py-14 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl bg-gradient-to-r from-scarlet to-scarlet-dark px-6 py-10 text-white shadow-lift md:flex-row md:items-center md:px-10">
          <div>
            <p className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]">
              <Icon name="redeem" className="text-[14px]" />
              Free to post
            </p>
            <h2 className="mt-3 text-[26px] font-bold leading-8 tracking-[-0.015em] md:text-[32px] md:leading-10">
              Subletting your room for next semester?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-[22px] text-white/85">
              Post it in a few minutes and let students looking for summer, semester and full year places
              message you here.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/listings/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-3 text-sm font-semibold text-scarlet shadow-lift transition hover:bg-red-50"
            >
              <Icon name="add_home" className="text-[18px]" />
              Post a sublet
            </Link>
            {!user && (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                <Icon name="account_circle" className="text-[18px]" />
                Sign in or create account
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
