import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OrderDTO, SubscriptionDTO } from "../types";
import { deriveStatus } from "../lib/format";
import { useToast } from "./ToastContext";

const ORDERS_KEY = "peppsbite_orders";
const SUBSCRIPTION_KEY = "peppsbite_subscription";
const WISHLIST_KEY = "peppsbite_wishlist";

type OrderContextValue = {
  orders: OrderDTO[];
  subscription: SubscriptionDTO;
  wishlist: string[];
  toggleWishlist: (slug: string) => boolean;
  isWishlisted: (slug: string) => boolean;
  createOrder: (payload: {
    items: OrderDTO["items"];
    deliveryAddress: string;
    deliveryTime: string;
    deliveryInstructions: string;
    paymentMethod: string;
    promoCode: string | null;
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
  }) => OrderDTO;
  getOrder: (id: number) => OrderDTO | undefined;
  updateSubscription: (plan: "monthly" | "annual") => void;
  cancelSubscription: () => void;
};

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDTO>({
    plan: null,
    status: "none",
    startedAt: null,
  });
  const [wishlist, setWishlist] = useState<string[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    try {
      const storedOrders = window.localStorage.getItem(ORDERS_KEY);
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      }
      const storedSub = window.localStorage.getItem(SUBSCRIPTION_KEY);
      if (storedSub) {
        setSubscription(JSON.parse(storedSub));
      }
      const storedWishlist = window.localStorage.getItem(WISHLIST_KEY);
      if (storedWishlist) {
        setWishlist(JSON.parse(storedWishlist));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveOrders = (updated: OrderDTO[]) => {
    setOrders(updated);
    try {
      window.localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const createOrder = useCallback(
    (payload: {
      items: OrderDTO["items"];
      deliveryAddress: string;
      deliveryTime: string;
      deliveryInstructions: string;
      paymentMethod: string;
      promoCode: string | null;
      subtotal: number;
      deliveryFee: number;
      discount: number;
      total: number;
    }): OrderDTO => {
      const newId = Date.now() % 1000000;
      const newOrder: OrderDTO = {
        id: newId,
        status: "confirmed",
        deliveryAddress: payload.deliveryAddress,
        deliveryTime: payload.deliveryTime,
        deliveryInstructions: payload.deliveryInstructions,
        paymentMethod: payload.paymentMethod,
        promoCode: payload.promoCode,
        subtotal: payload.subtotal,
        deliveryFee: payload.deliveryFee,
        discount: payload.discount,
        total: payload.total,
        createdAt: new Date().toISOString(),
        items: payload.items,
      };

      setOrders((prev) => {
        const next = [newOrder, ...prev];
        try {
          window.localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });

      return newOrder;
    },
    []
  );

  const getOrder = useCallback(
    (id: number): OrderDTO | undefined => {
      const order = orders.find((o) => o.id === id);
      if (!order) return undefined;
      return {
        ...order,
        status: deriveStatus(order.createdAt, order.status),
      };
    },
    [orders]
  );

  // Computed orders with live derived status
  const liveOrders = useMemo(() => {
    return orders.map((o) => ({
      ...o,
      status: deriveStatus(o.createdAt, o.status),
    }));
  }, [orders]);

  const updateSubscription = useCallback(
    (plan: "monthly" | "annual") => {
      const next: SubscriptionDTO = {
        plan,
        status: "active",
        startedAt: new Date().toISOString(),
      };
      setSubscription(next);
      try {
        window.localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      showToast(`Welcome to Peppsbite ${plan === "annual" ? "Annual" : "Monthly"} Plan!`);
    },
    [showToast]
  );

  const cancelSubscription = useCallback(() => {
    const next: SubscriptionDTO = {
      plan: null,
      status: "none",
      startedAt: null,
    };
    setSubscription(next);
    try {
      window.localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    showToast("Subscription cancelled");
  }, [showToast]);

  const toggleWishlist = useCallback(
    (slug: string) => {
      let isAdded = false;
      setWishlist((prev) => {
        let next: string[];
        if (prev.includes(slug)) {
          next = prev.filter((s) => s !== slug);
          isAdded = false;
        } else {
          next = [...prev, slug];
          isAdded = true;
        }
        try {
          window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      showToast(isAdded ? "Saved to wishlist" : "Removed from wishlist");
      return isAdded;
    },
    [showToast]
  );

  const isWishlisted = useCallback((slug: string) => wishlist.includes(slug), [wishlist]);

  const value = useMemo(
    () => ({
      orders: liveOrders,
      subscription,
      wishlist,
      toggleWishlist,
      isWishlisted,
      createOrder,
      getOrder,
      updateSubscription,
      cancelSubscription,
    }),
    [
      liveOrders,
      subscription,
      wishlist,
      toggleWishlist,
      isWishlisted,
      createOrder,
      getOrder,
      updateSubscription,
      cancelSubscription,
    ]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrders must be used within OrderProvider");
  return ctx;
}
