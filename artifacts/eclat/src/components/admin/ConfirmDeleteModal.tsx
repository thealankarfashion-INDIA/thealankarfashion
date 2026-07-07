import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isBulk?: boolean;
  isDeleting?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isBulk = false,
  isDeleting = false
}: ConfirmDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = () => {
    if (isBulk && confirmText !== 'DELETE ALL') return;
    onConfirm();
    // Don't reset text immediately to avoid UI glitch while animating out
    setTimeout(() => setConfirmText(''), 300);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => setConfirmText(''), 300);
  };

  const isButtonDisabled = isDeleting || (isBulk && confirmText !== 'DELETE ALL');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isDeleting ? handleClose : undefined}
            className="fixed inset-0 bg-black/60 z-[300] backdrop-blur-[2px]"
          />
          <div className="fixed inset-0 z-[301] flex flex-col justify-end md:justify-center items-center pointer-events-none p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full md:max-w-lg pointer-events-auto"
            >
              <div className="bg-white rounded-t-[24px] md:rounded-[24px] shadow-2xl overflow-hidden pb-6 md:pb-0">
              {/* Mobile Drag Handle */}
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-2 md:hidden" />
              
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-5 text-center md:text-left">
                  <div className="w-14 h-14 md:w-12 md:h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-7 h-7 md:w-6 md:h-6 text-red-600" />
                  </div>
                  <div className="flex-1 w-full pt-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl md:text-2xl font-serif text-gray-900 flex-1">{title}</h3>
                      <button
                        onClick={handleClose}
                        disabled={isDeleting}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 absolute top-4 right-4 md:static md:top-auto md:right-auto bg-gray-50 md:bg-transparent rounded-full p-2 md:p-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-sm md:text-[15px] text-gray-600 leading-relaxed mb-5">
                      {message}
                    </p>

                    {isBulk && (
                      <div className="mb-2 text-left">
                        <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
                          To confirm, type <strong className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">DELETE ALL</strong> below
                        </label>
                        <input
                          type="text"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          disabled={isDeleting}
                          placeholder="DELETE ALL"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-center md:text-left"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white md:bg-[#F7F1EE]/50 px-6 md:px-8 py-4 md:py-5 flex flex-col-reverse md:flex-row items-center justify-end gap-3 md:border-t md:border-[#E8D8D1]">
                <button
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="w-full md:w-auto px-6 py-3.5 md:py-2.5 text-sm font-bold md:font-medium text-[#8E5E4F] bg-[#F7F1EE] md:bg-white border-none md:border md:border-[#E8D8D1] rounded-xl hover:bg-[#E8D8D1] md:hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isButtonDisabled}
                  className="w-full md:w-auto px-6 py-3.5 md:py-2.5 text-sm font-bold md:font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    isBulk ? 'Clear All Data' : 'Delete Item'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
