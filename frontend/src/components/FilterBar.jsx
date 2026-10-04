import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFilters } from "../context/FiltersContext";
import {
  countMoreFilters,
  createDefaultFilters,
  hasActiveFilters,
} from "../utils/defaultFilters";
import { fitFilters } from "../utils/fitFilters";
import { NEAR_TRANSIT_MINUTES } from "../utils/transit";
import Icon from "./ui/Icon";

// Chip row filters in priority order. The last ones move into More filters first.
const BAR_FILTERS = ["campus", "dates", "price", "beds", "transit"];
const BAR_GAP = 8;

const CAMPUSES = ["College Ave", "Busch", "Livingston", "Cook/Douglass"];
const PROPERTY_TYPES = [
  ["all", "Any type"],
  ["apartment", "Apartment"],
  ["house", "House"],
  ["studio", "Studio"],
  ["townhome", "Townhome"],
];

const chipBase =
  "flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-[0.02em] shadow-sm transition";
const chipIdle = "bg-surface-low text-midnight hover:bg-surface";
const chipActive = "bg-midnight text-white";
const bareInput = "bg-transparent text-xs font-semibold text-inherit outline-none [color-scheme:light]";

// In the More filters panel a chip may wrap onto two lines on narrow screens.
function chipClass(isActive, wraps = false) {
  const shape = wraps ? "max-w-full flex-wrap rounded-2xl" : "rounded-full";
  return `${chipBase} ${shape} ${isActive ? chipActive : chipIdle}`;
}

function ViewToggle({ view }) {
  const item = (isActive) =>
    `flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
      isActive ? "bg-midnight text-white shadow-sm" : "text-slate-500 hover:text-midnight"
    }`;
  return (
    <div className="flex shrink-0 items-center rounded-full bg-surface-low p-1 shadow-inner">
      <Link to="/" className={item(view === "list")} aria-current={view === "list" ? "page" : undefined}>
        <Icon name="view_list" className="text-[16px]" />
        List
      </Link>
      <Link to="/map" className={item(view === "map")} aria-current={view === "map" ? "page" : undefined}>
        <Icon name="map" className={`text-[16px] ${view === "map" ? "text-emerald-300" : ""}`} />
        Map
      </Link>
    </div>
  );
}

/**
 * Search and filter control center shared by the Listings and Map pages.
 * Row one has search, the List and Map switch and the filters toggle. Row two
 * holds the main filter chips. Chips that don't fit the screen move into the
 * "More filters" panel with the less common filters, so the row never wraps.
 */
