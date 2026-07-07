import { motion } from 'framer-motion';

function CornerBrackets() {
  return (
    <>
      <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-white/70" />
      <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-white/70" />
      <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-white/70" />
      <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-white/70" />
    </>
  );
}

export interface PaymentProgressAnimationProps {
  amount: number;
  status?: 'success' | 'error';
}

export default function PaymentProgressAnimation({ amount, status = 'success' }: PaymentProgressAnimationProps) {
  const color = status === 'success' ? '#1BCC7B' : '#EF4444';
  const text = status === 'success' 
    ? `Payment of ₹${amount.toLocaleString()} is in progress`
    : `Payment of ₹${amount.toLocaleString()} failed`;

  return (
    <div className="fixed inset-0 bg-white z-[200] flex flex-col items-center justify-center gap-16 overflow-hidden">
      <div className="relative flex items-center justify-center h-48 w-full gap-5 md:gap-7 mt-10">
        {/* Left Card */}
        <div className="relative flex flex-col items-center h-full justify-end pb-6">
          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            className="relative w-12 h-20 md:w-14 md:h-24 rounded-sm flex items-center justify-center z-10 shadow-lg"
            style={{ backgroundColor: color }}
          >
             <CornerBrackets />
             <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white flex items-center justify-center shadow-inner">
               <span className="font-bold text-sm md:text-lg" style={{ color }}>₹</span>
             </div>
             {/* Trail */}
             <div className="absolute top-full left-0 right-0 h-24 md:h-32 pointer-events-none" 
                  style={{ background: `linear-gradient(to bottom, ${color}4D, transparent)` }} />
          </motion.div>
        </div>
        
        {/* Center Card */}
        <div className="relative flex flex-col items-center h-full justify-start pt-2">
          <motion.div
            animate={{ y: [-12, 12, -12] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-16 h-28 md:w-20 md:h-36 rounded-sm flex items-center justify-center z-20 shadow-xl"
            style={{ backgroundColor: color }}
          >
             <CornerBrackets />
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white flex items-center justify-center shadow-inner">
               <span className="font-bold text-lg md:text-xl" style={{ color }}>₹</span>
             </div>
             {/* Trail */}
             <div className="absolute top-full left-0 right-0 h-32 md:h-48 pointer-events-none" 
                  style={{ background: `linear-gradient(to bottom, ${color}66, transparent)` }} />
          </motion.div>
        </div>

        {/* Right Card */}
        <div className="relative flex flex-col items-center h-full justify-end pb-10">
          <motion.div
            animate={{ y: [-6, 10, -6] }}
            transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            className="relative w-10 h-16 md:w-12 md:h-20 rounded-sm flex items-center justify-center z-10 shadow-lg"
            style={{ backgroundColor: color }}
          >
             <CornerBrackets />
             <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white flex items-center justify-center shadow-inner">
               <span className="font-bold text-xs md:text-sm" style={{ color }}>₹</span>
             </div>
             {/* Trail */}
             <div className="absolute top-full left-0 right-0 h-20 md:h-28 pointer-events-none" 
                  style={{ background: `linear-gradient(to bottom, ${color}4D, transparent)` }} />
          </motion.div>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-[#333] font-semibold text-lg md:text-xl tracking-tight z-30"
      >
        {text}
      </motion.p>
    </div>
  );
}
