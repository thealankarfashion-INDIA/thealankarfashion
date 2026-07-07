import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, User, Sparkles, ChevronRight, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";

interface AdminLoginProps {
  onLogin: () => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authStep, setAuthStep] = useState<'username' | 'password'>('username');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (authStep === 'username') {
      if (!username) {
        setError('Please enter a valid username');
        return;
      }
      setAuthStep('password');
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    });
    if (authError) {
      setError("Invalid credentials. Please check your email and password.");
      setLoading(false);
      return;
    }
    const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
    if (roleError || isAdmin !== true) {
      await supabase.auth.signOut();
      setError("This account is not authorized for admin access.");
      setLoading(false);
      return;
    }
    await onLogin();
    setLoading(false);
  };

  const AuthForm = (
    <div className="flex flex-col h-full">
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />
      
      <h2 className="text-center text-lg font-semibold text-[#8E5E4F] mb-6">
        {authStep === 'username' ? 'Admin Portal Access' : 'Enter Admin Password'}
      </h2>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl text-center font-medium border border-red-100"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 flex flex-col items-center w-full">
        {authStep === 'username' ? (
          <div className="w-full relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-gray-300 pr-3">
              <User className="w-5 h-5 text-[#8E5E4F]/50" />
            </div>
            <input 
              type="text" required
              placeholder="Enter Admin Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              className="w-full pl-[60px] pr-4 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-lg text-[#8E5E4F] placeholder-[#8E5E4F]/40 outline-none focus:border-[#B47A67] focus:ring-1 focus:ring-[#B47A67] transition-all"
            />
          </div>
        ) : (
          <div className="w-full space-y-3">
            <div className="text-sm text-center text-[#8E5E4F] mb-2 font-medium">
              {username} <button type="button" onClick={() => setAuthStep('username')} className="text-[#B47A67] underline ml-2 text-xs">Edit</button>
            </div>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} required placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full pl-4 pr-11 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-md text-[#8E5E4F] placeholder-[#8E5E4F]/40 outline-none focus:border-[#B47A67] transition-all"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E5E4F]/40 hover:text-[#B47A67] transition-colors">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        <button type="submit" disabled={loading || !username}
          className="w-full py-3.5 mt-2 bg-[#B47A67] text-white rounded-xl text-lg font-bold tracking-wide hover:bg-[#8E5E4F] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          ) : (
            <span className="flex items-center justify-center gap-2">
              {authStep === 'username' ? 'Continue' : 'Sign In'}
              <ChevronRight className="w-5 h-5" />
            </span>
          )}
        </button>
      </form>

      <div className="mt-auto pt-8 text-center">
        <Link href="/" className="text-xs text-[#8E5E4F]/60 hover:text-[#B47A67] transition-colors flex items-center justify-center gap-2">
          <ArrowLeft className="w-3 h-3" /> Back to main site
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F1EE]">
      {/* ─── MOBILE LAYOUT ─── */}
      <div className="md:hidden min-h-screen bg-[#111111] flex flex-col overflow-x-hidden">
        <div className="flex-1 flex flex-col">
          <div className="pt-12 pb-8 px-6 relative z-10 flex flex-col items-center">
            <h1 className="text-white text-3xl font-black text-center leading-tight tracking-tight mt-4 drop-shadow-md">
              ADMIN PANEL <br/> ACCESS
            </h1>
            <div className="mt-4 bg-[#B47A67] px-5 py-2 transform -skew-x-6 shadow-lg">
              <span className="text-white font-serif text-xl italic font-bold tracking-widest block transform skew-x-6">Thealankar</span>
            </div>
          </div>
          
          <div className="relative w-full flex-1 min-h-[250px] bg-gradient-to-b from-[#111111] to-[#E8D8D1] -mt-12">
            <img 
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop" 
              alt="Office" 
              className="absolute inset-0 w-full h-full object-cover object-center mix-blend-overlay opacity-90" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-[#111111]/80 pointer-events-none" />
          </div>

          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-white rounded-t-[32px] px-8 pt-8 pb-10 z-20 w-full -mt-8 flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.1)]"
          >
            {AuthForm}
          </motion.div>
        </div>
      </div>

      {/* ─── DESKTOP LAYOUT ─── */}
      <div className="hidden md:flex min-h-screen">
        {/* Left Side: Hero Branding */}
        <div className="w-[55%] relative overflow-hidden bg-[#111111] flex flex-col justify-between p-16">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600&auto=format&fit=crop" 
            alt="Office" 
            className="absolute inset-0 w-full h-full object-cover object-center opacity-40" 
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#111111]/95 via-[#2C1E16]/80 to-transparent pointer-events-none" />
          
          {/* Brand Name */}
          <div className="relative z-10">
            <div className="bg-[#B47A67] px-6 py-2.5 transform -skew-x-6 shadow-2xl inline-block">
              <span className="text-white font-serif text-3xl italic font-bold tracking-widest block transform skew-x-6">Thealankar</span>
            </div>
          </div>

          {/* Central Headline */}
          <div className="relative z-10">
            <motion.h1 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white text-6xl font-black leading-tight tracking-tight drop-shadow-2xl mb-8"
            >
              SECURE<br/>ADMIN<br/>PANEL
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/60 text-lg leading-relaxed max-w-sm"
            >
              Management dashboard for products, orders, and customer insights. Authorized personnel only.
            </motion.p>
          </div>

          {/* Bottom Feature Pills */}
          <div className="relative z-10 flex flex-wrap gap-4">
            {['✦ Inventory Control', '✦ Order Tracking', '✦ Analytics'].map((f, i) => (
              <motion.div 
                key={f}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + (i * 0.1) }}
                className="bg-white/10 border border-white/20 text-white/90 text-sm font-semibold px-6 py-2.5 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors cursor-default"
              >
                {f}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-[45%] flex items-center justify-center p-16 bg-[#F7F1EE]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[440px]"
          >
            {/* Context Logo */}
            <div className="mb-10 pl-2 border-l-4 border-[#B47A67]">
              <div className="font-serif text-4xl text-[#8E5E4F] italic font-bold tracking-wider mb-2">Thealankar</div>
              <p className="text-[#8E5E4F]/60 text-base">Welcome Back Admin — Access your dashboard</p>
            </div>

            <div className="bg-white rounded-3xl p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-[#E8D8D1]/60">
              {AuthForm}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-[11px] text-[#8E5E4F]/40 uppercase tracking-[0.2em] font-bold">
                Security Protocol Active &bull; AES-256 Encrypted
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
