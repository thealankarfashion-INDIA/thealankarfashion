import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { motion } from "framer-motion";

interface QuickViewProps {
  product: Product;
  open: boolean;
  onClose: () => void;
}

export function QuickView({ product, open, onClose }: QuickViewProps) {
  const { addToCart } = useCart();
  const defaultSize = (product.sizes && product.sizes[0]) || (product.variants && product.variants[0]) || "One Size";
  const [selectedSize, setSelectedSize] = useState(defaultSize);
  const [activeMedia, setActiveMedia] = useState(0);

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
    return match ? match[1] : null;
  };

  const youtubeUrls = product.youtubeUrls || (product.youtubeUrl ? [product.youtubeUrl] : []);
  const allYoutubeIds = youtubeUrls.map((url: string) => getYoutubeId(url)).filter(Boolean);
  const allImages = product.images || (product.image ? [product.image] : []);
  const media = [
    ...allImages.map((url: string) => ({ type: 'image', url })), 
    ...allYoutubeIds.map((id: string | null) => ({ type: 'video', url: id as string }))
  ];

  const handleAdd = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image || (product.images && product.images[0]) || '',
      color: '',
      size: selectedSize,
      quantity: 1,
      maxQuantity: product.stockQuantity,
    });
    onClose();
  };

  const availableSizes = product.sizes || product.variants || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#FBF6F3] border border-[#E8D8D1] p-0 overflow-hidden" aria-describedby="quick-view-desc">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="aspect-square bg-white overflow-hidden relative group">
            {media[activeMedia]?.type === 'video' ? (
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${media[activeMedia].url}?autoplay=1&mute=1`}
                title="Product video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <img
                src={media[activeMedia]?.url || (product.image || '')}
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            )}
            
            {media.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1.5 bg-white/40 backdrop-blur-md rounded-full">
                {media.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveMedia(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${activeMedia === idx ? 'bg-[#B47A67] w-3' : 'bg-[#B47A67]/30'}`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="p-6 sm:p-8 flex flex-col justify-center">
            <div className="text-[10px] tracking-widest uppercase text-[#8E5E4F]/50 mb-2">{product.brand || 'THEALANKAR'}</div>
            <h2 className="font-serif text-xl sm:text-2xl text-[#8E5E4F] mb-1">{product.name}</h2>
            {product.weight && <div className="text-xs text-[#8E5E4F]/50 mb-3">{product.weight}</div>}
            <p id="quick-view-desc" className="text-sm text-[#8E5E4F]/60 leading-relaxed mb-6 line-clamp-3">{product.description}</p>

            {availableSizes.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-[#8E5E4F]/50 mb-2 uppercase tracking-wider">Size</div>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map(v => (
                    <button
                      key={v}
                      onClick={() => setSelectedSize(v)}
                      className={`px-3 py-1.5 rounded-sm text-xs border transition-all ${selectedSize === v
                        ? "border-[#B47A67] bg-[#B47A67] text-white"
                        : "border-[#E8D8D1] text-[#8E5E4F] hover:border-[#B47A67]"
                        }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mb-6">
              <span className="text-xl font-medium text-[#8E5E4F]">₹{(Number(product.price) || 0).toFixed(2)}</span>
              {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                <span className="text-sm text-[#8E5E4F]/40 line-through">₹{Number(product.originalPrice).toFixed(2)}</span>
              )}
            </div>

            {product.stockQuantity !== undefined && product.stockQuantity > 0 && product.stockQuantity <= 5 && (
              <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2 }} className="text-[11px] font-bold text-red-600 mb-3 text-center">
                Only {product.stockQuantity} pieces left!
              </motion.div>
            )}

            {product.inStock === false || product.stockQuantity === 0 ? (
              <motion.button
                whileTap={{ x: [0, -8, 8, -8, 8, 0] }}
                transition={{ duration: 0.4 }}
                className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-500 py-3 text-sm tracking-widest uppercase cursor-not-allowed border border-gray-300"
              >
                <ShoppingBag className="h-4 w-4" />
                OUT OF STOCK
              </motion.button>
            ) : (
              <button
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-2 bg-[#B47A67] text-white py-3 text-sm tracking-widest uppercase hover:bg-[#A86F5C] transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
