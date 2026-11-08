"use client";

import { CUISINE_OPTIONS, LOCATION_OPTIONS, PRICE_BANDS } from "@/utils/marketplace";
import { Search, SlidersHorizontal, X } from "lucide-react";

export interface FilterState {
  search: string;
  cuisine: string;
  location: string;
  priceBand: string;
  availableOnly: boolean;
  sort: string;
}

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  cuisine: "",
  location: "",
  priceBand: "",
  availableOnly: false,
  sort: "rating",
};

interface ChefFiltersProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  resultCount: number;
}

const selectClass =
  "w-full px-3 py-2.5 rounded-xl bg-white border border-forest-200 text-sm font-medium text-forest-950 outline-none focus:border-forest-950 focus:ring-1 focus:ring-forest-950 transition-colors appearance-none";

export default function ChefFilters({
  filters,
  onChange,
  resultCount,
}: ChefFiltersProps) {
  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const reset = () => onChange(DEFAULT_FILTERS);

  const hasActiveFilters =
    filters.search ||
    filters.cuisine ||
    filters.location ||
    filters.priceBand ||
    filters.availableOnly;

  return (
    <div className="bg-white rounded-2xl border border-forest-100 p-4 sm:p-5 space-y-4">
      {/* Search + sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-400" />
          <input
            type="text"
            placeholder="Search by name, brand, or specialty…"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-cream-50 border border-forest-200 text-sm font-medium text-forest-950 placeholder-forest-400 outline-none focus:border-forest-950 focus:ring-1 focus:ring-forest-950 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-forest-400 shrink-0" />
          <select
            value={filters.sort}
            onChange={(e) => update("sort", e.target.value)}
            className={selectClass + " w-auto"}
            aria-label="Sort chefs"
          >
            <option value="rating">Top rated</option>
            <option value="reviews">Most reviewed</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.cuisine}
          onChange={(e) => update("cuisine", e.target.value)}
          className={selectClass + " w-auto min-w-[160px]"}
          aria-label="Filter by cuisine"
        >
          <option value="">All cuisines</option>
          {CUISINE_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={filters.location}
          onChange={(e) => update("location", e.target.value)}
          className={selectClass + " w-auto min-w-[160px]"}
          aria-label="Filter by location"
        >
          <option value="">All locations</option>
          {LOCATION_OPTIONS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select
          value={filters.priceBand}
          onChange={(e) => update("priceBand", e.target.value)}
          className={selectClass + " w-auto min-w-[160px]"}
          aria-label="Filter by price"
        >
          <option value="">Any price</option>
          {PRICE_BANDS.map((b) => (
            <option key={b.label} value={`${b.min}-${b.max}`}>
              {b.label}
            </option>
          ))}
        </select>

        <label className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-forest-200 bg-white cursor-pointer hover:border-forest-400 transition-colors select-none">
          <input
            type="checkbox"
            checked={filters.availableOnly}
            onChange={(e) => update("availableOnly", e.target.checked)}
            className="h-4 w-4 rounded accent-forest-950"
          />
          <span className="text-sm font-medium text-forest-800">
            Available now
          </span>
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-forest-600 hover:bg-cream-50 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-xs text-forest-500">
        {resultCount} chef{resultCount === 1 ? "" : "s"} found
      </p>
    </div>
  );
}
