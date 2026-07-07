import React, { useState, useCallback } from "react";
import { Link } from "wouter";
import { Heart, Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";


interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addToCart, updateQuantity, removeFromCart, items } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();


  const cartItem = items.find(i => i.productId === product.id);
  const cartQty = cartItem?.quantity || 0;
  const defaultSize = (product.sizes && product.sizes[0]) || (product.variants && product.variants[0]) || "One Size";

  const badgeColors: Record<string, string> = {
    NEW: "bg-[#B47A67] text-white",
    BESTSELLER: "bg-[#C8927D] text-white",
    SALE: "bg-red-500 text-white",
    LIMITED: "bg-[#8E5E4F] text-white",
  };

  const handleIncrement = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (cartQty === 0) {
      addToCart({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image || (product.images && product.images[0]) || '',
        color: '',
        size: defaultSize,
        quantity: 1,
        rating: product.rating,
        reviews: product.reviews || product.reviewCount || 0,
        originalPrice: product.originalPrice,
        maxQuantity: product.stockQuantity
      });
    } else if (cartItem) {
      if (product.stockQuantity === undefined || cartQty < product.stockQuantity) {
        updateQuantity(cartItem.productId, cartItem.color, cartItem.size, cartQty + 1);
      }
    }
  }, [addToCart, updateQuantity, cartQty, cartItem, product, defaultSize]);

  const handleDecrement = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!cartItem) return;
    if (cartQty <= 1) removeFromCart(cartItem.productId, cartItem.color, cartItem.size);
    else updateQuantity(cartItem.productId, cartItem.color, cartItem.size, cartQty - 1);
  }, [removeFromCart, updateQuantity, cartItem, cartQty]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image || (product.images && product.images[0]) || '',
      color: '',
      size: defaultSize,
      quantity: 1,
      rating: product.rating,
      reviews: product.reviews || product.reviewCount || 0,
      originalPrice: product.originalPrice,
      maxQuantity: product.stockQuantity
    });
  }, [addToCart, product, defaultSize]);

  const handleWishlistClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    toggleWishlist(product.id);
  }, [toggleWishlist, product.id]);

  const isWishlisted = isInWishlist(product.id);

  return React.useMemo(() => (
    <>
      <motion.article
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: index * 0.05, ease: "easeOut" }}
        className="group relative bg-[#FBF6F3] rounded-xl border border-[#E8D8D1] overflow-hidden transition-all duration-300 hover:shadow-lg"
      >
        {/* Image Container */}
        <Link href={`/products/${product.id}`}>
          <div className="relative w-full bg-white border-b border-[#E8D8D1] cursor-pointer overflow-hidden flex items-center justify-center">
            <div className="w-full h-[240px] sm:h-[240px] md:h-[320px] lg:h-[260px] flex items-center justify-center relative">
              <img
                src={product.image || (product.images && product.images[0]) || undefined}
                alt={product.name}
                className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${(product.inStock === false || product.stockQuantity === 0) ? 'opacity-60 grayscale' : ''}`}
                loading="lazy"
                decoding="async"
              />
              {(product.inStock === false || product.stockQuantity === 0) && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
                  <span className="bg-white/90 text-[#8E5E4F] font-bold tracking-[0.2em] uppercase text-[10px] md:text-xs px-3 py-1.5 rounded shadow-sm border border-[#E8D8D1]/50">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>
          </div>

        </Link>

        {/* Badge */}
        {product.stockQuantity !== undefined && product.stockQuantity > 0 && product.stockQuantity <= 5 ? (
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute top-3 left-3 text-[10px] tracking-wider px-2 py-0.5 rounded-full font-bold shadow-sm bg-red-600 text-white z-10"
          >
            ONLY {product.stockQuantity} LEFT!
          </motion.div>
        ) : product.badge ? (
          <div className={`absolute top-3 left-3 text-[10px] tracking-wider px-2 py-0.5 rounded-full font-medium shadow-sm z-10 ${badgeColors[product.badge] || "bg-[#B47A67] text-white"}`}>
            {product.badge}
          </div>
        ) : null}

        {/* Wishlist */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors"
          aria-label="Add to wishlist"
        >
          <Heart className={`h-4 w-4 transition-colors ${isWishlisted ? "fill-red-400 text-red-400" : "text-[#8E5E4F]/50"}`} />
        </button>

        {/* Content Block */}
        <div className="p-4 bg-white flex flex-col justify-between" style={{ minHeight: '140px' }}>
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] tracking-[0.18em] uppercase text-[#8E5E4F]/50 truncate pe-2">{product.brand || "THEALANKAR"}</div>
              {/* Rating dots */}
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < Math.floor(product.rating || 0) ? "bg-[#C8927D]" : "bg-[#E8D8D1]"}`} />
                  ))}
                </div>
                <span className="text-[10px] text-[#8E5E4F]/50">({product.reviews || product.reviewCount || 0})</span>
              </div>
            </div>

            <Link href={`/products/${product.id}`}>
              <h3 className="font-serif text-[15px] leading-tight text-[#8E5E4F] mb-3 cursor-pointer hover:text-[#B47A67] transition-colors line-clamp-2">
                {product.name}
              </h3>
            </Link>
          </div>

          <div className="flex items-end justify-between mt-auto pt-2 border-t border-[#E8D8D1]/50 gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-end gap-1.5 flex-wrap">
                <span className="font-semibold text-lg text-[#8E5E4F] leading-none">₹{(Number(product.price) || 0).toFixed(0)}</span>
                {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                  <span className="text-[11px] text-[#8E5E4F]/40 line-through pb-[2px]">₹{Number(product.originalPrice).toFixed(0)}</span>
                )}
              </div>
            </div>

            {/* Cart Controls */}
            <div className="shrink-0 flex items-center justify-end">
              {product.inStock === false || product.stockQuantity === 0 ? (
                <motion.button
                  whileTap={{ x: [0, -5, 5, -5, 5, 0] }}
                  transition={{ duration: 0.4 }}
                  className="text-[9px] uppercase tracking-wider text-[#8E5E4F]/60 font-bold bg-transparent px-2 py-1.5 rounded-full cursor-not-allowed border border-[#E8D8D1] whitespace-nowrap"
                >
                  Sold Out
                </motion.button>
              ) : cartQty > 0 ? (
                <div className="flex items-stretch rounded-lg border border-[#B47A67] overflow-hidden bg-white shadow-sm">
                  <button onClick={handleDecrement} className="flex items-center justify-center w-8 h-8 bg-[#B47A67] text-white hover:bg-[#A86F5C] transition-colors active:scale-95 shrink-0">
                    <Minus size={13} strokeWidth={3} />
                  </button>
                  <span className="text-[13px] font-semibold text-[#8E5E4F] px-2 flex items-center justify-center tabular-nums">{cartQty}</span>
                  <button onClick={handleIncrement} disabled={product.stockQuantity !== undefined && cartQty >= product.stockQuantity} className="flex items-center justify-center w-8 h-8 bg-[#B47A67] text-white hover:bg-[#A86F5C] transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                    <Plus size={13} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddClick}
                  className="text-[11px] font-semibold tracking-wider uppercase px-4 py-1.5 rounded-full border border-[#E8D8D1] text-[#8E5E4F] transition-colors hover:bg-[#B47A67] hover:text-white hover:border-[#B47A67] whitespace-nowrap"
                >
                  Add
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.article>


    </>
  ), [product, index, cartQty, cartItem, isWishlisted, handleIncrement, handleDecrement, handleAddClick, handleWishlistClick]);
}
