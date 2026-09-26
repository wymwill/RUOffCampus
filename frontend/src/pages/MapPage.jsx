import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import Supercluster from "supercluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useListings } from "../context/ListingsContext";
import busData from "../data/busRoutes.json";

// College Ave, New Brunswick - fallback center before listings load.
const DEFAULT_CENTER = [40.5007, -74.4474];
const DEFAULT_ZOOM = 14;

const routesServingStop = new Map();
for (const route of busData.routes) {
  for (const stopId of busData.routeStops[route.id] ?? []) {
    if (!routesServingStop.has(stopId)) routesServingStop.set(stopId, []);
    routesServingStop.get(stopId).push(route.name);
  }
}

function formatPrice(listing) {
  if (listing.priceLabel) return listing.priceLabel;
  if (!listing.price) return "Ask";
  return `$${Number(listing.price).toLocaleString("en-US")}`;
}

function createPriceIcon(listing) {
  return L.divIcon({
    className: "listing-price-pin",
    html: `<div class="listing-price-pin-bubble">${formatPrice(listing)}</div>`,
    iconSize: [0, 0],
  });
}

function createClusterIcon(count) {
  return L.divIcon({
    className: "listing-cluster",
    html: `<div class="listing-cluster-bubble">${count}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

// Fit the initial view to the Rutgers-area cluster: listings far outside
// New Brunswick (rare outliers) stay pannable but do not stretch the view.
const CAMPUS_FIT_RADIUS_DEG = 0.2;

function FitToListings({ positions }) {
  const map = useMap();
  useEffect(() => {
    const nearCampus = positions.filter(
      ([lat, lng]) =>
        Math.abs(lat - DEFAULT_CENTER[0]) <= CAMPUS_FIT_RADIUS_DEG &&
        Math.abs(lng - DEFAULT_CENTER[1]) <= CAMPUS_FIT_RADIUS_DEG
    );
    if (nearCampus.length > 1) {
      map.fitBounds(nearCampus, { padding: [48, 48], maxZoom: 15 });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [map, positions]);
  return null;
}

function ListingPopup({ listing }) {
  return (
    <div className="map-listing-popup">
      <img src={listing.image} alt="" className="map-listing-popup-image" />
      <div className="map-listing-popup-body">
        <p className="map-listing-popup-price">
          {formatPrice(listing)}
          <span className="map-listing-popup-price-suffix">/mo</span>
        </p>
        <p className="map-listing-popup-title">{listing.title}</p>
        <p className="map-listing-popup-meta">
          {[
            listing.beds ? `${listing.beds} bd` : null,
            listing.baths ? `${listing.baths} ba` : null,
            listing.campus || null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <Link to={`/listings/${listing.id}`} className="map-listing-popup-link">
          View listing
        </Link>
      </div>
    </div>
  );
}

function ClusteredListingPins({ listings }) {
  const map = useMap();
  const [viewState, setViewState] = useState(() => ({
    bounds: map.getBounds(),
    zoom: map.getZoom(),
  }));

  useMapEvents({
    moveend: () => {
      setViewState({ bounds: map.getBounds(), zoom: map.getZoom() });
    },
    zoomend: () => {
      setViewState({ bounds: map.getBounds(), zoom: map.getZoom() });
    },
  });

  const clusterIndex = useMemo(() => {
    const index = new Supercluster({ maxZoom: 17, radius: 60 });
    index.load(
      listings.map((listing) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [listing.longitude, listing.latitude],
        },
        properties: { listing },
      }))
    );
    return index;
  }, [listings]);

  const clusters = useMemo(() => {
    const { bounds, zoom } = viewState;
    const padded = bounds.pad(0.4);
    return clusterIndex.getClusters(
      [padded.getWest(), padded.getSouth(), padded.getEast(), padded.getNorth()],
      Math.floor(zoom)
    );
  }, [clusterIndex, viewState]);

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const { cluster: isCluster, point_count: count, listing } =
          feature.properties;

        if (isCluster) {
          return (
            <Marker
              key={`cluster-${feature.id}`}
              position={[lat, lng]}
              icon={createClusterIcon(count)}
              eventHandlers={{
                click: () => {
                  map.flyTo(
                    [lat, lng],
                    clusterIndex.getClusterExpansionZoom(feature.id),
                    { duration: 0.4 }
                  );
                },
              }}
            />
          );
        }

        return (
          <Marker
            key={listing.id}
            position={[lat, lng]}
            icon={createPriceIcon(listing)}
          >
            <Popup>
              <ListingPopup listing={listing} />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

function MapPage() {
  const { listings, isLoading, error, refreshListings } = useListings();
  const [showBusRoutes, setShowBusRoutes] = useState(true);
  const [showRouteKey, setShowRouteKey] = useState(false);

  const mappableListings = useMemo(
    () =>
      listings.filter(
        (listing) =>
          Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude)
      ),
    [listings]
  );
  const positions = useMemo(
    () => mappableListings.map((listing) => [listing.latitude, listing.longitude]),
    [mappableListings]
  );
  const unmappedCount = listings.length - mappableListings.length;

  return (
    <div className="relative h-[calc(100dvh-57px)] w-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        />
        <FitToListings positions={positions} />

        {showBusRoutes && (
          <>
            {busData.routes.map((route) => (
              <Polyline
                key={route.id}
                positions={route.points}
                pathOptions={{ color: route.color, weight: 3, opacity: 0.5 }}
              />
            ))}
            {busData.stops.map((stop) => (
              <CircleMarker
                key={stop.id}
                center={[stop.lat, stop.lng]}
                radius={4}
                pathOptions={{
                  color: "#475569",
                  weight: 1.5,
                  fillColor: "#ffffff",
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="map-stop-popup">
                    <p className="map-stop-name">{stop.name}</p>
                    <p className="map-stop-routes">
                      {(routesServingStop.get(stop.id) ?? []).join(" · ") ||
                        "No route data"}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </>
        )}

        <ClusteredListingPins listings={mappableListings} />
      </MapContainer>

      <div className="pointer-events-none absolute left-4 top-4 z-[1000] flex flex-col gap-2">
        <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-slate-900">
            {isLoading
              ? "Loading listings..."
              : `${mappableListings.length} listings on the map`}
          </p>
          {unmappedCount > 0 && !isLoading && (
            <p className="mt-0.5 text-xs text-slate-500">
              {unmappedCount} listing{unmappedCount === 1 ? "" : "s"} without a
              map location
            </p>
          )}
        </div>

        {error && (
          <div className="pointer-events-auto rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            <p className="font-medium">Could not load listings.</p>
            <button
              type="button"
              onClick={refreshListings}
              className="mt-2 rounded-full border border-red-300 px-3 py-1 text-xs font-medium transition hover:border-red-400"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <div className="absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setShowBusRoutes((value) => !value)}
          aria-pressed={showBusRoutes}
          className={`rounded-full border px-4 py-2 text-sm font-medium shadow-sm backdrop-blur transition ${
            showBusRoutes
              ? "border-red-600 bg-red-600 text-white"
              : "border-slate-200 bg-white/95 text-slate-700 hover:border-slate-300"
          }`}
        >
          Bus routes
        </button>

        {showBusRoutes && (
          <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => setShowRouteKey((value) => !value)}
              aria-expanded={showRouteKey}
              className="px-4 py-2 text-xs font-medium text-slate-600 transition hover:text-slate-900"
            >
              {showRouteKey ? "Hide route key" : "Route key"}
            </button>
            {showRouteKey && (
              <ul className="max-h-64 w-44 overflow-y-auto px-4 pb-3">
                {busData.routes.map((route) => (
                  <li
                    key={route.id}
                    className="flex items-center gap-2 py-0.5 text-xs text-slate-600"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: route.color }}
                    />
                    {route.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MapPage;
