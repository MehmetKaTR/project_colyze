import { useEffect, useState } from "react";
import logo from "../assets/colyze_logo.png";

export const LoadingScreen = ({ onComplete }) => {
  const [text, setText] = useState("Agasan Colyze");
  const [statusLines, setStatusLines] = useState([
    "Initializing user interface...",
    "Starting backend process...",
  ]);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const waitForEndpoint = async (url, timeoutMs = 35000) => {
    if (window?.electron?.waitBackendReady) {
      try {
        const u = new URL(url);
        const res = await window.electron.waitBackendReady(u.pathname, timeoutMs);
        return !!res?.ok;
      } catch {
        // fallback to renderer fetch
      }
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) return true;
      } catch {
        // retry until timeout
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    return false;
  };

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    let isCancelled = false;
    const runBootSequence = async () => {
      setStatusLines((prev) => [...prev, "Waiting for backend API (127.0.0.1:5050)..."]);
      const backendOk = await waitForEndpoint("http://127.0.0.1:5050/healthz");
      if (!backendOk) {
        if (!isCancelled) {
          setHasError(true);
          setStatusLines((prev) => [
            ...prev,
            "Backend startup timeout. Check python backend logs.",
          ]);
        }
        return;
      }
      if (isCancelled) return;

      setStatusLines((prev) => [...prev, "Backend API is ready."]);
      setStatusLines((prev) => [...prev, "Checking camera service routes..."]);

      const cameraRouteOk = await waitForEndpoint("http://127.0.0.1:5050/camera_profiles", 20000);
      if (!cameraRouteOk) {
        if (!isCancelled) {
          setHasError(true);
          setStatusLines((prev) => [
            ...prev,
            "Camera routes are not ready. Please restart app/backend.",
          ]);
        }
        return;
      }
      if (isCancelled) return;

      setStatusLines((prev) => [...prev, "Camera routes are ready."]);
      setStatusLines((prev) => [...prev, "System ready. Launching workspace..."]);
      setIsReady(true);
      setTimeout(() => {
        if (!isCancelled) onComplete();
      }, 700);
    };

    runBootSequence();
    return () => {
      isCancelled = true;
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />

      <div className="relative w-[min(92vw,560px)] rounded-3xl border border-slate-700/70 bg-slate-900/70 backdrop-blur-md px-8 py-10 shadow-2xl">
        <div className="mx-auto mb-6 flex h-36 w-36 md:h-44 md:w-44 items-center justify-center rounded-2xl bg-slate-950/70 ring-1 ring-slate-700">
          <img
            src={logo}
            alt="Agasan Logo"
            className="h-28 w-28 md:h-36 md:w-36 opacity-0 animate-fadeInScale"
          />
        </div>

        <div className="mb-4 text-center text-2xl md:text-3xl font-semibold tracking-wide">
          {text}
          <span className="ml-1 text-sky-300 animate-blink">|</span>
        </div>

        <div className="mx-auto h-[4px] w-full max-w-[320px] overflow-hidden rounded-full bg-slate-800 relative">
          <div className={`absolute inset-y-0 left-0 w-[35%] rounded-full shadow-[0_0_18px_rgba(56,189,248,0.8)] ${isReady ? "bg-emerald-400" : "bg-sky-400 animate-loading-bar"}`} />
        </div>

        <div className="mt-4 space-y-1.5">
          {statusLines.slice(-4).map((line, idx) => (
            <p key={`${line}-${idx}`} className="text-center text-[11px] tracking-wide text-slate-300">
              {line}
            </p>
          ))}
          {hasError && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mx-auto mt-2 block rounded-md border border-rose-500/70 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
            >
              Retry Startup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
