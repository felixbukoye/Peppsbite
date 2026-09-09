export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  categoryLabel: string;
  collections: string[];
  brand: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  weight: string;
  imageUrl: string;
  inStock: boolean;
  stockCount: number;
  tags: string[];
  rating: number;
};

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  price: number;
  weight: string;
  imageUrl: string;
  quantity: number;
  stockCount: number;
};

export type OrderStatus =
  | "confirmed"
  | "preparing"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export type OrderItemDTO = {
  id: number;
  productId: number | null;
  slug: string;
  name: string;
  weight: string;
  imageUrl: string;
  price: number;
  quantity: number;
};

export type OrderDTO = {
  id: number;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryTime: string;
  deliveryInstructions: string;
  paymentMethod: string;
  promoCode: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  createdAt: string;
  items: OrderItemDTO[];
};

export type SubscriptionDTO = {
  plan: "monthly" | "annual" | null;
  status: "active" | "none";
  startedAt: string | null;
};
