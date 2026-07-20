import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import useStoreProducts from '@/hooks/useStoreProducts';
import useStoreCategories from '@/hooks/useStoreCategories';
import ProductCard from '@/components/product/ProductCard';
import { ShoppingBag } from 'lucide-react';
import { ProductCardSkeleton } from '@/components/ui/SkeletonLoaders';

type ShopByCategoryProps = {
  showProducts?: boolean;
};

export default function ShopByCategory({ showProducts = true }: ShopByCategoryProps) {
  const { products, loading } = useStoreProducts(showProducts);
  const { categories } = useStoreCategories();
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const productsRef = useRef<HTMLDivElement>(null);

  const PHOTO = `${import.meta.env.BASE_URL}images/categories/all-categories.jpeg`;

  const derivedCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return [{ id: 'all', name: 'All Categories', image: PHOTO, count: products.length }, ...categories];
    }
    const set = new Set<string>();
    products.forEach(p => p?.category && set.add(p.category));
    return [
      { id: 'all', name: 'All Categories', image: PHOTO, count: products.length },
      ...Array.from(set).map(c => ({ id: c, name: c, image: '', count: products.filter(p => p.category === c).length }))
    ];
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return [...products];
    const selected = derivedCategories.find(c => c.id === activeCategory);
    if (!selected) return [...products];
    return products.filter(p => (p.category || '').toLowerCase() === selected.name.toLowerCase() || p.category === selected.id);
  }, [products, activeCategory, derivedCategories]);

  const paginated = filteredProducts.slice(0, visibleCount);

  return (
    <section className="pt-6 pb-2 bg-white">
      <div className="max-w-md md:max-w-7xl mx-auto px-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg text-[#8E5E4F] tracking-tight">Shop by Category</h3>
          <span className="text-[10px] uppercase tracking-widest text-[#B47A67] font-bold">Catalogue</span>
        </div>

        {/* Category tiles */}
        <div className="mb-6 -mx-3 px-3">
          <div className="flex overflow-x-auto scroll-snap-x-mandatory gap-3 pb-4 hide-scrollbar pr-3">
            {derivedCategories.map((cat, i) => (
              <motion.div key={cat.id} whileTap={{ scale: 0.96 }}
                className={`flex-none w-[130px] scroll-snap-start bg-[#F7F1EE] rounded-[16px] shadow-sm border cursor-pointer overflow-hidden transition-all flex flex-col ${activeCategory === cat.id ? 'border-[#B47A67] ring-1 ring-[#B47A67] shadow-md' : 'border-[#E8D8D1]/40'}`}
                onClick={() => {
                  if (!showProducts) {
                    setLocation(cat.id === 'all' ? '/shop' : `/shop?category=${cat.id}`);
                    return;
                  }
                  setActiveCategory(cat.id);
                  setVisibleCount(12);
                  if (window.innerWidth < 768) setTimeout(() => productsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
              >
                <div className="h-[130px] w-full overflow-hidden relative border-b border-[#E8D8D1]/30">
                  {cat.image ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500" loading={i < 4 ? 'eager' : 'lazy'} /> : <div className="w-full h-full flex items-center justify-center"><span className="text-[#8E5E4F]/40 text-sm font-serif">{cat.name}</span></div>}
                </div>
                <div className="p-3 flex flex-col flex-grow bg-white items-center justify-center text-center">
                  <h3 className="font-bold text-[11px] text-[#8E5E4F] leading-tight line-clamp-1">{cat.name}</h3>
                  <div className="mt-1">
                    <div className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded ${activeCategory === cat.id ? 'bg-[#8E5E4F] text-white' : 'text-[#B47A67] bg-[#F7F1EE]'}`}>
                      {activeCategory === cat.id ? 'VIEWING' : 'SELECT'}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {!showProducts && (
          <div className="flex justify-center pb-4">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full border border-[#B47A67] bg-[#B47A67] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-sm transition-colors hover:bg-[#8E5E4F]"
            >
              <ShoppingBag className="h-4 w-4" />
              View Products
            </Link>
          </div>
        )}

        {/* Product grid */}
        {showProducts && <div ref={productsRef} className="scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#8E5E4F]">{derivedCategories.find(c => c.id === activeCategory)?.name || 'Products'}</h3>
            <span className="text-xs text-[#8E5E4F]/50 font-medium bg-[#F7F1EE] px-2 py-0.5 rounded">{loading ? '...' : `${filteredProducts.length} items`}</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
              {[...Array(6)].map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <>
              <motion.div layout className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                <AnimatePresence>{paginated.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}</AnimatePresence>
              </motion.div>
              {filteredProducts.length === 0 && (
                <div className="text-center py-10 bg-[#F7F1EE] rounded-xl border border-[#E8D8D1]/50 mt-2">
                  <p className="font-medium text-sm text-[#8E5E4F] mb-2">No products found.</p>
                  <button onClick={() => setActiveCategory('all')} className="text-xs text-[#B47A67] font-bold hover:underline">VIEW ALL</button>
                </div>
              )}
              {visibleCount < filteredProducts.length && (
                <div className="mt-12 text-center">
                  <button onClick={() => setVisibleCount(p => p + 12)} className="px-8 py-3.5 bg-[#B47A67] border border-[#B47A67] text-white rounded-full text-sm font-semibold tracking-wider uppercase hover:bg-[#8E5E4F] hover:border-[#8E5E4F] transition-all shadow-md active:scale-95">Load More Products</button>
                </div>
              )}
            </>
          )}
        </div>}
      </div>
    </section>
  );
}
