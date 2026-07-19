import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/seo/SEO';
import useStoreCategories from '@/hooks/useStoreCategories';
import useStoreProducts from '@/hooks/useStoreProducts';
import { useCart } from '@/context/CartContext';

export default function Collections() {
  const [, setLocation] = useLocation();
  const { categories, loading: catsLoading } = useStoreCategories();
  const { products, loading: prodsLoading } = useStoreProducts();
  const { items } = useCart();

  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [navHeight, setNavHeight] = useState(104);

  const leftMenuRef = useRef<HTMLDivElement>(null);
  const rightContentRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  // Measure the actual fixed navbar height so our layout fits perfectly
  useEffect(() => {
    const navbar = document.querySelector('body > div > div.fixed') as HTMLElement | null
      || document.querySelector('[class*="fixed top-0"]') as HTMLElement | null;

    const measure = () => {
      // The fixed navbar container is the first fixed child of body
      const fixedBars = document.querySelectorAll<HTMLElement>('[class*="fixed top-0"]');
      let h = 0;
      fixedBars.forEach(el => { h = Math.max(h, el.offsetHeight); });
      if (h > 0) setNavHeight(h);
    };

    measure();
    const ro = new ResizeObserver(measure);
    document.querySelectorAll<HTMLElement>('[class*="fixed top-0"]').forEach(el => ro.observe(el));
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Read search params to jump to a specific category
  useEffect(() => {
    if (categories.length === 0) return;
    
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('cat');
    
    if (catParam && categories.some(c => c.id === catParam)) {
      setActiveCategoryId(catParam);
      // Let render happen, then scroll to it
      setTimeout(() => {
        const section = rightContentRef.current?.querySelector(`section[data-cat="${catParam}"]`) as HTMLElement;
        if (section && rightContentRef.current) {
          isProgrammaticScroll.current = true;
          rightContentRef.current.scrollTo({
            top: section.offsetTop - 20,
            behavior: 'smooth'
          });
          setTimeout(() => { isProgrammaticScroll.current = false; }, 600);
        }
      }, 300);
    } else if (!activeCategoryId) {
      // Default to first category
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, window.location.search]);

  // Keep active category button visible in left menu
  const scrollLeftToActive = useCallback((id: string) => {
    const btn = leftMenuRef.current?.querySelector(
      `[data-catid="${id}"]`
    ) as HTMLElement | null;
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  // Right panel scroll → auto-highlight matching left category
  useEffect(() => {
    const rightEl = rightContentRef.current;
    if (!rightEl) return;

    const onScroll = () => {
      if (isProgrammaticScroll.current) return;
      const sections = Array.from(
        rightEl.querySelectorAll<HTMLElement>('section[data-cat]')
      );
      let bestId = '';
      let bestVisible = -Infinity;
      const cTop = rightEl.getBoundingClientRect().top;
      const cBottom = rightEl.getBoundingClientRect().bottom;

      sections.forEach((s) => {
        const r = s.getBoundingClientRect();
        const visible = Math.min(r.bottom, cBottom) - Math.max(r.top, cTop);
        if (visible > bestVisible) {
          bestVisible = visible;
          bestId = s.getAttribute('data-cat') ?? '';
        }
      });

      if (bestId && bestId !== activeCategoryId) {
        setActiveCategoryId(bestId);
        scrollLeftToActive(bestId);
      }
    };

    rightEl.addEventListener('scroll', onScroll, { passive: true });
    return () => rightEl.removeEventListener('scroll', onScroll);
  }, [activeCategoryId, scrollLeftToActive]);

  // Left tap → scroll right panel to that section
  const handleCategoryClick = (id: string) => {
    setActiveCategoryId(id);
    scrollLeftToActive(id);
    const section = rightContentRef.current?.querySelector(
      `section[data-cat="${id}"]`
    ) as HTMLElement | null;
    if (section && rightContentRef.current) {
      isProgrammaticScroll.current = true;
      rightContentRef.current.scrollTo({ top: section.offsetTop, behavior: 'smooth' });
      setTimeout(() => { isProgrammaticScroll.current = false; }, 900);
    }
  };

  const remainingHeight = `calc(100dvh - ${navHeight}px)`;

  return (
    <div className="min-h-[100dvh] bg-[#F5F5F5] font-sans text-[#2C1E16] flex flex-col">
      <SEO title="Jewellery Collections" description="Explore exclusive jewellery collections including Temple Jewellery, Modern Minimalism, and Festive Specials." url="https://thealankar.in/collections" />
      <Navbar />

      {/* Two-pane layout sitting exactly below the navbar */}
      <div
        className="flex w-full"
        style={{ marginTop: navHeight, height: remainingHeight }}
      >
        {/* ── LEFT: Fixed-width category sidebar ── */}
        <style>{`
          .hide-sb::-webkit-scrollbar { display: none; }
          .hide-sb { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
        <div
          ref={leftMenuRef}
          className="cat-sidebar hide-sb flex-shrink-0 overflow-y-auto bg-[#F9F9F9] md:bg-white border-r border-gray-100 flex flex-col"
          style={{ width: '85px' }}
        >
          <style>{`
            @media (min-width: 768px) { .cat-sidebar { width: 240px !important; } }
          `}</style>

          {catsLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col md:flex-row items-center gap-2 p-3 md:p-4 shrink-0">
                  <div className="w-12 h-12 md:w-10 md:h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
                  <div className="w-14 h-3 md:w-28 bg-gray-200 animate-pulse rounded" />
                </div>
              ))
            : categories.map((category) => {
                const isActive = category.id === activeCategoryId;
                return (
                  <button
                    key={category.id}
                    data-catid={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className={`relative flex flex-col md:flex-row items-center md:justify-start gap-1.5 md:gap-3 p-3 md:p-4 w-full text-left transition-colors shrink-0 ${
                      isActive
                        ? 'bg-white text-[#8E5E4F] font-semibold'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-bar"
                        className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#B47A67] rounded-r-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}

                    {/* Image */}
                    <div className={`w-[48px] h-[48px] md:w-10 md:h-10 rounded-full overflow-hidden border-2 p-0.5 flex-shrink-0 transition-colors ${isActive ? 'border-[#B47A67]' : 'border-transparent'}`}>
                      <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                        {category.image ? (
                          <img src={category.image} alt={category.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400">
                            {category.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Label */}
                    <span className={`text-[9.5px] md:text-[13px] text-center md:text-left leading-tight line-clamp-2 ${isActive ? 'text-[#B47A67] md:text-[#8E5E4F]' : 'text-gray-500'}`}>
                      {category.name}
                    </span>
                  </button>
                );
              })}
        </div>

        {/* ── RIGHT: Scrollable product sections ── */}
        <div
          ref={rightContentRef}
          className="flex-1 overflow-y-auto hide-sb bg-white"
          style={{ minWidth: 0 }}
        >
          {prodsLoading ? (
            <div className="p-4 md:p-8 grid grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-[68px] h-[68px] md:w-24 md:h-24 rounded-full bg-gray-100 animate-pulse" />
                  <div className="w-14 h-2.5 bg-gray-100 animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {categories.map((category) => {
                const catProducts = products.filter((p) => p.category === category.id);
                const featured = catProducts.filter((p) => p.featured);
                const others = catProducts.filter((p) => !p.featured);

                return (
                  <section
                    key={category.id}
                    id={`cat-${category.id}`}
                    data-cat={category.id}
                    className="px-4 pt-5 pb-8 md:px-8 md:pt-8 md:pb-12 border-b border-gray-100 last:border-b-0"
                  >
                    {/* Section header */}
                    <div className="flex items-center gap-2 md:gap-3 mb-4">
                      <div className="w-7 h-7 md:w-9 md:h-9 rounded-full overflow-hidden border border-gray-200 shrink-0">
                        {category.image ? (
                          <img src={category.image} alt={category.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#E8D8D1] flex items-center justify-center text-[9px] font-bold text-[#8E5E4F]">
                            {category.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <h2 className="text-[14px] md:text-xl font-bold text-gray-800">{category.name}</h2>
                      {category.description && (
                        <span className="hidden md:block text-sm text-gray-400 font-normal ml-2">
                          — {category.description}
                        </span>
                      )}
                    </div>

                    {catProducts.length === 0 ? (
                      <p className="text-[11px] text-gray-400 py-4 text-center">No products yet</p>
                    ) : (
                      <>
                        {/* Featured row */}
                        {featured.length > 0 && (
                          <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-[9px] md:text-[11px] uppercase tracking-wider text-[#B47A67] font-semibold">Popular</span>
                              <div className="h-px flex-1 bg-gray-100" />
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-x-3 gap-y-5 md:gap-x-5 md:gap-y-7">
                              {featured.map((product) => (
                                <div
                                  key={product.id}
                                  onClick={() => setLocation(`/product/${product.id}`)}
                                  className="flex flex-col items-center gap-1.5 cursor-pointer group"
                                >
                                  <div className="w-[68px] h-[68px] md:w-[100px] md:h-[100px] rounded-full bg-[#F5F6F8] overflow-hidden border border-gray-100 relative group-hover:shadow-md transition-shadow">
                                    <img
                                      src={product.image || product.images?.[0] || ''}
                                      alt={product.name}
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-[#B47A67] text-white text-[7px] md:text-[9px] font-bold px-1 md:px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap">
                                      <span className="w-1.5 h-1.5 bg-white rounded-full flex items-center justify-center">
                                        <span className="text-[#B47A67] text-[5px]">✓</span>
                                      </span>
                                      Mall
                                    </div>
                                  </div>
                                  <span className="text-[9.5px] md:text-[12px] text-center text-gray-700 font-medium leading-tight line-clamp-2 px-0.5">
                                    {product.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Other products */}
                        {others.length > 0 && (
                          <>
                            {featured.length > 0 && (
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-[9px] md:text-[11px] uppercase tracking-wider text-gray-400 font-semibold">All</span>
                                <div className="h-px flex-1 bg-gray-100" />
                              </div>
                            )}
                            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-x-3 gap-y-5 md:gap-x-5 md:gap-y-7">
                              {others.map((product) => (
                                <div
                                  key={product.id}
                                  onClick={() => setLocation(`/product/${product.id}`)}
                                  className="flex flex-col items-center gap-1.5 cursor-pointer group"
                                >
                                  <div className="w-[68px] h-[68px] md:w-[100px] md:h-[100px] rounded-full bg-[#F5F6F8] overflow-hidden border border-gray-100 group-hover:shadow-md transition-shadow">
                                    <img
                                      src={product.image || product.images?.[0] || ''}
                                      alt={product.name}
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                  </div>
                                  <span className="text-[9.5px] md:text-[12px] text-center text-gray-700 font-medium leading-tight line-clamp-2 px-0.5">
                                    {product.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </section>
                );
              })}

              {/* Desktop footer inside the right scroll area */}
              <div className="hidden md:block">
                <Footer />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
