import { useMemo } from 'react';
import { useLocation } from 'wouter';
import SEO from '@/components/seo/SEO';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import useStoreProducts from '@/hooks/useStoreProducts';
import { Gem, Sparkles, Heart } from 'lucide-react';

function shuffle<T>(arr: T[], seed = 99): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const FadeUp = ({
  children,
  delay = 0,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  onClick?: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
    onClick={onClick}
  >
    {children}
  </motion.div>
);

export default function About() {
  const [, setLocation] = useLocation();
  const { products, loading } = useStoreProducts();

  const images = useMemo(() => {
    const withImg = products.filter((p) => p.image || p.images?.length);
    return shuffle(withImg).map((p) => ({
      src: p.image || p.images?.[0] || '',
      alt: p.name,
      id: p.id,
    }));
  }, [products]);

  const img = (i: number) => images[i] ?? { src: '', alt: '', id: '' };

  const fallback =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23E8D8D1" width="400" height="400"/%3E%3C/svg%3E';

  const Img = ({
    i,
    className,
    grayscale = false,
    alt,
  }: {
    i: number;
    className?: string;
    grayscale?: boolean;
    alt?: string;
  }) =>
    img(i).src ? (
      <img
        src={img(i).src}
        alt={alt || img(i).alt}
        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${grayscale ? 'grayscale-[0.15]' : ''} ${className ?? ''}`}
        onError={(e) => {
          (e.target as HTMLImageElement).src = fallback;
        }}
      />
    ) : (
      <div className="w-full h-full bg-[#E8D8D1]" />
    );

  const aboutSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About The Alankar",
    "description": "Discover the story behind The Alankar. We craft premium women's fashion jewellery with quality you can trust, elegance for every occasion, and customer happiness at our core.",
    "url": "https://thealankar.in/about"
  });

  return (
    <>
      <SEO
        title="About The Alankar — Our Story, Promise & Craftsmanship Philosophy"
        description="Discover the story behind The Alankar. We craft premium women's fashion jewellery with quality you can trust, elegance for every occasion, and customer happiness at our core."
        keywords="about the alankar jewellery brand, premium women jewellery brand India, the alankar story, fashion jewellery company, trusted jewellery store"
        url="https://thealankar.in/about"
        schema={aboutSchema}
      />
      <div className="min-h-[100dvh] flex flex-col bg-[#FDF9F3]">
        <Navbar />
        <main className="flex-1">

          {/* ── SEO H1 & Hero ── */}
          <section className="relative h-[80vh] flex items-end justify-center overflow-hidden">
            <div className="absolute inset-0">
              {img(0).src ? (
                <img
                  src={img(0).src}
                  alt="The Alankar premium jewellery collection"
                  className="w-full h-full object-cover object-center"
                  onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
                />
              ) : (
                <div className="w-full h-full bg-[#E8D8D1]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            </div>
            <div className="relative z-10 text-center text-white px-4 pb-16 max-w-4xl">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-[11px] md:text-xs uppercase tracking-[0.3em] mb-4 text-[#C59B62]"
              >
                Crafted for Eternity
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15 }}
                className="font-serif text-5xl md:text-7xl lg:text-8xl mb-6 leading-none"
              >
                About The Alankar
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-white/90 text-base md:text-xl max-w-2xl mx-auto leading-relaxed font-light"
              >
                Welcome to <strong>The Alankar</strong>, where elegance meets timeless craftsmanship.
              </motion.p>
            </div>
          </section>

          {/* ── Origin story & Mission ── */}
          <section className="py-24 md:py-32">
            <div className="container mx-auto px-6 md:px-8 max-w-4xl text-center">
              <FadeUp>
                <h2 className="text-[12px] uppercase tracking-[0.3em] text-[#B47A67] font-semibold block mb-6">
                  Our Story & Philosophy
                </h2>
              </FadeUp>
              <FadeUp delay={0.1}>
                <h3 className="font-serif text-3xl md:text-4xl mb-10 leading-relaxed text-[#2C1E16]">
                  "We believe jewellery is more than an accessory—it's a reflection of your story, style, and cherished moments."
                </h3>
              </FadeUp>
              <FadeUp delay={0.2}>
                <p className="text-[#8E5E4F] leading-relaxed text-base md:text-lg mb-6 max-w-3xl mx-auto">
                  At The Alankar, our carefully curated collection is designed to bring beauty, confidence, and grace to every occasion. As a premium destination for exquisite artificial and imitation jewellery, we blend traditional Indian aesthetics with modern sensibilities.
                </p>
              </FadeUp>
              <FadeUp delay={0.3}>
                <p className="text-[#8E5E4F] leading-relaxed text-base md:text-lg max-w-3xl mx-auto">
                  Whether you're celebrating a milestone, gifting a loved one, or treating yourself, we strive to offer pieces that are both meaningful and memorable. From intricately designed bridal sets to subtle everyday wear, every ornament is a testament to our passion for artistry.
                </p>
              </FadeUp>
            </div>
          </section>

          {/* ── SEO-Rich Extra Content ── */}
          <section className="py-16 md:py-24 bg-[#F7EFE5]">
            <div className="container mx-auto px-6 md:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">

                <FadeUp
                  className="relative cursor-pointer group"
                  onClick={() => img(1).id && setLocation(`/product/${img(1).id}`)}
                >
                  <div className="aspect-[3/4] overflow-hidden rounded-xl shadow-lg">
                    <Img i={1} alt="Exquisite Indian Jewellery Craftsmanship" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-full h-full border border-[#C59B62]/40 rounded-xl -z-10" />
                </FadeUp>

                <FadeUp delay={0.15} className="space-y-10">
                  <div>
                    <h3 className="font-serif text-2xl md:text-3xl text-[#2C1E16] mb-4">
                      The Art of Imitation Jewellery
                    </h3>
                    <p className="text-[#8E5E4F] leading-relaxed">
                      At The Alankar, we redefine luxury with our premium artificial jewellery. We source the finest materials, from radiant stones to skin-friendly alloys, ensuring every necklace, earring, and bangle feels as opulent as fine gold. Our designs reflect the grandeur of traditional Indian motifs mixed with contemporary trends.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl md:text-3xl text-[#2C1E16] mb-4">
                      Meticulous Craftsmanship
                    </h3>
                    <p className="text-[#8E5E4F] leading-relaxed">
                      Our collections are brought to life by skilled artisans who have dedicated their lives to the craft. Whether it's the intricate detailing of temple jewellery or the sparkling finish of American Diamond sets, we uphold the highest standards to deliver pieces that are flawlessly finished and durably plated.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl md:text-3xl text-[#2C1E16] mb-4">
                      Accessible Luxury Online
                    </h3>
                    <p className="text-[#8E5E4F] leading-relaxed">
                      We've built a seamless digital platform to make discovering and purchasing your favorite styles effortless. From secure checkouts to fast delivery, The Alankar provides a world-class online shopping experience that brings the boutique right to your doorstep.
                    </p>
                  </div>
                </FadeUp>
              </div>
            </div>
          </section>

          {/* ── Our Promise (Three pillars) ── */}
          <section className="py-24 md:py-32">
            <div className="container mx-auto px-6 md:px-8">
              <FadeUp className="text-center mb-16">
                <h2 className="text-[12px] uppercase tracking-[0.3em] text-[#B47A67] font-semibold block mb-4">
                  What We Stand For
                </h2>
                <h3 className="font-serif text-3xl md:text-4xl text-[#2C1E16]">
                  Our Promise
                </h3>
              </FadeUp>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                {[
                  {
                    icon: Gem,
                    title: 'Quality You Can Trust',
                    body: "Every piece is selected with attention to detail, ensuring exceptional quality and lasting beauty. We stand behind the durability and finish of all our products.",
                    imgIdx: 2,
                  },
                  {
                    icon: Sparkles,
                    title: 'Elegance for Every Occasion',
                    body: "From everyday essentials to statement pieces, our collections are crafted to complement your unique style, whether it's a grand wedding or a casual brunch.",
                    imgIdx: 3,
                  },
                  {
                    icon: Heart,
                    title: 'Customer Happiness First',
                    body: "Your satisfaction is at the heart of everything we do. We are committed to providing a seamless, delightful shopping experience and exceptional customer support.",
                    imgIdx: 4,
                  },
                ].map((pillar, i) => (
                  <FadeUp key={pillar.title} delay={i * 0.12} className="flex flex-col gap-6">
                    <div
                      className="aspect-[4/3] overflow-hidden rounded-xl cursor-pointer group shadow-sm"
                      onClick={() => img(pillar.imgIdx).id && setLocation(`/product/${img(pillar.imgIdx).id}`)}
                    >
                      <Img i={pillar.imgIdx} alt={pillar.title} />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#F7EFE5] flex items-center justify-center shrink-0 border border-[#E8D8D1]">
                        <pillar.icon className="w-5 h-5 text-[#B47A67]" />
                      </div>
                      <h4 className="font-serif text-xl text-[#2C1E16]">{pillar.title}</h4>
                    </div>
                    <p className="text-[#8E5E4F] leading-relaxed text-sm">{pillar.body}</p>
                  </FadeUp>
                ))}
              </div>
            </div>
          </section>

          {/* ── Emotional full-width closer ── */}
          <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0">
              {img(5).src ? (
                <img
                  src={img(5).src}
                  alt="Thealankar craftsmanship"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
                />
              ) : (
                <div className="w-full h-full bg-[#E8D8D1]" />
              )}
              <div className="absolute inset-0 bg-[#1a0c08]/65" />
            </div>
            <FadeUp className="relative z-10 text-center text-white px-6 max-w-3xl">
              <p className="font-serif text-2xl md:text-3xl lg:text-4xl leading-relaxed mb-8 italic">
                "Thank you for choosing The Alankar and allowing us to be a part of your special moments."
              </p>
              <p className="text-[#C59B62] text-xs uppercase tracking-[0.3em] mb-10">
                — The Alankar Team
              </p>
              <button
                onClick={() => setLocation('/shop')}
                className="px-8 py-3 border border-[#C59B62] text-[#C59B62] text-xs uppercase tracking-[0.2em] hover:bg-[#C59B62] hover:text-white transition-colors duration-300"
              >
                Explore the Collection
              </button>
            </FadeUp>
          </section>

          {/* ── Horizontal product gallery strip ── */}
          {images.length > 6 && (
            <section className="py-16 md:py-20">
              <FadeUp className="text-center mb-10">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#B47A67] font-semibold">
                  From Our Porkollar's Hands
                </span>
              </FadeUp>
              <div
                className="flex gap-4 px-6 md:px-8 pb-2"
                style={{ overflowX: 'auto', scrollbarWidth: 'none' }}
              >
                {images.slice(6, 14).map((item, i) => (
                  <motion.div
                    key={item.id || i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    onClick={() => item.id && setLocation(`/product/${item.id}`)}
                    className="flex-shrink-0 w-[180px] md:w-[220px] aspect-square overflow-hidden rounded-sm cursor-pointer group"
                  >
                    {item.src ? (
                      <img
                        src={item.src}
                        alt={item.alt}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#E8D8D1]" />
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          )}

        </main>
        <Footer />
      </div>
    </>
  );
}
