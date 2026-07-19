// src/components/search/SearchOverlay.tsx
// Premium enterprise search overlay for Thealankar
import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Search, X, Clock, TrendingUp, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { SearchResult, useSearch } from '@/hooks/useSearch';
import { Category } from '@/lib/types';
import useStoreProducts from '@/hooks/useStoreProducts';
import useStoreCategories from '@/hooks/useStoreCategories';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

/** Highlight matched text in suggestion */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-[#B47A67] font-bold not-italic">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

/** Single suggestion row */
function SuggestionRow({
  result,
  isActive,
  query,
  onClick,
}: {
  result: SearchResult;
  isActive: boolean;
  query: string;
  onClick: () => void;
}) {
  const { product } = result;
  const img = product.images?.[0] || product.image;
  const isAvailable = product.inStock !== false && (product.stockQuantity === undefined || product.stockQuantity > 0);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        isActive ? 'bg-[#FBF6F3]' : 'hover:bg-[#FBF6F3]/60'
      }`}
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-xl bg-[#F7F1EE] border border-[#E8D8D1] overflow-hidden shrink-0 flex items-center justify-center">
        {img ? (
          <img src={img} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <Sparkles className="w-4 h-4 text-[#B47A67]/40" />
        )}
      </div>
      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#3D2C27] leading-tight line-clamp-1">
          <HighlightText text={product.name} query={query} />
        </p>
        <p className="text-[10px] text-[#8E5E4F]/60 mt-0.5 capitalize">{product.category}</p>
      </div>
      {/* Price + stock */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-[#8E5E4F]">₹{product.price?.toFixed(0)}</p>
        {!isAvailable && (
          <p className="text-[9px] text-red-400 font-medium uppercase tracking-wider">Out</p>
        )}
      </div>
    </button>
  );
}

export default function SearchOverlay({
  isOpen,
  onClose,
  inputRef,
}: SearchOverlayProps) {
  const [, setLocation] = useLocation();
  const { products } = useStoreProducts();
  const { categories = [] } = useStoreCategories();
  const searchState = useSearch(products, categories);
  const { query, setQuery, debouncedQuery, results, isSearching, history, trending, addToHistory, removeFromHistory, clearHistory } = searchState;
  const activeIdxRef = useRef(-1);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Navigate to product or search
  const navigateToProduct = useCallback((productId: string) => {
    onClose();
    setLocation(`/products/${productId}`);
  }, [onClose, setLocation]);

  const navigateToSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    addToHistory(term.trim());
    onClose();
    setLocation(`/shop?search=${encodeURIComponent(term.trim())}`);
  }, [addToHistory, onClose, setLocation]);

  const handleResultClick = useCallback((result: SearchResult) => {
    addToHistory(query);
    navigateToProduct(result.product.id);
  }, [query, addToHistory, navigateToProduct]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Enter') {
        if (activeIdxRef.current >= 0 && results[activeIdxRef.current]) {
          handleResultClick(results[activeIdxRef.current]);
        } else if (query.trim()) {
          navigateToSearch(query);
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdxRef.current = Math.min(activeIdxRef.current + 1, results.length - 1);
        overlayRef.current?.querySelectorAll('[data-suggestion]')[activeIdxRef.current]?.scrollIntoView({ block: 'nearest' });
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdxRef.current = Math.max(activeIdxRef.current - 1, -1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, query, onClose, handleResultClick, navigateToSearch]);

  // Reset active index on new results
  useEffect(() => { activeIdxRef.current = -1; }, [results]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [isOpen]);

  const suggestionResults = results.slice(0, 8);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[#F7F1EE] z-[200]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            ref={overlayRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-[210] bg-white shadow-2xl overflow-hidden isolate"
            style={{
              maxHeight: '85vh',
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
            }}
          >
            {/* Search Input Row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8D8D1]/60 bg-white sticky top-0">
              <Search className="w-4 h-4 text-[#B47A67] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && query.trim()) navigateToSearch(query); }}
                placeholder="Search jewellery, category, brand…"
                autoFocus
                className="flex-1 bg-transparent text-[15px] text-[#3D2C27] placeholder:text-[#8E5E4F]/40 outline-none font-medium"
              />
              {query && (
                <button onClick={() => setQuery('')} className="p-1 rounded-full hover:bg-[#FBF6F3] transition-colors">
                  <X className="w-4 h-4 text-[#8E5E4F]/50" />
                </button>
              )}
              <button onClick={onClose} className="px-3 py-1 text-xs font-semibold text-[#B47A67] hover:text-[#8E5E4F] transition-colors">
                Cancel
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 60px)' }}>

              {/* ── ACTIVE SEARCH STATE ── */}
              {query.trim() ? (
                <div>
                  {/* Loading shimmer */}
                  {isSearching && (
                    <div className="px-4 py-3 space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3 items-center animate-pulse">
                          <div className="w-10 h-10 rounded-xl bg-[#F7F1EE]" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-[#F7F1EE] rounded w-3/4" />
                            <div className="h-2 bg-[#F7F1EE] rounded w-1/4" />
                          </div>
                          <div className="h-4 bg-[#F7F1EE] rounded w-12" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Results */}
                  {!isSearching && suggestionResults.length > 0 && (
                    <>
                      <div className="flex items-center justify-between px-4 pt-3 pb-1">
                        <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E5E4F]/50 font-semibold">
                          {results.length} Result{results.length !== 1 ? 's' : ''}
                        </p>
                        <button
                          onClick={() => navigateToSearch(query)}
                          className="text-[10px] text-[#B47A67] font-semibold flex items-center gap-0.5 hover:gap-1.5 transition-all"
                        >
                          See all <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      {suggestionResults.map((result, idx) => (
                        <div key={result.product.id} data-suggestion="">
                          <SuggestionRow
                            result={result}
                            isActive={idx === activeIdxRef.current}
                            query={debouncedQuery}
                            onClick={() => handleResultClick(result)}
                          />
                        </div>
                      ))}
                      {/* See all CTA */}
                      <button
                        onClick={() => navigateToSearch(query)}
                        className="w-full px-4 py-3 border-t border-[#E8D8D1]/50 flex items-center justify-center gap-2 text-sm font-semibold text-[#8E5E4F] hover:text-[#B47A67] transition-colors"
                      >
                        See all results for "{query}"
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* No results */}
                  {!isSearching && suggestionResults.length === 0 && (
                    <div className="py-12 text-center px-8">
                      <div className="w-14 h-14 rounded-full bg-[#FBF6F3] border border-[#E8D8D1] mx-auto flex items-center justify-center mb-4">
                        <Search className="w-6 h-6 text-[#B47A67]/40" />
                      </div>
                      <p className="text-sm font-semibold text-[#8E5E4F] mb-1">No results found</p>
                      <p className="text-xs text-[#8E5E4F]/50">Try different keywords or browse categories</p>
                    </div>
                  )}
                </div>
              ) : (
                /* ── EMPTY STATE ── */
                <div className="px-4 pt-4 pb-8 space-y-6">

                  {/* Recent Searches */}
                  {history.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E5E4F]/50 font-semibold">Your Recent Searches</p>
                        <button onClick={clearHistory} className="text-[10px] text-[#B47A67] font-semibold hover:opacity-70 transition-opacity">Clear</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {history.map(term => (
                          <div key={term} className="flex items-center gap-1.5 bg-[#FBF6F3] border border-[#E8D8D1] rounded-full px-3 py-1.5 group">
                            <Clock className="w-3 h-3 text-[#8E5E4F]/40 shrink-0" />
                            <button
                              onClick={() => { setQuery(term); }}
                              className="text-xs text-[#8E5E4F] font-medium"
                            >
                              {term}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeFromHistory(term); }}
                              className="ml-0.5 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#E8D8D1]"
                            >
                              <X className="w-2.5 h-2.5 text-[#8E5E4F]/60" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Searches */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-3 h-3 text-[#B47A67]" />
                      <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E5E4F]/50 font-semibold">Trending Searches</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {trending.map(term => (
                        <button
                          key={term}
                          onClick={() => navigateToSearch(term)}
                          className="flex items-center gap-1.5 bg-[#B47A67]/10 border border-[#B47A67]/20 rounded-full px-3 py-1.5 text-xs text-[#B47A67] font-medium hover:bg-[#B47A67]/20 transition-colors"
                        >
                          <Zap className="w-3 h-3" />
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Browse Categories */}
                  {categories.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-3 h-3 text-[#B47A67]" />
                        <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E5E4F]/50 font-semibold">What's On Your Mind?</p>
                      </div>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4 md:gap-6">
                        {categories.slice(0, 10).map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => { onClose(); setLocation(`/shop?category=${cat.id}`); }}
                            className="flex flex-col items-center gap-2 group"
                          >
                            <div className="w-full aspect-square max-w-[100px] rounded-2xl bg-[#FBF6F3] border border-[#E8D8D1] overflow-hidden flex items-center justify-center group-hover:border-[#B47A67]/40 transition-all shadow-sm">
                              {cat.image ? (
                                <img src={cat.image} alt={cat.name} loading="lazy" decoding="async" className="w-full h-full object-cover mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-300" />
                              ) : (
                                <Sparkles className="w-6 h-6 text-[#B47A67]/40" />
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-[#8E5E4F] text-center leading-tight line-clamp-2 max-w-[100px]">{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
