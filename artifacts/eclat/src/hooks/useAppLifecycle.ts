import { useEffect, useRef } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { dispatchAppResume, logClientError } from "@/lib/appLifecycle";
import { supabase } from "@/lib/supabase";

const SESSION_REFRESH_WINDOW_SECONDS = 180;

export function useAppLifecycle(queryClient: QueryClient) {
  const hiddenAtRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    const recover = async (reason: string) => {
      if (runningRef.current) return;
      runningRef.current = true;
      const hiddenMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : undefined;
      hiddenAtRef.current = null;

      try {
        dispatchAppResume(reason, hiddenMs);

        if (navigator.onLine !== false) {
          supabase.auth.startAutoRefresh();
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            logClientError("auth-session-resume-failed", error);
          } else {
            const expiresAt = data.session?.expires_at;
            const secondsLeft = expiresAt ? expiresAt - Math.floor(Date.now() / 1000) : null;
            if (secondsLeft !== null && secondsLeft < SESSION_REFRESH_WINDOW_SECONDS) {
              const { error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) logClientError("auth-session-refresh-failed", refreshError);
            }
          }
        }

        await queryClient.resumePausedMutations();
        void queryClient.invalidateQueries({ refetchType: "active" });
      } catch (error) {
        logClientError("app-resume-failed", error);
      } finally {
        runningRef.current = false;
      }
    };

    const scheduleRecover = (reason: string) => {
      if (document.visibilityState === "hidden") return;
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = window.setTimeout(() => {
        resumeTimerRef.current = null;
        void recover(reason);
      }, 120);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        supabase.auth.stopAutoRefresh();
        return;
      }
      scheduleRecover("visibilitychange");
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      logClientError("unhandled-promise-rejection", event.reason);
    };

    const onError = (event: ErrorEvent) => {
      logClientError("window-error", event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const onPageShow = (event: PageTransitionEvent) => {
      scheduleRecover(event.persisted ? "pageshow-bfcache" : "pageshow");
    };

    const onFocus = () => scheduleRecover("focus");
    const onOnline = () => scheduleRecover("online");

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [queryClient]);
}
