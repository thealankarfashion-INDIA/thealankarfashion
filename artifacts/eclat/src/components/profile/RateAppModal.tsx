import { useState, useEffect } from 'react';
import { X, Star, CheckCircle, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { addAppRating, checkUserHasRated } from '@/lib/ratings';
import { useLocation } from 'wouter';

interface RateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RateAppModal({ isOpen, onClose }: RateAppModalProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  
  const [step, setStep] = useState<'loading' | 'unauthenticated' | 'alreadyRated' | 'initial' | 'feedback' | 'thankyou'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!user) {
        setStep('unauthenticated');
      } else {
        setStep('loading');
        checkUserHasRated(user.uid).then(hasRated => {
          if (hasRated) {
            setStep('alreadyRated');
          } else {
            setStep('initial');
          }
        });
      }
    } else {
      setTimeout(() => {
        setStep('loading');
        setSelectedRating(null);
        setComment('');
        setHoveredStar(null);
      }, 300);
    }
  }, [isOpen, user]);

  const handleStarClick = (rating: number) => {
    if (step === 'initial') {
      setSelectedRating(rating);
      setStep('feedback');
    } else if (step === 'feedback') {
      setSelectedRating(rating);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRating) return;
    setIsSubmitting(true);
    try {
      await addAppRating(user?.uid || null, user?.displayName || null, selectedRating, comment);
      setStep('thankyou');
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (error) {
      console.error('Failed to submit rating', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (rating: number | null) => {
    switch (rating) {
      case 1: return '1 - Terrible';
      case 2: return '2 - Bad';
      case 3: return '3 - Okay';
      case 4: return '4 - Good';
      case 5: return '5 - Excellent';
      default: return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-[2px]"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[201] flex items-end md:items-center justify-center pointer-events-none md:p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full md:max-w-md pointer-events-auto"
            >
              <div className="bg-white rounded-t-[24px] md:rounded-[24px] overflow-hidden flex flex-col pt-6 pb-8 px-6 shadow-2xl relative w-full">
              
              {/* Close Button & Header */}
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-[#2C1E16] pr-8 leading-tight">
                  {step === 'thankyou' ? 'Thank You!' : 'Enjoying the Thealankar app?'}
                </h2>
                <button 
                  onClick={onClose}
                  className="p-1 text-gray-400 hover:text-gray-800 transition-colors absolute top-6 right-5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {step === 'loading' && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex justify-center items-center py-12"
                  >
                    <div className="w-8 h-8 border-4 border-[#B47A67]/30 border-t-[#B47A67] rounded-full animate-spin" />
                  </motion.div>
                )}

                {step === 'unauthenticated' && (
                  <motion.div
                    key="unauth"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-8"
                  >
                    <div className="w-16 h-16 bg-[#F7F1EE] rounded-full flex items-center justify-center mb-6">
                      <LogIn className="w-8 h-8 text-[#8E5E4F]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#2C1E16] mb-2">Login Required</h3>
                    <p className="text-center text-[15px] text-[#8E5E4F] font-medium mb-6">
                      You must be logged in to rate the app.
                    </p>
                    <button
                      onClick={() => { onClose(); setLocation('/login'); }}
                      className="bg-[#B47A67] text-white px-8 py-3 rounded-xl font-medium hover:bg-[#8E5E4F] transition-colors"
                    >
                      Log In Now
                    </button>
                  </motion.div>
                )}

                {step === 'alreadyRated' && (
                  <motion.div
                    key="already-rated"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-8"
                  >
                    <div className="w-16 h-16 bg-[#F7F1EE] rounded-full flex items-center justify-center mb-6">
                      <Star className="w-8 h-8 text-[#D4AF37] fill-[#D4AF37]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#2C1E16] mb-2">Already Rated</h3>
                    <p className="text-center text-[15px] text-[#8E5E4F] font-medium">
                      You have already submitted a rating.<br/>Thank you for your feedback!
                    </p>
                  </motion.div>
                )}

                {step === 'thankyou' && (
                  <motion.div
                    key="thank-you"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center justify-center py-8"
                  >
                    <div className="w-20 h-20 bg-[#F7F1EE] rounded-full flex items-center justify-center mb-6 shadow-inner">
                      <CheckCircle className="w-10 h-10 text-[#4CAF50]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#2C1E16] mb-2">Feedback Received</h3>
                    <p className="text-center text-[15px] text-[#8E5E4F] font-medium">
                      Your rating has been saved successfully.<br/>Thanks for helping us improve!
                    </p>
                  </motion.div>
                )}

                {step === 'initial' && (
                  <motion.div
                    key="rating-form-initial"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    {/* Illustration (Recreating people holding stars) */}
                    <div className="w-full flex justify-center items-center py-6">
                      <svg width="240" height="100" viewBox="0 0 240 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Decorative Elements */}
                        <path d="M100 20 Q 120 5, 140 20" stroke="#E8D8D1" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
                        <path d="M40 80 Q 60 70, 80 80" stroke="#E8D8D1" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
                        <circle cx="110" cy="15" r="2" fill="#D4AF37" />
                        <circle cx="50" cy="70" r="1.5" fill="#B47A67" />
                        
                        {/* Paper plane */}
                        <path d="M85 35 L 92 30 L 90 38 Z" fill="#B47A67" />
                        <path d="M70 45 Q 80 40, 85 35" stroke="#E8D8D1" strokeWidth="1" strokeDasharray="2 2" fill="none" />

                        {/* Person 1 (Left) */}
                        <g transform="translate(45, 60)">
                          {/* Legs */}
                          <line x1="0" y1="20" x2="-2" y2="35" stroke="#2C1E16" strokeWidth="3" strokeLinecap="round"/>
                          <line x1="4" y1="20" x2="6" y2="35" stroke="#2C1E16" strokeWidth="3" strokeLinecap="round"/>
                          {/* Body */}
                          <rect x="-3" y="5" width="10" height="16" rx="2" fill="#8E5E4F" />
                          {/* Head */}
                          <circle cx="2" cy="0" r="4" fill="#E8D8D1" />
                          {/* Arms holding star */}
                          <line x1="-2" y1="8" x2="-10" y2="5" stroke="#8E5E4F" strokeWidth="2" strokeLinecap="round" />
                          <line x1="6" y1="8" x2="15" y2="0" stroke="#8E5E4F" strokeWidth="2" strokeLinecap="round" />
                        </g>
                        {/* Star held by Person 1 */}
                        <path d="M55 58 L58 64 L65 65 L60 70 L61 77 L55 74 L49 77 L50 70 L45 65 L52 64 Z" fill="#4CAF50" />

                        {/* Person 2 (Dancing) */}
                        <g transform="translate(85, 65)">
                          <line x1="0" y1="20" x2="-8" y2="30" stroke="#2C1E16" strokeWidth="3" strokeLinecap="round"/>
                          <line x1="4" y1="20" x2="10" y2="30" stroke="#2C1E16" strokeWidth="3" strokeLinecap="round"/>
                          <path d="M-3 5 L7 5 L9 20 L-1 20 Z" fill="#2C1E16" />
                          <circle cx="2" cy="0" r="4" fill="#B47A67" />
                          {/* Arms up */}
                          <path d="M-3 8 Q -10 0, -5 -10" stroke="#2C1E16" strokeWidth="2" strokeLinecap="round" fill="none" />
                          <path d="M7 8 Q 15 0, 10 -10" stroke="#2C1E16" strokeWidth="2" strokeLinecap="round" fill="none" />
                        </g>
                        {/* Large Star held by Person 2 */}
                        <path d="M90 40 L95 50 L107 52 L98 60 L100 72 L90 66 L80 72 L82 60 L73 52 L85 50 Z" fill="#4CAF50" />

                        {/* Person 3 (Center) */}
                        <g transform="translate(130, 60)">
                          <line x1="0" y1="20" x2="0" y2="35" stroke="#2C1E16" strokeWidth="3" strokeLinecap="round"/>
                          <line x1="5" y1="20" x2="8" y2="35" stroke="#2C1E16" strokeWidth="3" strokeLinecap="round"/>
                          <rect x="-3" y="5" width="11" height="15" rx="2" fill="#B47A67" />
                          <circle cx="2.5" cy="0" r="4.5" fill="#E8D8D1" />
                          <line x1="-3" y1="8" x2="-8" y2="0" stroke="#B47A67" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="8" y1="8" x2="16" y2="-2" stroke="#B47A67" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                        {/* Star held by Person 3 */}
                        <path d="M142 50 L145 56 L152 57 L147 62 L148 69 L142 66 L136 69 L137 62 L132 57 L139 56 Z" fill="#4CAF50" />

                        {/* Person 4 (Running right) */}
                        <g transform="translate(170, 70)">
                          <line x1="0" y1="15" x2="-8" y2="25" stroke="#2C1E16" strokeWidth="3" strokeLinecap="round"/>
                          <line x1="4" y1="15" x2="12" y2="20" stroke="#2C1E16" strokeWidth="3" strokeLinecap="round"/>
                          <rect x="-3" y="5" width="12" height="12" rx="2" fill="#8E5E4F" transform="skewX(-10)" />
                          <circle cx="5" cy="0" r="4" fill="#B47A67" />
                          <line x1="-3" y1="8" x2="-8" y2="15" stroke="#8E5E4F" strokeWidth="2" strokeLinecap="round" />
                          <line x1="8" y1="8" x2="14" y2="2" stroke="#8E5E4F" strokeWidth="2" strokeLinecap="round" />
                        </g>
                        
                        {/* Person 5 (Far Right) */}
                        <g transform="translate(200, 60)">
                          <line x1="-1" y1="20" x2="-3" y2="35" stroke="#2C1E16" strokeWidth="3" strokeLinecap="round"/>
                          <line x1="5" y1="20" x2="7" y2="35" stroke="#2C1E16" strokeWidth="3" strokeLinecap="round"/>
                          <rect x="-3" y="5" width="10" height="16" rx="2" fill="#2C1E16" />
                          <circle cx="2" cy="0" r="4" fill="#E8D8D1" />
                          <line x1="-3" y1="8" x2="-12" y2="-5" stroke="#2C1E16" strokeWidth="2" strokeLinecap="round" />
                          <line x1="7" y1="8" x2="12" y2="-5" stroke="#2C1E16" strokeWidth="2" strokeLinecap="round" />
                        </g>
                        {/* Star held by Person 5 */}
                        <path d="M190 45 L194 54 L204 55 L197 63 L199 73 L190 68 L181 73 L183 63 L176 55 L186 54 Z" fill="#4CAF50" />
                      </svg>
                    </div>

                    {/* Text */}
                    <p className="text-center text-[15px] text-[#2C1E16] font-medium mb-6">
                      Rate your experience with the Thealankar App
                    </p>

                    {/* 5 Stars Interactive */}
                    <div className="flex items-center justify-center gap-3 md:gap-4 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(null)}
                          onClick={() => handleStarClick(star)}
                          className="p-1 focus:outline-none transition-transform hover:scale-110 active:scale-95"
                        >
                          <Star
                            className={`w-10 h-10 md:w-12 md:h-12 transition-colors ${
                              (hoveredStar ?? 0) >= star
                                ? 'fill-[#B47A67] text-[#B47A67]'
                                : 'fill-transparent text-[#E8D8D1]'
                            }`}
                            strokeWidth={1}
                          />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 'feedback' && (
                  <motion.div
                    key="rating-form-feedback"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className={isSubmitting ? "opacity-50 pointer-events-none" : ""}
                  >
                    <p className="text-center text-[15px] text-[#2C1E16] font-medium mb-4 mt-2">
                      Rate your experience with the Thealankar App
                    </p>

                    <div className="flex items-center justify-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(null)}
                          onClick={() => handleStarClick(star)}
                          className="p-1 focus:outline-none transition-transform hover:scale-110 active:scale-95"
                        >
                          <Star
                            className={`w-10 h-10 transition-colors ${
                              (hoveredStar ?? selectedRating ?? 0) >= star
                                ? 'fill-[#B47A67] text-[#B47A67]'
                                : 'fill-transparent text-[#E8D8D1]'
                            }`}
                            strokeWidth={1}
                          />
                        </button>
                      ))}
                    </div>
                    
                    <p className="text-center text-[#B47A67] font-medium text-sm mb-6 flex items-center justify-center gap-1.5 h-5">
                      {getRatingLabel(hoveredStar ?? selectedRating) && (
                        <>
                          <Star className="w-4 h-4 fill-[#B47A67]" />
                          {getRatingLabel(hoveredStar ?? selectedRating)}
                        </>
                      )}
                    </p>

                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us more about your experience (optional)"
                      className="w-full h-28 border border-[#E8D8D1] rounded-xl p-4 text-sm text-[#2C1E16] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B47A67]/20 focus:border-[#B47A67] resize-none mb-6"
                    />

                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !selectedRating}
                      className="w-full bg-[#B47A67] text-white py-3.5 rounded-xl font-medium hover:bg-[#8E5E4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* iOS Bottom Bar Area space (only really needed on actual mobile devices, but good for styling) */}
              <div className="h-2 w-1/3 bg-gray-200 rounded-full mx-auto mt-6 md:hidden" />
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
