import React, { useEffect, useState } from "react";
import type { Product } from "../types";
import { CategorySection } from "./CategorySection";
import { INITIAL_PRODUCTS } from "../data/products";

const STORAGE_KEY = "peppsbite_recently_viewed";

export function addRecentlyViewed(slug: string) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [slug, ...list.filter((s) => s !== slug)].slice(0, 10);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function RecentlyViewed() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const slugs: string[] = raw ? JSON.parse(raw) : [];
      if (slugs.length === 0) return;

      const found = slugs
        .map((slug) => INITIAL_PRODUCTS.find((p) => p.slug === slug))
        .filter((p): p is Product => Boolean(p));

      setProducts(found);
    } catch {
      // ignore
    }
  }, []);

  if (products.length === 0) return null;

  return <CategorySection title="Recently viewed" products={products} />;
}
