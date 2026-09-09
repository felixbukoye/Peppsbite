import React from "react";
import { useCart } from "../context/CartContext";
import { MinusIcon, PlusIcon } from "./icons";
import type { Product } from "../types";

export function AddToCartControl({
  product,
  size = "sm",
}: {
  product: Product;
  size?: "sm" | "lg";
}) {
  const { quantityOf, addItem, increment, decrement } = useCart();
  const quantity = quantityOf(product.id);
  const dims = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const iconDims = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (!product.inStock) {
    return (
      <button
        type="button"
        disabled
        className={`${dims} flex items-center justify-center rounded-full bg-neutral-200 text-neutral-400 cursor-not-allowed`}
        aria-label="Out of stock"
      >
        <PlusIcon className={iconDims} />
      </button>
    );
  }

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addItem(product, 1);
        }}
        aria-label={`Add ${product.name} to cart, $${product.price.toFixed(2)}`}
        className={`${dims} flex items-center justify-center rounded-full bg-black text-white shadow-md transition-all active:scale-90 hover:bg-neutral-800`}
      >
        <PlusIcon className={iconDims} />
      </button>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`flex items-center gap-2 rounded-full bg-black text-white shadow-md ${
        size === "sm" ? "px-1.5 py-1" : "px-2.5 py-1.5"
      }`}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => decrement(product.id)}
        className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
      >
        <MinusIcon className="h-3 w-3" />
      </button>
      <span className="min-w-[14px] animate-pop text-center text-xs font-bold">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => increment(product.id)}
        className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
      >
        <PlusIcon className="h-3 w-3" />
      </button>
    </div>
  );
}
