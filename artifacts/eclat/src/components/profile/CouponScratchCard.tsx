import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, ArrowRight, X } from 'lucide-react';
import { UserCoupon, markCouponScratched } from '@/lib/user';
import { getCouponBannerImage, getCouponIconImage } from '@/lib/coupons';

interface CouponScratchCardProps {
  userCoupon: UserCoupon;
  userId: string;
  onViewDetails: (coupon: UserCoupon) => void;
  onScratched?: () => void;
}

export default function CouponScratchCard({ userCoupon, userId, onViewDetails, onScratched }: CouponScratchCardProps) {
  const [isScratched, setIsScratched] = useState(userCoupon.isScratched);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const hasFinished = useRef(false); // guard against double-fire
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{x: number, y: number} | null>(null);

  const { couponData } = userCoupon;
  const bannerImage = getCouponBannerImage(couponData);
  const iconImage = getCouponIconImage(couponData);
  const [bannerLoadFailed, setBannerLoadFailed] = useState(false);
  const [iconLoadFailed, setIconLoadFailed] = useState(false);
  const showBannerImage = Boolean(bannerImage && !bannerLoadFailed);
  const showIconImage = Boolean(iconImage && !iconLoadFailed);

  useEffect(() => {
    setBannerLoadFailed(false);
    setIconLoadFailed(false);
  }, [userCoupon.id, bannerImage, iconImage]);

  const handleTap = () => {
    if (isScratched) return;
    setIsModalOpen(true);
  };

  // Render Canvas ONLY when modal is open and not fading out
  useEffect(() => {
    if (!isModalOpen || isScratched || isFadingOut) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const initCanvas = () => {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) {
        setTimeout(initCanvas, 50);
        return;
      }
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      const w = rect.width;
      const h = rect.height;

      // Blue gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#295BC2');
      gradient.addColorStop(1, '#1c4599');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Sparkles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '10px sans-serif';
      ctx.fillText('✦', w * 0.45, h * 0.1);
      ctx.fillText('✦', w * 0.8, h * 0.75);
      ctx.font = '8px sans-serif';
      ctx.fillText('✦', w * 0.15, h * 0.4);
      ctx.font = '12px sans-serif';
      ctx.fillText('✧', w * 0.7, h * 0.2);

      // White circle
      const cx = w / 2;
      const cy = h / 2 - 15;
      const r = 50;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Gift Box
      ctx.fillStyle = '#5F8EE1';
      ctx.fillRect(cx - 16, cy - 2, 32, 26);
      ctx.fillRect(cx - 18, cy - 8, 36, 6);
      ctx.fillStyle = '#4A75C4';
      ctx.fillRect(cx - 2, cy - 8, 4, 34);
      ctx.fillStyle = '#5F8EE1';
      ctx.beginPath();
      ctx.ellipse(cx - 9, cy - 12, 7, 5, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 9, cy - 12, 7, 5, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // Text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '500 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scratch here', w / 2, h - 35);
    };

    initCanvas();
  }, [isModalOpen, isScratched, isFadingOut]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const checkScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] < 128) transparent++;
    }
    
    const percentage = transparent / (pixels.length / 16);
    if (percentage > 0.4 && !isFadingOut) {
      finishScratch();
    }
  };

  const finishScratch = async () => {
    if (hasFinished.current) return; // prevent double-fire
    hasFinished.current = true;
    setIsFadingOut(true);

    try {
      await markCouponScratched(userId, userCoupon.id);
    } catch (err) {
      console.error('Failed to mark coupon scratched:', err);
    }

    // Step 1: show revealed card briefly (canvas fades out via AnimatePresence)
    setTimeout(() => {
      setIsScratched(true);
      if (onScratched) onScratched();

      // Step 2: close the scratch modal
      setTimeout(() => {
        setIsModalOpen(false);

        // Step 3: open the coupon details modal
        setTimeout(() => {
          onViewDetails({ ...userCoupon, isScratched: true });
        }, 350);
      }, 600);
    }, 400);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e);
    if (!coords) return;
    isDrawing.current = true;
    lastPoint.current = coords;
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, 30, 0, Math.PI * 2);
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const coords = getCoordinates(e);
    if (!coords || !lastPoint.current) return;
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 60;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    lastPoint.current = coords;
    if (Math.random() < 0.1) checkScratchPercentage();
  };

  const handlePointerUp = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      lastPoint.current = null;
      checkScratchPercentage();
    }
  };

  return (
    <>
      {/* 1. Grid Item (Static/Animating) */}
      <motion.div
        layoutId={`coupon-card-${userCoupon.id}`}
        className="relative w-full aspect-[4/4.5] rounded-3xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-[#E8D8D1]/50 bg-white group cursor-pointer"
        onClick={() => {
          if (!isScratched) {
            handleTap();
          } else {
            onViewDetails(userCoupon);
          }
        }}
      >
        {!isScratched ? (
          // Unscratched HTML for Grid
          <div className="absolute inset-0 bg-[#295BC2] flex flex-col items-center justify-center pointer-events-none">
            <div className="absolute inset-0 opacity-40" style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 10%, white 1px, transparent 1px), radial-gradient(circle at 90% 80%, white 1px, transparent 1px), radial-gradient(circle at 10% 90%, white 1px, transparent 1px), linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.8) 50%, transparent 52%) 30% 30% / 8px 8px no-repeat, linear-gradient(-45deg, transparent 48%, rgba(255,255,255,0.8) 50%, transparent 52%) 30% 30% / 8px 8px no-repeat, linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.8) 50%, transparent 52%) 70% 60% / 6px 6px no-repeat, linear-gradient(-45deg, transparent 48%, rgba(255,255,255,0.8) 50%, transparent 52%) 70% 60% / 6px 6px no-repeat',
              backgroundSize: '100% 100%'
            }} />
            <div className="absolute top-[10%] left-[45%] text-white text-[8px]">✦</div>
            <div className="absolute top-[75%] left-[80%] text-white text-[8px]">✦</div>
            <div className="absolute top-[40%] left-[15%] text-white text-[6px]">✦</div>
            
            <div className="relative z-10 w-[84px] h-[84px] bg-white rounded-full flex items-center justify-center mb-5">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="10" y="22" width="28" height="22" rx="2" fill="#5F8EE1"/>
                <rect x="8" y="16" width="32" height="6" rx="1" fill="#5F8EE1"/>
                <rect x="22" y="16" width="4" height="28" fill="#4A75C4"/>
                <path d="M24 16C24 16 20 8 14 10C8 12 12 16 24 16Z" fill="#5F8EE1"/>
                <path d="M24 16C24 16 28 8 34 10C40 12 36 16 24 16Z" fill="#5F8EE1"/>
              </svg>
            </div>
            <span className="relative z-10 text-white/90 text-[13px] font-medium tracking-wide">
              Tap to scratch
            </span>
          </div>
        ) : (
          // Scratched HTML for Grid
          <div className="absolute inset-0 bg-white flex flex-col items-center justify-between pointer-events-none">
            <div className="absolute inset-0 bg-[#F7F1EE]">
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
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/75 to-white" />
            <div className="relative z-10 flex flex-col items-center p-4 pt-7 text-center flex-1 w-full">
              <div className="w-12 h-12 rounded-full border border-gray-100 overflow-hidden flex items-center justify-center mb-3 bg-white shadow-sm shrink-0">
                {showIconImage ? (
                  <img
                    src={iconImage}
                    alt={couponData.brandName}
                    className="w-full h-full object-cover"
                    onError={() => setIconLoadFailed(true)}
                  />
                ) : (
                  <Gift className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <h4 className="font-semibold text-[#4A4A4A] text-[13px] tracking-wide mb-1.5 w-full truncate px-2">{couponData.brandName}</h4>
              <p className="text-[#1A1A1A] text-[15px] font-bold leading-tight line-clamp-2 w-full px-1">{couponData.title}</p>
            </div>
            
            <div className="relative z-10 w-full border-t border-dashed border-gray-200 bg-white/95">
              <div className="w-full py-3.5 flex items-center justify-center gap-1.5 text-[#8E5E4F] text-[14px] font-semibold">
                View details 
                <div className="w-4 h-4 rounded-full bg-[#8E5E4F] text-white flex items-center justify-center">
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* 2. Interactive Scratch Modal */}
      <AnimatePresence mode="wait">
        {isModalOpen && (
          <motion.div
            key={`scratch-modal-${userCoupon.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          >
            {/* Backdrop - only close manually if not auto-closing */}
            <div
              onClick={() => { if (!isFadingOut) setIsModalOpen(false); }}
              className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            />

            {/* Rays */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
              animate={{ opacity: 1, scale: 2, rotate: 3600 }}
              transition={{ duration: 60, ease: "linear", repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg 30deg, rgba(255,255,255,0.1) 30deg 45deg, transparent 45deg 120deg, rgba(255,255,255,0.1) 120deg 135deg, transparent 135deg 210deg, rgba(255,255,255,0.1) 210deg 225deg, transparent 225deg 300deg, rgba(255,255,255,0.1) 300deg 315deg, transparent 315deg 360deg)'
              }}
            />

            {/* Close Button */}
            <button
              onClick={() => { if (!isFadingOut) setIsModalOpen(false); }}
              className="absolute top-6 right-6 text-white p-2 z-[1010] hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* The Central Interactive Card */}
            <motion.div
              layoutId={`coupon-card-${userCoupon.id}`}
              className="relative w-full max-w-[320px] aspect-[4/3.5] rounded-3xl overflow-hidden shadow-2xl bg-white touch-none z-[1010]"
            >
              {/* Revealed Content (underneath foil) */}
              <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="absolute inset-0 bg-[#F7F1EE]">
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
                <div className="absolute inset-0 bg-white/82 backdrop-blur-[1px]" />
                <div className="relative z-10 w-16 h-16 rounded-full border border-gray-100 overflow-hidden flex items-center justify-center mb-4 bg-white shadow-sm shrink-0">
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
                <h4 className="relative z-10 font-semibold text-[#4A4A4A] text-[16px] tracking-wide mb-2 w-full truncate">{couponData.brandName}</h4>
                <p className="relative z-10 text-[#1A1A1A] text-[18px] font-bold leading-tight w-full">{couponData.title}</p>
                {isScratched && <p className="relative z-10 text-[#8E5E4F] text-[13px] mt-4 font-semibold animate-pulse">Loading your reward...</p>}
              </div>

              {/* Canvas Foil Layer */}
              <AnimatePresence>
                {(!isScratched && !isFadingOut) && (
                  <motion.canvas
                    ref={canvasRef}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className="absolute inset-0 w-full h-full z-10 cursor-crosshair touch-none"
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
