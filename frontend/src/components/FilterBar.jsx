import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  countMoreFilters,
  createDefaultFilters,
  hasActiveFilters,
} from "../utils/defaultFilters";
import { fitFilters } from "../utils/fitFilters";

// Bar filters in priority order. The last ones move into More filters first.
const BAR_FILTERS = ["dates", "price", "beds", "campus"];
const BAR_GAP = 8;

const CAMPUSES = ["College Ave", "Busch", "Livingston", "Cook/Douglass"];
const PROPERTY_TYPES = [
  ["all", "Any type"],
  ["apartment", "Apartment"],
  ["house", "House"],
  ["studio", "Studio"],
  ["townhome", "Townhome"],
];

const pillBase = "flex shrink-0 items-center gap-2 border px-3 py-2 text-sm transition";
const pillIdle = "border-slate-300 bg-white text-slate-700 hover:border-slate-400";
const pillActive = "border-red-500 bg-red-50 text-red-700";
const bareInput =
  "bg-transparent text-sm text-slate-900 outline-none [color-scheme:light]";

// In the More filters panel a pill may wrap onto two lines on narrow screens.
function pillClass(isActive, wraps = false) {
  const shape = wraps ? "max-w-full flex-wrap rounded-2xl" : "rounded-full";
  return `${pillBase} ${shape} ${isActive ? pillActive : pillIdle}`;
}

/**
 * Horizontal filter bar that sticks under the navbar. The main filters sit in
 * one row. Whichever of them don't fit the screen move into the "More filters"
 * panel, along with the less common filters, so the row never wraps.
 */
function FilterBar({ filters, setFilters }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [barKeys, setBarKeys] = useState(BAR_FILTERS);
  const rowRef = useRef(null);
  const slotRef = useRef(null);
  const measureRef = useRef(null);
  const hasDates = Boolean(filters.dates.moveIn || filters.dates.moveOut);
  const [minPrice, maxPrice] = filters.price;

  const isFilterActive = {
    dates: hasDates,
    price: minPrice > 0 || maxPrice != null,
    beds: filters.beds !== "any",
    campus: filters.campus !== "all",
  };
  const overflowKeys = BAR_FILTERS.filter((key) => !barKeys.includes(key));
  const moreCount =
    countMoreFilters(filters) + overflowKeys.filter((key) => isFilterActive[key]).length;

  // Measure every bar filter in a hidden copy of the row, then keep as many as
  // fit the space left beside the More filters and Reset buttons.
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

  // The four main filters. Each renders in the bar when it fits, otherwise
  // at the top of the More filters panel.
  const renderFilter = (key, inPanel = false) => {
    switch (key) {
      case "dates":
        return (
          <div className={pillClass(hasDates, inPanel)}>
            <label className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Move in</span>
              <input
                type="date"
                aria-label="Move in"
                value={filters.dates.moveIn}
                max={filters.dates.moveOut || undefined}
                onChange={(e) => updateDates({ moveIn: e.target.value })}
                className={bareInput}
              />
            </label>
            {!inPanel && <span className="text-slate-300">|</span>}
            <label className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Move out</span>
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
          <div className={pillClass(minPrice > 0 || maxPrice != null, inPanel)}>
            <span className="text-xs text-slate-500">Price</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              aria-label="Minimum price"
              placeholder="Min"
              value={minPrice || ""}
              onChange={(e) => setPrice(0, e.target.value)}
              className={`${bareInput} w-16`}
            />
            <span className="text-slate-400">to</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              aria-label="Maximum price"
              placeholder="Max"
              value={maxPrice ?? ""}
              onChange={(e) => setPrice(1, e.target.value)}
              className={`${bareInput} w-16`}
            />
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
            className={`${pillClass(filters.beds !== "any")} cursor-pointer outline-none`}
          >
            <option value="any">Any beds</option>
            <option value="0">Studio</option>
            <option value="1">1 bed</option>
            <option value="2">2 beds</option>
            <option value="3">3+ beds</option>
          </select>
        );
      case "campus":
        return (
          <select
            aria-label="Campus"
            value={filters.campus}
            onChange={(e) => update({ campus: e.target.value })}
            className={`${pillClass(filters.campus !== "all")} cursor-pointer outline-none`}
          >
            <option value="all">Any campus</option>
            {CAMPUSES.map((campus) => (
              <option key={campus} value={campus}>
                {campus}
              </option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <div className="sticky top-[57px] z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6">
        {/* Clipped so the full width measuring row never widens the page. */}
        <div className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden">
          <div ref={measureRef} inert aria-hidden="true" className="flex w-max items-center gap-2">
            {BAR_FILTERS.map((key) => (
              <Fragment key={key}>{renderFilter(key)}</Fragment>
            ))}
          </div>
        </div>

        <div ref={rowRef} className="flex items-center gap-2 py-3">
          <div ref={slotRef} className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {barKeys.map((key) => (
              <Fragment key={key}>{renderFilter(key)}</Fragment>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            aria-controls="more-filters"
            className={pillClass(moreOpen || moreCount > 0)}
          >
            More filters
            {moreCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold leading-none text-white">
                {moreCount}
              </span>
            )}
          </button>

          {/* Always rendered so its space is reserved and the fit doesn't jump. */}
          <button
            type="button"
            onClick={() => setFilters(createDefaultFilters())}
            disabled={!hasActiveFilters(filters)}
            className="shrink-0 px-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:invisible"
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
              <legend className="mb-2 text-sm font-medium text-slate-700">Property type</legend>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filters.propertyType === value}
                    onClick={() => update({ propertyType: value })}
                    className={pillClass(filters.propertyType === value && value !== "all")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">Amenities</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters.amenities).map(([name, selected]) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleAmenity(name)}
                    className={pillClass(selected)}
                  >
                    {name.replaceAll("_", " ")}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col justify-between gap-4">
              <label
                className={`inline-flex items-center gap-2 text-sm ${
                  hasDates ? "text-slate-700" : "text-slate-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={filters.dates.includeUndated}
                  disabled={!hasDates}
                  onChange={(e) => updateDates({ includeUndated: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-red-600"
                />
                Include listings without dates
              </label>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="self-start rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 lg:self-end"
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
