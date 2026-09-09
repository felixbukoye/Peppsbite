import React from "react";
import { LocationBar } from "./LocationBar";
import { TopCartButton } from "./TopCartButton";
import { PermissionBanner } from "./PermissionBanner";
import { PromoCarousel } from "./PromoCarousel";
import { CategoryChips } from "./CategoryChips";
import { CategorySection } from "./CategorySection";
import { RecentlyViewed } from "./RecentlyViewed";
import { SearchIcon, FilterIcon } from "./icons";
import { useNavigation } from "../context/NavigationContext";
import { INITIAL_PRODUCTS } from "../data/products";

export function HomePage() {
  const { navigate } = useNavigation();

  const allNeeds = INITIAL_PRODUCTS.filter((p) => p.collections.includes("all-needs"));
  const belowTwenty = INITIAL_PRODUCTS.filter((p) => p.collections.includes("below-20"));
  const freshPicks = INITIAL_PRODUCTS.filter((p) => p.collections.includes("fresh-picks"));

  return (
    <div className="pt-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="px-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <LocationBar />
        </div>
        <TopCartButton />
      </div>

      <div className="mt-3 px-4">
        <button
          type="button"
          onClick={() => navigate("/search")}
          className="flex w-full items-center gap-2 rounded-full bg-white px-4 py-3 shadow-[0_2px_10px_rgba(16,24,40,0.06)] border border-neutral-100/80 hover:border-neutral-300 transition-colors"
        >
          <SearchIcon className="h-4 w-4 text-neutral-400" />
          <span className="flex-1 text-left text-sm text-neutral-400">
            Find food, snacks &amp; grocery essentials...
          </span>
          <span
            aria-label="Open filter options"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
          >
            <FilterIcon className="h-3.5 w-3.5" />
          </span>
        </button>
      </div>

      <div className="mt-4">
        <PermissionBanner />
      </div>

      <PromoCarousel />

      <CategoryChips />

      <CategorySection
        title="We have all your needs"
        seeAllHref="/category/all-needs"
        products={allNeeds}
      />

      <CategorySection
        title="Everything here below $20!"
        seeAllHref="/category/below-20"
        products={belowTwenty}
      />

      <CategorySection
        title="Fresh picks for you"
        seeAllHref="/category/fresh-picks"
        products={freshPicks}
      />

      <RecentlyViewed />

      <div className="h-6" />
    </div>
  );
}
