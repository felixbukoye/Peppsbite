import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, Product } from "../types";
import { formatPrice } from "../lib/format";
import { useToast } from "./ToastContext";

const STORAGE_KEY = "peppsbite_cart";
const PROMO_KEY = "peppsbite_promo";
const FREE_DELIVERY_THRESHOLD = 15000; // NGN 15,000
const DELIVERY_FEE = 2500; // NGN 2,500
const VALID_PROMO = "PEPPS20";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  promoCode: string | null;
  discount: number;
  deliveryFee: number;
  total: number;
  amountToFreeDelivery: number;
  applyPromo: (code: string) => boolean;
  removePromo: () => void;
  quantityOf: (productId: number) => number;
  addItem: (product: Product, quantity?: number) => void;
  increment: (productId: number) => void;
  decrement: (productId: number) => void;
  removeItem: (productId: number) => void;
  setQuantity: (product: Product, quantity: number) => void;
  addRawItems: (items: Omit<CartItem, "stockCount">[]) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
      const promo = window.localStorage.getItem(PROMO_KEY);
      if (promo) setPromoCode(promo);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  const quantityOf = useCallback(
    (productId: number) => items.find((i) => i.productId === productId)?.quantity ?? 0,
    [items]
  );

  const addItem = useCallback(
    (product: Product, quantity = 1) => {
      if (!product.inStock) return;
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          const maxStock = product.stockCount || 99;
          const nextQty = Math.min(existing.quantity + quantity, maxStock);
          if (nextQty === existing.quantity) {
            showToast("Maximum quantity reached");
            return prev;
          }
          return prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: nextQty } : i
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            weight: product.weight,
            imageUrl: product.imageUrl,
            quantity: Math.min(quantity, product.stockCount || 99),
            stockCount: product.stockCount || 99,
          },
        ];
      });
      showToast("Added to cart");
    },
    [showToast]
  );

  const increment = useCallback(
    (productId: number) => {
      setItems((prev) =>
        prev.map((i) => {
          if (i.productId !== productId) return i;
          if (i.quantity >= i.stockCount) {
            showToast("Maximum quantity reached");
            return i;
          }
          return { ...i, quantity: i.quantity + 1 };
        })
      );
    },
    [showToast]
  );

  const decrement = useCallback((productId: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeItem = useCallback(
    (productId: number) => {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      showToast("Removed from cart");
    },
    [showToast]
  );

  const setQuantity = useCallback((product: Product, quantity: number) => {
    const clamped = Math.max(0, Math.min(quantity, product.stockCount || 99));
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (clamped === 0) {
        return prev.filter((i) => i.productId !== product.id);
      }
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: clamped } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          weight: product.weight,
          imageUrl: product.imageUrl,
          quantity: clamped,
          stockCount: product.stockCount || 99,
        },
      ];
    });
  }, []);

  const addRawItems = useCallback(
    (newItems: Omit<CartItem, "stockCount">[]) => {
      setItems((prev) => {
        const next = [...prev];
        for (const item of newItems) {
          const existing = next.find((i) => i.productId === item.productId);
          if (existing) {
            next.forEach((i, idx) => {
              if (i.productId === item.productId) {
                next[idx] = { ...i, quantity: i.quantity + item.quantity };
              }
            });
          } else {
            next.push({ ...item, stockCount: 99 });
          }
        }
        return next;
      });
      showToast("Added to cart");
    },
    [showToast]
  );

  const clear = useCallback(() => {
    setItems([]);
    setPromoCode(null);
    try {
      window.localStorage.removeItem(PROMO_KEY);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.price, 0),
    [items]
  );

  const applyPromo = useCallback(
    (code: string) => {
      const normalized = code.trim().toUpperCase();
      if (normalized === VALID_PROMO) {
        setPromoCode(normalized);
        try {
          window.localStorage.setItem(PROMO_KEY, normalized);
        } catch {
          // ignore
        }
        showToast(`Promo code applied! You saved ${formatPrice(subtotal * 0.2)}`);
        return true;
      }
      showToast("This code isn't valid or has expired");
      return false;
    },
    [showToast, subtotal]
  );

  const removePromo = useCallback(() => {
    setPromoCode(null);
    try {
      window.localStorage.removeItem(PROMO_KEY);
    } catch {
      // ignore
    }
  }, []);

  const discount = useMemo(
    () => (promoCode === VALID_PROMO ? Math.round(subtotal * 0.2 * 100) / 100 : 0),
    [promoCode, subtotal]
  );

  const deliveryFee = useMemo(
    () =>
      items.length === 0
        ? 0
        : subtotal - discount >= FREE_DELIVERY_THRESHOLD
        ? 0
        : DELIVERY_FEE,
    [items.length, subtotal, discount]
  );

  const total = useMemo(
    () => Math.max(0, subtotal - discount + deliveryFee),
    [subtotal, discount, deliveryFee]
  );

  const amountToFreeDelivery = useMemo(
    () => Math.max(0, FREE_DELIVERY_THRESHOLD - (subtotal - discount)),
    [subtotal, discount]
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      promoCode,
      discount,
      deliveryFee,
      total,
      amountToFreeDelivery,
      applyPromo,
      removePromo,
      quantityOf,
      addItem,
      increment,
      decrement,
      removeItem,
      setQuantity,
      addRawItems,
      clear,
    }),
    [
      items,
      itemCount,
      subtotal,
      promoCode,
      discount,
      deliveryFee,
      total,
      amountToFreeDelivery,
      applyPromo,
      removePromo,
      quantityOf,
      addItem,
      increment,
      decrement,
      removeItem,
      setQuantity,
      addRawItems,
      clear,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
