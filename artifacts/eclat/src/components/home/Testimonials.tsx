import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { testimonials } from '@/data/testimonials';
import { Star } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { useEffect, useCallback } from 'react';

export default function Testimonials() {
  const { ref, controls } = useScrollAnimation();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <section className="py-24 bg-muted overflow-hidden">
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
          <h2 className="font-serif text-3xl md:text-4xl mb-4">Words from our Muses</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Experience Thealankar through the eyes of the women who wear it.</p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="flex-[0_0_100%] md:flex-[0_0_70%] px-4">
                  <div className="bg-background p-10 md:p-14 rounded-sm text-center border border-border/50 h-full flex flex-col justify-center">
                    <div className="flex justify-center gap-1 mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="font-serif text-lg md:text-xl leading-relaxed text-foreground mb-8">"{testimonial.text}"</p>
                    <p className="text-sm tracking-widest uppercase text-muted-foreground">— {testimonial.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={scrollPrev}
            className="absolute top-1/2 -left-4 md:-left-12 -translate-y-1/2 w-10 h-10 bg-background rounded-full shadow-md flex items-center justify-center text-foreground hover:bg-muted transition-colors z-10"
          >
            ←
          </button>
          <button 
            onClick={scrollNext}
            className="absolute top-1/2 -right-4 md:-right-12 -translate-y-1/2 w-10 h-10 bg-background rounded-full shadow-md flex items-center justify-center text-foreground hover:bg-muted transition-colors z-10"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
