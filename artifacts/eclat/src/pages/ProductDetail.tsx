import { useState, useEffect } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { Heart, Share2, ChevronLeft, ChevronRight, Maximize2, Minus, Plus, Check, X, Truck, RotateCcw, ShieldCheck, Sparkles, ArrowLeft, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import useStoreProducts from '@/hooks/useStoreProducts';
import useStoreOffers from '@/hooks/useStoreOffers';
import useStoreCategories from '@/hooks/useStoreCategories';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/product/ProductCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import SEO from '@/components/seo/SEO';

export default function ProductDetail() {
  const [, paramsPlural] = useRoute('/products/:id');
  const [, paramsSingular] = useRoute('/product/:id');
  const id = paramsPlural?.id || paramsSingular?.id || '';

  const { products, loading: loadingProducts } = useStoreProducts();
  const { offers } = useStoreOffers();
  const { categories, loading: loadingCats } = useStoreCategories();
  const product = products.find(p => p.id === id);
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [selectedSize, setSelectedSize] = useState('');
  const [added, setAdded] = useState(false);
  const [activeMedia, setActiveMedia] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<null | 'available' | 'unavailable'>(null);

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
    return match ? match[1] : null;
  };

  const youtubeUrls = product?.youtubeUrls || (product?.youtubeUrl ? [product.youtubeUrl] : []);
  const allYoutubeIds = youtubeUrls.map((url: string) => getYoutubeId(url)).filter(Boolean);
  const allImages = product?.images || (product?.image ? [product.image] : []);
  const media = [
    ...allImages.map((url: string) => ({ type: 'image', url })),
    ...allYoutubeIds.map((vid: string | null) => ({ type: 'video', url: vid as string }))
  ];

  const related = products.filter(p => p.id !== id && p.category === product?.category).slice(0, 4);
  const sizes = product?.sizes?.length ? product.sizes : product?.variants?.length ? product.variants : [];
  
  useEffect(() => { setActiveMedia(0); setQuantity(1); setAdded(false); setSelectedSize(''); }, [id]);
  
  if (product && !selectedSize && sizes.length > 0) {
    setTimeout(() => setSelectedSize(sizes[0]), 0);
  }

  const discount = product?.originalPrice && Number(product.originalPrice) > Number(product.price)
    ? Math.round(((Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice)) * 100) : 0;

  const activeOffers = offers.filter((o: any) => o.active && o.code);

  const handleAddToCart = () => {
    if (!product) return;
    const image = product.image || (product.images && product.images[0]) || '';
    addToCart({ productId: product.id, name: product.name, price: product.price, image, color: '', size: selectedSize || sizes[0] || 'One Size', quantity, rating: product.rating, reviews: product.reviews || product.reviewCount || 0, originalPrice: product.originalPrice, sku: skuId, maxQuantity: product.stockQuantity });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: product?.name, url: window.location.href }); } catch {}
    } else { navigator.clipboard.writeText(window.location.href); }
  };

  const checkPincode = () => {
    if (pincode.length === 6) setPincodeResult('available');
    else setPincodeResult('unavailable');
  };

  const prevMedia = () => setActiveMedia(p => p <= 0 ? media.length - 1 : p - 1);
  const nextMedia = () => setActiveMedia(p => p >= media.length - 1 ? 0 : p + 1);

  // Loading skeleton
  if (loadingProducts || loadingCats) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 lg:pt-48"><div className="max-w-7xl mx-auto px-4 md:px-8 py-6 lg:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 aspect-square rounded-lg bg-[#E8D8D1] animate-pulse" />
            <div className="lg:col-span-5 space-y-4 px-4 lg:px-0">
              <div className="h-6 bg-[#E8D8D1] rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-[#E8D8D1] rounded w-1/3 animate-pulse" />
              <div className="h-8 bg-[#E8D8D1] rounded w-1/2 animate-pulse" />
              <div className="h-20 bg-[#E8D8D1] rounded animate-pulse mt-8" />
            </div>
          </div>
        </div></div>
      </div>
    );
  }

  // Not found
  if (!product) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <h1 className="font-serif text-3xl text-[#8E5E4F] mb-4">Product not found</h1>
            <Link href="/shop"><button className="text-[#B47A67] hover:underline text-sm">Browse all products</button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const trustBadges = [
    { icon: <Sparkles className="w-4 h-4 text-[#B47A67]" />, label: '100% Anti-Tarnish' },
    { icon: <RotateCcw className="w-4 h-4 text-[#B47A67]" />, label: '7-Day Return & Exchange' },
    { icon: <Truck className="w-4 h-4 text-[#B47A67]" />, label: 'Free Shipping Available' },
  ];

  const qualityBadges = [
    { icon: '✨', title: 'COVERING', sub: 'CHAIN' },
    { icon: '🏛️', title: '1+ YEARS', sub: 'LEGACY' },
    { icon: '🤲', title: 'HANDCRAFTED', sub: 'SKIN FRIENDLY' },
    { icon: '❤️', title: '1 YEAR', sub: 'WARRANTY' },
  ];

  const getCategoryName = (catId: string) => {
    if (!catId) return "Uncategorized";
    const found = categories.find(c => c.id === catId || c.id.trim() === catId.trim() || c.name === catId);
    return found ? found.name : catId;
  };

  const skuId = product.sku || product.id.slice(0, 10).toUpperCase();

  const productSchema = product ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.images || (product.image ? [product.image] : []),
    "description": product.description || `Buy ${product.name} at The Alankar.`,
    "sku": skuId,
    "brand": {
      "@type": "Brand",
      "name": "The Alankar"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://thealankar.in/product/${product.id}`,
      "priceCurrency": "INR",
      "price": product.price,
      "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition"
    }
  }) : undefined;

  return (
    <>
      {product && (
        <SEO 
          title={`${product.name} | The Alankar`}
          description={product.description || `Buy ${product.name} online at The Alankar. Premium handcrafted women's fashion jewellery.`}
          image={product.image || product.images?.[0]}
          url={`https://thealankar.in/product/${product.id}`}
          schema={productSchema}
        />
      )}
      <div className="min-h-[100dvh] flex flex-col bg-white">
      <Navbar />

      {/* ─── Fullscreen Modal ─── */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center" onClick={() => setFullscreen(false)}>
            <button className="absolute top-6 right-6 text-white/80 hover:text-white z-10"><X className="w-8 h-8" /></button>
            {media[activeMedia]?.type === 'video' ? (
              <iframe className="w-full max-w-4xl aspect-video" src={`https://www.youtube.com/embed/${media[activeMedia].url}?autoplay=1`} title="Video" frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen onClick={e => e.stopPropagation()} />
            ) : (
              <img src={media[activeMedia]?.url} alt={product.name} className="max-w-[90vw] max-h-[90vh] object-contain" onClick={e => e.stopPropagation()} />
            )}
            {media.length > 1 && <>
              <button onClick={e => { e.stopPropagation(); prevMedia(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/40"><ChevronLeft className="w-6 h-6" /></button>
              <button onClick={e => { e.stopPropagation(); nextMedia(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/40"><ChevronRight className="w-6 h-6" /></button>
            </>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 pt-[104px] md:pt-48 pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-10">

            {/* ═══ LEFT: IMAGE GALLERY ═══ */}
            <div className="lg:col-span-7">
              <div className="lg:flex lg:gap-4">
                {/* Desktop vertical thumbnails */}
                <div className="hidden lg:flex flex-col gap-2 w-20 shrink-0">
                  {media.map((m, idx) => (
                    <button key={idx} onClick={() => setActiveMedia(idx)} className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${activeMedia === idx ? 'border-[#B47A67] shadow-md' : 'border-[#E8D8D1] opacity-60 hover:opacity-100'}`}>
                      {m.type === 'video' ? (
                        <div className="w-full h-full relative bg-gray-100">
                          <img src={`https://img.youtube.com/vi/${m.url}/0.jpg`} className="w-full h-full object-cover opacity-60" alt="" />
                          <div className="absolute inset-0 flex items-center justify-center"><div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center"><svg className="w-3 h-3 fill-[#B47A67] ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>
                        </div>
                      ) : <img src={m.url} className="w-full h-full object-cover" alt="" />}
                    </button>
                  ))}
                </div>

                {/* Main image */}
                <div className="relative flex-1">
                  <div className="relative aspect-square lg:rounded-xl overflow-hidden bg-[#f5f5f5]">
                    {media[activeMedia]?.type === 'video' ? (
                      <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${media[activeMedia].url}?autoplay=1&mute=1`} title="Video" frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen />
                    ) : (
                      <img src={media[activeMedia]?.url || product.image} alt={product.name} className="w-full h-full object-cover" />
                    )}
                    <button onClick={() => setFullscreen(true)} className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm border border-gray-200 hover:bg-white transition-colors"><Maximize2 className="w-4 h-4 text-gray-600" /></button>
                    {media.length > 1 && <>
                      <button onClick={prevMedia} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm border border-gray-200"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
                      <button onClick={nextMedia} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm border border-gray-200"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
                    </>}
                  </div>
                  {/* Mobile dots */}
                  {media.length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-3 lg:hidden">
                      {media.map((_, i) => <div key={i} onClick={() => setActiveMedia(i)} className={`h-1.5 rounded-full cursor-pointer transition-all ${i === activeMedia ? 'w-5 bg-[#B47A67]' : 'w-1.5 bg-[#E8D8D1]'}`} />)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ RIGHT: PRODUCT INFO ═══ */}
            <div className="lg:col-span-5 px-4 lg:px-0 mt-4 lg:mt-0">
              {/* Name + Actions */}
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-medium text-base lg:text-xl text-[#333] leading-snug flex-1">{product.name}</h1>
                <div className="flex items-center gap-2 shrink-0 mt-1">
                  <button onClick={() => toggleWishlist(product.id)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${isInWishlist(product.id) ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                    <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-red-400 text-red-400' : 'text-gray-500'}`} />
                  </button>
                  <button onClick={handleShare} className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <Share2 className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* SKU */}
              <p className="text-xs text-gray-400 mt-2"><span className="font-semibold text-gray-500">SKU:</span> {skuId}</p>

              {/* Price */}
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                  <span className="text-sm text-gray-400 line-through">MRP ₹{Number(product.originalPrice).toLocaleString('en-IN')}</span>
                )}
                <span className="text-2xl font-bold text-[#333]">₹{Number(product.price).toLocaleString('en-IN')}</span>
                {discount > 0 && <span className="text-xs font-bold text-white bg-[#333] px-2.5 py-1 rounded">SAVE {discount}%</span>}
              </div>
              <p className="text-xs text-gray-400 mt-1">(MRP inc. of all taxes)</p>

              {/* Sizes */}
              {sizes.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Size / Variant</p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((v: string) => (
                      <button key={v} onClick={() => setSelectedSize(v)} className={`px-4 py-2 rounded-lg text-sm border transition-all ${selectedSize === v ? 'border-[#B47A67] bg-[#B47A67] text-white' : 'border-[#E8D8D1] text-[#8E5E4F] hover:border-[#B47A67]'}`}>{v}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors */}
              {product.colors && product.colors.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Colour</p>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((c: string) => (
                      <div key={c} title={c} className="w-7 h-7 rounded-full border-2 border-[#E8D8D1] cursor-pointer" style={{ backgroundColor: c.startsWith('#') ? c : undefined }}>
                        {!c.startsWith('#') && <span className="text-[9px] flex items-center justify-center h-full text-[#8E5E4F]">{c.slice(0, 2)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trust badges */}
              <div className="flex items-center gap-4 mt-6 py-4 border-t border-b border-gray-100 flex-wrap">
                {trustBadges.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {b.icon}
                    <span className="text-xs font-semibold text-[#333]">{b.label}</span>
                  </div>
                ))}
              </div>

              {/* Delivery Options */}
              <div className="mt-6">
                <h3 className="font-bold text-sm text-[#333] uppercase tracking-wide mb-3">Delivery Options 🚚</h3>
                <div className="flex gap-2">
                  <input type="text" value={pincode} onChange={e => { setPincode(e.target.value.replace(/\D/g, '').slice(0, 6)); setPincodeResult(null); }} placeholder="Enter pincode" className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#B47A67] transition-colors" maxLength={6} />
                  <button onClick={checkPincode} className="px-6 py-2.5 bg-[#B47A67] text-white rounded-full text-sm font-semibold hover:bg-[#A06A57] transition-colors">Check</button>
                </div>
                {pincodeResult && (
                  <p className={`text-xs mt-2 ${pincodeResult === 'available' ? 'text-green-600' : 'text-red-500'}`}>
                    {pincodeResult === 'available' ? '✓ Delivery available in 3-5 business days' : '✗ Please enter a valid 6-digit pincode'}
                  </p>
                )}
              </div>

              {/* Available Offers */}
              {activeOffers.length > 0 && (
                <div className="mt-6 border-2 border-dashed border-[#E8D8D1] rounded-xl p-4 bg-[#FDF8F5]">
                  <h3 className="font-bold text-sm text-[#333] mb-3">Available Offers 🏷️</h3>
                  <div className="space-y-2.5">
                    {activeOffers.map((offer: any, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-sm mt-0.5">🎀</span>
                        <p className="text-sm text-[#555]">
                          {offer.title || `Get Extra ${offer.discount}${offer.type === 'percentage' ? '%' : '₹'} Off`}
                          {offer.code && <> – Use Code: <strong className="text-[#333]">{offer.code}</strong></>}
                          {offer.minOrderAmount && <> (Above ₹{offer.minOrderAmount.toLocaleString('en-IN')})</>}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Desktop: Quantity + Add to Cart */}
              {product.stockQuantity !== undefined && product.stockQuantity > 0 && product.stockQuantity <= 5 && (
                <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2 }} className="text-sm font-bold text-red-600 mt-4 mb-2">
                  Only {product.stockQuantity} pieces left in stock!
                </motion.div>
              )}
              <div className="hidden lg:flex items-center gap-4 mt-6">
                <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"><Minus className="w-4 h-4" /></button>
                  <span className="w-10 text-center text-sm font-semibold text-[#333] tabular-nums">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} disabled={product.stockQuantity !== undefined && quantity >= product.stockQuantity} className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"><Plus className="w-4 h-4" /></button>
                </div>
                {product.inStock === false || product.stockQuantity === 0 ? (
                  <motion.button whileTap={{ x: [0, -8, 8, -8, 8, 0] }} transition={{ duration: 0.4 }} className="flex-1 py-3.5 rounded-full text-sm font-bold tracking-wider uppercase transition-all bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300">
                    OUT OF STOCK
                  </motion.button>
                ) : (
                  <button onClick={handleAddToCart} className={`flex-1 py-3.5 rounded-full text-sm font-bold tracking-wider uppercase transition-all ${added ? 'bg-green-600 text-white' : 'bg-[#B47A67] text-white hover:bg-[#A06A57]'}`}>
                    {added ? <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Added!</span> : 'ADD TO CART'}
                  </button>
                )}
              </div>

              {/* Quality Badges */}
              <div className="flex items-center justify-around mt-8 py-6 bg-[#FDF8F5] rounded-xl border border-[#f0e6de]">
                {qualityBadges.map((b, i) => (
                  <div key={i} className="flex flex-col items-center text-center gap-1">
                    <div className="w-12 h-12 rounded-full border-2 border-[#E8D0C5] flex items-center justify-center text-lg bg-white">{b.icon}</div>
                    <p className="text-[9px] font-bold text-[#B47A67] uppercase tracking-wider leading-tight">{b.title}</p>
                    <p className="text-[8px] text-[#B47A67]/70 uppercase tracking-wider">{b.sub}</p>
                  </div>
                ))}
              </div>

              {/* Accordions */}
              <div className="mt-6">
                <Accordion type="single" collapsible>
                  {[
                    { title: 'DESCRIPTION', content: product.description },
                    { title: 'RETURN/EXCHANGE POLICY', content: 'We accept returns within 7 days of delivery for unworn items in original packaging. Custom-made pieces are non-returnable. Contact us immediately for any issues.' },
                    { title: 'MANUFACTURING DETAILS', content: product.fabric || product.ingredients || `Brand: ${product.brand || 'Thealankar'}\nCategory: ${getCategoryName(product.category)}\n${product.weight ? `Weight: ${product.weight}` : ''}` },
                  ].filter(item => item.content).map(item => (
                    <AccordionItem key={item.title} value={item.title} className="border border-[#E8D8D1] rounded-xl px-4 mb-2 bg-[#FAFAFA]">
                      <AccordionTrigger className="text-xs font-bold tracking-widest text-[#555] py-4 hover:text-[#B47A67] hover:no-underline uppercase">{item.title}</AccordionTrigger>
                      <AccordionContent className="text-sm text-[#777] pb-4 leading-relaxed whitespace-pre-line">{item.content}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {related.length > 0 && (
            <section className="mt-16 px-4 md:px-0">
              <h2 className="font-serif text-2xl text-[#8E5E4F] mb-8">You May Also Like</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
            </section>
          )}

          {/* ── Emotional quote ── */}
          <section className="mt-20 mx-4 md:mx-0 rounded-sm overflow-hidden relative h-[300px] md:h-[380px] flex items-center justify-center">
            {(() => {
              const quoteImg = products.find(p => p.id !== product?.id && (p.image || p.images?.[0]));
              return quoteImg ? (
                <img
                  src={quoteImg.image || quoteImg.images?.[0] || ''}
                  alt="heritage"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : <div className="absolute inset-0 bg-[#E8D8D1]" />;
            })()}
            <div className="absolute inset-0 bg-[#1a0c08]/65" />
            <div className="relative z-10 text-center text-white px-6 max-w-2xl">
              <p className="font-serif text-xl md:text-2xl lg:text-3xl leading-relaxed mb-6 italic">
                "Gold does not remember who wore it last. But the women who wore it — they remember everything."
              </p>
              <p className="text-[#C59B62] text-xs uppercase tracking-[0.3em] mb-8">
                — Thealankar, Coimbatore, Tamil Nadu
              </p>
              <Link href="/shop">
                <span className="inline-block px-8 py-3 border border-[#C59B62] text-[#C59B62] text-xs uppercase tracking-[0.2em] hover:bg-[#C59B62] hover:text-white transition-colors duration-300 cursor-pointer">
                  Explore the Collection
                </span>
              </Link>
            </div>
          </section>

          {/* ── From Our Kaarigar's Hands gallery ── */}
          {products.filter(p => p.id !== product?.id && (p.image || p.images?.[0])).length > 0 && (
            <section className="mt-16 mb-8">
              <div className="px-4 md:px-0 mb-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#B47A67] font-semibold">
                  From Our Porkollar&#39;s Hands
                </span>
              </div>
              <div
                className="flex gap-4 px-4 md:px-0 pb-2"
                style={{ overflowX: 'auto', scrollbarWidth: 'none' }}
              >
                {products
                  .filter(p => p.id !== product?.id && (p.image || p.images?.[0]))
                  .slice(0, 10)
                  .map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      onClick={() => { window.location.href = `/product/${p.id}`; }}
                      className="flex-shrink-0 w-[140px] md:w-[200px] aspect-square overflow-hidden rounded-sm cursor-pointer group"
                    >
                      <img
                        src={p.image || p.images?.[0] || ''}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22%3E%3Crect fill=%22%23E8D8D1%22 width=%22400%22 height=%22400%22/%3E%3C/svg%3E'; }}
                      />
                    </motion.div>
                  ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* ─── MOBILE STICKY BOTTOM BAR ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 12px)' }}>
        {product.stockQuantity !== undefined && product.stockQuantity > 0 && product.stockQuantity <= 5 && (
          <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2 }} className="text-[11px] font-bold text-red-600 mb-2 text-center">
            Only {product.stockQuantity} pieces left!
          </motion.div>
        )}
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-gray-300 rounded-full overflow-hidden shrink-0 bg-white">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-[#333] active:bg-gray-100"><Minus className="w-4 h-4" strokeWidth={2.5} /></button>
            <span className="w-8 text-center text-sm font-bold text-[#333] tabular-nums">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} disabled={product.stockQuantity !== undefined && quantity >= product.stockQuantity} className="w-10 h-10 flex items-center justify-center text-[#333] active:bg-gray-100 disabled:opacity-50"><Plus className="w-4 h-4" strokeWidth={2.5} /></button>
          </div>
          {product.inStock === false || product.stockQuantity === 0 ? (
            <motion.button whileTap={{ x: [0, -8, 8, -8, 8, 0] }} transition={{ duration: 0.4 }} className="flex-1 py-3.5 rounded-full text-sm font-bold tracking-widest uppercase transition-all bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300">
              OUT OF STOCK
            </motion.button>
          ) : (
            <button onClick={handleAddToCart} className={`flex-1 py-3.5 rounded-full text-sm font-bold tracking-widest uppercase transition-all ${added ? 'bg-green-600 text-white' : 'bg-[#B47A67] text-white hover:bg-[#A06A57] active:scale-[0.98]'}`}>
              {added ? 'ADDED!' : 'ADD TO CART'}
            </button>
          )}
        </div>
      </div>

      <div className="hidden lg:block"><Footer /></div>
    </div>
    </>
  );
}
