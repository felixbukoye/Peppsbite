import type { OrderStatus } from "../types";

export function formatPrice(value: number | string | null | undefined): string {
  const num = typeof value === "number" ? value : parseFloat(String(value || 0)) || 0;
  return `$${num.toFixed(2)}`;
}

export function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "Recently";
  return `Ordered on ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function deriveStatus(createdAt: string | Date, storedStatus: string): OrderStatus {
  if (storedStatus === "cancelled") return "cancelled";
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const elapsedMinutes = (Date.now() - date.getTime()) / 60000;
  
  if (elapsedMinutes < 1) return "confirmed";
  if (elapsedMinutes < 3) return "preparing";
  if (elapsedMinutes < 6) return "on_the_way";
  return "delivered";
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed: "Order confirmed",
  preparing: "Being prepared",
  on_the_way: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_STYLES: Record<OrderStatus, string> = {
  confirmed: "bg-blue-50 text-blue-600",
  preparing: "bg-amber-50 text-amber-600",
  on_the_way: "bg-[#E8622C]/10 text-[#E8622C]",
  delivered: "bg-emerald-50 text-emerald-600",
  cancelled: "bg-neutral-100 text-neutral-500",
};
