import React, { useEffect, useMemo, useState } from "react";
import { INITIAL_PRODUCTS } from "../data/products";
import { formatPrice } from "../lib/format";
import { BackHeader } from "./BackHeader";
import { CategorySection } from "./CategorySection";
import { EmptyState } from "./EmptyState";
import { MinusIcon, PlusIcon, HeartIcon, ShareIcon, StarIcon } from "./icons";
import { useCart } from "../context/CartContext";
import { useOrders } from "../context/OrderContext";
import { useToast } from "../context/ToastContext";
import { addRecentlyViewed } from "./RecentlyViewed";

export function ProductDetailPage({ slug }: { slug: string }) {
  const product = INITIAL_PRODUCTS.find((p) => p.slug === slug);
  const { quantityOf, setQuantity } = useCart();
  const { toggleWishlist, isWishlisted } = useOrders();
  const { showToast } = useToast();

  useEffect(() => {
    if (slug) {
      addRecentlyViewed(slug);
    }
  }, [slug]);

  const inCartQty = product ? quantityOf(product.id) : 0;
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (inCartQty > 0) {
      setQty(inCartQty);
    }
  }, [inCartQty]);

  const similar = useMemo(() => {
    if (!product) return [];
    return INITIAL_PRODUCTS.filter(
      (p) => p.category === product.category && p.id !== product.id
    ).slice(0, 6);
  }, [product]);

  if (!product) {
    return (
      <div className="pb-6">
        <BackHeader title="Product" fallbackHref="/" />
        <EmptyState
          icon="🥫"
          headline="Product not found"
          subtext="This item may have been moved or is no longer available"
          ctaLabel="Back to store"
          ctaHref="/"
        />
      </div>
    );
  }

  const saved = isWishlisted(product.slug);
  const lineTotal = qty * product.price;

  const handlePrimary = () => {
    if (!product.inStock) {
      showToast("We will notify you when back in stock");
      return;
    }
    setQuantity(product, qty);
    showToast(inCartQty > 0 ? "Cart updated" : `Added ${qty} to cart`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard");
      }
    } catch {
      // user cancelled share
    }
  };

  return (
    <div className="pb-8 animate-[fadeIn_0.2s_ease-out]">
      <BackHeader title={product.categoryLabel} fallbackHref="/" />

      <div className="relative mx-4 mt-4 aspect-square overflow-hidden rounded-3xl bg-neutral-100 shadow-md">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover"
        />
        {product.discountPercent ? (
          <span className="absolute left-3 top-3 rounded-lg bg-[#E8622C] px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            {product.discountPercent}% off
          </span>
        ) : null}
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-xs px-2.5 py-1 shadow-sm text-xs font-bold text-neutral-800">
          <StarIcon className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          <span>{product.rating}</span>
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold leading-snug text-neutral-900">
              {product.name}
            </h1>
            <p className="mt-1 text-sm font-medium text-neutral-500">
              {product.brand ? `${product.brand} · ` : ""}
              {product.weight}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              aria-label="Save for later"
              title="Save for later"
              onClick={() => toggleWishlist(product.slug)}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors shadow-xs ${
                saved
                  ? "bg-[#E8622C] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <HeartIcon className="h-4 w-4 fill-current" />
            </button>
            <button
              type="button"
              aria-label="Share this item"
              title="Share this item"
              onClick={handleShare}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors shadow-xs"
            >
              <ShareIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3.5 flex items-center gap-2">
          <span className="text-2xl font-extrabold text-[#E8622C]">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice ? (
            <span className="text-sm text-neutral-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          ) : null}
          {product.discountPercent ? (
            <span className="rounded-md bg-[#E8622C]/10 px-2 py-0.5 text-xs font-bold text-[#E8622C]">
              Save {product.discountPercent}%
            </span>
          ) : null}
        </div>

        {!product.inStock ? (
          <p className="mt-3 rounded-2xl bg-neutral-100 px-3.5 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200">
            Out of stock — we&apos;ll notify you when restocked.
          </p>
        ) : product.stockCount <= 5 ? (
          <p className="mt-3 text-sm font-semibold text-[#E8622C]">
            Only {product.stockCount} left in stock!
          </p>
        ) : null}

        <div className="mt-6">
          <h2 className="text-sm font-bold text-neutral-900">About this item</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
            {product.description}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm font-bold text-neutral-900">Quantity</span>
          <div className="flex items-center gap-3 rounded-full bg-neutral-100 px-2 py-1.5 border border-neutral-200/60">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={!product.inStock}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm disabled:opacity-40 hover:bg-neutral-50 transition-colors"
            >
              <MinusIcon className="h-3.5 w-3.5 text-neutral-800" />
            </button>
            <span className="min-w-[20px] text-center text-sm font-bold text-neutral-900">
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={!product.inStock || qty >= product.stockCount}
              onClick={() => {
                if (qty >= product.stockCount) {
                  showToast("Maximum quantity reached");
                  return;
                }
                setQty((q) => q + 1);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm disabled:opacity-40 hover:bg-neutral-50 transition-colors"
            >
              <PlusIcon className="h-3.5 w-3.5 text-neutral-800" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrimary}
          disabled={!product.inStock}
          className="mt-6 w-full rounded-full bg-black py-4 text-sm font-bold text-white shadow-lg disabled:bg-neutral-300 hover:bg-neutral-800 transition-colors active:scale-98"
        >
          {!product.inStock
            ? "Notify me when available"
            : inCartQty > 0
            ? "Update cart"
            : `Add to cart · ${formatPrice(lineTotal)}`}
        </button>
      </div>

      <div className="mt-4">
        <CategorySection title="You might also like" products={similar} />
      </div>
    </div>
  );
}
