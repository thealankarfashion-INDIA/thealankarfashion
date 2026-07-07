import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Package, Truck, ShieldCheck, MapPin, CreditCard, Calendar, Sparkles, Gift, ShoppingBag, ArrowRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import type { Order } from '@/lib/types';
import TrackingAnimation from '@/components/order/TrackingAnimation';
import { Printer } from 'lucide-react';
import { doc, onSnapshot } from '@/lib/supabaseStore';
import { getDB } from '@/lib/supabase';
import { printInvoice } from '@/lib/invoice';
import PaymentProgressAnimation from '@/components/payment/PaymentProgressAnimation';
// ─── Success Sound Effect via Web Audio API ───────────────────────────
function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // GPay style sound: Two quick clear high-pitched dings
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.2);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1396.91, ctx.currentTime + 0.15); // F6
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
    gain2.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.8);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1396.91, ctx.currentTime + 0.15);
    gain3.gain.setValueAtTime(0, ctx.currentTime + 0.15);
    gain3.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.17);
    gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(ctx.currentTime + 0.15);
    osc3.stop(ctx.currentTime + 0.6);

    // Cleanup
    setTimeout(() => ctx.close(), 1000);
  } catch (e) {
    // Audio not available, silently ignore
  }
}

// ─── Confetti Particle System ─────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  shape: 'rect' | 'circle' | 'star';
  opacity: number;
  gravity: number;
  life: number;
  maxLife: number;
}

const CONFETTI_COLORS = [
  '#C59B62', '#B47A67', '#8E5E4F', '#CF6B8D', '#D4AF37',
  '#E8D8D1', '#1BCC7B', '#FFD700', '#FF69B4', '#FFA07A',
  '#87CEEB', '#F7F1EE', '#FF6347', '#9370DB',
];

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create initial burst of particles
    const createBurst = (count: number, originX: number, originY: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 4 + Math.random() * 12;
        const maxLife = 120 + Math.random() * 100;
        particlesRef.current.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 4,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 4 + Math.random() * 8,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 15,
          shape: (['rect', 'circle', 'star'] as const)[Math.floor(Math.random() * 3)],
          opacity: 1,
          gravity: 0.12 + Math.random() * 0.08,
          life: 0,
          maxLife,
        });
      }
    };

    // Multi-point burst
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.32;
    setTimeout(() => createBurst(80, centerX, centerY), 300);
    setTimeout(() => createBurst(40, centerX - 100, centerY - 50), 500);
    setTimeout(() => createBurst(40, centerX + 100, centerY - 50), 500);
    setTimeout(() => createBurst(30, centerX, centerY - 80), 700);

    // Side cannons
    setTimeout(() => createBurst(35, 50, canvas.height * 0.6), 600);
    setTimeout(() => createBurst(35, canvas.width - 50, canvas.height * 0.6), 600);

    const drawStar = (cx: number, cy: number, size: number) => {
      const spikes = 5;
      const outerR = size;
      const innerR = size / 2;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI * i) / spikes - Math.PI / 2;
        const method = i === 0 ? 'moveTo' : 'lineTo';
        ctx[method](cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter(p => {
        p.life++;
        if (p.life > p.maxLife) return false;

        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;
        p.opacity = Math.max(0, 1 - p.life / p.maxLife);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(0, 0, p.size / 2);
        }

        ctx.restore();
        return true;
      });

      if (particlesRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

function AnimatedCheckmark() {
  return (
    <div className="relative flex items-center justify-center w-32 h-32 md:w-40 md:h-40">
      {/* Outer softer ring */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute rounded-full bg-[#1BCC7B]/10 w-28 h-28 md:w-32 md:h-32 flex items-center justify-center"
      >
        {/* Main Circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.1, 1] }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-lg overflow-hidden"
          style={{ background: '#1BCC7B' }}
        >
          {/* Checkmark SVG */}
          <svg
            className="w-10 h-10 md:w-12 md:h-12 z-20"
            viewBox="0 0 52 52"
            fill="none"
          >
            <motion.path
              d="M14 27L22 35L38 19"
              stroke="white"
              strokeWidth="5"
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

// ─── Floating Badge Animation ─────────────────────────────────────────
function FloatingBadge({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, type: 'spring', stiffness: 150, damping: 15 }}
    >
      {children}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
export default function OrderConfirmation() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'progress' | 'animating' | 'details'>('loading');
  const [tempAmount, setTempAmount] = useState<number>(1);
  const soundPlayedRef = useRef(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedOrderId = sessionStorage.getItem('last_order_id');
    const orderIdFromUrl = new URLSearchParams(window.location.search).get('id');
    const id = orderIdFromUrl || storedOrderId;

    try {
      const checkoutRaw = sessionStorage.getItem('thealankar_order');
      if (checkoutRaw) {
        const parsed = JSON.parse(checkoutRaw);
        if (parsed.orderTotal) setTempAmount(parsed.orderTotal);
      }
    } catch(e) {}

    if (id) {
      const db = getDB();
      const unsub = onSnapshot(doc(db, 'orders', id), (snap) => {
        if (snap.exists()) {
          setOrder({ id: snap.id, ...snap.data() } as Order);
        }
        setLoading(false);
      });
      return () => unsub();
    } else {
      setLoading(false);
      return undefined;
    }
  }, []);

  // Trigger animations and sound after loading
  useEffect(() => {
    if (!loading && !soundPlayedRef.current && order) {
      soundPlayedRef.current = true;
      setPhase('progress');

      // 3 seconds Progress animation
      setTimeout(() => {
        setPhase('animating');
        setShowConfetti(true);
        setTimeout(() => playSuccessSound(), 100);

        // 3.5 seconds GPay animation phase
        setTimeout(() => {
          setShowConfetti(false);
          const targetOrderId = order?.orderId || sessionStorage.getItem('last_order_id');
          if (targetOrderId) {
            // Ensure sessionStorage is set so guest users can access the order details
            sessionStorage.setItem('last_order_id', targetOrderId);
            setLocation(`/order/${targetOrderId}`);
          } else {
            setLocation('/shop');
          }
        }, 3500);
      }, 3000);
    }
  }, [loading, order, setLocation]);

  if (loading || phase === 'progress') {
    return <PaymentProgressAnimation amount={order?.total || tempAmount} />;
  }

  if (phase === 'animating') {
    return (
      <div className="fixed inset-0 bg-white z-[200] flex flex-col items-center justify-center">
        <AnimatePresence>
          {showConfetti && <ConfettiCanvas />}
        </AnimatePresence>

        <AnimatedCheckmark />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-6 text-center"
        >
          <h2 className="text-xl md:text-2xl font-bold text-[#8E5E4F] tracking-tight">₹{order?.total.toLocaleString() || tempAmount.toLocaleString()} paid successfully</h2>
        </motion.div>
      </div>
    );
  }

  return null;
}
