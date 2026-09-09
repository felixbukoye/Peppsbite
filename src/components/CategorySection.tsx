import React from "react";
import type { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { ChevronRightIcon } from "./icons";
import { useNavigation } from "../context/NavigationContext";

export function CategorySection({
  title,
  seeAllHref,
  products,
}: {
  title: string;
  seeAllHref?: string;
  products: Product[];
}) {
  const { navigate } = useNavigation();

  if (products.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-[17px] font-bold text-neutral-900">{title}</h2>
        {seeAllHref ? (
          <button
            type="button"
            onClick={() => navigate(seeAllHref)}
            className="flex items-center gap-0.5 text-xs font-semibold text-neutral-500 hover:text-black transition-colors"
          >
            See all
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            className="w-[150px] shrink-0"
          />
        ))}
      </div>
    </section>
  );
}
