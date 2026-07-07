import { motion } from 'framer-motion';
import { FaWhatsapp, FaPhone } from 'react-icons/fa';

export default function FloatingContact() {
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col gap-3">
      <motion.a initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        href="tel:+918056323960"
        className="w-11 h-11 md:w-12 md:h-12 bg-white text-[#8E5E4F] rounded-full shadow-xl flex items-center justify-center border border-[#E8D8D1] hover:bg-[#FBF6F3] transition-colors"
      >
        <FaPhone className="w-4 h-4 md:w-5 md:h-5" />
      </motion.a>
      <motion.a initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        href="https://wa.me/918056323960" target="_blank" rel="noopener noreferrer"
        className="w-11 h-11 md:w-12 md:h-12 bg-[#25D366] text-white rounded-full shadow-2xl flex items-center justify-center shadow-[#25D366]/30 hover:bg-[#20bd5a] transition-colors relative"
      >
        <div className="absolute inset-0 rounded-full border border-white/20" />
        <FaWhatsapp className="w-5 h-5 md:w-6 md:h-6" />
      </motion.a>
    </div>
  );
}
