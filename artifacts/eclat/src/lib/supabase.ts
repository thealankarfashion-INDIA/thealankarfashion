import { createClient } from '@supabase/supabase-js';

// Supabase browser credentials are public project identifiers. Keep production
// defaults so a local/static build cannot publish a bundle that crashes before
// React mounts when build-time environment variables are unavailable.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://nevrcoezrzolxspfosla.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_xF75v7uPaZ_UjSLqGWcTkA_y6HdV5_G";
const ADMIN_RECOVERY_STORAGE_KEY = "thealankar_admin_recovery";
const ADMIN_RECOVERY_ERROR_STORAGE_KEY = "thealankar_admin_recovery_error";
const ADMIN_RECOVERY_REQUEST_KEY = "thealankar_admin_recovery_requested_at";
const SPA_REDIRECT_STORAGE_KEY = "thealankar_spa_redirect";
const ADMIN_RECOVERY_REQUEST_TTL_MS = 2 * 60 * 60 * 1000;
const ADMIN_RESET_ROUTE = "/admin/reset-password";
const ADMIN_RESET_MARKERS = {
  "admin-reset": "1",
  admin: "antomanage",
};
const PRODUCTION_SITE_ORIGIN = "https://thealankar.in";

function getCleanPathname(pathname = "") {
  const cleanPath = pathname.replace(/\/+$/, "");
  return cleanPath || "/";
}

function getRoutePathname(pathname = "") {
  const cleanPath = getCleanPathname(pathname);
  const configuredBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  const basePaths = [configuredBase, "/thealankarfashion"].filter(
    (basePath) => basePath && basePath !== "/"
  );

  for (const basePath of basePaths) {
    if (cleanPath === basePath) return "/";
    if (cleanPath.startsWith(`${basePath}/`)) {
      return getCleanPathname(cleanPath.slice(basePath.length));
    }
  }

  return cleanPath;
}

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

function getAppBasePath() {
  const configuredBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (configuredBase && configuredBase !== "/") return configuredBase;

  const path = getCleanPathname(window.location.pathname || "");
  if (path === "/thealankarfashion" || path.startsWith("/thealankarfashion/")) {
    return "/thealankarfashion";
  }

  return "";
}

function getAdminResetSearch(search = "") {
  const params = new URLSearchParams(search.replace(/^\?/, ""));
  for (const [key, value] of Object.entries(ADMIN_RESET_MARKERS)) {
    params.set(key, value);
  }
  return `?${params.toString()}`;
}

function getAdminResetUrl(search = "") {
  return `${getAppBasePath()}${ADMIN_RESET_ROUTE}${getAdminResetSearch(search)}`;
}

function getAdminResetUrlWithCurrentParams(search = "", hash = "") {
  return `${getAppBasePath()}${ADMIN_RESET_ROUTE}${getAdminResetSearch(search)}${hash}`;
}

function getAdminResetRedirectOrigin() {
  if (typeof window === "undefined") return PRODUCTION_SITE_ORIGIN;
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return window.location.origin;
  }
  return PRODUCTION_SITE_ORIGIN;
}

export function getAdminResetRedirectUrl() {
  return `${getAdminResetRedirectOrigin()}${ADMIN_RESET_ROUTE}${getAdminResetSearch()}`;
}

function hasRecentAdminRecoveryRequest() {
  if (typeof window === "undefined") return false;
  const requestedAt = Number(window.localStorage.getItem(ADMIN_RECOVERY_REQUEST_KEY) || "0");
  if (!requestedAt) return false;
  if (Date.now() - requestedAt > ADMIN_RECOVERY_REQUEST_TTL_MS) {
    window.localStorage.removeItem(ADMIN_RECOVERY_REQUEST_KEY);
    return false;
  }
  return true;
}

function hasAdminRouteIntent() {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash || "";
  const path = getRoutePathname(window.location.pathname || "");
  const search = window.location.search || "";
  return (
    hash.startsWith("#/antomanage") ||
    path === "/antomanage" ||
    path === "/admin/login" ||
    path === "/admin/forgot-password" ||
    path === "/admin/reset-password" ||
    search.includes("admin=antomanage") ||
    search.includes("admin-reset=1")
  );
}

function captureAdminRecoveryRedirect() {
  if (typeof window === "undefined") return;
  const hash = window.location.hash || "";
  const path = getRoutePathname(window.location.pathname || "");
  const search = window.location.search || "";
  const hasExpiredLinkError =
    hash.includes("error_code=otp_expired") ||
    hash.includes("Email+link+is+invalid") ||
    hash.includes("has+expired") ||
    search.includes("error_code=otp_expired");
  const hasAdminResetMarker =
    search.includes("admin-reset=1") || hash.includes("admin-reset=1");
  const hasRecoveryType =
    hash.includes("type=recovery") || search.includes("type=recovery");
  const hasTokenCallback =
    hash.includes("access_token=") ||
    hash.includes("refresh_token=") ||
    search.includes("code=");
  const isAdminRecoveryRedirect =
    hasAdminRouteIntent() ||
    hasRecentAdminRecoveryRequest() ||
    hasAdminResetMarker ||
    hasRecoveryType ||
    hasExpiredLinkError;
  const isRecoveryRedirect =
    hasRecoveryType ||
    hasExpiredLinkError ||
    hasAdminResetMarker ||
    (hasTokenCallback && isAdminRecoveryRedirect);

  if (isRecoveryRedirect && isAdminRecoveryRedirect) {
    window.sessionStorage.setItem(ADMIN_RECOVERY_STORAGE_KEY, "1");
  }

  if (hasExpiredLinkError && isAdminRecoveryRedirect) {
    window.sessionStorage.setItem(
      ADMIN_RECOVERY_ERROR_STORAGE_KEY,
      "This reset link is invalid or expired. Send a fresh reset email and open the newest email only."
    );
  }

  if (
    isRecoveryRedirect &&
    isAdminRecoveryRedirect &&
    path !== ADMIN_RESET_ROUTE
  ) {
    window.history.replaceState(null, "", getAdminResetUrlWithCurrentParams(search, hash));
    return;
  }

  if (
    search.includes("admin-reset=1") &&
    path !== ADMIN_RESET_ROUTE &&
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

export function markAdminRecoveryRequested() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_RECOVERY_REQUEST_KEY, String(Date.now()));
}

export function clearAdminRecoveryRedirect() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ADMIN_RECOVERY_STORAGE_KEY);
  window.sessionStorage.removeItem(ADMIN_RECOVERY_ERROR_STORAGE_KEY);
  window.localStorage.removeItem(ADMIN_RECOVERY_REQUEST_KEY);
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
