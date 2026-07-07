import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import useStoreAnnouncements from '@/hooks/useStoreAnnouncements';

export default function AnnouncementBar() {
  const { announcements } = useStoreAnnouncements();
  const [currentIndex, setCurrentIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const active = useMemo(() => announcements.filter(a => a.active), [announcements]);

  useEffect(() => {
    if (active.length <= 1) return;
    const interval = setInterval(() => setCurrentIndex(p => (p + 1) % active.length), 4000);
    return () => clearInterval(interval);
  }, [active.length]);

  if (active.length === 0) return null;

  return (
    <div className="relative bg-[#8E5E4F] border-b border-[#E8D8D1] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_8s_ease-in-out_infinite]" />
      <div className="relative max-w-7xl mx-auto px-4">
        <div className="h-10 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="px-8 text-center"
            >
              {active[currentIndex]?.link ? (
                <a href={active[currentIndex].link} className="text-xs font-medium tracking-wide text-white hover:text-[#E4C7BC] transition-colors">
                  {active[currentIndex].text}
                </a>
              ) : (
                <span className="text-xs font-medium tracking-wide text-[#E4C7BC]">
                  {active[currentIndex].text}
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
