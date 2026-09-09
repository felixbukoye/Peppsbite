import React from "react";
import { useOrders } from "../context/OrderContext";
import { EmptyState } from "./EmptyState";
import { OrderCard } from "./OrderCard";
import { TopCartButton } from "./TopCartButton";

export function PurchasesPage() {
  const { orders } = useOrders();

  return (
    <div className="pb-8 animate-[fadeIn_0.2s_ease-out]">
      <div className="px-4 pt-5 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">
            Purchases
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            View your order history and live deliveries
          </p>
        </div>
        <TopCartButton />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon="🧾"
          headline="No orders yet"
          subtext="Your grocery order history will show up here as soon as you place an order"
          ctaLabel="Browse products"
          ctaHref="/"
        />
      ) : (
        <div className="space-y-3.5 px-4 pt-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
