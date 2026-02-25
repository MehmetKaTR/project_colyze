import React, { useEffect, useState } from "react";

const ToastHost = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (event) => {
      const toast = event?.detail;
      if (!toast?.id) return;
      setToasts((prev) => [...prev, toast]);

      const ttl = Number(toast.duration || 4200);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, ttl);
    };

    window.addEventListener("app-toast", onToast);
    return () => window.removeEventListener("app-toast", onToast);
  }, []);

  const closeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toneClass = (type) => {
    if (type === "success") return "border-emerald-400/50 bg-emerald-500/15 text-emerald-100";
    if (type === "error") return "border-rose-400/50 bg-rose-500/15 text-rose-100";
    if (type === "warning") return "border-amber-400/50 bg-amber-500/15 text-amber-100";
    return "border-sky-400/50 bg-sky-500/15 text-sky-100";
  };

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[12000] flex w-[min(92vw,420px)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto toast-enter rounded-xl border px-3 py-2 shadow-xl backdrop-blur ${toneClass(toast.type)}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm font-medium break-words">{toast.message}</p>
            <button
              type="button"
              className="mt-0.5 rounded px-1 text-xs text-slate-200/90 hover:bg-slate-800/40"
              onClick={() => closeToast(toast.id)}
              aria-label="Kapat"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastHost;
