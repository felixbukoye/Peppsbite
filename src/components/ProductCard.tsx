import React from "react";
import type { Product } from "../types";
import { formatPrice } from "../lib/format";
import { AddToCartControl } from "./AddToCartControl";
import { useNavigation } from "../context/NavigationContext";

export function ProductCard({
  product,
  className = "",
}: {
  key?: React.Key;
  product: Product;
  className?: string;
}) {
  const { navigate } = useNavigation();

  return (
    <div
      onClick={() => navigate(`/product/${product.slug}`)}
      className={`group block cursor-pointer rounded-2xl bg-white p-2.5 shadow-[0_2px_10px_rgba(16,24,40,0.05)] transition-all hover:shadow-[0_6px_18px_rgba(16,24,40,0.1)] active:scale-[0.99] ${className}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {product.discountPercent ? (
          <span
            aria-label={`${product.discountPercent} percent discount applied`}
            className="absolute left-2 top-2 rounded-md bg-[#E8622C] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
          >
            {product.discountPercent}%
          </span>
        ) : null}
        {!product.inStock ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]">
            <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-[10px] font-semibold text-white">
              Out of stock
            </span>
          </div>
        ) : product.stockCount <= 5 ? (
          <span className="absolute bottom-2 left-2 rounded-md bg-black/70 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium text-white">
            Only {product.stockCount} left!
          </span>
        ) : null}
        <div className="absolute bottom-2 right-2">
          <AddToCartControl product={product} size="sm" />
        </div>
      </div>
      <div className="mt-2 space-y-0.5">
        <p className="line-clamp-1 text-[13px] font-semibold text-neutral-900 group-hover:text-black">
          {product.name}
        </p>
        <p className="text-[11px] text-neutral-500">{product.weight}</p>
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-sm font-bold text-[#E8622C]">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice ? (
            <span className="text-[11px] text-neutral-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
