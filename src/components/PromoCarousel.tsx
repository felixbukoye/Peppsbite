import React, { useEffect, useRef, useState } from "react";
import { useOrders } from "../context/OrderContext";
import { useNavigation } from "../context/NavigationContext";
import { StarIcon } from "./icons";

interface PromoItem {
  id: string;
  categorySlug: string;
  badgeLabel: string;
  badgeDiscount: string;
  emoji: string;
  accentColor: string;
  badgeBorder: string;
  title: string;
  subtitle: string;
  cta: string;
  imageUrl: string;
  gradient: string;
}

const PROMOTIONS: PromoItem[] = [
  {
    id: "food",
    categorySlug: "/category/produce",
    badgeLabel: "Fresh Food Fest",
    badgeDiscount: "25% OFF",
    emoji: "🥗",
    accentColor: "bg-emerald-500",
    badgeBorder: "border-emerald-400/40",
    title: "Farm-Fresh Food & Harvest Picks",
    subtitle: "Organic fruits, crisp salads, artisan bakery & wholesome meals in 15 mins.",
    cta: "Shop Fresh Food",
    imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80",
    gradient: "from-neutral-950/92 via-neutral-950/65 to-black/35",
  },
  {
    id: "groceries",
    categorySlug: "/category/dairy",
    badgeLabel: "Supermarket Prices",
    badgeDiscount: "$0 Delivery",
    emoji: "🥛",
    accentColor: "bg-[#E8622C]",
    badgeBorder: "border-orange-400/40",
    title: "Daily Groceries & Essentials",
    subtitle: "Pasture-raised eggs, organic milk, pantry staples & kitchen favorites at low prices.",
    cta: "Stock Up Groceries",
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
    gradient: "from-neutral-950/92 via-neutral-950/65 to-black/35",
  },
  {
    id: "snacks",
    categorySlug: "/category/sweet-snacks",
    badgeLabel: "Crave Specials",
    badgeDiscount: "Buy 2 Get 1",
    emoji: "🍿",
    accentColor: "bg-purple-600",
    badgeBorder: "border-purple-400/40",
    title: "Sweet & Savory Snack Craves",
    subtitle: "Artisan chocolates, crunchy tortilla crisps, roasted wafers & late-night munchies.",
    cta: "Explore Snack Deals",
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=900&q=80",
    gradient: "from-neutral-950/92 via-neutral-950/65 to-black/35",
  },
];

export function PromoCarousel() {
  const { subscription } = useOrders();
  const { navigate } = useNavigation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const isSubscribed = subscription.status === "active";

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== active && index >= 0 && index < PROMOTIONS.length) {
      setActive(index);
    }
  };

  const scrollToSlide = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const slideWidth = el.clientWidth;
    el.scrollTo({ left: index * slideWidth, behavior: "smooth" });
    setActive(index);
  };

  // Optional subtle auto-rotation if user is not interacting
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      setActive((prev) => {
        const next = (prev + 1) % PROMOTIONS.length;
        const el = scrollerRef.current;
        if (el) {
          el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
        }
        return next;
      });
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      {/* Member Active status banner if subscribed */}
      {isSubscribed ? (
        <div className="px-4 mb-2.5">
          <div
            onClick={() => navigate("/plans")}
            className="flex items-center justify-between rounded-2xl bg-neutral-900 px-3.5 py-2 text-white shadow-xs cursor-pointer hover:bg-neutral-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8622C] text-white">
                <StarIcon className="h-3 w-3" />
              </span>
              <span className="text-xs font-bold">
                Peppsbite Pass Active · {subscription.plan === "annual" ? "Annual Plan" : "Monthly Plan"}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#E8622C] underline">
              Manage →
            </span>
          </div>
        </div>
      ) : null}

      {/* Main Snap Carousel of 3 Promotional Cards */}
      <div className="relative group">
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 scroll-smooth"
        >
          {PROMOTIONS.map((promo, idx) => (
            <div
              key={promo.id}
              className="min-w-full snap-center"
            >
              <div
                onClick={() => navigate(promo.categorySlug)}
                className="relative block cursor-pointer overflow-hidden rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-black/5 transition-all duration-200 active:scale-[0.99] group/card"
              >
                {/* Background Image & Layered Gradient */}
                <div className="absolute inset-0">
                  <img
                    src={promo.imageUrl}
                    alt={promo.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r ${promo.gradient}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                </div>

                {/* Card Content Overlay */}
                <div className="relative flex flex-col justify-between min-h-[190px] p-5 sm:p-6 text-white">
                  {/* Badge Row */}
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 border border-white/20 shadow-xs">
                      <span className="text-xs">{promo.emoji}</span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-white">
                        {promo.badgeLabel}
                      </span>
                      <span className="text-white/40">·</span>
                      <span className="text-[10px] font-black text-amber-300">
                        {promo.badgeDiscount}
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold text-white/60 bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-full">
                      {idx + 1} of {PROMOTIONS.length}
                    </span>
                  </div>

                  {/* Headline & Body */}
                  <div className="mt-4">
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight text-white drop-shadow-xs">
                      {promo.title}
                    </h2>
                    <p className="mt-1.5 max-w-[260px] text-xs text-white/90 leading-relaxed line-clamp-2 drop-shadow-xs">
                      {promo.subtitle}
                    </p>

                    {/* Action button */}
                    <div className="mt-4 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-neutral-950 shadow-md hover:bg-neutral-100 transition-all active:scale-95">
                        {promo.cta}
                        <span className="text-neutral-500 font-bold transition-transform group-hover/card:translate-x-0.5">
                          →
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pill Progress Indicators */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {PROMOTIONS.map((promo, i) => (
          <button
            key={promo.id}
            type="button"
            aria-label={`Go to promotion ${i + 1}: ${promo.title}`}
            onClick={() => scrollToSlide(i)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              active === i
                ? "w-7 bg-neutral-900 shadow-xs"
                : "w-2 bg-neutral-300 hover:bg-neutral-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
