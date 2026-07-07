import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import useStoreProducts from '@/hooks/useStoreProducts';
import ProductCard from '../product/ProductCard';
import { Link } from 'wouter';
import { Loader2 } from 'lucide-react';
import { ProductCardSkeleton } from '@/components/ui/SkeletonLoaders';

export default function BestSellers() {
  const { ref, controls } = useScrollAnimation();
  const { products, loading } = useStoreProducts();

  const bestSellers = products
    .filter((p) => p.isBestseller || p.featured)
    .slice(0, 4);

  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={controls}
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
          }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-4xl mb-4">Our Iconic Pieces</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The foundation of a modern wardrobe. Beloved by our community for their enduring elegance.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : bestSellers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No featured products yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {bestSellers.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <Link
            href="/shop"
            className="inline-block bg-foreground text-background px-10 py-4 text-sm tracking-widest uppercase hover:bg-foreground/90 transition-colors"
          >
            Shop All Best Sellers
          </Link>
        </div>
      </div>
    </section>
  );
}