function FilterBar({ view = "list", resultCount, sticky = true }) {
  const { filters, setFilters } = useFilters();
  const [moreOpen, setMoreOpen] = useState(false);
  const [barKeys, setBarKeys] = useState(BAR_FILTERS);
  const rowRef = useRef(null);
  const slotRef = useRef(null);
  const measureRef = useRef(null);
  const hasDates = Boolean(filters.dates.moveIn || filters.dates.moveOut);
  const [minPrice, maxPrice] = filters.price;

  const isFilterActive = {
    campus: filters.campus !== "all",
    dates: hasDates,
    price: minPrice > 0 || maxPrice != null,
    beds: filters.beds !== "any",
    transit: filters.nearTransit,
  };
  const overflowKeys = BAR_FILTERS.filter((key) => !barKeys.includes(key));
  const moreCount =
    countMoreFilters(filters) + overflowKeys.filter((key) => isFilterActive[key]).length;

  // Measure every chip in a hidden copy of the row, then keep as many as fit
  // the space left beside the Reset button.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const slot = slotRef.current;
    const measure = measureRef.current;
    if (!row || !slot || !measure) return undefined;

    const fit = () => {
      const widths = [...measure.children].map((child, index) => ({
        key: BAR_FILTERS[index],
        width: child.getBoundingClientRect().width,
      }));
      const buttonsWidth = [...row.children]
        .filter((child) => child !== slot)
        .reduce((sum, child) => sum + child.getBoundingClientRect().width + BAR_GAP, 0);
      const available = row.clientWidth - buttonsWidth;
      const next = fitFilters(widths, available, BAR_GAP);
      setBarKeys((prev) => (prev.join() === next.join() ? prev : next));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    observer.observe(measure);
    for (const child of row.children) {
      if (child !== slot) observer.observe(child);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  const update = (changes) => setFilters((prev) => ({ ...prev, ...changes }));
  const updateDates = (changes) =>
    setFilters((prev) => ({ ...prev, dates: { ...prev.dates, ...changes } }));

  const setPrice = (index, raw) =>
    setFilters((prev) => {
      const next = [...prev.price];
      const value = raw === "" ? null : Math.max(0, Number(raw));
      next[index] = index === 0 ? value ?? 0 : value;
      return { ...prev, price: next };
    });

  const toggleAmenity = (name) =>
    setFilters((prev) => ({
      ...prev,
      amenities: { ...prev.amenities, [name]: !prev.amenities[name] },
    }));

  // Each chip renders in the row when it fits, otherwise at the top of the
  // More filters panel.
  const renderFilter = (key, inPanel = false) => {
    switch (key) {
      case "campus":
        return (
          <div
            className={`flex shrink-0 flex-wrap items-center gap-1 bg-surface-low p-1 shadow-inner ${
              inPanel ? "rounded-2xl" : "rounded-full"
            }`}
          >
            {["all", ...CAMPUSES].map((campus) => {
              const isActive = filters.campus === campus;
              return (
                <button
                  key={campus}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => update({ campus })}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? campus === "all"
                        ? "bg-white text-midnight shadow-sm"
                        : "bg-scarlet text-white shadow-scarlet"
                      : "text-slate-500 hover:bg-surface hover:text-midnight"
                  }`}
                >
                  {isActive && campus !== "all" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                  {campus === "all" ? "All campuses" : campus}
                </button>
              );
            })}
          </div>
        );
      case "dates":
        return (
          <div className={chipClass(hasDates, inPanel)}>
            <Icon name="calendar_month" className="text-[16px] opacity-70" />
            <label className="flex items-center gap-1.5">
              <span className="opacity-70">Move in</span>
              <input
                type="date"
                aria-label="Move in"
                value={filters.dates.moveIn}
                max={filters.dates.moveOut || undefined}
                onChange={(e) => updateDates({ moveIn: e.target.value })}
                className={bareInput}
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="opacity-70">Move out</span>
              <input
                type="date"
                aria-label="Move out"
                value={filters.dates.moveOut}
                min={filters.dates.moveIn || undefined}
                onChange={(e) => updateDates({ moveOut: e.target.value })}
                className={bareInput}
              />
            </label>
          </div>
        );
      case "price":
        return (
          <div className={chipClass(isFilterActive.price, inPanel)}>
            <span className="opacity-70">$</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              aria-label="Minimum price"
              placeholder="Min"
              value={minPrice || ""}
              onChange={(e) => setPrice(0, e.target.value)}
              className={`${bareInput} w-14 placeholder:text-current placeholder:opacity-60`}
            />
            <span className="opacity-60">to</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              aria-label="Maximum price"
              placeholder="Max"
              value={maxPrice ?? ""}
              onChange={(e) => setPrice(1, e.target.value)}
              className={`${bareInput} w-14 placeholder:text-current placeholder:opacity-60`}
            />
            <span className="opacity-70">/mo</span>
          </div>
        );
      case "beds":
        return (
          <select
            aria-label="Bedrooms"
            value={filters.beds}
            onChange={(e) =>
              update({ beds: e.target.value === "any" ? "any" : Number(e.target.value) })
            }
            className={`${chipClass(isFilterActive.beds)} cursor-pointer outline-none`}
          >
            <option value="any">Bedrooms (All)</option>
            <option value="0">Studio</option>
            <option value="1">1 bed</option>
            <option value="2">2 beds</option>
            <option value="3">3+ beds</option>
          </select>
        );
      case "transit":
        return (
          <button
            type="button"
            aria-pressed={filters.nearTransit}
            onClick={() => update({ nearTransit: !filters.nearTransit })}
            className={
              filters.nearTransit
                ? chipClass(true)
                : `${chipBase} rounded-full bg-surface text-scarlet hover:bg-surface-high`
            }
          >
            <Icon name="directions_bus" className="text-[15px]" />
            {`< ${NEAR_TRANSIT_MINUTES} min to a bus stop`}
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`${
        sticky ? "sticky top-[var(--header-h)]" : "relative"
      } z-40 shrink-0 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)]`}
    >
      <div className="relative mx-auto max-w-[1600px] px-4 md:px-8">
        {/* Clipped so the full width measuring row never widens the page. */}
        <div className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden">
          <div ref={measureRef} inert aria-hidden="true" className="flex w-max items-center gap-2">
            {BAR_FILTERS.map((key) => (
              <Fragment key={key}>{renderFilter(key)}</Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3">
          <label className="relative min-w-0 flex-1 md:max-w-xl">
            <span className="sr-only">Search listings</span>
            <Icon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-500"
            />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
              placeholder="Search street, address or bus stop (e.g. The Yard)"
              className="w-full rounded-full bg-surface-low py-2 pl-11 pr-4 text-sm text-midnight shadow-inner outline-none transition placeholder:text-slate-500 focus:bg-surface focus:ring-2 focus:ring-midnight"
            />
          </label>
          <div className="hidden flex-1 md:block" />
          <ViewToggle view={view} />
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-controls="more-filters"
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
              moreOpen || moreCount > 0
                ? "bg-midnight text-white"
                : "bg-surface text-midnight hover:bg-surface-high"
            }`}
          >
            <Icon name="tune" className="text-[18px]" />
            <span className="hidden sm:inline">
              {resultCount != null ? `${resultCount} available` : "Filters"}
            </span>
            {moreCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-scarlet px-1.5 text-[11px] leading-none text-white">
                {moreCount}
              </span>
            )}
          </button>
        </div>

        <div ref={rowRef} className="flex items-center gap-2 py-2.5">
          <div ref={slotRef} className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {barKeys.map((key) => (
              <Fragment key={key}>{renderFilter(key)}</Fragment>
            ))}
          </div>

          {/* Always rendered so its space is reserved and the fit doesn't jump. */}
          <button
            type="button"
            onClick={() => setFilters(createDefaultFilters())}
            disabled={!hasActiveFilters(filters)}
            className="shrink-0 px-2 text-xs font-semibold text-scarlet hover:text-scarlet-dark disabled:invisible"
          >
            Reset
          </button>
        </div>

        {moreOpen && (
          <div
            id="more-filters"
            className="grid gap-6 border-t border-slate-200 py-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
          >
            {overflowKeys.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
                {overflowKeys.map((key) => (
                  <Fragment key={key}>{renderFilter(key, true)}</Fragment>
                ))}
              </div>
            )}
            <fieldset>
              <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Property type
              </legend>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filters.propertyType === value}
                    onClick={() => update({ propertyType: value })}
                    className={chipClass(filters.propertyType === value && value !== "all")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Amenities
              </legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters.amenities).map(([name, selected]) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleAmenity(name)}
                    className={chipClass(selected)}
                  >
                    {name.replaceAll("_", " ")}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col justify-between gap-4">
              <label
                className={`inline-flex items-center gap-2 text-sm ${
                  hasDates ? "text-midnight" : "text-slate-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={filters.dates.includeUndated}
                  disabled={!hasDates}
                  onChange={(e) => updateDates({ includeUndated: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-scarlet"
                />
                Include listings without dates
              </label>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="self-start rounded-full bg-scarlet px-5 py-2 text-sm font-semibold text-white shadow-scarlet hover:bg-scarlet-dark lg:self-end"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FilterBar;
