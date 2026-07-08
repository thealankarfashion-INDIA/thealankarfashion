const prefetchedRoutes = new Set<string>();

const routeLoaders = [
  {
    match: (href: string) => href === "/shop" || href === "/new-arrivals" || href.startsWith("/shop?"),
    load: () => import("@/pages/Shop"),
  },
  {
    match: (href: string) => href.startsWith("/products/") || href.startsWith("/product/"),
    load: () => import("@/pages/ProductDetail"),
  },
  {
    match: (href: string) => href === "/collections" || href.startsWith("/collections?"),
    load: () => import("@/pages/Collections"),
  },
  {
    match: (href: string) => href.startsWith("/collections/"),
    load: () => import("@/pages/CollectionDetail"),
  },
  {
    match: (href: string) => href === "/about",
    load: () => import("@/pages/About"),
  },
  {
    match: (href: string) => href === "/contact",
    load: () => import("@/pages/Contact"),
  },
  {
    match: (href: string) => href === "/faq",
    load: () => import("@/pages/FAQ"),
  },
  {
    match: (href: string) => href === "/size-guide",
    load: () => import("@/pages/SizeGuide"),
  },
  {
    match: (href: string) => href === "/checkout" || href.startsWith("/checkout?"),
    load: () => import("@/pages/Checkout"),
  },
  {
    match: (href: string) => href === "/profile" || href.startsWith("/profile?"),
    load: () => import("@/pages/Profile"),
  },
  {
    match: (href: string) => href === "/my-orders",
    load: () => import("@/pages/MyOrders"),
  },
  {
    match: (href: string) => href.startsWith("/order/") || href.startsWith("/track/"),
    load: () => import("@/pages/OrderDetails"),
  },
  {
    match: (href: string) => href === "/cart",
    load: () => import("@/pages/Cart"),
  },
  {
    match: (href: string) => href === "/wallet",
    load: () => import("@/pages/Wallet"),
  },
];

export function prefetchRoute(href: string) {
  const normalizedHref = href.trim();
  if (!normalizedHref || prefetchedRoutes.has(normalizedHref)) {
    return;
  }

  const routeLoader = routeLoaders.find((loader) => loader.match(normalizedHref));
  if (!routeLoader) {
    return;
  }

  prefetchedRoutes.add(normalizedHref);
  void routeLoader.load().catch(() => {
    prefetchedRoutes.delete(normalizedHref);
  });
}

export function prefetchLinkProps(href: string) {
  return {
    onMouseEnter: () => prefetchRoute(href),
    onTouchStart: () => prefetchRoute(href),
  };
}

export function warmCommonRoutes() {
  const commonRoutes = ["/shop", "/collections", "/profile", "/cart", "/about"];
  commonRoutes.forEach(prefetchRoute);
}
