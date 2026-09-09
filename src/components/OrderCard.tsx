import React from "react";
import type { OrderDTO } from "../types";
import { formatOrderDate, formatPrice, STATUS_LABELS, STATUS_STYLES } from "../lib/format";
import { useCart } from "../context/CartContext";
import { useNavigation } from "../context/NavigationContext";

export function OrderCard({ order }: { key?: React.Key; order: OrderDTO }) {
  const { addRawItems } = useCart();
  const { navigate } = useNavigation();

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
    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(16,24,40,0.05)] border border-neutral-100">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
            STATUS_STYLES[order.status] || "bg-neutral-100 text-neutral-600"
          }`}
        >
          {STATUS_LABELS[order.status] || order.status}
        </span>
        <span className="text-xs text-neutral-400">
          {formatOrderDate(order.createdAt)}
        </span>
      </div>

      <div className="mt-3 flex -space-x-2 overflow-hidden py-1">
        {order.items.slice(0, 4).map((item, idx) => (
          <div
            key={item.id || idx}
            className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white bg-neutral-100 shadow-xs"
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
        {order.items.length > 4 ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-xs font-semibold text-neutral-700 shadow-xs">
            +{order.items.length - 4}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
        <span className="text-sm font-bold text-neutral-900">
          #{order.id} · {formatPrice(order.total)}
        </span>
        <button
          type="button"
          onClick={() => navigate(`/purchases/${order.id}`)}
          className="text-xs font-semibold text-neutral-500 hover:text-black transition-colors"
        >
          View details →
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleReorder}
          className="flex-1 rounded-full bg-black py-2.5 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition-colors active:scale-98"
        >
          Reorder items
        </button>
      </div>
    </div>
  );
}
