import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { useNavigation } from "../context/NavigationContext";
import { BackHeader } from "./BackHeader";
import { EmptyState } from "./EmptyState";
import { MinusIcon, PlusIcon } from "./icons";
import { formatPrice } from "../lib/format";

export function CartPage() {
  const {
    items,
    subtotal,
    discount,
    deliveryFee,
    total,
    promoCode,
    amountToFreeDelivery,
    increment,
    decrement,
    removeItem,
    applyPromo,
    removePromo,
  } = useCart();

  const { navigate } = useNavigation();
  const [promoInput, setPromoInput] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  return (
    <div className="pb-8 animate-[fadeIn_0.2s_ease-out]">
      <BackHeader title="Your cart" fallbackHref="/" />

      {items.length === 0 ? (
        <EmptyState
          icon="🛍️"
          headline="Your cart is empty"
          subtext="Looks like you haven't added anything yet. Explore our fresh grocery items!"
          ctaLabel="Start shopping"
          ctaHref="/"
        />
      ) : (
        <div className="px-4 pt-4">
          <p className="mb-3 text-sm font-semibold text-neutral-500">
            {items.reduce((s, i) => s + i.quantity, 0)} {items.reduce((s, i) => s + i.quantity, 0) === 1 ? "item" : "items"}
          </p>

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_10px_rgba(16,24,40,0.05)] border border-neutral-100"
              >
                <div
                  onClick={() => navigate(`/product/${item.slug}`)}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100 cursor-pointer"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    onClick={() => navigate(`/product/${item.slug}`)}
                    className="truncate text-sm font-semibold text-neutral-900 cursor-pointer hover:underline"
                  >
                    {item.name}
                  </p>
                  <p className="text-xs text-neutral-500">{item.weight}</p>
                  <p className="mt-0.5 text-sm font-bold text-[#E8622C]">
                    {formatPrice(item.price)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-1.5 py-1 border border-neutral-200/60">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => {
                        if (item.quantity === 1) {
                          setConfirmRemove(item.productId);
                        } else {
                          decrement(item.productId);
                        }
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-xs hover:bg-neutral-50 transition-colors"
                    >
                      <MinusIcon className="h-3 w-3 text-neutral-800" />
                    </button>
                    <span className="min-w-[16px] text-center text-xs font-bold text-neutral-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => increment(item.productId)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-xs hover:bg-neutral-50 transition-colors"
                    >
                      <PlusIcon className="h-3 w-3 text-neutral-800" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setConfirmRemove(item.productId)}
                    className="text-[11px] font-medium text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Free delivery threshold info */}
          {amountToFreeDelivery > 0 ? (
            <p className="mt-4 rounded-xl bg-[#E8622C]/10 border border-[#E8622C]/20 px-3.5 py-2.5 text-xs font-semibold text-[#E8622C]">
              Add {formatPrice(amountToFreeDelivery)} more to qualify for FREE delivery
            </p>
          ) : (
            <p className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-semibold text-emerald-700">
              🎉 You&apos;ve qualified for FREE delivery!
            </p>
          )}

          {/* Promo code section */}
          <div className="mt-5">
            {promoCode ? (
              <div className="flex items-center justify-between rounded-2xl bg-black px-4 py-3 text-white shadow-sm">
                <span className="text-sm font-semibold">
                  Promo &ldquo;{promoCode}&rdquo; applied (20% OFF)
                </span>
                <button
                  type="button"
                  onClick={removePromo}
                  className="text-xs font-semibold text-white/70 hover:text-white transition-colors underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Enter promo code"
                  className="flex-1 rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-black transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (applyPromo(promoInput)) setPromoInput("");
                  }}
                  className="rounded-full bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors shadow-sm"
                >
                  Apply
                </button>
              </div>
            )}
            <p className="mt-1.5 px-1 text-[11px] text-neutral-400">
              Tip: Use promo code &ldquo;PEPPS20&rdquo; for 20% off
            </p>
          </div>

          {/* Pricing summary */}
          <div className="mt-6 space-y-2.5 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(16,24,40,0.05)] border border-neutral-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-semibold text-neutral-900">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Delivery fee</span>
              <span className="font-semibold text-neutral-900">
                {deliveryFee === 0 ? (
                  <span className="text-emerald-600 font-bold">FREE</span>
                ) : (
                  formatPrice(deliveryFee)
                )}
              </span>
            </div>
            {discount > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Discount (PEPPS20)</span>
                <span className="font-semibold text-[#E8622C]">
                  -{formatPrice(discount)}
                </span>
              </div>
            ) : null}
            <div className="mt-1 flex items-center justify-between border-t border-dashed border-neutral-200 pt-3 text-base">
              <span className="font-bold text-neutral-900">Total</span>
              <span className="font-extrabold text-neutral-900 text-lg">{formatPrice(total)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/checkout")}
            className="mt-5 w-full rounded-full bg-black py-4 text-sm font-bold text-white shadow-lg hover:bg-neutral-800 transition-all active:scale-98"
          >
            Proceed to checkout · {formatPrice(total)}
          </button>
        </div>
      )}

      {/* Confirmation modal for item removal */}
      {confirmRemove !== null ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-xs px-6 animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-xs rounded-3xl bg-white p-5 text-center shadow-2xl animate-[popIn_0.2s_ease-out]">
            <p className="text-sm font-bold text-neutral-900">
              Remove this item from your cart?
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              You can easily re-add it anytime from the catalog.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="flex-1 rounded-full border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={() => {
                  removeItem(confirmRemove);
                  setConfirmRemove(null);
                }}
                className="flex-1 rounded-full bg-black py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
              >
                Yes, remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
