import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStoreProducts from '@/hooks/useStoreProducts';
import useStoreBrands from '@/hooks/useStoreBrands';
import ProductCard from '@/components/product/ProductCard';
import { ShoppingBag } from 'lucide-react';
import { ProductCardSkeleton } from '@/components/ui/SkeletonLoaders';

export default function ShopByBrand() {
  const { products, loading } = useStoreProducts();
  const { brands } = useStoreBrands();
  const [activeBrand, setActiveBrand] = useState('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const ref = useRef<HTMLDivElement>(null);

  const PHOTO = '/images/PHOTO-2026-06-09-22-59-02.jpg';
  const derivedBrands = [{ id: 'all', name: 'All Brands', image: PHOTO, tagline: 'Explore all' }, ...brands];

  const filtered = useMemo(() => {
    if (activeBrand === 'all') return [...products];
    const selected = derivedBrands.find(b => b.id === activeBrand);
    if (!selected) return [...products];
    return products.filter(p => (p.brand || '').toLowerCase() === selected.name.toLowerCase() || p.brand === selected.id);
  }, [products, activeBrand, derivedBrands]);

  const paginated = filtered.slice(0, visibleCount);
  if (brands.length === 0) return null;

  return (
    <section className="pt-6 pb-2 bg-white">
      <div className="max-w-md md:max-w-7xl mx-auto px-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg text-[#8E5E4F] tracking-tight">Shop by Brand</h3>
          <span className="text-[10px] uppercase tracking-widest text-[#B47A67] font-bold">Our Family</span>
        </div>
        <div className="mb-6 -mx-3 px-3">
          <div className="flex overflow-x-auto scroll-snap-x-mandatory gap-3 pb-4 hide-scrollbar pr-3">
            {derivedBrands.map((brand, i) => (
              <motion.div key={brand.id} whileTap={{ scale: 0.96 }}
                className={`flex-none w-[130px] scroll-snap-start bg-[#F7F1EE] rounded-[16px] shadow-sm border cursor-pointer overflow-hidden transition-all flex flex-col ${activeBrand === brand.id ? 'border-[#B47A67] ring-1 ring-[#B47A67] shadow-md' : 'border-[#E8D8D1]/40'}`}
                onClick={() => { setActiveBrand(brand.id); setVisibleCount(12); if (window.innerWidth < 768) setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth' }), 100); }}
              >
                <div className="h-[130px] w-full bg-white overflow-hidden flex items-center justify-center border-b border-[#E8D8D1]/30 relative">
                  {brand.image ? <img src={brand.image} alt={brand.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading={i < 4 ? 'eager' : 'lazy'} /> : <span className="text-[#8E5E4F]/40 text-sm font-serif">{brand.name}</span>}
                </div>
                <div className="p-3 flex flex-col flex-grow bg-white items-center justify-center text-center">
                  <h3 className="font-bold text-[11px] text-[#8E5E4F] leading-tight line-clamp-1">{brand.name}</h3>
                  <div className="mt-1">
                    <div className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded ${activeBrand === brand.id ? 'bg-[#8E5E4F] text-white' : 'text-[#B47A67] bg-[#F7F1EE]'}`}>
                      {activeBrand === brand.id ? 'VIEWING' : 'SELECT'}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <div ref={ref} className="scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#8E5E4F]">{derivedBrands.find(b => b.id === activeBrand)?.name || 'Products'}</h3>
            <span className="text-xs text-[#8E5E4F]/50 font-medium bg-[#F7F1EE] px-2 py-0.5 rounded">{loading ? '...' : `${filtered.length} items`}</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
              {[...Array(6)].map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <>
              <motion.div layout className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                <AnimatePresence>{paginated.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</AnimatePresence>
              </motion.div>
              {filtered.length === 0 && (
                <div className="text-center py-10 bg-[#F7F1EE] rounded-xl border border-[#E8D8D1]/50 mt-2">
                  <p className="font-medium text-sm text-[#8E5E4F] mb-2">No products found for this brand.</p>
                  <button onClick={() => setActiveBrand('all')} className="text-xs text-[#B47A67] font-bold hover:underline">VIEW ALL BRANDS</button>
                </div>
              )}
              {visibleCount < filtered.length && (
                <div className="mt-6 text-center">
                  <button onClick={() => setVisibleCount(p => p + 12)} className="px-6 py-2.5 bg-[#F7F1EE] text-[#8E5E4F] border border-[#E8D8D1] rounded-full text-[10px] font-bold tracking-wider uppercase hover:bg-[#E8D8D1]/50 transition-all shadow-sm active:scale-95">Load More</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
