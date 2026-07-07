import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ChevronDown, Heart, ShoppingBag, Menu, X, MapPin,
  Home as HomeIcon, PlaySquare, PercentSquare, User as UserIcon, ShoppingCart, Sparkles
} from 'lucide-react';

import { lazy, Suspense } from 'react';
import { useCart } from '@/context/CartContext';
import useStoreCategories from '@/hooks/useStoreCategories';
import useStoreProducts from '@/hooks/useStoreProducts';
import ShopByCategory from '@/components/home/ShopByCategory';
import ShopByBrand from '@/components/home/ShopByBrand';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import useStoreOffers from '@/hooks/useStoreOffers';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { HomePageSkeleton } from '@/components/ui/SkeletonLoaders';
import FAQSection from '@/components/home/FAQSection';
import SearchBar from '@/components/search/SearchBar';

// Lazy-load framer-motion heavy components not needed on initial paint
const CartDrawer = lazy(() => import('@/components/layout/CartDrawer'));
const AnnouncementBar = lazy(() => import('@/components/home/AnnouncementBar'));

// Deferred component wrapper to reduce initial CPU busy time
const DeferredRender = ({ children }: { children: React.ReactNode }) => {
  const [shouldRender, setShouldRender] = useState(() => {
    // If the user has already visited the home page in this session, render immediately 
    // to preserve scroll restoration when navigating back from a product page.
    try {
      return sessionStorage.getItem('home_visited') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!shouldRender) {
      // Wait until main thread is idle or 1.5 seconds have passed
      const timer = setTimeout(() => {
        setShouldRender(true);
        try {
          sessionStorage.setItem('home_visited', 'true');
        } catch { }
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [shouldRender]);

  return shouldRender ? <>{children}</> : null;
};



// 1. App Header Component (Mobile Only)
const AppHeader = () => {
  const [_, setLocation] = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`sticky top-0 z-40 md:hidden transition-all duration-500 ${isScrolled ? 'bg-[#F2EBE7]' : 'bg-transparent'}`}>
      <Suspense fallback={null}><AnnouncementBar /></Suspense>
      <div className={`w-full px-4 py-3 flex flex-col gap-3 transition-all duration-500 ${isScrolled ? 'border-b border-[#DCD0C0]/50 shadow-[0_2px_10px_rgba(142,94,79,0.05)]' : 'border-b border-transparent'}`}>

        {/* Top Row: Hamburger, Logo, Icons */}
        <div className="relative flex items-center justify-between h-[44px]">
          {/* Left: Hamburger */}
          <div className="flex items-center gap-2 relative z-10">
            <button className="flex items-center gap-2 text-[#333333]" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <div className="flex flex-col gap-1.5">
                <span className="w-5 h-[1px] bg-[#333333]"></span>
                <span className="w-5 h-[1px] bg-[#333333]"></span>
              </div>
              <span className="text-[10px] font-medium tracking-widest uppercase mt-0.5">Menu</span>
            </button>
          </div>

          {/* Center: Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-full max-w-[150px]">
            <Link href="/">
              <span className="font-serif text-[28px] italic tracking-wider text-[#C59B62] truncate">
                Thealankar
              </span>
            </Link>
          </div>

          {/* Right: Icons */}
          <div className="flex items-center gap-4 relative z-10">
            <Link href="/profile?tab=wishlist" className="hover:opacity-80 transition-opacity">
              <Heart className="w-[22px] h-[22px] text-[#333333]" strokeWidth={1.5} />
            </Link>
            <button onClick={() => setIsCartOpen(true)} className="relative hover:opacity-80 transition-opacity">
              <ShoppingBag className="w-[22px] h-[22px] text-[#333333]" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#CF6B8D] text-white text-[9px] font-bold w-[16px] h-[16px] rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search & Address Bar */}
        <div className="flex items-center gap-3">
          {/* Deliver To Address Link */}
          <Link href="/profile?tab=addresses" className="flex items-center gap-1 text-[#333333] text-[10px] font-medium shrink-0 hover:opacity-70 transition-opacity">
            <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="flex items-center">
              DELIVER TO
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </span>
          </Link>

          {/* Search Bar */}
          <SearchBar
            variant="home"
            placeholder="Search earrings, necklaces…"
            className="flex-1"
          />
        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <>
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ animation: 'menuFadeIn 0.25s ease forwards' }}
            className="fixed inset-0 bg-black/40 z-[100]"
          />
          <div
            style={{ animation: 'menuSlideIn 0.3s ease forwards' }}
            className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-[#FDF9F3] z-[110] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E8D8D1]">
              <span className="font-serif text-2xl italic tracking-wider text-[#C59B62]">
                Thealankar
              </span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-[#333333] hover:opacity-70">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <div className="flex flex-col">
                {[
                  { name: 'NEW ARRIVALS', href: '/new-arrivals' },
                  { name: 'SHOP ALL', href: '/shop' },
                  { name: 'COLLECTIONS', href: '/collections' },
                  { name: 'MAISON', href: '/about' }
                ].map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-6 py-4 text-xs font-bold tracking-[0.15em] uppercase text-[#333333] border-b border-[#E8D8D1]/40 hover:bg-white transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              <div className="px-6 py-8 mt-4 bg-[#F7EFE5]/50 border-t border-[#E8D8D1]">
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-semibold tracking-wide text-[#8E5E4F] mb-6">
                  <UserIcon className="w-5 h-5" strokeWidth={1.5} />
                  My Account
                </Link>
                <Link href="/profile?tab=orders" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-semibold tracking-wide text-[#8E5E4F]">
                  <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                  My Orders
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// 2. Category Strip Component
const CategoryStrip = () => {
  const { categories, loading } = useStoreCategories();

  const displayCategories = categories || [];


  return (
    <div className="bg-white pt-4 pb-3 overflow-x-auto hide-scrollbar border-b border-[#E8D8D1]/50 relative z-30">
      <div className="flex gap-5 md:gap-10 px-4 md:px-8 min-w-max max-w-md md:max-w-7xl mx-auto md:justify-center">
        {displayCategories.map((cat, i) => (
          <Link href={`/shop?category=${cat.id}`} key={cat.id || i} className="flex flex-col items-center gap-2 min-w-[76px] md:min-w-[84px] relative cursor-pointer group text-[#8E5E4F] hover:text-[#B47A67] transition-colors">
            <div className="w-[60px] h-[60px] md:w-[72px] md:h-[72px] flex items-center justify-center rounded-[20px] md:rounded-[24px] overflow-hidden bg-[#F7F1EE] group-hover:bg-[#E8D8D1]/50 transition-all border border-[#E8D8D1]/40 relative shadow-sm group-hover:shadow-md">
              {loading && <div className="absolute inset-0 bg-[#E8D8D1]/50 animate-pulse" />}
              {cat.image ? (
                <img src={cat.image} alt={cat.name} loading="lazy" decoding="async" className="w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-[#B47A67]" />
              )}
            </div>
            <span className="text-[11px] md:text-[13px] font-semibold tracking-tight text-center leading-tight line-clamp-2 px-1 max-w-[80px] md:max-w-[100px]">{cat.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// 3. Hero Banner Component
const HeroBanner = () => {
  const { offers, loading } = useStoreOffers();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000, stopOnInteraction: false })]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => setCurrent(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  const displayOffers = offers || [];


  return (
    <div className="px-3 pt-4 max-w-md md:max-w-7xl mx-auto bg-white">
      <div className="relative rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-[#E8D8D1]/50" ref={emblaRef}>
        <div className="flex">
          {displayOffers.map((offer) => (
            <Link href={offer.link || "/shop"} key={offer.id} className="flex-none w-full relative aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/9] bg-gradient-to-r from-[#F7F1EE] to-[#E8D8D1] flex items-center cursor-pointer">
              <div className="w-1/2 md:w-1/3 pl-5 md:pl-16 z-20">
                {offer.badge && (
                  <div className="bg-gradient-to-r from-[#D4AF37] to-[#B47A67] text-white text-[9px] md:text-xs tracking-wider font-bold px-2 md:px-4 py-0.5 md:py-1 rounded shadow-sm inline-flex items-center gap-1 mb-2 md:mb-4 uppercase">
                    <Sparkles className="w-2.5 h-2.5 md:w-4 md:h-4" /> {offer.badge}
                  </div>
                )}
                <div className="bg-white px-2 py-1 md:px-4 md:py-2 rounded inline-block shadow-sm mb-2 md:mb-4 border border-[#E8D8D1]">
                  <span className="font-serif italic font-bold text-[#8E5E4F] text-xs md:text-sm">Thealankar</span>
                </div>
                <h2 className="text-sm sm:text-base md:text-3xl font-medium text-[#8E5E4F] leading-tight mb-1 md:mb-3 line-clamp-2">{offer.title}</h2>
                {offer.subtitle && <div className="text-lg sm:text-2xl md:text-5xl font-black text-[#8E5E4F] tracking-tight">{offer.subtitle}</div>}
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-[55%] md:w-[65%]">
                {loading && <div className="absolute inset-0 bg-[#E8D8D1]/50 animate-pulse" />}
                <img
                  src={offer.image}
                  alt={offer.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-top"
                  style={{ maskImage: 'linear-gradient(to right, transparent, black 40%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 40%)' }}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-1.5 mt-3 mb-2">
        {displayOffers.map((_, i) => (
          <div key={i} onClick={() => emblaApi?.scrollTo(i)} className={`h-1.5 rounded-full transition-all cursor-pointer ${i === current ? 'w-4 bg-[#8E5E4F]' : 'w-1.5 bg-[#E8D8D1]'}`} />
        ))}
      </div>
    </div>
  );
}

// 4. Sub Category Grid
const SubCategoryGrid = () => {
  const { categories, loading } = useStoreCategories();

  const items = categories && categories.length > 0
    ? categories.slice(0, 4).map((cat) => ({
      name: cat.name,
      img: cat.image || "",
      link: `/shop?category=${cat.id}`
    }))
    : [];

  return (
    <div className="bg-[#FCE8F0] py-8 px-4 md:py-10 md:px-10 overflow-hidden">
      {/* Mobile: title at top, then horizontally swipeable staggered cards */}
      <div className="md:hidden">
        <div className="mb-5">
          <p className="text-[#C06080] font-semibold text-base leading-snug">This Season's</p>
          <p className="text-[#C06080] font-semibold text-base">
            Signature <span className="font-serif italic text-xl text-[#C06080]">Collection</span>
          </p>
        </div>
        {/* Horizontal swipeable row with stagger: odd cards higher, even cards lower */}
        <div className="flex gap-3 overflow-x-auto hide-scrollbar items-start pb-4 -mx-4 px-4">
          {items.map((item, i) => (
            <a
              href={item.link}
              key={i}
              className={`relative flex-none w-[46vw] max-w-[180px] rounded-2xl overflow-hidden block group shadow-sm aspect-[3/4] ${i % 2 === 0 ? 'mt-6' : 'mt-0'}`}
            >
              {loading ? (
                <div className="w-full h-full bg-[#E8D0D8] animate-pulse rounded-2xl" />
              ) : (
                <>
                  <img src={item.img} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-white font-serif italic text-sm leading-tight">{item.name}</p>
                  </div>
                </>
              )}
            </a>
          ))}
        </div>
      </div>


      {/* Desktop: title on left, 4 staggered cards in a row */}
      <div className="hidden md:flex items-start gap-5 max-w-7xl mx-auto">
        {/* Title */}
        <div className="flex-shrink-0 flex flex-col justify-center w-36 lg:w-48 mt-8">
          <p className="text-[#C06080] font-semibold text-xl lg:text-2xl leading-snug">This Season's</p>
          <p className="text-[#C06080] font-semibold text-xl lg:text-2xl">
            Signature <span className="font-serif italic text-2xl lg:text-3xl text-[#C06080]">Collection</span>
          </p>
        </div>
        {/* Cards: alternating up/down stagger */}
        <div className="flex flex-1 gap-4 items-start pb-6">
          {items.map((item, i) => (
            <a
              href={item.link}
              key={i}
              className={`relative flex-1 rounded-2xl overflow-hidden block group shadow-md hover:shadow-xl transition-all duration-300 aspect-[2/3] ${i % 2 === 0 ? 'mt-6' : 'mt-0'}`}
            >
              {loading ? (
                <div className="w-full h-full bg-[#E8D0D8] animate-pulse" />
              ) : (
                <>
                  <img src={item.img} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-white font-serif italic text-base leading-tight">{item.name}</p>
                  </div>
                </>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// 5. Loved Ones Component
const LovedOnes = () => {
  const { products, loading } = useStoreProducts();
  const cards = products.filter(p => p.images && p.images.length > 0).slice(0, 5).map((p, i) => ({
    id: p.id,
    img: p.images[0],
    bg: ['bg-[#F2F8FB]', 'bg-[#FDF6E3]', 'bg-[#EAF5F2]', 'bg-[#F9F0F4]', 'bg-[#F0F4F8]'][i % 5]
  }));

  if (cards.length === 0) return null;


  return (
    <div className="px-3 pb-8 pt-2 max-w-md md:max-w-7xl mx-auto bg-white">
      <h3 className="font-black text-lg md:text-2xl text-[#8E5E4F] mb-4 tracking-tight">Shop for Loved Ones</h3>
      <div className="flex gap-3 md:gap-6 overflow-x-auto hide-scrollbar pb-2 -mx-3 px-3 md:mx-0 md:px-0">
        {cards.map((card, i) => (
          <Link href={`/product/${card.id}`} key={card.id || i} className={`min-w-[130px] md:min-w-[200px] w-[140px] md:w-[220px] rounded-[16px] md:rounded-[24px] overflow-hidden ${card.bg} relative aspect-[3/4] flex-shrink-0 cursor-pointer shadow-sm border border-[#E8D8D1]/30 hover:shadow-md transition-all group`}>
            {loading && <div className="absolute inset-0 bg-[#E8D8D1]/50 animate-pulse" />}
            <img src={card.img} alt="Gift" loading="lazy" decoding="async" className="w-full h-full object-cover object-top mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-700" />
            {i === 2 && !loading && (
              <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-[#1BCC7B] text-white text-[10px] md:text-sm font-bold px-2 py-0.5 md:px-3 md:py-1 rounded shadow-sm tracking-wider">
                Thealankar
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// 6. Bottom Navigation Component (Mobile Only)
const BottomNav = () => {
  const [location] = useLocation();
  const { items, isCartOpen, setIsCartOpen } = useCart();
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="fixed sm:absolute bottom-0 left-0 right-0 bg-white border-t border-[#E8D8D1] flex justify-around items-center pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] z-50 shadow-[0_-4px_20px_rgba(142,94,79,0.05)] md:hidden">
      <Link href="/" className={`flex flex-col items-center gap-1 ${location === '/' ? 'text-[#B47A67]' : 'text-[#8E5E4F]/60'}`}>
        <HomeIcon className="w-6 h-6" fill={location === '/' ? 'currentColor' : 'none'} strokeWidth={location === '/' ? 2 : 1.5} />
        <span className="text-[10px] font-bold">Home</span>
      </Link>
      <Link href="/play" className="flex flex-col items-center gap-1 text-[#8E5E4F]/60 hover:text-[#B47A67]">
        <PlaySquare className="w-6 h-6" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">Play</span>
      </Link>
      <Link href="/deals" className="flex flex-col items-center gap-1 text-[#8E5E4F]/60 hover:text-[#B47A67]">
        <PercentSquare className="w-6 h-6" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">Top Deals</span>
      </Link>
      <Link href="/profile" className={`flex flex-col items-center gap-1 ${location === '/profile' ? 'text-[#B47A67]' : 'text-[#8E5E4F]/60'}`}>
        <UserIcon className="w-6 h-6" fill={location === '/profile' ? 'currentColor' : 'none'} strokeWidth={location === '/profile' ? 2 : 1.5} />
        <span className="text-[10px] font-medium">Account</span>
      </Link>
      <button onClick={() => setIsCartOpen(true)} className={`flex flex-col items-center gap-1 relative ${isCartOpen ? 'text-[#B47A67]' : 'text-[#8E5E4F]/60'}`}>
        <div className="relative">
          <ShoppingCart className="w-6 h-6" fill={isCartOpen ? 'currentColor' : 'none'} strokeWidth={isCartOpen ? 2 : 1.5} />
          {cartCount > 0 && (
            <div className="absolute -top-1.5 -right-2 bg-[#F05A61] text-white text-[9px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center border border-white shadow-sm">
              {cartCount}
            </div>
          )}
        </div>
        <span className="text-[10px] font-medium">Cart</span>
      </button>
    </div>
  );
};

import { MainBannerSlider } from '@/components/home/MainBannerSlider';
import SEO from '@/components/seo/SEO';

// Main Export
export default function Home() {
  const { loading: categoriesLoading } = useStoreCategories();
  const { loading: offersLoading } = useStoreOffers();

  // Only skeleton the main content area — shell renders immediately to reduce LCP delay
  const isLoading = categoriesLoading || offersLoading;

  return (
    <>
      <SEO />
      {/* Skip-to-content link for keyboard/screen reader accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-[#8E5E4F] focus:font-semibold focus:rounded focus:shadow-lg"
      >
        Skip to main content
      </a>
      <div className="min-h-[100dvh] bg-[#F7F1EE] flex flex-col md:bg-white">
        <div className="hidden md:block">
          <Navbar />
        </div>

        {/* Main Content: skeleton only wraps the content area, not the shell */}
        <main id="main-content" className="flex-1 w-full bg-white relative pb-20 md:pb-0 md:pt-[168px]">
          <AppHeader />

          {isLoading ? (
            <HomePageSkeleton />
          ) : (
            <>
              <MainBannerSlider />

              <div className="w-full h-4 md:h-6 bg-white" />
              <SubCategoryGrid />

              {/* Defer below-the-fold sections to prioritize Hero and Categories */}
              <DeferredRender>
                <div className="mx-4 h-[1px] bg-gradient-to-r from-transparent via-[#E8D8D1] to-transparent md:hidden my-4 opacity-70" />
                <LovedOnes />
                <div className="mx-4 h-[1px] bg-gradient-to-r from-transparent via-[#E8D8D1] to-transparent md:hidden my-4 opacity-70" />
                <HeroBanner />
                <div className="mx-4 h-[1px] bg-gradient-to-r from-transparent via-[#E8D8D1] to-transparent md:hidden my-4 opacity-70" />
                <ShopByCategory />

                <div className="mx-4 h-[1px] bg-gradient-to-r from-transparent via-[#E8D8D1] to-transparent md:hidden my-4 opacity-70" />
                <ShopByBrand />

                <div className="mx-4 h-[1px] bg-gradient-to-r from-transparent via-[#E8D8D1] to-transparent md:hidden my-4 opacity-70" />
                <FAQSection />
              </DeferredRender>
            </>
          )}
        </main>

        <BottomNav />

        <div className="md:hidden">
          <Suspense fallback={null}><CartDrawer /></Suspense>
        </div>

        <div className="mt-10 md:mt-20 mb-16 md:mb-0">
          <Footer />
        </div>
      </div>
    </>
  );
}
