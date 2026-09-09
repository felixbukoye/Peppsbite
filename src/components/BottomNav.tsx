import React from "react";
import { useNavigation } from "../context/NavigationContext";
import { CompassIcon, ReceiptIcon, SearchIcon, StarIcon } from "./icons";

export const DIRECT_NAV_PATHS = ["/", "/search", "/purchases", "/plans"];

export function isDirectNavPage(pathname: string): boolean {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const cleanPath = path.split("?")[0].replace(/\/+$/, "") || "/";
  return DIRECT_NAV_PATHS.includes(cleanPath);
}

const TABS = [
  { href: "/", label: "Explore", icon: CompassIcon, match: (p: string) => p === "/" || p === "" },
  { href: "/search", label: "Search", icon: SearchIcon, match: (p: string) => p === "/search" || p.startsWith("/search?") },
  { href: "/purchases", label: "Purchases", icon: ReceiptIcon, match: (p: string) => p === "/purchases" || p === "/purchases/" },
  { href: "/plans", label: "PeppsPass", icon: StarIcon, match: (p: string) => p === "/plans" || p === "/plans/" },
];

export function BottomNav() {
  const { pathname, navigate } = useNavigation();

  // If the current page is not opened directly by the navigation bar, do not render it
  if (!isDirectNavPage(pathname)) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md justify-around border-t border-black/5 bg-white/95 px-2 pb-2 pt-2 backdrop-blur">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <button
            key={tab.href}
            type="button"
            onClick={() => navigate(tab.href)}
            aria-label={`${tab.label} tab${active ? ", currently selected" : ""}`}
            className="flex min-w-[56px] flex-col items-center gap-1 rounded-2xl px-2 py-1 transition-transform active:scale-95 cursor-pointer"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                active ? "bg-black text-white shadow-sm" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span
              className={`text-[11px] font-medium ${
                active ? "text-black font-semibold" : "text-neutral-400"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
