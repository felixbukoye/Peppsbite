import React from "react";
import { ToastProvider } from "./context/ToastContext";
import { LocationProvider } from "./context/LocationContext";
import { CartProvider } from "./context/CartContext";
import { OrderProvider } from "./context/OrderContext";
import { NavigationProvider, useNavigation } from "./context/NavigationContext";
import { CartBar } from "./components/CartBar";
import { BottomNav, isDirectNavPage } from "./components/BottomNav";
import { HomePage } from "./components/HomePage";
import { SearchPage } from "./components/SearchPage";
import { CartPage } from "./components/CartPage";
import { CheckoutPage } from "./components/CheckoutPage";
import { ConfirmationPage } from "./components/ConfirmationPage";
import { PurchasesPage } from "./components/PurchasesPage";
import { OrderDetailPage } from "./components/OrderDetailPage";
import { ProductDetailPage } from "./components/ProductDetailPage";
import { CategoryPage } from "./components/CategoryPage";
import { PlansPage } from "./components/PlansPage";

function AppContent() {
  const { pathname } = useNavigation();

  const renderCurrentView = () => {
    // Normalization
    const path = pathname.startsWith("/") ? pathname : `/${pathname}`;

    if (path === "/" || path === "") {
      return <HomePage />;
    }

    if (path.startsWith("/search")) {
      return <SearchPage />;
    }

    if (path === "/cart" || path.startsWith("/cart")) {
      return <CartPage />;
    }

    if (path === "/checkout") {
      return <CheckoutPage />;
    }

    if (path.startsWith("/checkout/confirmation/")) {
      const id = path.replace("/checkout/confirmation/", "").split("/")[0];
      return <ConfirmationPage id={id} />;
    }

    if (path === "/purchases" || path === "/purchases/") {
      return <PurchasesPage />;
    }

    if (path.startsWith("/purchases/")) {
      const id = path.replace("/purchases/", "").split("/")[0];
      return <OrderDetailPage id={id} />;
    }

    if (path.startsWith("/product/")) {
      const slug = path.replace("/product/", "").split("/")[0];
      return <ProductDetailPage slug={slug} />;
    }

    if (path.startsWith("/category/")) {
      const slug = path.replace("/category/", "").split("/")[0];
      return <CategoryPage slug={slug} />;
    }

    if (path === "/plans" || path.startsWith("/plans")) {
      return <PlansPage />;
    }

    // Default fallback
    return <HomePage />;
  };

  const showBottomNav = isDirectNavPage(pathname);

  return (
    <div className="min-h-screen bg-neutral-200 flex justify-center selection:bg-[#E8622C] selection:text-white">
      <main
        className={`relative min-h-screen w-full max-w-md bg-[#FAFAFA] ${
          showBottomNav ? "pb-24" : "pb-8"
        } shadow-[0_0_60px_rgba(0,0,0,0.08)] overflow-x-hidden`}
      >
        {renderCurrentView()}
        <CartBar />
        {showBottomNav ? <BottomNav /> : null}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <LocationProvider>
        <CartProvider>
          <OrderProvider>
            <NavigationProvider>
              <AppContent />
            </NavigationProvider>
          </OrderProvider>
        </CartProvider>
      </LocationProvider>
    </ToastProvider>
  );
}
