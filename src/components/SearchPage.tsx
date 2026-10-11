import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "../types";
import { INITIAL_PRODUCTS, CATEGORIES } from "../data/products";
import { ProductGrid } from "./ProductGrid";
import { EmptyState } from "./EmptyState";
import { FilterIcon, SearchIcon, XIcon } from "./icons";
import { TopCartButton } from "./TopCartButton";

const RECENT_KEY = "peppsbite_recent_searches";
const TRENDING = ["Milk", "Chocolate", "Chips", "Bread", "Rice", "Coffee", "Apples", "Bananas"];

const PRICE_RANGES = [
  { label: "Under ₦2,000", min: undefined as number | undefined, max: 2000 },
  { label: "₦2,000 – ₦5,000", min: 2000, max: 5000 },
  { label: "₦5,000 – ₦10,000", min: 5000, max: 10000 },
  { label: "₦10,000+", min: 10000, max: undefined as number | undefined },
];

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [category, setCategory] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Available brands derived dynamically
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    INITIAL_PRODUCTS.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timeout);
  }, [query]);

  const activeFilterCount = [category, brand, priceRange !== null].filter(Boolean).length;

  const saveRecent = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecent((prev) => {
      const next = [clean, ...prev.filter((r) => r.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const results = useMemo(() => {
    const hasQuery = debouncedQuery.trim().length > 0;
    const hasFilters = Boolean(category || brand || priceRange !== null);

    if (!hasQuery && !hasFilters) {
      return [];
    }

    const q = debouncedQuery.toLowerCase().trim();

    return INITIAL_PRODUCTS.filter((item) => {
      if (q) {
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesBrand = item.brand.toLowerCase().includes(q);
        const matchesCategory = item.categoryLabel.toLowerCase().includes(q);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesBrand && !matchesCategory && !matchesTags) {
          return false;
        }
      }

      if (category && item.category !== category) {
        return false;
      }

      if (brand && item.brand !== brand) {
        return false;
      }

      if (priceRange !== null) {
        const range = PRICE_RANGES[priceRange];
        if (range.min !== undefined && item.price < range.min) return false;
        if (range.max !== undefined && item.price > range.max) return false;
      }

      return true;
    });
  }, [debouncedQuery, category, brand, priceRange]);

  const handleQuerySubmit = (term: string) => {
    setQuery(term);
    saveRecent(term);
  };

  const hasSearchOrFilter = query.trim().length > 0 || activeFilterCount > 0;

  return (
    <div className="pb-4 animate-[fadeIn_0.2s_ease-out]">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-[#FAFAFA]/95 px-4 py-3 backdrop-blur border-b border-black/5">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-[0_2px_10px_rgba(16,24,40,0.06)] border border-neutral-100">
          <SearchIcon className="h-4 w-4 shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                saveRecent(query);
              }
            }}
            placeholder='Search "milk", "snacks", "rice"...'
            className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="p-0.5 rounded-full hover:bg-neutral-100"
            >
              <XIcon className="h-4 w-4 text-neutral-400" />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          aria-label="Open filter options"
          onClick={() => setFilterOpen(true)}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition-colors shadow-sm"
        >
          <FilterIcon className="h-4 w-4" />
          {activeFilterCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E8622C] text-[9px] font-bold text-white shadow-xs">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        <TopCartButton />
      </header>

      {/* Active filters pill bar */}
      {activeFilterCount > 0 ? (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
          <span className="text-xs text-neutral-400 shrink-0 font-medium">Filtered by:</span>
          {category ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-800">
              {CATEGORIES.find((c) => c.category === category)?.categoryLabel || category}
              <button
                type="button"
                onClick={() => setCategory(null)}
                className="hover:text-black"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ) : null}
          {priceRange !== null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-800">
              {PRICE_RANGES[priceRange].label}
              <button
                type="button"
                onClick={() => setPriceRange(null)}
                className="hover:text-black"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ) : null}
          {brand ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-800">
              {brand}
              <button
                type="button"
                onClick={() => setBrand(null)}
                className="hover:text-black"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setCategory(null);
              setBrand(null);
              setPriceRange(null);
            }}
            className="text-xs text-[#E8622C] font-semibold shrink-0 ml-1 underline"
          >
            Reset
          </button>
        </div>
      ) : null}

      {!hasSearchOrFilter ? (
        <div className="px-4 pt-3">
          {recent.length > 0 ? (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-900">Recent searches</h2>
                <button
                  type="button"
                  onClick={() => {
                    setRecent([]);
                    try {
                      window.localStorage.removeItem(RECENT_KEY);
                    } catch {
                      // ignore
                    }
                  }}
                  className="text-xs font-medium text-neutral-400 hover:text-black transition-colors"
                >
                  Clear history
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleQuerySubmit(term)}
                    className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 shadow-xs border border-neutral-200/70 hover:border-neutral-400 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <h2 className="mb-2.5 text-sm font-bold text-neutral-900">Trending now</h2>
            <div className="flex flex-wrap gap-2">
              {TRENDING.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleQuerySubmit(term)}
                  className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 shadow-xs border border-neutral-200/70 hover:border-black hover:text-black transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon="🔍"
          headline="No matches found"
          subtext="Try searching with different keywords or adjust your filters"
        />
      ) : (
        <div className="pt-3">
          <p className="px-4 pb-2 text-xs font-semibold text-neutral-500">
            Found {results.length} {results.length === 1 ? "item" : "items"}
          </p>
          <ProductGrid products={results} />
        </div>
      )}

      {/* Filter Bottom Sheet */}
      {filterOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-[fadeIn_0.2s_ease-out] no-scrollbar">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900">Filter your search</h2>
              <button
                type="button"
                aria-label="Close filter panel"
                onClick={() => setFilterOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <XIcon className="h-4 w-4 text-neutral-600" />
              </button>
            </div>

            <div className="mb-5">
              <h3 className="mb-2 text-sm font-semibold text-neutral-900">Category</h3>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.category}
                    type="button"
                    onClick={() =>
                      setCategory((prev) => (prev === c.category ? null : c.category))
                    }
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      category === c.category
                        ? "bg-black text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {c.categoryLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <h3 className="mb-2 text-sm font-semibold text-neutral-900">Price range</h3>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map((range, idx) => (
                  <button
                    key={range.label}
                    type="button"
                    onClick={() =>
                      setPriceRange((prev) => (prev === idx ? null : idx))
                    }
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      priceRange === idx
                        ? "bg-black text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-neutral-900">Brand</h3>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto no-scrollbar">
                {availableBrands.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBrand((prev) => (prev === b ? null : b))}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      brand === b
                        ? "bg-black text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setCategory(null);
                  setBrand(null);
                  setPriceRange(null);
                }}
                className="flex-1 rounded-full border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => {
                  if (query.trim()) saveRecent(query);
                  setFilterOpen(false);
                }}
                className="flex-1 rounded-full bg-black py-3 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors shadow-md"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
