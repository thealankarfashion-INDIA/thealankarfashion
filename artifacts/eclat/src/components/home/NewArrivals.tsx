import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import useStoreProducts from '@/hooks/useStoreProducts';
import ProductCard from '../product/ProductCard';
import { Link } from 'wouter';
import { Loader2 } from 'lucide-react';
import { ProductCardSkeleton } from '@/components/ui/SkeletonLoaders';

export default function NewArrivals() {
  const { ref, controls } = useScrollAnimation();
  const { products, loading } = useStoreProducts();

  const newProducts = products.filter((p) => p.isNew).slice(0, 4);

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={controls}
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
          }}
          className="flex justify-between items-end mb-12"
        >
          <div>
            <h2 className="font-serif text-4xl md:text-5xl mb-4">New Arrivals</h2>
            <p className="text-muted-foreground max-w-md">
              Discover the latest additions to our collection. Masterfully crafted pieces designed for the modern muse.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden md:inline-block border-b border-foreground pb-1 text-sm uppercase tracking-widest hover:text-primary hover:border-primary transition-colors"
          >
            View All
          </Link>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : newProducts.length === 0 ? (
          // If no products are marked isNew, show the first 4 products
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {products.slice(0, 4).map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {newProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}

        <div className="mt-12 text-center md:hidden">
          <Link
            href="/shop"
            className="inline-block border-b border-foreground pb-1 text-sm uppercase tracking-widest hover:text-primary transition-colors"
          >
            View All
          </Link>
        </div>
      </div>
    </section>
  );
}
