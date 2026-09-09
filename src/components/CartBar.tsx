import React from "react";
import { useCart } from "../context/CartContext";
import { useNavigation } from "../context/NavigationContext";
import { formatPrice } from "../lib/format";
import { ShoppingBagIcon } from "./icons";
import { isDirectNavPage } from "./BottomNav";

export function CartBar() {
  const { itemCount, subtotal } = useCart();
  const { pathname, navigate } = useNavigation();

  if (itemCount === 0) return null;
  if (pathname.startsWith("/cart") || pathname.startsWith("/checkout")) {
    return null;
  }

  const hasBottomNav = isDirectNavPage(pathname);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 ${
        hasBottomNav ? "bottom-[64px]" : "bottom-4"
      } z-30 mx-auto w-full max-w-md px-4 pb-2 animate-[fadeIn_0.2s_ease-out]`}
    >
      <button
        type="button"
        onClick={() => navigate("/cart")}
        className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-2xl bg-black px-4 py-3 text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] transition-transform active:scale-[0.98] hover:bg-neutral-900 cursor-pointer"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
            <ShoppingBagIcon className="h-4 w-4" />
          </span>
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
        <span className="text-sm font-semibold">
          View cart • {formatPrice(subtotal)}
        </span>
      </button>
    </div>
  );
}
