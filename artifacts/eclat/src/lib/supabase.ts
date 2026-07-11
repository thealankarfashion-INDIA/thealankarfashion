import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ADMIN_RECOVERY_STORAGE_KEY = "thealankar_admin_recovery";
const ADMIN_RECOVERY_ERROR_STORAGE_KEY = "thealankar_admin_recovery_error";
const SPA_REDIRECT_STORAGE_KEY = "thealankar_spa_redirect";

function restoreSpaRedirect() {
  if (typeof window === "undefined") return;
  const redirectedPath = window.sessionStorage.getItem(SPA_REDIRECT_STORAGE_KEY);
  if (!redirectedPath || !redirectedPath.startsWith("/")) return;
  window.sessionStorage.removeItem(SPA_REDIRECT_STORAGE_KEY);
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (redirectedPath !== currentPath) {
    window.history.replaceState(null, "", redirectedPath);
  }
}

function getAdminResetUrl(search = "") {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const suffix = search ? `?${search.replace(/^\?/, "")}` : "";
  return `${window.location.origin}${basePath}/admin/reset-password${suffix}`;
}

function hasAdminRouteIntent() {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash || "";
  const path = window.location.pathname || "";
  const search = window.location.search || "";
  return (
    hash.startsWith("#/antomanage") ||
    path.endsWith("/antomanage") ||
    path.endsWith("/antomanage/reset-password") ||
    path.endsWith("/admin/login") ||
    path.endsWith("/admin/forgot-password") ||
    path.endsWith("/admin/reset-password") ||
    search.includes("admin=antomanage") ||
    search.includes("admin-reset=1")
  );
}

function captureAdminRecoveryRedirect() {
  if (typeof window === "undefined") return;
  const hash = window.location.hash || "";
  const path = window.location.pathname || "";
  const search = window.location.search || "";
  const hasExpiredLinkError =
    hash.includes("error_code=otp_expired") ||
    hash.includes("Email+link+is+invalid") ||
    hash.includes("has+expired") ||
    search.includes("error_code=otp_expired");
  const isRecoveryRedirect =
    hash.includes("type=recovery") ||
    hash.includes("access_token=") ||
    hash.includes("refresh_token=") ||
    hasExpiredLinkError ||
    search.includes("admin-reset=1") ||
    search.includes("type=recovery");

  if (isRecoveryRedirect && hasAdminRouteIntent()) {
    window.sessionStorage.setItem(ADMIN_RECOVERY_STORAGE_KEY, "1");
  }

  if (hasExpiredLinkError && hasAdminRouteIntent()) {
    window.sessionStorage.setItem(
      ADMIN_RECOVERY_ERROR_STORAGE_KEY,
      "This reset link is invalid or expired. Send a fresh reset email and open the newest email only."
    );
  }

  if (
    search.includes("admin-reset=1") &&
    !path.endsWith("/admin/reset-password") &&
    !hash.includes("access_token=") &&
    !hash.includes("refresh_token=") &&
    !hash.includes("type=recovery")
  ) {
    window.history.replaceState(null, "", getAdminResetUrl(search));
  }
}

restoreSpaRedirect();
captureAdminRecoveryRedirect();

if (import.meta.env.DEV && (!supabaseUrl || !supabasePublishableKey)) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabasePublishableKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function hasAdminRecoveryRedirect() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(ADMIN_RECOVERY_STORAGE_KEY) === "1";
}

export function clearAdminRecoveryRedirect() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ADMIN_RECOVERY_STORAGE_KEY);
  window.sessionStorage.removeItem(ADMIN_RECOVERY_ERROR_STORAGE_KEY);
}

export function clearAdminRecoveryError() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ADMIN_RECOVERY_ERROR_STORAGE_KEY);
}

export function getAdminRecoveryError() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(ADMIN_RECOVERY_ERROR_STORAGE_KEY) || "";
}

export function getDB() {
  return supabase;
}

export function getStorageInstance() {
  return supabase.storage;
}

export default supabase;
