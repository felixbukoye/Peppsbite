import React, { useState } from "react";
import { useLocation } from "../context/LocationContext";
import { MapPinIcon, XIcon } from "./icons";

const SUGGESTIONS = [
  "New York, USA",
  "Brooklyn, USA",
  "Jersey City, USA",
  "Los Angeles, USA",
  "Chicago, USA",
  "San Francisco, USA",
  "Boston, USA",
  "Seattle, USA",
  "Austin, USA",
];

export function LocationBar() {
  const { location, setLocation } = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query
    ? SUGGESTIONS.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : SUGGESTIONS;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Change delivery location, currently ${location}`}
        className="flex w-full items-center gap-2.5 px-1 py-1 text-left transition-opacity hover:opacity-80"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-sm">
          <MapPinIcon className="h-4 w-4" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[11px] font-medium text-neutral-500">Current location</span>
          <span className="truncate text-sm font-semibold text-neutral-900">
            {location} <span className="text-xs font-normal text-neutral-400">· Tap to change</span>
          </span>
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900">Choose delivery location</h2>
              <button
                type="button"
                aria-label="Close location selector"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <XIcon className="h-4 w-4 text-neutral-600" />
              </button>
            </div>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for your area or address..."
              className="mb-3 w-full rounded-full border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-black focus:bg-white transition-colors"
            />
            <div className="max-h-64 space-y-1 overflow-y-auto no-scrollbar">
              {filtered.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-neutral-500">
                  Hmm, we couldn&apos;t find that place. Try another search.
                </p>
              ) : (
                filtered.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setLocation(s);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm transition-colors ${
                      location === s
                        ? "bg-neutral-100 font-semibold text-black"
                        : "hover:bg-neutral-50 text-neutral-700"
                    }`}
                  >
                    <MapPinIcon
                      className={`h-4 w-4 ${
                        location === s ? "text-black" : "text-neutral-400"
                      }`}
                    />
                    <span>{s}</span>
                    {location === s ? (
                      <span className="ml-auto text-xs text-[#E8622C] font-semibold">Active</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
