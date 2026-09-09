import React from "react";
import { useCart } from "../context/CartContext";
import { useNavigation } from "../context/NavigationContext";
import { ShoppingCartIcon } from "./icons";

export function TopCartButton({ className = "" }: { className?: string }) {
  const { itemCount } = useCart();
  const { navigate, pathname } = useNavigation();

  const isCartPage = pathname === "/cart" || pathname.startsWith("/cart");

  return (
    <button
      type="button"
      id="top-cart-button"
      aria-label={`Shopping cart with ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
      onClick={() => {
        if (!isCartPage) {
          navigate("/cart");
        }
      }}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-xs border border-neutral-200/80 text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 active:scale-95 transition-all ${className}`}
    >
      <ShoppingCartIcon className="h-5 w-5 text-neutral-800" />
      {itemCount > 0 ? (
        <span
          id="top-cart-count-badge"
          key={itemCount}
          className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E8622C] px-1 text-[11px] font-extrabold text-white shadow-xs ring-2 ring-white animate-[popIn_0.2s_ease-out]"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </button>
  );
}
