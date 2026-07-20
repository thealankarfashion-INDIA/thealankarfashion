import { useEffect, useMemo, useState } from 'react';
import { useRoute, Link } from 'wouter';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/seo/SEO';
import { collections } from '@/data/collections';
import useStoreProducts from '@/hooks/useStoreProducts';
import ProductCard from '@/components/product/ProductCard';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProductCardSkeleton } from '@/components/ui/SkeletonLoaders';

const INITIAL_COLLECTION_PRODUCT_COUNT = 16;
const COLLECTION_LOAD_MORE_COUNT = 16;

export default function CollectionDetail() {
  const [, params] = useRoute('/collections/:slug');
  const slug = params?.slug;
  const collection = collections.find((c) => c.slug === slug);
  const { products, loading } = useStoreProducts();
  const [visibleCount, setVisibleCount] = useState(INITIAL_COLLECTION_PRODUCT_COUNT);
  const collectionName = collection?.name.toLowerCase() ?? '';

  useEffect(() => {
    setVisibleCount(INITIAL_COLLECTION_PRODUCT_COUNT);
  }, [slug]);

  const collectionProducts = useMemo(
    () => {
      if (!collectionName) return [];
      return products.filter(
        (p) =>
          p.collection?.toLowerCase() === collectionName ||
          p.category?.toLowerCase() === collectionName
      );
    },
    [products, collectionName]
  );
  const visibleProducts = collectionProducts.slice(0, visibleCount);

  if (!collection) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl">Collection not found.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {collection && <SEO title={`${collection.name} Collection`} description={collection.description} url={`https://thealankar.in/collections/${collection.slug}`} />}
      <Navbar />
      <main className="flex-1">
        {/* Collection Hero */}
        <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center pt-40 md:pt-48">
          <div className="absolute inset-0">
            <img
              src={collection.image}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
          <div className="relative z-10 text-center text-white px-4 max-w-3xl">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-serif text-5xl md:text-6xl mb-6"
            >
              {collection.name}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg md:text-xl text-white/90 font-light"
            >
              {collection.description}
            </motion.p>
          </div>
        </section>

        {/* Breadcrumbs */}
        <div className="container mx-auto px-4 md:px-8 py-8">
          <nav className="flex items-center text-xs tracking-widest uppercase text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3 mx-2" />
            <Link href="/collections" className="hover:text-foreground transition-colors">
              Collections
            </Link>
            <ChevronRight className="w-3 h-3 mx-2" />
            <span className="text-foreground">{collection.name}</span>
          </nav>
        </div>

        {/* Product Grid */}
        <section className="pb-24">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex justify-between items-center mb-12">
              <p className="text-sm text-muted-foreground tracking-widest uppercase">
                {loading ? '...' : `${collectionProducts.length} Pieces`}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                {[...Array(8)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : collectionProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  New pieces arriving soon for this collection.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                  {visibleProducts.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i} />
                  ))}
                </div>
                {visibleCount < collectionProducts.length && (
                  <div className="flex justify-center pt-12">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((count) => count + COLLECTION_LOAD_MORE_COUNT)}
                      className="rounded-full border border-[#B47A67] bg-white px-8 py-3 text-sm font-semibold tracking-[0.14em] text-[#8E5E4F] transition-colors hover:bg-[#B47A67] hover:text-white"
                    >
                      Load More Products
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
