import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import Supercluster from "supercluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import FilterBar from "../components/FilterBar";
import ListingTrust from "../components/ListingTrust";
import Icon from "../components/ui/Icon";
import { useFavorites } from "../context/FavoritesContext";
import { useFilters } from "../context/FiltersContext";
import { useListings } from "../context/ListingsContext";
import busData from "../data/busRoutes.json";
import applyFilters from "../utils/applyFilters";
import { pricePerBedroom, termBadge } from "../utils/listingBadges";
import { formatAmenityLabel } from "../utils/listingUtils";

// College Ave, New Brunswick. Fallback center before listings load.
const DEFAULT_CENTER = [40.5007, -74.4474];
const DEFAULT_ZOOM = 14;
const FOCUS_ZOOM = 16;

// New Jersey's bounding box. The map can't be panned or zoomed out past it.
const NEW_JERSEY_BOUNDS = L.latLngBounds([38.92, -75.57], [41.36, -73.88]);

const routesServingStop = new Map();
const routeIdsServingStop = new Map();
for (const route of busData.routes) {
  for (const stopId of busData.routeStops[route.id] ?? []) {
    if (!routesServingStop.has(stopId)) routesServingStop.set(stopId, []);
    routesServingStop.get(stopId).push(route.name);
    if (!routeIdsServingStop.has(stopId)) routeIdsServingStop.set(stopId, []);
    routeIdsServingStop.get(stopId).push(route.id);
  }
}

function formatPrice(listing) {
  if (listing.priceLabel) return listing.priceLabel;
  if (!listing.price) return "Ask";
  return `$${Number(listing.price).toLocaleString("en-US")}`;
}

// Pin labels go into Leaflet as HTML, and imported price labels come from
// another site, so escape them.
function escapeHtml(text) {
  return String(text).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );
}

// Green dot on pins posted by a confirmed Rutgers email.
function isRutgersListing(listing) {
  return !listing.isImported && listing.hostIsRutgers === true;
}

function createPriceIcon(listing, isSelected) {
  const dot = isRutgersListing(listing) && !isSelected ? '<span class="listing-price-pin-dot"></span>' : "";
  const icon = isSelected
    ? '<span class="material-symbols-outlined" style="font-size:16px">location_on</span>'
    : "";
  return L.divIcon({
    className: "listing-price-pin",
    html: `<div class="listing-price-pin-bubble${
      isSelected ? " listing-price-pin-selected" : ""
    }">${icon}${dot}${escapeHtml(formatPrice(listing))}</div>`,
    iconSize: [0, 0],
  });
}

