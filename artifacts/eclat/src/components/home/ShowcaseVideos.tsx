import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import useStoreVideos from '@/hooks/useStoreVideos';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export default function ShowcaseVideos() {
  const { videos } = useStoreVideos();
  const mapped = useMemo(() => videos.map(v => ({
    id: v.id, title: v.title,
    thumbnail: v.thumbnailUrl || v.thumbnail || `https://img.youtube.com/vi/${v.youtubeVideoId || v.videoId || ''}/hqdefault.jpg`,
    videoId: v.youtubeVideoId || v.videoId || '',
    duration: v.duration || '',
  })), [videos]);

  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' });

  if (mapped.length === 0) return null;

  return (
    <section className="py-20 bg-[#FBF6F3]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div className="text-left">
            <div className="text-[10px] tracking-[0.25em] uppercase text-[#8E5E4F]/50 mb-3">Live Display</div>
            <h2 className="font-serif text-3xl md:text-4xl text-[#8E5E4F] mb-4">Watch & Experience</h2>
            <p className="text-sm text-[#8E5E4F]/50 max-w-md">See our collections come to life.</p>
          </div>
          <div className="hidden md:flex gap-3 mt-6 self-end">
            <button onClick={() => emblaApi?.scrollPrev()} className="p-3 rounded-full border border-[#E8D8D1] hover:bg-white text-[#8E5E4F] transition-colors"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={() => emblaApi?.scrollNext()} className="p-3 rounded-full border border-[#E8D8D1] hover:bg-white text-[#8E5E4F] transition-colors"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {mapped.map((video, i) => (
              <motion.div key={video.id} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group cursor-pointer flex-none w-[85vw] sm:w-[50vw] md:w-[calc(33.333%-1rem)]" onClick={() => setActiveVideo(video.videoId)}
              >
                <div className="relative aspect-video rounded-sm overflow-hidden mb-4 shadow-sm border border-[#E8D8D1]">
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-[#8E5E4F]/20 group-hover:bg-[#8E5E4F]/40 transition-all duration-500 flex items-center justify-center">
                    <div className="h-14 w-14 rounded-full border border-white/50 bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  {video.duration && <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-medium">{video.duration}</div>}
                </div>
                <div className="font-serif text-base text-[#8E5E4F] group-hover:text-[#B47A67] transition-colors">{video.title}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <Dialog open={!!activeVideo} onOpenChange={() => setActiveVideo(null)}>
        <DialogContent className="max-w-4xl bg-black border-0 p-1 rounded-xl" aria-describedby="video-desc">
          <DialogTitle className="sr-only">Video Player</DialogTitle>
          <div id="video-desc" className="aspect-video w-full">
            {activeVideo && <iframe src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0`} className="w-full h-full rounded-lg" allowFullScreen allow="autoplay; encrypted-media" />}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
