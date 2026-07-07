import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { collections } from '@/data/collections';
import { Link } from 'wouter';

export default function FeaturedCollections() {
  const { ref, controls } = useScrollAnimation();

  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div 
          ref={ref}
          initial="hidden"
          animate={controls}
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
          }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-4xl mb-4">Curated Edits</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Discover our latest collections, thoughtfully designed for every facet of your life.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
          {collections.map((collection, index) => (
            <motion.div
              key={collection.id}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: index * 0.1, ease: "easeOut" } }
              }}
              className="group relative overflow-hidden aspect-[4/5] sm:aspect-square md:aspect-[4/5] bg-muted"
            >
              <Link href={`/collections/${collection.slug}`} className="block w-full h-full">
                <img 
                  src={collection.image} 
                  alt={collection.name} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center text-center">
                  <h3 className="font-serif text-2xl md:text-3xl text-white mb-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">{collection.name}</h3>
                  <p className="text-white/80 text-sm mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 max-w-xs">{collection.description}</p>
                  <span className="text-white text-xs uppercase tracking-[0.2em] border-b border-white/30 pb-1 hover:border-white transition-colors">Explore Collection</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