function createClusterIcon(count) {
  return L.divIcon({
    className: "listing-cluster",
    html: `<div class="listing-cluster-bubble">${count}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

// Fit the initial view to the Rutgers area. Listings far outside New
// Brunswick stay reachable but do not stretch the view.
const CAMPUS_FIT_RADIUS_DEG = 0.2;

// Width of the floating listing drawer plus its margin, so fitted pins land
// beside it rather than under it.
const DRAWER_OFFSET_PX = 416;

function FitToListings({ positions, leftInset }) {
  const map = useMap();
  useEffect(() => {
    const nearCampus = positions.filter(
      ([lat, lng]) =>
        Math.abs(lat - DEFAULT_CENTER[0]) <= CAMPUS_FIT_RADIUS_DEG &&
        Math.abs(lng - DEFAULT_CENTER[1]) <= CAMPUS_FIT_RADIUS_DEG
    );
    if (nearCampus.length > 1) {
      map.fitBounds(nearCampus, {
        paddingTopLeft: [leftInset + 48, 48],
        paddingBottomRight: [48, 48],
        maxZoom: 15,
      });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [map, positions, leftInset]);
  return null;
}

// Zooming out stops once the whole state is in view. Recomputed on resize.
function LockToNewJersey() {
  const map = useMap();
  useEffect(() => {
    const updateMinZoom = () => {
      map.setMinZoom(map.getBoundsZoom(NEW_JERSEY_BOUNDS));
    };
    updateMinZoom();
    map.on("resize", updateMinZoom);
    return () => {
      map.off("resize", updateMinZoom);
    };
  }, [map]);
  return null;
}

// Moves the map to a listing whenever a new focus request comes in, from the
// URL, the side list or a "View on map" button.
function FocusListing({ request }) {
  const map = useMap();
  useEffect(() => {
    if (!request) return;
    map.setView(
      [request.latitude, request.longitude],
      Math.max(map.getZoom(), FOCUS_ZOOM)
    );
  }, [map, request]);
  return null;
}

function BoundsWatcher({ onChange }) {
  const map = useMapEvents({
    moveend: () => onChange(map.getBounds()),
  });
  useEffect(() => {
    onChange(map.getBounds());
  }, [map, onChange]);
  return null;
}

function ListingPopupCard({ listing, isFavorited, onToggleFavorite }) {
  const term = termBadge(listing.available_from);
  const perBedroom = pricePerBedroom(listing);
  const stop = listing.nearestStop;
  const specs = [
    listing.beds === 0 ? "Studio" : `${listing.beds} Beds`,
    listing.baths > 0 ? `${listing.baths} Baths` : null,
    listing.propertyType ? formatAmenityLabel(listing.propertyType) : null,
  ].filter(Boolean);

  return (
    <div className="w-80 p-2 font-sans">
      <div className="relative h-36 overflow-hidden rounded-lg bg-surface-high">
        <img src={listing.image} alt="" className="h-full w-full object-cover" />
        {term && (
          <span className="absolute left-2 top-2 rounded-full bg-scarlet px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-md">
            {term}
          </span>
        )}
        <button
          type="button"
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={isFavorited}
          onClick={() => onToggleFavorite(listing.id)}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:scale-105"
        >
          <Icon
            name="favorite"
            filled={isFavorited}
            className={`text-[18px] ${isFavorited ? "text-scarlet" : "text-midnight"}`}
          />
        </button>
        {stop && (
          <span className="absolute bottom-2 left-2 rounded-full bg-midnight/80 px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] text-white backdrop-blur-sm">
            {stop.walkMinutes} min walk to {stop.name}
          </span>
        )}
      </div>

      <div className="px-1 pb-1 pt-2">
        <div className="flex items-start justify-between gap-2">
          <div className="text-lg font-bold leading-6 text-midnight">{listing.title}</div>
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{specs.join(" • ")}</div>
        <div className="mt-1.5">
          <ListingTrust listing={listing} compact />
        </div>
        {listing.description && (
          <div className="mt-1.5 line-clamp-2 text-xs leading-[18px] text-slate-600">
            {listing.description}
          </div>
        )}
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <div className="text-lg font-extrabold leading-none text-scarlet">
              {formatPrice(listing)}
            </div>
            {perBedroom && (
              <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                {perBedroom}
              </div>
            )}
          </div>
          <Link
            to={`/listings/${listing.id}`}
            className="shrink-0 rounded-full bg-scarlet px-4 py-1.5 text-xs font-bold text-white! no-underline shadow-sm transition hover:bg-scarlet-dark"
          >
            View Listing
          </Link>
        </div>
      </div>
    </div>
  );
}

function ClusteredListingPins({ listings, onSelect }) {
  const map = useMap();
  const [viewState, setViewState] = useState(() => ({
    bounds: map.getBounds(),
    zoom: map.getZoom(),
  }));

  useMapEvents({
    moveend: () => setViewState({ bounds: map.getBounds(), zoom: map.getZoom() }),
    zoomend: () => setViewState({ bounds: map.getBounds(), zoom: map.getZoom() }),
  });

  const clusterIndex = useMemo(() => {
    const index = new Supercluster({ maxZoom: 17, radius: 60 });
    index.load(
      listings.map((listing) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [listing.longitude, listing.latitude] },
        properties: { listing },
      }))
    );
    return index;
  }, [listings]);

  const clusters = useMemo(() => {
    const padded = viewState.bounds.pad(0.4);
    return clusterIndex.getClusters(
      [padded.getWest(), padded.getSouth(), padded.getEast(), padded.getNorth()],
      Math.floor(viewState.zoom)
    );
  }, [clusterIndex, viewState]);

  return clusters.map((feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const { cluster: isCluster, point_count: count, listing } = feature.properties;

    if (isCluster) {
      return (
        <Marker
          key={`cluster-${feature.id}`}
          position={[lat, lng]}
          icon={createClusterIcon(count)}
          eventHandlers={{
            click: () =>
              map.flyTo([lat, lng], clusterIndex.getClusterExpansionZoom(feature.id), {
                duration: 0.4,
              }),
          }}
        />
      );
    }

    return (
      <Marker
        key={listing.id}
        position={[lat, lng]}
        icon={createPriceIcon(listing, false)}
        eventHandlers={{ click: () => onSelect(listing, false) }}
      />
    );
  });
}

function DrawerCard({ listing, isSelected, onSelect }) {
  const term = termBadge(listing.available_from);
  const stop = listing.nearestStop;
  const amenity = Object.entries(listing.amenities || {}).find(([, value]) => value)?.[0];
  const footnote = [
    stop ? `${stop.walkMinutes} min to ${stop.name}` : null,
    amenity ? formatAmenityLabel(amenity) : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <button
      type="button"
      onClick={() => onSelect(listing, true)}
      aria-current={isSelected ? "true" : undefined}
      className={`group w-full rounded-xl p-1.5 text-left shadow-sm transition ${
        isSelected ? "bg-surface-low ring-2 ring-scarlet/40" : "bg-white hover:bg-surface-low"
      }`}
    >
      <div className="flex gap-2">
        <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-high">
          <img
            src={listing.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          {term && (
            <span className="absolute left-1 top-1 rounded-full bg-scarlet px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
              {term}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="truncate text-sm font-bold text-midnight">{listing.title}</span>
              <span className="shrink-0 text-xs font-extrabold text-scarlet">
                {formatPrice(listing)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {[
                listing.beds === 0 ? "Studio" : `${listing.beds} Bed`,
                listing.baths > 0 ? `${listing.baths} Bath` : null,
              ]
                .filter(Boolean)
                .join(" • ")}
              {typeof listing.distance === "number" && listing.campus
                ? ` • ${listing.distance} mi to ${listing.campus}`
                : ""}
            </p>
            <div className="mt-1">
              <ListingTrust listing={listing} compact />
            </div>
          </div>
          {footnote && (
            <span className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
              {footnote}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function MapPage() {
  const { listings, isLoading, error, refreshListings } = useListings();
  const { favorites, toggleFavorite } = useFavorites();
  const { filters } = useFilters();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("listing");
  const [focusRequest, setFocusRequest] = useState(null);
  const [showBusRoutes, setShowBusRoutes] = useState(true);
  const [showRouteKey, setShowRouteKey] = useState(false);
  // Routes unchecked in the route key. Their lines and stops are hidden.
  const [hiddenRouteIds, setHiddenRouteIds] = useState(() => new Set());
  const visibleRoutes = busData.routes.filter((route) => !hiddenRouteIds.has(route.id));
  const visibleStops = busData.stops.filter((stop) =>
    (routeIdsServingStop.get(stop.id) ?? []).some((routeId) => !hiddenRouteIds.has(routeId))
  );

  const toggleRoute = (routeId) =>
    setHiddenRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  const [drawerOpen, setDrawerOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 768
  );
  const [searchAsPan, setSearchAsPan] = useState(true);
  const [mapBounds, setMapBounds] = useState(null);

  const filteredListings = useMemo(() => applyFilters(listings, filters), [listings, filters]);
  const mappableListings = useMemo(
    () =>
      filteredListings.filter(
        (listing) => Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude)
      ),
    [filteredListings]
  );
  const positions = useMemo(
    () => mappableListings.map((listing) => [listing.latitude, listing.longitude]),
    [mappableListings]
  );
  const unmappedCount = filteredListings.length - mappableListings.length;

  // A listing opened by link stays selected even if the filters hide it.
  const selectedListing = selectedId
    ? (mappableListings.find((listing) => String(listing.id) === selectedId) ??
      listings.find(
        (listing) =>
          String(listing.id) === selectedId &&
          Number.isFinite(listing.latitude) &&
          Number.isFinite(listing.longitude)
      ) ??
      null)
    : null;

  // The selected listing gets its own pin, so keep it out of the clusters.
  const clusteredListings = useMemo(
    () =>
      selectedListing
        ? mappableListings.filter((listing) => listing.id !== selectedListing.id)
        : mappableListings,
    [mappableListings, selectedListing]
  );

  const drawerListings = useMemo(() => {
    const inView =
      searchAsPan && mapBounds
        ? mappableListings.filter((listing) =>
            mapBounds.contains([listing.latitude, listing.longitude])
          )
        : mappableListings;
    return [...inView].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [mappableListings, mapBounds, searchAsPan]);

  // Move the map once when a listing arrives by link.
  const [focusedFromUrl, setFocusedFromUrl] = useState(null);
  if (selectedListing && focusedFromUrl !== selectedListing.id && !focusRequest) {
    setFocusedFromUrl(selectedListing.id);
    setFocusRequest({ latitude: selectedListing.latitude, longitude: selectedListing.longitude });
  }

  const selectListing = (listing, moveMap) => {
    setSearchParams({ listing: String(listing.id) }, { replace: true });
    if (moveMap) {
      setFocusRequest({ latitude: listing.latitude, longitude: listing.longitude });
    }
  };

  const clearSelection = () => setSearchParams({}, { replace: true });

  const campusLabel = filters.campus === "all" ? "New Brunswick" : filters.campus;

  return (
    <div className="flex h-[calc(100dvh-var(--header-h))] flex-col overflow-hidden">
      <FilterBar view="map" sticky={false} resultCount={isLoading ? null : mappableListings.length} />

      <div className="relative flex-1 overflow-hidden bg-surface-low">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          zoomControl={false}
          maxBounds={NEW_JERSEY_BOUNDS}
          maxBoundsViscosity={1}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          />
          <ZoomControl position="bottomright" />
          <LockToNewJersey />
          <BoundsWatcher onChange={setMapBounds} />
          {/* Fit to the results until a listing has been focused, then leave the view alone. */}
          {focusRequest ? (
            <FocusListing request={focusRequest} />
          ) : (
            <FitToListings
              positions={positions}
              leftInset={drawerOpen && window.innerWidth >= 768 ? DRAWER_OFFSET_PX : 0}
            />
          )}

          {showBusRoutes && (
            <>
              {visibleRoutes.map((route) => (
                <Polyline
                  key={route.id}
                  positions={route.points}
                  pathOptions={{ color: route.color, weight: 3, opacity: 0.55, dashArray: "8 6" }}
                />
              ))}
              {visibleStops.map((stop) => (
                <CircleMarker
                  key={stop.id}
                  center={[stop.lat, stop.lng]}
                  radius={4}
                  pathOptions={{ color: "#0f172a", weight: 1.5, fillColor: "#ffffff", fillOpacity: 1 }}
                >
                  <Popup>
                    <div className="map-stop-popup">
                      <div className="map-stop-name">{stop.name}</div>
                      <div className="map-stop-routes">
                        {(routesServingStop.get(stop.id) ?? []).join(" · ") || "No route data"}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </>
          )}

          <ClusteredListingPins listings={clusteredListings} onSelect={selectListing} />

          {selectedListing && (
            <Marker
              key={`selected-${selectedListing.id}`}
              position={[selectedListing.latitude, selectedListing.longitude]}
              icon={createPriceIcon(selectedListing, true)}
              zIndexOffset={1000}
              eventHandlers={{
                add: (event) => event.target.openPopup(),
                popupclose: clearSelection,
              }}
            >
              <Popup offset={[0, -34]} minWidth={336} maxWidth={336} closeButton={false}>
                <ListingPopupCard
                  listing={selectedListing}
                  isFavorited={favorites.has(selectedListing.id)}
                  onToggleFavorite={toggleFavorite}
                />
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {drawerOpen ? (
          <aside className="absolute bottom-4 left-4 top-4 z-[1000] flex w-96 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <div className="shrink-0 p-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">
                    {campusLabel} {searchAsPan ? "· in map view" : ""}
                  </p>
                  <h2 className="text-lg font-extrabold text-midnight">
                    {isLoading
                      ? "Loading listings..."
                      : `${drawerListings.length} ${drawerListings.length === 1 ? "listing" : "listings"}`}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Hide listing list"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-low text-slate-500 transition hover:text-midnight"
                >
                  <Icon name="chevron_left" className="text-[20px]" />
                </button>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Sorted by distance to the nearest student center
                {unmappedCount > 0 && !isLoading
                  ? `. ${unmappedCount} without a map location.`
                  : ""}
              </p>
              <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-midnight">
                <input
                  type="checkbox"
                  checked={searchAsPan}
                  onChange={(e) => setSearchAsPan(e.target.checked)}
                  className="h-4 w-4 rounded accent-scarlet"
                />
                Search as I pan the map
              </label>
            </div>

            <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-4 pt-1">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-semibold">Could not load listings.</p>
                  <button
                    type="button"
                    onClick={refreshListings}
                    className="mt-2 rounded-full border border-red-300 px-3 py-1 text-xs font-semibold transition hover:border-red-400"
                  >
                    Try again
                  </button>
                </div>
              )}
              {!isLoading && drawerListings.length === 0 && !error && (
                <p className="rounded-xl bg-surface-low px-4 py-6 text-center text-sm text-slate-500">
                  {searchAsPan
                    ? "No listings in this part of the map. Zoom out or move the map."
                    : "No listings match your filters."}
                </p>
              )}
              {drawerListings.map((listing) => (
                <DrawerCard
                  key={listing.id}
                  listing={listing}
                  isSelected={selectedListing?.id === listing.id}
                  onSelect={selectListing}
                />
              ))}
            </div>

            <div className="flex shrink-0 justify-end border-t border-slate-100 px-4 py-2.5">
              <Link
                to="/listings"
                className="flex items-center gap-1 text-sm font-semibold text-scarlet hover:text-scarlet-dark"
              >
                See all listings
                <Icon name="arrow_forward" className="text-[18px]" />
              </Link>
            </div>
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="absolute left-4 top-4 z-[1000] flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-midnight shadow-lift transition hover:bg-surface-low"
          >
            <Icon name="view_list" className="text-[18px]" />
            Show list
            {!isLoading && (
              <span className="rounded-full bg-scarlet px-1.5 text-xs text-white">
                {drawerListings.length}
              </span>
            )}
          </button>
        )}

        <div className="absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setShowBusRoutes((value) => !value)}
            aria-pressed={showBusRoutes}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-lift transition ${
              showBusRoutes ? "bg-scarlet text-white" : "bg-white text-midnight hover:bg-surface-low"
            }`}
          >
            <Icon name="directions_bus" className="text-[18px]" />
            Bus routes
          </button>

          {showBusRoutes && (
            <div className="rounded-2xl bg-white shadow-lift">
              <button
                type="button"
                onClick={() => setShowRouteKey((value) => !value)}
                aria-expanded={showRouteKey}
                className="px-4 py-2 text-xs font-semibold text-slate-600 transition hover:text-midnight"
              >
                {showRouteKey ? "Hide route key" : "Route key"}
              </button>
              {showRouteKey && (
                <div className="w-52 px-4 pb-3">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em]">
                    <span className="text-slate-500">
                      {visibleRoutes.length} of {busData.routes.length} shown
                    </span>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setHiddenRouteIds(new Set())}
                        className="text-scarlet hover:text-scarlet-dark"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setHiddenRouteIds(new Set(busData.routes.map((route) => route.id)))}
                        className="text-scarlet hover:text-scarlet-dark"
                      >
                        None
                      </button>
                    </span>
                  </div>
                  <ul className="no-scrollbar max-h-64 overflow-y-auto">
                    {busData.routes.map((route) => {
                      const isVisible = !hiddenRouteIds.has(route.id);
                      return (
                        <li key={route.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-xs text-slate-700 hover:bg-surface-low">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={() => toggleRoute(route.id)}
                              className="h-3.5 w-3.5 rounded accent-scarlet"
                            />
                            <span
                              className={`h-2.5 w-2.5 shrink-0 rounded-full ${isVisible ? "" : "opacity-30"}`}
                              style={{ backgroundColor: route.color }}
                            />
                            <span className={isVisible ? "font-semibold text-midnight" : "text-slate-400"}>
                              {route.name}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapPage;
