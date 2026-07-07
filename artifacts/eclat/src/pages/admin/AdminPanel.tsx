import { useEffect, useState } from "react";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";
import { supabase } from "@/lib/supabase";

export function AdminPanel() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  const verifyAdmin = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setLoggedIn(false);
      setChecking(false);
      return;
    }
    const { data, error } = await supabase.rpc("is_admin");
    setLoggedIn(!error && data === true);
    setChecking(false);
  };

  useEffect(() => {
    void verifyAdmin();
    const { data } = supabase.auth.onAuthStateChange(() => void verifyAdmin());
    return () => data.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    setChecking(true);
    await verifyAdmin();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLoggedIn(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F1EE]">
        <div className="w-8 h-8 border-2 border-[#8E5E4F]/20 border-t-[#8E5E4F] rounded-full animate-spin" />
      </div>
    );
  }
  if (!loggedIn) return <AdminLogin onLogin={handleLogin} />;
  return <AdminDashboard onLogout={handleLogout} />;
}
