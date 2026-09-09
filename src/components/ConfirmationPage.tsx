import React from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigation } from "../context/NavigationContext";
import { formatPrice } from "../lib/format";

export function ConfirmationPage({ id }: { id: string }) {
  const { getOrder } = useOrders();
  const { navigate } = useNavigation();
  const orderId = Number(id);
  const order = getOrder(orderId);

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-8 text-center animate-[fadeIn_0.3s_ease-out]">
      <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[#E8622C]/15 text-5xl animate-[popIn_0.4s_ease-out]">
        🎉
      </div>

      <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
        Order placed!
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Your order #{order?.id || id} is being prepared by our store team
      </p>

      {order ? (
        <div className="mt-6 w-full rounded-2xl bg-white p-4 text-left shadow-[0_2px_10px_rgba(16,24,40,0.06)] border border-neutral-100">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Deliver to</span>
            <span className="max-w-[60%] truncate text-right font-semibold text-neutral-900">
              {order.deliveryAddress}
            </span>
          </div>
          <div className="mt-2.5 flex justify-between text-sm">
            <span className="text-neutral-500">Total paid</span>
            <span className="font-bold text-[#E8622C]">{formatPrice(order.total)}</span>
          </div>
          <div className="mt-2.5 flex justify-between text-sm border-t border-neutral-100 pt-2.5">
            <span className="text-neutral-500">Status</span>
            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs">
              Order confirmed
            </span>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => navigate(`/purchases/${id}`)}
        className="mt-6 w-full rounded-full bg-black py-4 text-sm font-bold text-white shadow-lg hover:bg-neutral-800 transition-transform active:scale-98"
      >
        Track my order
      </button>

      <button
        type="button"
        onClick={() => navigate("/")}
        className="mt-3 py-2 text-sm font-semibold text-neutral-500 hover:text-black transition-colors"
      >
        Continue shopping
      </button>
    </div>
  );
}
