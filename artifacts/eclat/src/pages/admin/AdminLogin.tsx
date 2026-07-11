import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, ChevronRight, ArrowLeft, Mail } from "lucide-react";
import { Link } from "wouter";
import {
  clearAdminRecoveryRedirect,
  clearAdminRecoveryError,
  getAdminRecoveryError,
  hasAdminRecoveryRedirect,
  markAdminRecoveryRequested,
  supabase,
} from "@/lib/supabase";

const ADMIN_EMAIL = "thealankar.fashion@gmail.com";
type AdminResetStep = "email" | "link" | "password";

interface AdminLoginProps {
  onLogin: () => void;
  mode?: "login" | "reset";
}

function getAdminResetRedirectUrl() {
  return `${window.location.origin}/admin/reset-password`;
}

function getCleanPathname(pathname = "") {
  const cleanPath = pathname.replace(/\/+$/, "");
  return cleanPath || "/";
}

function normalizeToAdminResetRoute() {
  const adminResetUrl = `${window.location.origin}/admin/reset-password`;
  const currentUrl = `${window.location.origin}${window.location.pathname}`;
  if (currentUrl !== adminResetUrl || window.location.search || window.location.hash) {
    window.history.replaceState(null, "", adminResetUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

function getAdminQueryMode() {
  const hash = window.location.hash || "";
  const path = getCleanPathname(window.location.pathname || "");
  const search = window.location.search || "";
  const queryIndex = hash.indexOf("?");
  if (hash.includes("type=recovery") || hash.includes("access_token=") || hash.includes("refresh_token=")) {
    return new URLSearchParams(hash.replace(/^#\/?/, ""));
  }
  if (search.includes("admin-reset=1") || search.includes("type=recovery")) {
    return new URLSearchParams(search.replace(/^\?/, ""));
  }
  if (path === "/admin/reset-password" || path === "/admin/forgot-password") {
    return new URLSearchParams("admin-reset=1");
  }
  if (queryIndex === -1) return null;
  return new URLSearchParams(hash.slice(queryIndex + 1));
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isAdminEmail(value: string) {
  return normalizeEmail(value) === ADMIN_EMAIL;
}

export function AdminLogin({ onLogin, mode = "login" }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authStep, setAuthStep] = useState<'email' | 'password'>('email');
  const [resetMode, setResetMode] = useState(mode === "reset");
  const [resetStep, setResetStep] = useState<AdminResetStep>("email");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const recoveryProcessedRef = useRef(false);
  const queryParams = typeof window === "undefined" ? null : getAdminQueryMode();
  const recoveryError = getAdminRecoveryError();
  const queryMode =
    recoveryError
      ? "reset"
      : hasAdminRecoveryRedirect() || queryParams?.get("type") === "recovery" || queryParams?.has("access_token")
      ? "recovery"
      : queryParams?.get("reset") === "1" || queryParams?.get("admin-reset") === "1"
        ? "reset"
        : "";

  useEffect(() => {
    if (mode === "reset" || queryMode === "reset" || queryMode === "recovery") {
      setResetMode(true);
      if (queryMode === "recovery") setResetStep("password");
    }
    if (recoveryError) {
      setEmail(ADMIN_EMAIL);
      setError(recoveryError);
      setResetStep("email");
    }
  }, [mode, queryMode, recoveryError]);

  useEffect(() => {
    if (!resetMode) return;

    let active = true;

    const rejectRecoverySession = async (messageText: string) => {
      await supabase.auth.signOut();
      if (!active) return;
      clearAdminRecoveryRedirect();
      setRecoveryReady(false);
      setResetStep("email");
      setError(messageText);
    };

    const authorizeRecoverySession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      if (!session) {
        if (active) setRecoveryReady(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !isAdminEmail(userData.user?.email || "")) {
        await rejectRecoverySession("This reset link is not for the registered admin account.");
        return;
      }

      const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
      if (roleError || isAdmin !== true) {
        await rejectRecoverySession("This account is not authorized for admin access.");
        return;
      }

      if (!active) return;
      clearAdminRecoveryError();
      setEmail(normalizeEmail(userData.user?.email || ADMIN_EMAIL));
      setRecoveryReady(true);
      setResetStep("password");
      setError("");
      normalizeToAdminResetRoute();
    };

    const prepareRecovery = async () => {
      if (recoveryProcessedRef.current) return;
      recoveryProcessedRef.current = true;
      setAuthLoading(true);
      const code = new URLSearchParams(window.location.search).get("code");
      if (import.meta.env.DEV) {
        console.log("Recovery pathname:", window.location.pathname);
        console.log("Recovery code present:", Boolean(code));
      }
      if (code) {
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError || !exchangeData.session) {
          if (!active) return;
          clearAdminRecoveryRedirect();
          setRecoveryReady(false);
          setResetStep("email");
          setError("This reset link is invalid or expired. Send a fresh reset email and open the newest email only.");
          setAuthLoading(false);
          normalizeToAdminResetRoute();
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      await authorizeRecoverySession(data.session);
      if (active) setAuthLoading(false);
    };

    void prepareRecovery();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (import.meta.env.DEV) {
        console.log("Admin recovery auth event:", event);
        console.log("Recovery session ready:", Boolean(session));
      }
      if (event === "PASSWORD_RECOVERY" || (session && hasAdminRecoveryRedirect())) {
        setAuthLoading(true);
        void authorizeRecoverySession(session).finally(() => {
          if (active) setAuthLoading(false);
        });
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [resetMode]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!newPassword || newPassword.length < 8) {
      setError("Please enter a password with at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (!recoveryReady) {
      setError("The password recovery session is not ready. Open the newest reset email first.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setError(updateError.message || "Password reset failed. Please try again.");
      setLoading(false);
      return;
    }

    setMessage("Password updated. Please sign in again with your new password.");
    setNewPassword("");
    setConfirmNewPassword("");
    await supabase.auth.signOut();
    clearAdminRecoveryRedirect();
    setResetMode(false);
    setResetStep("email");
    setAuthStep("email");
    setLoading(false);
    window.history.replaceState(null, "", `${window.location.origin}/admin/login`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const sendPasswordResetEmail = async () => {
    setError("");
    setMessage("");

    const loginEmail = normalizeEmail(email);

    if (!loginEmail) {
      setError("Enter your admin email first, then we can send the reset email.");
      return;
    }

    if (!isAdminEmail(loginEmail)) {
      setMessage("If this admin email exists, a reset email has been sent.");
      return;
    }

    setLoading(true);
    const redirectTo = getAdminResetRedirectUrl();
    if (import.meta.env.DEV) {
      console.log("Admin reset redirect URL:", redirectTo);
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message || "Could not send reset email. Please wait a minute and try again.");
      setLoading(false);
      return;
    }

    clearAdminRecoveryError();
    markAdminRecoveryRequested();
    setEmail(loginEmail);
    setResetMode(true);
    setResetStep("link");
    setMessage("Reset email sent. Open the Reset password link in that email, then set your new password here.");
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (resetMode) {
      if (resetStep === "password") {
        await handleResetPassword(e);
      } else {
        await sendPasswordResetEmail();
      }
      return;
    }

    if (authStep === 'email') {
      const loginEmail = normalizeEmail(email);
      if (!loginEmail || !loginEmail.includes("@")) {
        setError("Please enter the admin email address.");
        return;
      }
      if (!isAdminEmail(loginEmail)) {
        setError("This email is not authorized for admin access.");
        return;
      }
      setEmail(loginEmail);
      setAuthStep('password');
      return;
    }

    setLoading(true);
    const loginEmail = normalizeEmail(email);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    if (authError) {
      setError("Invalid credentials. Please check your email and password.");
      setLoading(false);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (!isAdminEmail(userData.user?.email || "")) {
      await supabase.auth.signOut();
      setError("This account is not authorized for admin access.");
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
        {resetMode ? 'Reset Admin Password' : authStep === 'email' ? 'Admin Portal Access' : 'Enter Admin Password'}
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

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-green-50 text-green-700 text-xs rounded-xl text-center font-medium border border-green-100"
        >
          {message}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 flex flex-col items-center w-full">
        {resetMode ? (
          <div className="w-full space-y-3">
            {authLoading && (
              <div className="text-xs text-center text-[#8E5E4F] bg-[#FBF6F3] border border-[#E8D8D1] rounded-xl p-3">
                Preparing secure reset session...
              </div>
            )}
            {resetStep === "email" && (
              <>
                <div className="w-full relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-gray-300 pr-3">
                    <Mail className="w-5 h-5 text-[#8E5E4F]/50" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Enter Admin Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    className="w-full pl-[60px] pr-4 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-lg text-[#8E5E4F] placeholder-[#8E5E4F]/40 outline-none focus:border-[#B47A67] focus:ring-1 focus:ring-[#B47A67] transition-all"
                  />
                </div>
                <div className="text-[11px] text-[#8E5E4F]/60 bg-[#FBF6F3] border border-[#E8D8D1] rounded-xl p-3">
                  Supabase is currently sending a secure reset link to the registered admin email.
                </div>
              </>
            )}

            {resetStep === "link" && (
              <>
                <div className="text-sm text-center text-[#8E5E4F] mb-2 font-medium">
                  {email} <button type="button" onClick={() => setResetStep("email")} className="text-[#B47A67] underline ml-2 text-xs">Edit</button>
                </div>
                <div className="text-xs text-center text-[#8E5E4F]/70 bg-[#FBF6F3] border border-[#E8D8D1] rounded-xl p-4 leading-relaxed">
                  Open the latest Supabase email and click <strong>Reset password</strong> or <strong>Sign in</strong>. After it opens this page again, you can set the new admin password.
                </div>
                <button
                  type="button"
                  onClick={sendPasswordResetEmail}
                  className="w-full text-xs font-semibold tracking-wide text-[#B47A67] hover:text-[#8E5E4F] transition-colors"
                >
                  Resend reset email
                </button>
              </>
            )}

            {resetStep === "password" && (
              <>
                <div className="w-full relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-gray-300 pr-3">
                    <Lock className="w-5 h-5 text-[#8E5E4F]/50" />
                  </div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    disabled={!recoveryReady}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                    className="w-full pl-[60px] pr-11 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-lg text-[#8E5E4F] placeholder-[#8E5E4F]/40 outline-none focus:border-[#B47A67] focus:ring-1 focus:ring-[#B47A67] transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E5E4F]/40 hover:text-[#B47A67] transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-gray-300 pr-3">
                    <Lock className="w-5 h-5 text-[#8E5E4F]/50" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    disabled={!recoveryReady}
                    placeholder="Confirm New Password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full pl-[60px] pr-11 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-md text-[#8E5E4F] placeholder-[#8E5E4F]/40 outline-none focus:border-[#B47A67] transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E5E4F]/40 hover:text-[#B47A67] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="text-[11px] text-[#8E5E4F]/60 bg-[#FBF6F3] border border-[#E8D8D1] rounded-xl p-3">
                  Password must be at least 8 characters. Both password fields must match.
                </div>
                {!recoveryReady && (
                  <div className="text-xs text-center text-[#8E5E4F]/60 bg-[#FBF6F3] border border-[#E8D8D1] rounded-xl p-3">
                    Open the reset email first so Supabase can allow a password update.
                  </div>
                )}
              </>
            )}
          </div>
        ) : authStep === 'email' ? (
          <div className="w-full relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-gray-300 pr-3">
              <Mail className="w-5 h-5 text-[#8E5E4F]/50" />
            </div>
            <input 
              type="email" required
              placeholder="Enter Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className="w-full pl-[60px] pr-4 py-3.5 bg-white border border-[#E8D8D1] rounded-xl text-lg text-[#8E5E4F] placeholder-[#8E5E4F]/40 outline-none focus:border-[#B47A67] focus:ring-1 focus:ring-[#B47A67] transition-all"
            />
          </div>
        ) : (
          <div className="w-full space-y-3">
            <div className="text-sm text-center text-[#8E5E4F] mb-2 font-medium">
              {email} <button type="button" onClick={() => setAuthStep('email')} className="text-[#B47A67] underline ml-2 text-xs">Edit</button>
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
            <button
              type="button"
              onClick={sendPasswordResetEmail}
              className="w-full text-xs font-semibold tracking-wide text-[#B47A67] hover:text-[#8E5E4F] transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="w-3.5 h-3.5" />
              Forgot password? Send reset email
            </button>
          </div>
        )}

        <button type="submit" disabled={loading || authLoading || (resetMode && resetStep === "password" && !recoveryReady) || (!resetMode && !email)}
          className="w-full py-3.5 mt-2 bg-[#B47A67] text-white rounded-xl text-lg font-bold tracking-wide hover:bg-[#8E5E4F] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
          {loading || authLoading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          ) : (
            <span className="flex items-center justify-center gap-2">
              {resetMode ? resetStep === "password" ? "Update Password" : resetStep === "link" ? "Resend Reset Email" : "Send Reset Email" : authStep === 'email' ? 'Continue' : 'Sign In'}
              <ChevronRight className="w-5 h-5" />
            </span>
          )}
        </button>
        {!resetMode && authStep === 'password' && (
          <button
            type="button"
            onClick={() => {
              void sendPasswordResetEmail();
            }}
            className="text-xs font-semibold tracking-wide text-[#8E5E4F]/60 hover:text-[#B47A67] transition-colors"
          >
            Reset password instead
          </button>
        )}
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
