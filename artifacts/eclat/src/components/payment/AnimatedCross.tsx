import { motion } from 'framer-motion';

export default function AnimatedCross() {
  return (
    <div className="relative flex items-center justify-center w-32 h-32 md:w-40 md:h-40">
      {/* Outer softer ring */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute rounded-full w-28 h-28 md:w-32 md:h-32 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
      >
        {/* Main Circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.1, 1] }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-lg overflow-hidden"
          style={{ background: '#EF4444' }}
        >
          {/* Cross SVG */}
          <svg
            className="w-10 h-10 md:w-12 md:h-12 z-20"
            viewBox="0 0 52 52"
            fill="none"
          >
            <motion.path
              d="M16 16L36 36M36 16L16 36"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
            />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}
