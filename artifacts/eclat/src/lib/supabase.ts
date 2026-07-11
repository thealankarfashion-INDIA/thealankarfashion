import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ADMIN_RECOVERY_STORAGE_KEY = "thealankar_admin_recovery";
const ADMIN_RECOVERY_ERROR_STORAGE_KEY = "thealankar_admin_recovery_error";

function captureAdminRecoveryRedirect() {
  if (typeof window === "undefined") return;
  const hash = window.location.hash || "";
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

  if (isRecoveryRedirect) {
    window.sessionStorage.setItem(ADMIN_RECOVERY_STORAGE_KEY, "1");
  }

  if (hasExpiredLinkError) {
    window.sessionStorage.setItem(
      ADMIN_RECOVERY_ERROR_STORAGE_KEY,
      "This reset link is invalid or expired. Send a fresh reset email and open the newest email only."
    );
  }
}

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
