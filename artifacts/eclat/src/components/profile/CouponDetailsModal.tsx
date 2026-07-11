import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Check } from 'lucide-react';
import { UserCoupon } from '@/lib/user';
import { useLocation } from 'wouter';
import { getCouponBannerImage, getCouponIconImage } from '@/lib/coupons';

interface CouponDetailsModalProps {
  userCoupon: UserCoupon | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CouponDetailsModal({ userCoupon, isOpen, onClose }: CouponDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [bannerLoadFailed, setBannerLoadFailed] = useState(false);
  const [iconLoadFailed, setIconLoadFailed] = useState(false);
  const [, setLocation] = useLocation();

  const couponData = userCoupon?.couponData;
  const bannerImage = getCouponBannerImage(couponData);
  const iconImage = getCouponIconImage(couponData);
  const showBannerImage = Boolean(bannerImage && !bannerLoadFailed);
  const showIconImage = Boolean(iconImage && !iconLoadFailed);

  useEffect(() => {
    setBannerLoadFailed(false);
    setIconLoadFailed(false);
  }, [userCoupon?.id, bannerImage, iconImage]);

  if (!userCoupon || !couponData) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(couponData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with rays */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-[1px] flex items-center justify-center overflow-hidden"
          >
            {/* Full screen rotating rays behind modal */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute w-[200vw] h-[200vw] pointer-events-none opacity-40"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg 15deg, rgba(255,255,255,1) 15deg 30deg, transparent 30deg 75deg, rgba(255,255,255,1) 75deg 90deg, transparent 90deg 135deg, rgba(255,255,255,1) 135deg 150deg, transparent 150deg 195deg, rgba(255,255,255,1) 195deg 210deg, transparent 210deg 255deg, rgba(255,255,255,1) 255deg 270deg, transparent 270deg 315deg, rgba(255,255,255,1) 315deg 330deg, transparent 330deg 360deg)'
              }}
            />
          </motion.div>

          {/* Modal Container */}
          <div className="fixed inset-0 z-[999] flex flex-col items-center justify-end md:justify-center p-0 md:p-4 pointer-events-none">
            
            {/* Top Card (The Revealed Coupon) - Desktop & Mobile */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="bg-white rounded-[24px] shadow-xl w-full max-w-[340px] px-6 pb-6 pt-12 flex flex-col items-center text-center relative z-10 pointer-events-auto mb-[-24px] md:mb-6"
            >
              <div className="absolute inset-0 rounded-[24px] overflow-hidden bg-[#F7F1EE]">
                {showBannerImage ? (
                  <img
                    src={bannerImage}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setBannerLoadFailed(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#FFF8F1] via-[#F7F1EE] to-[#E8D8D1]" />
                )}
              </div>
              <div className="absolute inset-0 rounded-[24px] bg-white/82 backdrop-blur-[1px]" />
              <div className="absolute -top-10 z-20 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                <div className="w-[72px] h-[72px] rounded-full border border-gray-100 overflow-hidden flex items-center justify-center bg-white">
                  {showIconImage ? (
                    <img
                      src={iconImage}
                      alt={couponData.brandName}
                      className="w-full h-full object-cover"
                      onError={() => setIconLoadFailed(true)}
                    />
                  ) : (
                    <Gift className="w-8 h-8 text-gray-400" />
                  )}
                </div>
              </div>
              
              <div className="relative z-10 w-full">
                <h2 className="text-[19px] font-bold text-[#1A1A1A] mb-2">{couponData.brandName}</h2>
                <p className="text-[15px] text-[#4A4A4A] font-medium leading-snug mb-3 px-2">
                  {couponData.title}
                </p>
                <p className="text-[13px] text-gray-500 font-medium">
                  {couponData.subtitle}
                </p>
              </div>
            </motion.div>

            {/* Bottom Sheet (Coupon Details) */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full md:max-w-[420px] rounded-t-[24px] md:rounded-[24px] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-6 pt-7 pb-8 relative pointer-events-auto flex flex-col"
            >
              {/* Desktop close button */}
              <button 
                onClick={onClose}
                className="absolute -top-12 right-0 p-2 text-white hover:bg-white/20 rounded-full transition-colors hidden md:block"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="text-center mb-6">
                <h3 className="text-[17px] font-semibold text-[#4A4A4A]">Coupon Details</h3>
              </div>

              <div className="mb-8">
                <h4 className="text-[15px] font-bold text-[#1A1A1A] mb-1.5">About {couponData.brandName}</h4>
                <p className="text-[14px] text-gray-500 leading-relaxed">
                  {couponData.description || `${couponData.brandName} is a premium brand committed to delivering truly remarkable customer experiences.`}
                </p>
              </div>

              <div className="flex items-center justify-between mb-8">
                <div className="px-5 py-2.5 border-[1.5px] border-dashed border-[#A5C0F3] bg-[#F2F6FE] rounded-lg">
                  <span className="font-sans text-[15px] font-bold text-[#1A1A1A] uppercase tracking-wide">{couponData.code}</span>
                </div>
                <button 
                  onClick={handleCopy}
                  className="text-[#8E5E4F] text-[14px] font-semibold uppercase tracking-wide hover:opacity-80 transition-opacity flex items-center gap-1"
                >
                  {copied ? <><Check className="w-4 h-4" /> Copied</> : "TAP TO COPY"}
                </button>
              </div>

              <button onClick={() => setLocation(`/checkout?promo=${couponData.code}`)} className="w-full py-3.5 bg-[#8E5E4F] text-white rounded-[12px] text-[16px] font-semibold hover:bg-[#B47A67] transition-colors shadow-sm mt-auto">
                Claim Offer
              </button>
            </motion.div>

          </div>
          
          {/* Mobile close button (floating at top right) */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed top-4 right-4 z-[1000] p-1.5 text-white bg-transparent md:hidden"
          >
            <X className="w-7 h-7" />
          </motion.button>
        </>
      )}
    </AnimatePresence>
  );
}
