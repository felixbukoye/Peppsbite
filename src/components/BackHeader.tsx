import React, { type ReactNode } from "react";
import { useNavigation } from "../context/NavigationContext";
import { ChevronLeftIcon } from "./icons";
import { TopCartButton } from "./TopCartButton";

export function BackHeader({
  title,
  right,
  fallbackHref = "/",
  showCart = true,
}: {
  title: string;
  right?: ReactNode;
  fallbackHref?: string;
  showCart?: boolean;
}) {
  const { goBack, pathname } = useNavigation();

  const isCartOrCheckout =
    pathname === "/cart" ||
    pathname.startsWith("/cart") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout");

  const shouldRenderCart = showCart && !isCartOrCheckout;

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/5 bg-[#FAFAFA]/95 px-4 py-3 backdrop-blur">
      <button
        type="button"
        id="back-button"
        aria-label="Go back"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          goBack(fallbackHref);
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-xs border border-neutral-200/80 hover:bg-neutral-100 transition-all active:scale-95 cursor-pointer"
      >
        <ChevronLeftIcon className="h-5 w-5 text-neutral-800" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-[15px] font-bold text-neutral-900">
        {title}
      </h1>
      {right !== undefined ? right : shouldRenderCart ? <TopCartButton /> : null}
    </header>
  );
}

