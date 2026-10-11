import React, { useState } from "react";
import { useOrders } from "../context/OrderContext";
import { BackHeader } from "./BackHeader";
import { CheckIcon, StarIcon } from "./icons";

const PERKS = [
  {
    title: "₦0 Delivery Fees",
    desc: "Free instant delivery on all orders over ₦15,000, saving you up to ₦30,000 every month.",
  },
  {
    title: "Member Exclusive Discounts",
    desc: "Unlock extra 10% to 20% discounts on top snacks, organic produce, and pantry staples.",
  },
  {
    title: "VIP Express Packing",
    desc: "Your bags are packed first by dedicated store teams and matched with top-rated couriers.",
  },
  {
    title: "Guaranteed Freshness",
    desc: "Instant 1-tap refund if any fruit, vegetable, or bakery item doesn't meet your standard.",
  },
];

export function PlansPage() {
  const { subscription, updateSubscription, cancelSubscription } = useOrders();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");

  const isSubscribed = subscription.status === "active";

  return (
    <div className="pb-8 animate-[fadeIn_0.2s_ease-out]">
      <BackHeader title="Peppsbite Pass" fallbackHref="/" />

      <div className="px-4 pt-4 space-y-5">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 p-6 text-white shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8622C] text-white">
              <StarIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-white/90">
              Unlimited Membership
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight">
            Peppsbite Pass
          </h1>
          <p className="mt-1 text-xs text-neutral-300 leading-relaxed max-w-[280px]">
            The smarter way to order fresh groceries, daily snacks, and household essentials.
          </p>

          {isSubscribed ? (
            <div className="mt-4 rounded-2xl bg-white/10 p-3 backdrop-blur-xs border border-white/10">
              <p className="text-xs font-bold text-emerald-400">
                Active Membership: {subscription.plan === "annual" ? "Annual Plan" : "Monthly Plan"}
              </p>
              <p className="text-[11px] text-white/70 mt-0.5">
                Enjoying ₦0 delivery fee and exclusive member deals.
              </p>
            </div>
          ) : null}
        </div>

        {/* Plan Selector */}
        {!isSubscribed ? (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-neutral-900">Choose your membership plan</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlan("annual")}
                className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                  selectedPlan === "annual"
                    ? "border-black bg-neutral-50 ring-2 ring-black shadow-sm"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                }`}
              >
                <span className="absolute -top-2.5 right-3 rounded-full bg-[#E8622C] px-2 py-0.5 text-[9px] font-bold text-white uppercase shadow-xs">
                  Save 20%
                </span>
                <span className="text-xs font-bold text-neutral-900">Annual Plan</span>
                <span className="mt-2 text-xl font-extrabold text-neutral-900">₦57,600</span>
                <span className="text-[10px] text-neutral-500">per year (₦4,800/mo)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan("monthly")}
                className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                  selectedPlan === "monthly"
                    ? "border-black bg-neutral-50 ring-2 ring-black shadow-sm"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                }`}
              >
                <span className="text-xs font-bold text-neutral-900">Monthly Plan</span>
                <span className="mt-2 text-xl font-extrabold text-neutral-900">₦6,000</span>
                <span className="text-[10px] text-neutral-500">billed monthly</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => updateSubscription(selectedPlan)}
              className="w-full rounded-full bg-black py-4 text-sm font-bold text-white shadow-lg hover:bg-neutral-800 transition-all active:scale-98"
            >
              Start {selectedPlan === "annual" ? "Annual" : "Monthly"} Membership
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-bold text-neutral-900 mb-1">Manage Subscription</h2>
            <p className="text-xs text-neutral-500 mb-4">
              You can cancel or switch billing cycles anytime without penalty.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  updateSubscription(subscription.plan === "annual" ? "monthly" : "annual")
                }
                className="flex-1 rounded-full border border-neutral-300 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Switch to {subscription.plan === "annual" ? "Monthly" : "Annual (Save 20%)"}
              </button>
              <button
                type="button"
                onClick={cancelSubscription}
                className="flex-1 rounded-full bg-red-50 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
              >
                Cancel Pass
              </button>
            </div>
          </div>
        )}

        {/* Benefits list */}
        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_10px_rgba(16,24,40,0.05)] border border-neutral-100">
          <h2 className="text-sm font-bold text-neutral-900 mb-4">Everything included in your Pass</h2>
          <div className="space-y-4">
            {PERKS.map((perk) => (
              <div key={perk.title} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-white text-xs mt-0.5">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-neutral-900">{perk.title}</h3>
                  <p className="text-[11px] text-neutral-500 leading-relaxed mt-0.5">
                    {perk.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
