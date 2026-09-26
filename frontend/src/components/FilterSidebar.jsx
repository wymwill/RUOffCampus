import { useState } from "react";
import { createDefaultFilters } from "../utils/defaultFilters";

function FilterSidebar({ filters, setFilters }) {
  // Filters start collapsed on phone-sized viewports so listings show first;
  // expanded on lg+ where the sidebar sits next to the grid.
  const [open, setOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 1024
  );
  const handleBedsChange = (e) => {
    const value = e.target.value;

    setFilters((prev) => ({
      ...prev,
      beds: value === "any" ? "any" : Number(value),
    }));
  };

  const handlePropertyTypeChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      propertyType: e.target.value,
    }));
  };

  const handleMinPriceChange = (e) => {
    const newMin = Number(e.target.value);

    setFilters((prev) => ({
      ...prev,
      price: [newMin, prev.price[1]],
    }));
  };

  const handleMaxPriceChange = (e) => {
    const newMax = Number(e.target.value);

    setFilters((prev) => ({
      ...prev,
      price: [prev.price[0], newMax],
    }));
  };

  const handleCampusChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      campus: e.target.value,
    }));
  };

  const handleAmenityChange = (e) => {
    const { name, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [name]: checked,
      },
    }));
  };

  const handleDateChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      dates: {
        ...prev.dates,
        [name]: type === "checkbox" ? checked : value,
      },
    }));
  };

  const resetFilters = () => {
    setFilters(createDefaultFilters());
  };

  const hasDates = Boolean(filters.dates.moveIn || filters.dates.moveOut);

  return (
    <aside className="h-fit w-full max-w-none rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:max-w-xs">
      <div className={`flex items-center justify-between ${open ? "mb-6" : ""} lg:mb-6`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 text-xl font-semibold text-slate-900"
        >
          Filters
          <span aria-hidden="true" className="text-sm text-slate-500 lg:hidden">
            {open ? "▲" : "▼"}
          </span>
        </button>
        <button
          onClick={resetFilters}
          className="text-sm font-medium text-red-600 hover:text-red-700"
        >
          Reset
        </button>
      </div>

      <div className={`space-y-6 ${open ? "" : "hidden"} lg:block`}>
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-slate-700">
            Your dates
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-500">
              Move in
              <input
                type="date"
                name="moveIn"
                value={filters.dates.moveIn}
                max={filters.dates.moveOut || undefined}
                onChange={handleDateChange}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500"
              />
            </label>
            <label className="text-xs text-slate-500">
              Move out
              <input
                type="date"
                name="moveOut"
                value={filters.dates.moveOut}
                min={filters.dates.moveIn || undefined}
                onChange={handleDateChange}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500"
              />
            </label>
          </div>
          <label
            className={`mt-3 inline-flex items-center gap-2 text-sm ${
              hasDates ? "text-slate-700" : "text-slate-400"
            }`}
          >
            <input
              type="checkbox"
              name="includeUndated"
              checked={filters.dates.includeUndated}
              disabled={!hasDates}
              onChange={handleDateChange}
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            Include listings without dates
          </label>
        </fieldset>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Bedrooms
          </label>
          <select
            value={filters.beds}
            onChange={handleBedsChange}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-red-500"
          >
            <option value="any">Any</option>
            <option value="0">Studio</option>
            <option value="1">1 Bed</option>
            <option value="2">2 Beds</option>
            <option value="3">3+ Beds</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Campus preferred
          </label>
          <select
            value={filters.campus}
            onChange={handleCampusChange}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-red-500"
          >
            <option value="all">Any campus</option>
            <option value="College Ave">College Ave</option>
            <option value="Busch">Busch</option>
            <option value="Livingston">Livingston</option>
            <option value="Cook/Douglass">Cook/Douglass</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Property Type
          </label>
          <select
            value={filters.propertyType}
            onChange={handlePropertyTypeChange}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-red-500"
          >
            <option value="all">All Types</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="studio">Studio</option>
            <option value="townhome">Townhome</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Amenities
          </label>
          <div className="grid gap-2">
            {Object.entries(filters.amenities).map(([key, checked]) => (
              <label key={key} className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name={key}
                  checked={checked}
                  onChange={handleAmenityChange}
                  className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                {key.replaceAll("_", " ")}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Price Range
          </label>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={filters.price[0]}
              onChange={handleMinPriceChange}
              placeholder="Min"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-red-500"
            />

            <input
              type="number"
              value={filters.price[1]}
              onChange={handleMaxPriceChange}
              placeholder="Max"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-red-500"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

export default FilterSidebar;
