import { useScroll, useTransform, MotionValue } from 'framer-motion';
import { useRef, RefObject } from 'react';

export function useParallax(distance: number = 50): { ref: RefObject<HTMLDivElement | null>; y: MotionValue<number> } {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);

  return { ref, y };
}
