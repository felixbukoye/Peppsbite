import React from "react";
import { INITIAL_PRODUCTS, CATEGORIES } from "../data/products";
import { BackHeader } from "./BackHeader";
import { ProductGrid } from "./ProductGrid";
import { EmptyState } from "./EmptyState";

const TITLES: Record<string, string> = {
  "all-needs": "We have all your needs",
  "below-5k": "Everything here below ₦5,000!",
  "fresh-picks": "Fresh picks for you",
};

export function CategoryPage({ slug }: { slug: string }) {
  const categoryMatch = CATEGORIES.find((c) => c.category === slug);
  const title =
    TITLES[slug] ||
    categoryMatch?.categoryLabel ||
    slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const items = INITIAL_PRODUCTS.filter(
    (p) => p.collections.includes(slug) || p.category === slug
  );

  return (
    <div className="pb-6 animate-[fadeIn_0.2s_ease-out]">
      <BackHeader title={title} fallbackHref="/" />
      <div className="pt-4">
        {items.length === 0 ? (
          <EmptyState
            icon="📦"
            headline="Nothing here yet"
            subtext="Try a different category or search for items"
            ctaLabel="Back to explore"
            ctaHref="/"
          />
        ) : (
          <>
            <p className="px-4 pb-3 text-xs font-semibold text-neutral-500">
              Showing {items.length} items
            </p>
            <ProductGrid products={items} />
          </>
        )}
      </div>
    </div>
  );
}
