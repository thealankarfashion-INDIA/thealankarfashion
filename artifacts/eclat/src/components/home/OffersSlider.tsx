import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import useStoreOffers from '@/hooks/useStoreOffers';

export default function OffersSlider() {
  const { offers } = useStoreOffers();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4500, stopOnInteraction: false })]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => setCurrent(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  if (offers.length === 0) return null;

  return (
    <section className="py-20 max-w-7xl mx-auto px-6 lg:px-8">
      <div className="text-center mb-12">
        <div className="text-[10px] tracking-[0.25em] uppercase text-[#8E5E4F]/50 mb-3">Limited Time</div>
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="h-px w-12 bg-[#E8D8D1]" />
          <h2 className="font-serif text-3xl md:text-4xl text-[#8E5E4F]">Special Offers</h2>
          <div className="h-px w-12 bg-[#E8D8D1]" />
        </div>
        <p className="text-sm text-[#8E5E4F]/50 max-w-md mx-auto">Exclusive deals on our most-loved collections</p>
      </div>
      <div className="relative rounded-2xl overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {offers.map(offer => (
            <div key={offer.id} className="flex-none w-full relative h-[400px] md:h-[480px]">
              <img src={offer.image} alt={offer.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-r ${offer.bg || 'from-[#8E5E4F]/80 to-transparent'} opacity-75`} />
              <div className="absolute inset-0 flex items-center px-12 md:px-20">
                <div className="text-white max-w-lg">
                  {offer.badge && <div className="inline-block px-3 py-1 bg-[#B47A67] text-white text-[10px] tracking-[0.2em] rounded-full mb-4 uppercase">{offer.badge}</div>}
                  <h3 className="font-serif text-4xl md:text-5xl mb-3">{offer.title}</h3>
                  <p className="text-white/70 text-sm mb-6 max-w-xs">{offer.subtitle}</p>
                  {offer.countdown && (
                    <div className="flex items-center gap-6 mb-8">
                      <div className="text-center"><div className="font-serif text-3xl">{offer.countdown.days || '00'}</div><div className="text-[9px] tracking-widest text-white/50 uppercase">Days</div></div>
                      <div className="text-white/30 text-2xl">:</div>
                      <div className="text-center"><div className="font-serif text-3xl">{offer.countdown.hours || '00'}</div><div className="text-[9px] tracking-widest text-white/50 uppercase">Hours</div></div>
                      <div className="text-white/30 text-2xl">:</div>
                      <div className="text-center"><div className="font-serif text-3xl">{offer.countdown.minutes || '00'}</div><div className="text-[9px] tracking-widest text-white/50 uppercase">Mins</div></div>
                    </div>
                  )}
                  <Link href="/shop"><button className="px-8 py-3 bg-white text-[#8E5E4F] rounded-sm text-sm font-medium hover:bg-[#FBF6F3] transition-all">{offer.cta || 'Shop Now'}</button></Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => emblaApi?.scrollPrev()} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/40 transition-colors"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={() => emblaApi?.scrollNext()} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/40 transition-colors"><ChevronRight className="h-5 w-5" /></button>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {offers.map((_, i) => (
            <button key={i} onClick={() => emblaApi?.scrollTo(i)} className={`transition-all duration-300 rounded-full ${i === current ? 'w-8 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
