import { lazy, type ComponentType } from "react";

export const APP_RESUME_EVENT = "thealankar:app-resume";

export type AppResumeDetail = {
  reason: string;
  at: number;
  hiddenMs?: number;
};

export function dispatchAppResume(reason: string, hiddenMs?: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AppResumeDetail>(APP_RESUME_EVENT, {
      detail: { reason, at: Date.now(), hiddenMs },
    })
  );
}

export function isDynamicImportError(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk")
  );
}

export function logClientError(context: string, error: unknown, extra?: unknown) {
  const payload = {
    context,
    error,
    extra,
    path: typeof window !== "undefined" ? window.location.href : "",
    online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
    visible: typeof document !== "undefined" ? document.visibilityState : undefined,
    at: new Date().toISOString(),
  };
  console.error("[Thealankar]", payload);
}

export function lazyWithRetry<T extends { default: ComponentType<any> }>(
  loader: () => Promise<T>
) {
  return lazy(async () => {
    try {
      return await loader();
    } catch (error) {
      logClientError("lazy-import-failed", error);
      if (isDynamicImportError(error)) {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        return loader();
      }
      throw error;
    }
  });
}
