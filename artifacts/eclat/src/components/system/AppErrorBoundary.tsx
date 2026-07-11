import { Component, type ErrorInfo, type ReactNode } from "react";
import { APP_RESUME_EVENT, isDynamicImportError, logClientError } from "@/lib/appLifecycle";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logClientError("react-render-error", error, info.componentStack);
  }

  componentDidMount() {
    window.addEventListener(APP_RESUME_EVENT, this.clearError);
    window.addEventListener("hashchange", this.clearError);
    window.addEventListener("popstate", this.clearError);
  }

  componentWillUnmount() {
    window.removeEventListener(APP_RESUME_EVENT, this.clearError);
    window.removeEventListener("hashchange", this.clearError);
    window.removeEventListener("popstate", this.clearError);
  }

  clearError = () => {
    if (this.state.error) this.setState({ error: null });
  };

  loadLatest = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("v", Date.now().toString(36));
    window.location.replace(url.toString());
  };

  render() {
    if (!this.state.error) return this.props.children;

    const isChunkError = isDynamicImportError(this.state.error);

    return (
      <div className="min-h-screen bg-[#F7F1EE] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-[#E8D8D1] rounded-2xl p-8 text-center shadow-xl">
          <div className="font-serif text-4xl italic font-bold text-[#8E5E4F] mb-3">Thealankar</div>
          <h1 className="text-xl font-bold text-[#2C1E16] mb-3">
            {isChunkError ? "Updating the latest website" : "Something paused the page"}
          </h1>
          <p className="text-sm text-[#8E5E4F]/75 leading-relaxed mb-6">
            {isChunkError
              ? "A background tab resumed with an old app file. Load the latest version to continue."
              : "The page recovered from a browser or network interruption. Try again to continue."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={this.clearError}
              className="flex-1 rounded-xl border border-[#E8D8D1] px-4 py-3 text-sm font-bold text-[#8E5E4F] hover:bg-[#FBF6F3]"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={this.loadLatest}
              className="flex-1 rounded-xl bg-[#B47A67] px-4 py-3 text-sm font-bold text-white hover:bg-[#8E5E4F]"
            >
              Load Latest
            </button>
          </div>
        </div>
      </div>
    );
  }
}
