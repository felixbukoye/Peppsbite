import React from "react";
import { useOrders } from "../context/OrderContext";
import { useCart } from "../context/CartContext";
import { useNavigation } from "../context/NavigationContext";
import { BackHeader } from "./BackHeader";
import { EmptyState } from "./EmptyState";
import { CheckIcon } from "./icons";
import { formatOrderDate, formatPrice, STATUS_LABELS, STATUS_STYLES } from "../lib/format";

const STEPS = [
  { key: "confirmed", label: "Confirmed", desc: "Order received" },
  { key: "preparing", label: "Preparing", desc: "Items packed" },
  { key: "on_the_way", label: "Out for delivery", desc: "Rider is en route" },
  { key: "delivered", label: "Delivered", desc: "Handed over" },
];

export function OrderDetailPage({ id }: { id: string }) {
  const { getOrder } = useOrders();
  const { addRawItems } = useCart();
  const { navigate } = useNavigation();

  const orderId = Number(id);
  const order = getOrder(orderId);

  if (!order) {
    return (
      <div className="pb-6">
        <BackHeader title="Order Details" fallbackHref="/purchases" />
        <EmptyState
          icon="📄"
          headline="Order not found"
          subtext="We couldn't find the requested order in your history"
          ctaLabel="View all purchases"
          ctaHref="/purchases"
        />
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === order.status);
  const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  const handleReorder = () => {
    addRawItems(
      order.items.map((item) => ({
        productId: item.productId ?? 0,
        slug: item.slug,
        name: item.name,
        price: item.price,
        weight: item.weight,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
      }))
    );
    navigate("/cart");
  };

  return (
    <div className="pb-8 animate-[fadeIn_0.2s_ease-out]">
      <BackHeader title={`Order #${order.id}`} fallbackHref="/purchases" />

      <div className="space-y-4 px-4 pt-4">
        {/* Status Header card */}
        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_10px_rgba(16,24,40,0.05)] border border-neutral-100">
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                STATUS_STYLES[order.status] || "bg-neutral-100 text-neutral-600"
              }`}
            >
              {STATUS_LABELS[order.status]}
            </span>
            <span className="text-xs text-neutral-400">
              {formatOrderDate(order.createdAt)}
            </span>
          </div>

          {/* Delivery tracking visual stepper */}
          <div className="mt-6">
            <div className="relative flex items-center justify-between">
              {/* Stepper connecting line */}
              <div className="absolute left-4 right-4 top-3.5 -z-0 h-0.5 bg-neutral-200" />
              <div
                className="absolute left-4 top-3.5 -z-0 h-0.5 bg-[#E8622C] transition-all duration-500"
                style={{
                  width: `${(activeIndex / (STEPS.length - 1)) * 90}%`,
                }}
              />

              {STEPS.map((step, idx) => {
                const isPassed = idx <= activeIndex;
                const isCurrent = idx === activeIndex;

                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        isPassed
                          ? "bg-[#E8622C] text-white shadow-xs"
                          : "bg-white border-2 border-neutral-300 text-neutral-400"
                      } ${isCurrent ? "ring-4 ring-[#E8622C]/20 scale-110" : ""}`}
                    >
                      {isPassed ? <CheckIcon className="h-3.5 w-3.5" /> : idx + 1}
                    </span>
                    <span
                      className={`mt-2 text-[10px] font-semibold text-center max-w-[60px] ${
                        isPassed ? "text-neutral-900" : "text-neutral-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-neutral-50 p-3 text-xs text-neutral-600 border border-neutral-200/50">
            <span className="font-bold text-neutral-900">Estimated delivery:</span>{" "}
            {order.status === "delivered"
              ? "Package delivered successfully to your door."
              : order.status === "on_the_way"
              ? "Courier is 5 mins away on e-bike."
              : "Arriving within 15–25 minutes."}
          </div>
        </div>

        {/* Delivery Details */}
        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_10px_rgba(16,24,40,0.05)] border border-neutral-100 space-y-3">
          <h2 className="text-sm font-bold text-neutral-900">Delivery details</h2>
          <div className="text-xs space-y-2 text-neutral-600">
            <div className="flex justify-between">
              <span className="text-neutral-400">Address</span>
              <span className="max-w-[65%] text-right font-semibold text-neutral-900">
                {order.deliveryAddress}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Time window</span>
              <span className="font-semibold text-neutral-900">{order.deliveryTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Payment</span>
              <span className="font-semibold text-neutral-900">{order.paymentMethod}</span>
            </div>
            {order.deliveryInstructions ? (
              <div className="flex justify-between">
                <span className="text-neutral-400">Instructions</span>
                <span className="max-w-[65%] text-right font-medium text-neutral-800">
                  {order.deliveryInstructions}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Items List */}
        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_10px_rgba(16,24,40,0.05)] border border-neutral-100">
          <h2 className="text-sm font-bold text-neutral-900 mb-3">
            Items in this order ({order.items.reduce((s, i) => s + i.quantity, 0)})
          </h2>
          <div className="divide-y divide-neutral-100">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-2.5"
              >
                <div
                  onClick={() => navigate(`/product/${item.slug}`)}
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100 cursor-pointer"
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
                    className="truncate text-xs font-bold text-neutral-900 cursor-pointer hover:underline"
                  >
                    {item.name}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {item.quantity} × {formatPrice(item.price)} · {item.weight}
                  </p>
                </div>
                <span className="text-xs font-bold text-neutral-900">
                  {formatPrice(item.quantity * item.price)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_10px_rgba(16,24,40,0.05)] border border-neutral-100 space-y-2 text-sm">
          <h2 className="text-sm font-bold text-neutral-900 mb-2">Order summary</h2>
          <div className="flex justify-between text-neutral-500 text-xs">
            <span>Subtotal</span>
            <span className="font-semibold text-neutral-900">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-500 text-xs">
            <span>Delivery fee</span>
            <span className="font-semibold text-neutral-900">
              {order.deliveryFee === 0 ? "FREE" : formatPrice(order.deliveryFee)}
            </span>
          </div>
          {order.discount > 0 ? (
            <div className="flex justify-between text-neutral-500 text-xs">
              <span>Discount</span>
              <span className="font-semibold text-[#E8622C]">-{formatPrice(order.discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-dashed border-neutral-200 pt-2.5 text-base">
            <span className="font-bold text-neutral-900">Total</span>
            <span className="font-extrabold text-[#E8622C] text-lg">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReorder}
          className="w-full rounded-full bg-black py-4 text-sm font-bold text-white shadow-lg hover:bg-neutral-800 transition-transform active:scale-98"
        >
          Reorder all items
        </button>
      </div>
    </div>
  );
}
