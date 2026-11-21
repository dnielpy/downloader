"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

type Toast = { id: number; text: string; tone: "success" | "error" };

const ToastContext = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

/** Shows a short message at the bottom: toast("Guardado"), toast("Falló", "error"). */
export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = nextId++;
    setToasts((current) => [...current.slice(-3), { id, text, tone }]);
    setTimeout(
      () => setToasts((current) => current.filter((t) => t.id !== id)),
      tone === "error" ? 6000 : 3000,
    );
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-14 left-1/2 z-50 flex w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="popover flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm"
          >
            {toast.tone === "success" ? (
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            )}
            <span className="break-words">{toast.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
