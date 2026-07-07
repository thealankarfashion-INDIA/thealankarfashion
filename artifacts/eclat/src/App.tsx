import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { StoreDataProvider } from "@/context/StoreDataContext";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import BottomNav from "@/components/layout/BottomNav";
const AdminPanel = lazy(() => import("@/pages/admin/AdminPanel").then(m => ({ default: m.AdminPanel })));

import Home from "@/pages/Home";
const Shop = lazy(() => import("@/pages/Shop"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const Collections = lazy(() => import("@/pages/Collections"));
const CollectionDetail = lazy(() => import("@/pages/CollectionDetail"));
const About = lazy(() => import("@/pages/About"));
const Journal = lazy(() => import("@/pages/Journal"));
const Contact = lazy(() => import("@/pages/Contact"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const SizeGuide = lazy(() => import("@/pages/SizeGuide"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const Profile = lazy(() => import("@/pages/Profile"));
const MyOrders = lazy(() => import("@/pages/MyOrders"));
const Cart = lazy(() => import("@/pages/Cart"));
const OrderConfirmation = lazy(() => import("@/pages/OrderConfirmation"));
const OrderDetails = lazy(() => import("@/pages/OrderDetails"));
const Referrals = lazy(() => import("@/pages/Referrals"));
const InviteLanding = lazy(() => import("@/pages/InviteLanding"));
const Wallet = lazy(() => import("@/pages/Wallet"));
const NotFound = lazy(() => import("@/pages/not-found"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const queryClient = new QueryClient();

// Simple loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-2 border-[#8E5E4F]/20 border-t-[#8E5E4F] rounded-full animate-spin" />
  </div>
);

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
        <Route path="/admin" component={AdminPanel} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash.startsWith("#/admin"));

  useEffect(() => {
    const onHash = () => setIsAdmin(window.location.hash.startsWith("#/admin"));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
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
  );
}

export default App;
