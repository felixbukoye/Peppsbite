import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { useLocation } from "../context/LocationContext";
import { useOrders } from "../context/OrderContext";
import { useNavigation } from "../context/NavigationContext";
import { useToast } from "../context/ToastContext";
import { BackHeader } from "./BackHeader";
import { CheckIcon } from "./icons";
import { formatPrice } from "../lib/format";

const PAYMENT_METHODS = [
  { id: "card", label: "Visa •••• 4242 (Default)" },
  { id: "apple_pay", label: "Apple Pay" },
  { id: "cash", label: "Cash on delivery" },
];

export function CheckoutPage() {
  const { items, subtotal, discount, deliveryFee, total, promoCode, clear } = useCart();
  const { location } = useLocation();
  const { createOrder } = useOrders();
  const { navigate } = useNavigation();
  const { showToast } = useToast();

  const [address, setAddress] = useState(location);
  const [deliveryTime, setDeliveryTime] = useState<"asap" | "schedule">("asap");
  const [payment, setPayment] = useState("card");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeOrder = () => {
    if (items.length === 0) return;
    if (!address.trim()) {
      setError("Please enter a delivery address");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const order = createOrder({
        items: items.map((i, idx) => ({
          id: idx + 1,
          productId: i.productId,
          slug: i.slug,
          name: i.name,
          weight: i.weight,
          imageUrl: i.imageUrl,
          price: i.price,
          quantity: i.quantity,
        })),
        deliveryAddress: address.trim(),
        deliveryTime: deliveryTime === "asap" ? "ASAP (15-25 mins)" : "Scheduled for today 6:00 PM",
        deliveryInstructions: notes.trim(),
        paymentMethod: payment === "card" ? "Visa •••• 4242" : payment === "apple_pay" ? "Apple Pay" : "Cash on delivery",
        promoCode,
        subtotal,
        deliveryFee,
        discount,
        total,
      });

      clear();
      navigate(`/checkout/confirmation/${order.id}`);
    } catch (err) {
      setError("Failed to place order. Please try again.");
      showToast("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="pb-6 animate-[fadeIn_0.2s_ease-out]">
        <BackHeader title="Checkout" fallbackHref="/" />
        <p className="px-4 pt-10 text-center text-sm text-neutral-500">
          Your cart is empty. Add items before checking out.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-8 animate-[fadeIn_0.2s_ease-out]">
      <BackHeader title="Checkout" fallbackHref="/cart" />

      <div className="space-y-5 px-4 pt-4">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900">Deliver to</h2>
          </div>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-black transition-colors resize-none shadow-xs"
            placeholder="Enter full address, apartment or floor"
          />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-neutral-900">Delivery time</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDeliveryTime("asap")}
              className={`flex-1 rounded-2xl border py-3 px-3 text-xs font-semibold transition-all ${
                deliveryTime === "asap"
                  ? "border-black bg-black text-white shadow-sm"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              ⚡ ASAP (15–25 mins)
            </button>
            <button
              type="button"
              onClick={() => setDeliveryTime("schedule")}
              className={`flex-1 rounded-2xl border py-3 px-3 text-xs font-semibold transition-all ${
                deliveryTime === "schedule"
                  ? "border-black bg-black text-white shadow-sm"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              🕒 Schedule for later
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-neutral-900">Payment method</h2>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setPayment(method.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all ${
                  payment === method.id
                    ? "border-black bg-neutral-50/50"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                }`}
              >
                <span className="font-medium text-neutral-800">{method.label}</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    payment === method.id
                      ? "border-black bg-black text-white"
                      : "border-neutral-300"
                  }`}
                >
                  {payment === method.id ? <CheckIcon className="h-3 w-3" /> : null}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => showToast("Card management modal opened (demo)")}
              className="w-full rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-500 hover:text-black hover:border-black transition-colors"
            >
              + Add new payment method
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-neutral-900">Order instructions</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Leave at door, gate code 1234 (optional)"
            rows={2}
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-black transition-colors resize-none shadow-xs"
          />
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(16,24,40,0.05)] border border-neutral-100">
          <h2 className="mb-3 text-sm font-bold text-neutral-900">Order summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-semibold text-neutral-900">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
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
              <div className="flex justify-between">
                <span className="text-neutral-500">Discount ({promoCode})</span>
                <span className="font-semibold text-[#E8622C]">
                  -{formatPrice(discount)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-dashed border-neutral-200 pt-3 text-base">
              <span className="font-bold text-neutral-900">Total</span>
              <span className="font-extrabold text-neutral-900 text-lg">{formatPrice(total)}</span>
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={submitting || !address.trim()}
          onClick={placeOrder}
          className="w-full rounded-full bg-black py-4 text-sm font-bold text-white shadow-lg disabled:opacity-50 hover:bg-neutral-800 transition-all active:scale-98"
        >
          {submitting ? "Placing your order..." : `Place order · ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  );
}
