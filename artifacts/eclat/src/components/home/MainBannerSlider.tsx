import { useState, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Link } from 'wouter';
import useStoreMainBanners from '@/hooks/useStoreMainBanners';

export const MainBannerSlider = () => {
  const { mainBanners, loading } = useStoreMainBanners();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000, stopOnInteraction: false })]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => setCurrent(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  if (loading) {
    return <div className="w-full aspect-[4/5] md:aspect-[21/9] bg-[#F7F1EE] animate-pulse" />;
  }

  if (!mainBanners || mainBanners.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full bg-white">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {mainBanners.map((banner) => {
            const isFirst = banner.order === 1 || mainBanners.indexOf(banner) === 0;

            const Content = (
              <div className="w-full relative bg-[#F7F1EE]">
                {isFirst && (
                  <link rel="preload" as="image" href={banner.desktopImage} media="(min-width: 768px)" />
                )}
                {isFirst && (
                  <link rel="preload" as="image" href={banner.mobileImage} media="(max-width: 767px)" />
                )}
                <picture>
                  <source media="(min-width: 768px)" srcSet={banner.desktopImage} />
                  <img
                    src={banner.mobileImage}
                    alt="Main Banner"
                    className="w-full h-[500px] md:h-[550px] object-cover object-center block"
                    style={{ minHeight: '300px' }}
                    loading={isFirst ? "eager" : "lazy"}
                    decoding="async"
                    {...(isFirst ? { fetchPriority: "high" } as any : {})}
                  />
                </picture>
              </div>
            );

            return banner.link ? (
              <Link href={banner.link} key={banner.id} className="flex-none w-full relative block cursor-pointer">
                {Content}
              </Link>
            ) : (
              <div key={banner.id} className="flex-none w-full relative block">
                {Content}
              </div>
            );
          })}
        </div>
      </div>

      {mainBanners.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
          {mainBanners.map((_, i) => (
            <button
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
              onClick={(e) => {
                e.preventDefault();
                emblaApi?.scrollTo(i);
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
