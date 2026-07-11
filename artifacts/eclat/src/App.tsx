import { useState, useEffect, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { StoreDataProvider } from "@/context/StoreDataContext";
import { hasAdminRecoveryRedirect } from "@/lib/supabase";
import { lazyWithRetry } from "@/lib/appLifecycle";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { AppErrorBoundary } from "@/components/system/AppErrorBoundary";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import BottomNav from "@/components/layout/BottomNav";
const AdminPanel = lazyWithRetry(() => import("@/pages/admin/AdminPanel").then(m => ({ default: m.AdminPanel })));

import Home from "@/pages/Home";
const Shop = lazyWithRetry(() => import("@/pages/Shop"));
const ProductDetail = lazyWithRetry(() => import("@/pages/ProductDetail"));
const Collections = lazyWithRetry(() => import("@/pages/Collections"));
const CollectionDetail = lazyWithRetry(() => import("@/pages/CollectionDetail"));
const About = lazyWithRetry(() => import("@/pages/About"));
const Journal = lazyWithRetry(() => import("@/pages/Journal"));
const Contact = lazyWithRetry(() => import("@/pages/Contact"));
const FAQ = lazyWithRetry(() => import("@/pages/FAQ"));
const SizeGuide = lazyWithRetry(() => import("@/pages/SizeGuide"));
const Checkout = lazyWithRetry(() => import("@/pages/Checkout"));
const Profile = lazyWithRetry(() => import("@/pages/Profile"));
const MyOrders = lazyWithRetry(() => import("@/pages/MyOrders"));
const Cart = lazyWithRetry(() => import("@/pages/Cart"));
const OrderConfirmation = lazyWithRetry(() => import("@/pages/OrderConfirmation"));
const OrderDetails = lazyWithRetry(() => import("@/pages/OrderDetails"));
const Referrals = lazyWithRetry(() => import("@/pages/Referrals"));
const InviteLanding = lazyWithRetry(() => import("@/pages/InviteLanding"));
const Wallet = lazyWithRetry(() => import("@/pages/Wallet"));
const NotFound = lazyWithRetry(() => import("@/pages/not-found"));
const TermsOfService = lazyWithRetry(() => import("@/pages/TermsOfService"));
const PrivacyPolicy = lazyWithRetry(() => import("@/pages/PrivacyPolicy"));
const queryClient = new QueryClient();

// Simple loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-[#8E5E4F]/20 border-t-[#8E5E4F] rounded-full animate-spin" />
  </div>
);

function getCleanPathname(pathname = "") {
  const cleanPath = pathname.replace(/\/+$/, "");
  return cleanPath || "/";
}

function getRoutePathname(pathname = "") {
  const cleanPath = getCleanPathname(pathname);
  const configuredBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  const basePaths = [configuredBase, "/thealankarfashion"].filter(
    (basePath) => basePath && basePath !== "/"
  );

  for (const basePath of basePaths) {
    if (cleanPath === basePath) return "/";
    if (cleanPath.startsWith(`${basePath}/`)) {
      return getCleanPathname(cleanPath.slice(basePath.length));
    }
  }

  return cleanPath;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/shop" component={Shop} />
        <Route path="/new-arrivals" component={Shop} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/product/:id" component={ProductDetail} />
        <Route path="/collections" component={Collections} />
        <Route path="/collections/:slug" component={CollectionDetail} />
        <Route path="/about" component={About} />
        <Route path="/journal" component={Journal} />
        <Route path="/contact" component={Contact} />
        <Route path="/faq" component={FAQ} />
        <Route path="/size-guide" component={SizeGuide} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/profile" component={Profile} />
        <Route path="/my-orders" component={MyOrders} />
        <Route path="/order/:id" component={OrderDetails} />
        <Route path="/track/:id" component={OrderDetails} />
        <Route path="/cart" component={Cart} />
        <Route path="/referrals" component={Referrals} />
        <Route path="/invite/:code" component={InviteLanding} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/order-confirmation" component={OrderConfirmation} />
        <Route path="/antomanage" component={AdminPanel} />
        <Route path="/admin/login" component={AdminPanel} />
        <Route path="/admin/forgot-password" component={AdminPanel} />
        <Route path="/admin/reset-password" component={AdminPanel} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useAppLifecycle(queryClient);

  const isAdminLocation = () => {
    const hash = window.location.hash || "";
    const path = getRoutePathname(window.location.pathname || "");
    const search = window.location.search || "";
    const isExplicitAdminRoute =
      hash.startsWith("#/antomanage") ||
      path === "/antomanage" ||
      path === "/admin/login" ||
      path === "/admin/forgot-password" ||
      path === "/admin/reset-password" ||
      search.includes("admin=antomanage") ||
      search.includes("admin-reset=1");

    return (
      isExplicitAdminRoute ||
      (hasAdminRecoveryRedirect() && isExplicitAdminRoute) ||
      (isExplicitAdminRoute &&
        (hash.includes("type=recovery") ||
          hash.includes("access_token=") ||
          hash.includes("refresh_token=") ||
          search.includes("type=recovery")))
    );
  };

  const [isAdmin, setIsAdmin] = useState(() => isAdminLocation());

  useEffect(() => {
    const onLocationChange = () => setIsAdmin(isAdminLocation());
    window.addEventListener("hashchange", onLocationChange);
    window.addEventListener("popstate", onLocationChange);
    return () => {
      window.removeEventListener("hashchange", onLocationChange);
      window.removeEventListener("popstate", onLocationChange);
    };
  }, []);

  useEffect(() => {
    void import("@/lib/orders")
      .then(({ releaseExpiredPaymentPendingOrders }) => releaseExpiredPaymentPendingOrders())
      .catch(console.error);
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StoreDataProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <TooltipProvider>
                  {isAdmin ? (
                    <Suspense fallback={<PageLoader />}>
                      <AdminPanel />
                    </Suspense>
                  ) : (
                    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                      <ScrollToTop />
                      {/* Add pb-16 on mobile to prevent content hiding behind bottom nav */}
                      <div className="pb-16 md:pb-0">
                        <Router />
                      </div>
                      <BottomNav />
                    </WouterRouter>
                  )}
                  <Toaster />
                </TooltipProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </StoreDataProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
