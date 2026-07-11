import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import useStoreOffers from '@/hooks/useStoreOffers';
import { getOfferImage } from '@/lib/offers';

/**
 * Compact Flipkart-style offers slider — no heading, edge-to-edge banners
 * with dot indicators at the bottom. Used on Order pages.
 */
export default function CompactOffersSlider() {
  const { offers } = useStoreOffers();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000, stopOnInteraction: false })]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => setCurrent(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  if (offers.length === 0) return null;

  return (
    <div className="w-full overflow-hidden bg-white md:rounded-xl md:border md:border-[#E8D8D1]">
      {/* Carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {offers.map(offer => (
            <div key={offer.id} className="flex-[0_0_100%] min-w-0">
              <Link href="/shop">
                <a className="block">
                  <div className="relative w-full h-[160px] md:h-[200px]">
                    {getOfferImage(offer) ? (
                      <>
                        <img
                          src={getOfferImage(offer)}
                          alt={offer.title || 'Special Offer'}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        {/* Overlay text */}
                        {offer.title && (
                          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center px-5 md:px-8">
                            <div className="text-white max-w-[65%]">
                              {offer.badge && (
                                <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm text-[9px] font-bold uppercase tracking-wider rounded mb-1.5">
                                  {offer.badge}
                                </span>
                              )}
                              <h3 className="text-base md:text-lg font-bold leading-tight drop-shadow-md">{offer.title}</h3>
                              {offer.subtitle && <p className="text-[10px] text-white/80 mt-0.5">{offer.subtitle}</p>}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-r ${offer.bg || 'from-[#8E5E4F] to-[#B47A67]'} flex items-center px-5 md:px-8`}>
                        <div className="text-white max-w-[70%]">
                          {offer.badge && (
                            <span className="inline-block px-2 py-0.5 bg-white/20 text-[9px] font-bold uppercase tracking-wider rounded mb-1.5">
                              {offer.badge}
                            </span>
                          )}
                          <h3 className="text-base md:text-lg font-bold leading-tight mb-1">{offer.title}</h3>
                          {offer.subtitle && <p className="text-[10px] text-white/70">{offer.subtitle}</p>}
                          <button className="mt-2 px-3 py-1 bg-white text-[#8E5E4F] rounded text-[10px] font-semibold">
                            {offer.cta || 'Shop Now'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </a>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators — exactly like Flipkart */}
      {offers.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 py-2.5">
          {offers.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-5 h-[5px] bg-[#8E5E4F]'
                  : 'w-[5px] h-[5px] bg-[#8E5E4F]/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
