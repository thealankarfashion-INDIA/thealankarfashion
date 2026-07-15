import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearch, Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, Search as SearchIcon, ArrowLeft, ShoppingCart, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import useStoreProducts from '@/hooks/useStoreProducts';
import useStoreCategories from '@/hooks/useStoreCategories';
import useStoreBrands from '@/hooks/useStoreBrands';
import ProductCard from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/SkeletonLoaders';
import AnnouncementBar from '@/components/home/AnnouncementBar';
import SEO from '@/components/seo/SEO';
import SearchBar from '@/components/search/SearchBar';
import { useSearch as useSmartSearch } from '@/hooks/useSearch';


type SortOption = 'default' | 'price-asc' | 'price-desc' | 'rating' | 'new';

// Exact Style 4 input/select style — adapted to Hub colours
const filterInput = "w-full bg-[#F7F1EE] border border-[#E8D8D1] rounded-lg px-3 py-2.5 text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67] transition-colors";
const filterLabel = "block text-[10px] tracking-widest uppercase text-[#8E5E4F]/50 mb-3";

function displayOrderValue(value: unknown) {
  const order = Number(value);
  return Number.isFinite(order) && order > 0 ? order : 99999;
}

export default function Shop() {
  const searchParams = useSearch();
  const params = new URLSearchParams(searchParams);

  const { products, loading, error, retry } = useStoreProducts();
  const { categories: CATEGORIES } = useStoreCategories();
  const { brands: BRANDS } = useStoreBrands();

  // Smart search engine
  const smartSearch = useSmartSearch(products);

  const [search, setSearch] = useState(params.get('search') || '');
  const [category, setCategory] = useState(params.get('category') || params.get('cat') || 'all');
  const [brand, setBrand] = useState(params.get('brand') || 'all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>((params.get('sort') as SortOption) || 'default');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopFiltersCollapsed, setDesktopFiltersCollapsed] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'category' | 'brand' | 'price' | 'rating'>('category');

  const { items, isCartOpen, setIsCartOpen } = useCart();
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (category !== 'all') count++;
    if (brand !== 'all') count++;
    if (minPrice || maxPrice) count++;
    if (minRating !== '') count++;
    if (inStockOnly) count++;
    return count;
  }, [category, brand, minPrice, maxPrice, minRating, inStockOnly]);

  useEffect(() => {
    const urlParams = new URLSearchParams(searchParams);
    const catParam = urlParams.get('category') || urlParams.get('cat');
    if (catParam) {
      setCategory(catParam);
    }
    const searchParam = urlParams.get('search');
    if (searchParam !== null) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  const priceBounds = useMemo(() => {
    let min = Infinity, max = 0;
    products.forEach(p => {
      const pr = Number(p.price || 0);
      if (pr < min) min = pr;
      if (pr > max) max = pr;
    });
    if (!products.length) return { min: 0, max: 0 };
    return { min: min === Infinity ? 0 : min, max };
  }, [products]);

  // Sync smart search query with the URL/state search param
  useEffect(() => {
    smartSearch.setQuery(search);
  }, [search]);

  const filtered = useMemo(() => {
    let list: typeof products;

    // Use smart scoring if there is a search query
    if (search.trim() && smartSearch.debouncedQuery) {
      list = smartSearch.results.map(r => r.product);
    } else {
      list = [...products];
    }

    if (brand !== 'all') list = list.filter(p => p.brand === brand);
    if (category !== 'all') list = list.filter(p => p.category === category);
    if (minPrice) list = list.filter(p => (p.price || 0) >= Number(minPrice));
    if (maxPrice) list = list.filter(p => (p.price || 0) <= Number(maxPrice));
    if (minRating !== '') list = list.filter(p => (p.rating || 0) >= Number(minRating));
    if (inStockOnly) list = list.filter(p => {
      if (typeof p.inStock === 'boolean') return p.inStock;
      if (typeof p.inStock === 'number') return (p.inStock as number) > 0;
      return true;
    });

    // Only apply manual sort if no search query (smart search already ranks)
    if (!search.trim()) {
      switch (sort) {
        case 'price-asc': list.sort((a, b) => a.price - b.price); break;
        case 'price-desc': list.sort((a, b) => b.price - a.price); break;
        case 'rating': list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
        case 'new': list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
        default:
          list.sort((a, b) => {
            return displayOrderValue(a.displayOrder) - displayOrderValue(b.displayOrder);
          });
      }
    } else {
      // Allow manual sorting even in search mode
      switch (sort) {
        case 'price-asc': list.sort((a, b) => a.price - b.price); break;
        case 'price-desc': list.sort((a, b) => b.price - a.price); break;
        case 'rating': list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      }
    }

    return list;
  }, [products, search, smartSearch.results, smartSearch.debouncedQuery, brand, category, minPrice, maxPrice, minRating, inStockOnly, sort]);

  const clearFilters = () => {
    setSearch(''); setCategory('all'); setBrand('all');
    setMinPrice(''); setMaxPrice(''); setMinRating(''); setInStockOnly(false); setSort('default');
  };

  // Exact Style 4 FiltersUI — adapted colours
  const FiltersUI = (
    <div className="flex flex-col gap-5">
      <div>
        <label className={filterLabel}>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)} className={filterInput}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className={filterLabel}>Brand</label>
        <select value={brand} onChange={e => setBrand(e.target.value)} className={filterInput}>
          <option value="all">All Brands</option>
          {BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div>
        <label className={filterLabel}>Price Range (₹)</label>
        <div className="flex gap-2">
          <input type="number" placeholder={`Min (${priceBounds.min})`} value={minPrice}
            onChange={e => setMinPrice(e.target.value)} min={0}
            className={`${filterInput} w-1/2`} />
          <input type="number" placeholder={`Max (${priceBounds.max})`} value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)} min={0}
            className={`${filterInput} w-1/2`} />
        </div>
      </div>

      <div>
        <label className={filterLabel}>Minimum Rating</label>
        <select value={minRating} onChange={e => setMinRating(e.target.value === '' ? '' : Number(e.target.value))} className={filterInput}>
          <option value="">Any Rating</option>
          <option value={4}>4 Stars & Up</option>
          <option value={3}>3 Stars & Up</option>
        </select>
      </div>

      <label className="flex items-center gap-2 cursor-pointer mt-1">
        <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)}
          className="rounded border-[#E8D8D1] accent-[#B47A67] focus:ring-[#B47A67] w-4 h-4" />
        <span className="text-sm text-[#8E5E4F]">Show only in-stock</span>
      </label>

      <div>
        <label className={filterLabel}>Sort By</label>
        <select value={sort} onChange={e => setSort(e.target.value as SortOption)} className={filterInput}>
          <option value="default">Featured / Newest</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
          <option value="new">New Arrivals</option>
        </select>
      </div>

      <button onClick={clearFilters} className="text-xs text-[#8E5E4F]/50 hover:text-[#B47A67] text-left mt-2 transition-colors">
        Clear all filters
      </button>
    </div>
  );

  return (
    <>
      <SEO 
        title="Shop Women's Fashion Jewellery Online — Earrings, Necklaces, Bangles | The Alankar"
        description="Browse 500+ premium women's fashion jewellery pieces. Shop earrings, necklaces, bangles, hair clips & rings. Filter by category, price & style. Free shipping above ₹999."
        keywords="shop women fashion jewellery online, buy women ornaments online, fashion jewellery store India, trendy jewellery for women, affordable premium jewellery"
        url="https://thealankar.in/shop"
      />
      <div className="min-h-[100dvh] flex flex-col bg-[#F7F1EE] md:bg-[#FBF6F3]">
      <div className="hidden md:block">
        <Navbar />
      </div>


      {/* Mobile Shop Header (Only visible on mobile) */}
      <div className="md:hidden sticky top-0 z-40">
        <AnnouncementBar />
        <div className="bg-white border-b border-[#E8D8D1]/50 shadow-sm">

          <div className="flex items-center px-3 py-2.5 gap-3">
            <Link href="/" className="text-[#8E5E4F] hover:bg-[#F7F1EE] p-1 rounded-full"><ArrowLeft className="w-5 h-5" /></Link>
            <div className="flex-1">
              <SearchBar
                variant="shop"
                placeholder="Search jewellery, brands…"
              />
            </div>
            <Link href="/cart" className="relative text-[#8E5E4F] p-1">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#F05A61] text-white text-[9px] flex items-center justify-center rounded-full font-bold shadow-sm">{cartCount}</div>}
            </Link>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar px-3 pb-3 pt-1">
            <button className="flex-none flex items-center gap-1 border border-[#E8D8D1] rounded-lg px-3 py-1.5 text-[11px] font-bold text-[#8E5E4F] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              Sort <ChevronDown className="w-3 h-3" />
            </button>
            <button onClick={() => setMobileFiltersOpen(true)} className="flex-none flex items-center gap-1.5 border border-[#8E5E4F] rounded-lg px-3 py-1.5 text-[11px] font-bold text-white bg-[#8E5E4F] shadow-sm">
              <SlidersHorizontal className="w-3 h-3" /> Filter {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>
            <button onClick={() => setSort('new')} className={`flex-none flex items-center gap-1 border border-[#E8D8D1] rounded-lg px-3 py-1.5 text-[11px] font-bold shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors ${sort === 'new' ? 'bg-[#F7F1EE] text-[#B47A67] border-[#B47A67]/30' : 'bg-white text-[#8E5E4F]'}`}>
              ✨ Latest Trends
            </button>
            <button onClick={() => setInStockOnly(!inStockOnly)} className={`flex-none flex items-center gap-1 border border-[#E8D8D1] rounded-lg px-3 py-1.5 text-[11px] font-bold shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors ${inStockOnly ? 'bg-[#F7F1EE] text-[#B47A67] border-[#B47A67]/30' : 'bg-white text-[#8E5E4F]'}`}>
              In Stock
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1">
        {/* Desktop Wrapper */}
        <div className="md:px-6 md:py-6 pb-20 md:max-w-[1400px] md:mx-auto md:min-h-screen md:pt-48">

          {/* Desktop Search & Sort Bar (Hidden on mobile) */}
          <div className="hidden md:block mb-8">
            <div className="bg-[#FBF6F3] border border-[#E8D8D1] rounded-xl p-3 flex items-center gap-3">
              <div className="flex items-center gap-3 flex-1 px-4 py-2 bg-white rounded-lg border border-[#E8D8D1]">
                <SearchIcon className="h-4 w-4 text-[#8E5E4F]/40" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search for a product or brand..."
                  className="bg-transparent outline-none w-full text-sm text-[#8E5E4F] placeholder-[#8E5E4F]/30"
                />
                {search && (
                  <button onClick={() => setSearch('')}>
                    <X className="h-4 w-4 text-[#8E5E4F]/40 hover:text-[#8E5E4F]" />
                  </button>
                )}
              </div>

              {/* Desktop sort (top-right of search bar) */}
              <div className="hidden md:flex items-center gap-3 ml-auto px-2">
                <label className="text-sm text-[#8E5E4F]/50">Sort:</label>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortOption)}
                  className="bg-transparent border-0 text-sm text-[#8E5E4F] font-medium outline-none cursor-pointer"
                >
                  <option value="default">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                  <option value="new">New Arrivals</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grid Layout — exact Style 4: 5-col, sidebar 1, products 4 */}
          <div className={`md:grid gap-8 lg:gap-10 transition-[grid-template-columns] duration-300 ${desktopFiltersCollapsed ? 'md:grid-cols-[56px_minmax(0,1fr)]' : 'md:grid-cols-[280px_minmax(0,1fr)]'}`}>

            {/* Desktop Sidebar */}
            <aside className="hidden md:block">
              <div className={`sticky top-24 space-y-6 transition-all duration-300 ${desktopFiltersCollapsed ? 'w-14' : 'w-full'}`}>
                <div className={`flex items-center ${desktopFiltersCollapsed ? 'justify-center' : 'justify-between'}`}>
                  {!desktopFiltersCollapsed && <h3 className="font-serif text-xl text-[#8E5E4F]">Filters</h3>}
                  <button
                    type="button"
                    onClick={() => setDesktopFiltersCollapsed(value => !value)}
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8D8D1] bg-[#FBF6F3] text-[#8E5E4F] shadow-sm transition-colors hover:border-[#B47A67] hover:text-[#B47A67]"
                    aria-label={desktopFiltersCollapsed ? 'Expand filters' : 'Minimize filters'}
                    title={desktopFiltersCollapsed ? 'Expand filters' : 'Minimize filters'}
                  >
                    {desktopFiltersCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                    {desktopFiltersCollapsed && activeFiltersCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B47A67] px-1 text-[9px] font-bold text-white">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>
                {desktopFiltersCollapsed ? (
                  <button
                    type="button"
                    onClick={() => setDesktopFiltersCollapsed(false)}
                    className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-[#E8D8D1] bg-white text-[#8E5E4F] shadow-sm transition-colors hover:border-[#B47A67] hover:text-[#B47A67]"
                    aria-label="Expand filters"
                    title="Expand filters"
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B47A67] px-1 text-[9px] font-bold text-white">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                ) : (
                  FiltersUI
                )}
              </div>
            </aside>

            {/* Product Grid */}
            <main className="min-w-0 px-2 pt-4 md:px-0 md:pt-0">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6">
                  {[...Array(8)].map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-32 bg-[#FBF6F3] border border-[#E8D8D1] rounded-xl m-4">
                  <p className="text-[#8E5E4F]/60 mb-4">Failed to load products.</p>
                  <button onClick={retry} className="px-6 py-2.5 bg-[#B47A67] text-white rounded-full text-sm font-medium hover:bg-[#A86F5C] transition-colors">Retry</button>
                </div>
              ) : (
                <>
                  <div className="hidden md:flex items-center justify-between mb-6">
                    <div>
                      <h1 className="font-serif text-3xl md:text-4xl text-[#8E5E4F]">Shop Collection</h1>
                      <div className="text-sm text-[#8E5E4F]/50 mt-1">{filtered.length} products available</div>
                    </div>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="text-center py-20 bg-[#FBF6F3] rounded-2xl border border-[#E8D8D1] mt-4 md:mt-8 mx-2 md:mx-0">
                      <h2 className="font-serif text-2xl text-[#8E5E4F] mb-2">No products found</h2>
                      <p className="text-[#8E5E4F]/50 text-sm mb-6">Try relaxing your filters or searching something else.</p>
                      <button onClick={clearFilters} className="px-6 py-2.5 bg-[#B47A67] text-white rounded-full text-sm font-medium hover:bg-[#A86F5C] transition-colors">Clear All Filters</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6">
                      {filtered.map((product, i) => (
                        <ProductCard key={product.id} product={product} index={i} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </main>
          </div>

          {/* New Mobile Filter Full Screen Modal */}
          <AnimatePresence>
            {mobileFiltersOpen && (
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed inset-0 bg-[#FBF6F3] z-[100] md:hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#E8D8D1] bg-white shrink-0 shadow-sm">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setMobileFiltersOpen(false)} className="text-[#8E5E4F] p-1"><ArrowLeft className="w-6 h-6" /></button>
                    <h3 className="font-serif text-xl text-[#8E5E4F]">Filters</h3>
                  </div>
                  <button onClick={clearFilters} className="text-sm font-semibold text-[#8E5E4F]/70 hover:text-[#B47A67] transition-colors">Clear Filters</button>
                </div>

                {/* Two Pane Layout */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Left Pane (Tabs) */}
                  <div className="w-[35%] bg-[#F7F1EE] border-r border-[#E8D8D1] overflow-y-auto hide-scrollbar">
                    {['category', 'brand', 'price', 'rating'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setActiveFilterTab(t as any)}
                        className={`w-full text-left px-4 py-4 text-[13px] font-semibold transition-colors ${activeFilterTab === t ? 'bg-white text-[#B47A67] border-l-4 border-l-[#B47A67]' : 'text-[#8E5E4F] border-l-4 border-transparent hover:bg-white/50'}`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Right Pane (Options) */}
                  <div className="w-[65%] bg-white overflow-y-auto p-4 hide-scrollbar">
                    {activeFilterTab === 'category' && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-[#8E5E4F]/50 uppercase tracking-widest mb-3">Popular Filters</h4>
                        <label className="flex items-center gap-3">
                          <input type="radio" name="category" checked={category === 'all'} onChange={() => setCategory('all')} className="w-4 h-4 accent-[#B47A67]" />
                          <span className="text-sm text-[#8E5E4F] font-medium">All Categories</span>
                        </label>
                        {CATEGORIES.map(c => (
                          <label key={c.id} className="flex items-center gap-3">
                            <input type="radio" name="category" checked={category === c.id} onChange={() => setCategory(c.id)} className="w-4 h-4 accent-[#B47A67]" />
                            <span className="text-sm text-[#8E5E4F] font-medium">{c.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {activeFilterTab === 'brand' && (
                      <div className="space-y-4">
                        <div className="bg-[#FBF6F3] border border-[#E8D8D1] rounded p-2 flex items-center gap-2 mb-4">
                          <SearchIcon className="w-4 h-4 text-[#8E5E4F]/40" />
                          <input type="text" placeholder="Search Brand" className="w-full bg-transparent text-sm outline-none text-[#8E5E4F] placeholder-[#8E5E4F]/40" />
                        </div>
                        <h4 className="text-xs font-bold text-[#8E5E4F]/50 uppercase tracking-widest mb-3">Popular Filters</h4>
                        <label className="flex items-center gap-3">
                          <input type="radio" name="brand" checked={brand === 'all'} onChange={() => setBrand('all')} className="w-4 h-4 accent-[#B47A67]" />
                          <span className="text-sm text-[#8E5E4F] font-medium">All Brands</span>
                        </label>
                        {BRANDS.map(b => (
                          <label key={b.id} className="flex items-center gap-3">
                            <input type="radio" name="brand" checked={brand === b.id} onChange={() => setBrand(b.id)} className="w-4 h-4 accent-[#B47A67]" />
                            <span className="text-sm text-[#8E5E4F] font-medium">{b.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {activeFilterTab === 'price' && (
                      <div className="space-y-5">
                        <h4 className="text-xs font-bold text-[#8E5E4F]/50 uppercase tracking-widest mb-3">Price Range</h4>
                        <div>
                          <label className="text-xs font-bold text-[#8E5E4F] mb-1 block">Min Price (₹)</label>
                          <input type="number" placeholder={`Min (${priceBounds.min})`} value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-full bg-[#F7F1EE] border border-[#E8D8D1] rounded-lg p-2.5 text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-[#8E5E4F] mb-1 block">Max Price (₹)</label>
                          <input type="number" placeholder={`Max (${priceBounds.max})`} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-full bg-[#F7F1EE] border border-[#E8D8D1] rounded-lg p-2.5 text-sm text-[#8E5E4F] outline-none focus:border-[#B47A67]" />
                        </div>
                      </div>
                    )}
                    {activeFilterTab === 'rating' && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-[#8E5E4F]/50 uppercase tracking-widest mb-3">Customer Ratings</h4>
                        {[
                          { val: '', label: 'Any Rating' },
                          { val: 4, label: '4★ & above' },
                          { val: 3, label: '3★ & above' },
                        ].map(r => (
                          <label key={r.val} className="flex items-center gap-3">
                            <input type="radio" name="rating" checked={minRating === r.val} onChange={() => setMinRating(r.val as any)} className="w-4 h-4 accent-[#B47A67]" />
                            <span className="text-sm text-[#8E5E4F] font-medium">{r.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="p-3 border-t border-[#E8D8D1] shrink-0 flex items-center justify-between bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe">
                  <div className="pl-2 flex-1">
                    <div className="font-bold text-[15px] text-[#8E5E4F] leading-tight">{filtered.length}</div>
                    <div className="text-[11px] text-[#8E5E4F]/60 font-medium">products found</div>
                  </div>
                  <button onClick={() => setMobileFiltersOpen(false)} className="px-10 py-3 bg-[#B47A67] text-white rounded font-bold shadow-md hover:bg-[#8E5E4F] transition-colors tracking-wide">
                    Apply
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <div className="hidden md:block mt-10">
        <Footer />
      </div>
    </div>
    </>
  );
}
