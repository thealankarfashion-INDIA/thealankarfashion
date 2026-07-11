import { useEffect, useState } from "react";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";
import { supabase } from "@/lib/supabase";

function isAdminResetLocation() {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash || "";
  const path = window.location.pathname || "";
  const search = window.location.search || "";
  return (
    hash.startsWith("#/antomanage/reset-password") ||
    hash.includes("reset=1") ||
    hash.includes("type=recovery") ||
    hash.includes("access_token=") ||
    hash.includes("refresh_token=") ||
    path.endsWith("/antomanage/reset-password") ||
    search.includes("admin-reset=1") ||
    search.includes("type=recovery")
  );
}

export function AdminPanel() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [resetMode, setResetMode] = useState(() => isAdminResetLocation());

  const verifyAdmin = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setLoggedIn(false);
      setChecking(false);
      return;
    }
    const { data, error } = await supabase.rpc("is_admin");
    const isAuthorized = !error && data === true;
    if (!isAuthorized && !isAdminResetLocation()) {
      await supabase.auth.signOut();
    }
    setLoggedIn(isAuthorized);
    setChecking(false);
  };

  useEffect(() => {
    void verifyAdmin();
    const syncResetMode = () => {
      setResetMode(isAdminResetLocation());
    };
    syncResetMode();
    window.addEventListener("hashchange", syncResetMode);
    window.addEventListener("popstate", syncResetMode);
    const { data } = supabase.auth.onAuthStateChange(() => void verifyAdmin());
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("hashchange", syncResetMode);
      window.removeEventListener("popstate", syncResetMode);
    };
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
  if (resetMode) return <AdminLogin onLogin={handleLogin} mode="reset" />;
  if (!loggedIn) return <AdminLogin onLogin={handleLogin} />;
  return <AdminDashboard onLogout={handleLogout} />;
}
