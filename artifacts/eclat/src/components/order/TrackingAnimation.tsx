import { motion } from 'framer-motion';
import { CheckCircle2, Package, Truck, ShieldCheck } from 'lucide-react';
import { OrderStatus } from '@/lib/types';

interface TrackingAnimationProps {
  status: OrderStatus;
  className?: string;
}

export default function TrackingAnimation({ status, className = "" }: TrackingAnimationProps) {
  const steps = [
    { label: 'Placed', icon: CheckCircle2, status: ['Verified', 'Processing', 'Shipped', 'Delivered'].includes(status) ? 'done' : 'current' },
    { label: 'Processing', icon: Package, status: ['Processing', 'Shipped', 'Delivered'].includes(status) ? 'done' : status === 'Verified' ? 'current' : 'upcoming' },
    { label: 'Shipped', icon: Truck, status: ['Shipped', 'Delivered'].includes(status) ? 'done' : status === 'Processing' ? 'current' : 'upcoming' },
    { label: 'Delivered', icon: ShieldCheck, status: status === 'Delivered' ? 'done' : status === 'Shipped' ? 'current' : 'upcoming' },
  ];

  const doneCount = steps.filter(s => s.status === 'done').length;
  const progressPercent = doneCount === 0 ? 0 : ((doneCount - 1) / (steps.length - 1)) * 100;

  return (
    <div className={`relative ${className}`}>
      {/* Horizontal Line Container */}
      <div className="absolute top-5 left-[12.5%] right-[12.5%] h-0.5 bg-[#F7F1EE] hidden md:block" />
      
      {/* Progress Line */}
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${progressPercent * 0.75}%` }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="absolute top-5 left-[12.5%] h-0.5 bg-[#B47A67] hidden md:block origin-left"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex flex-col items-center text-center gap-3 relative z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-700 border-2 ${
                step.status === 'done' 
                  ? 'bg-[#B47A67] border-[#B47A67] shadow-lg shadow-[#B47A67]/20' 
                  : step.status === 'current'
                    ? 'bg-white border-[#B47A67] ring-4 ring-[#B47A67]/10'
                    : 'bg-white border-[#F7F1EE]'
              }`}>
                <Icon className={`w-4 h-4 ${step.status === 'done' ? 'text-white' : step.status === 'current' ? 'text-[#B47A67]' : 'text-[#8E5E4F]/20'}`} />
              </div>
              <span className={`text-[9px] tracking-[0.2em] uppercase font-bold ${step.status === 'upcoming' ? 'text-[#8E5E4F]/30' : 'text-[#8E5E4F]'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
