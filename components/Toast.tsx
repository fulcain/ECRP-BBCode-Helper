"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToasts must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              animate-slide-up rounded-lg border px-4 py-3 shadow-lg backdrop-blur-md
              flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.02]
              ${
                toast.type === "success"
                  ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-200"
                  : ""
              }
              ${
                toast.type === "error"
                  ? "border-red-500/40 bg-red-950/90 text-red-200"
                  : ""
              }
              ${
                toast.type === "info"
                  ? "border-blue-500/40 bg-blue-950/90 text-blue-200"
                  : ""
              }
              ${
                toast.type === "warning"
                  ? "border-amber-500/40 bg-amber-950/90 text-amber-200"
                  : ""
              }
            `}
            onClick={() => removeToast(toast.id)}
          >
            <span className="text-lg">
              {toast.type === "success" && "✅"}
              {toast.type === "error" && "❌"}
              {toast.type === "info" && "ℹ️"}
              {toast.type === "warning" && "⚠️"}
            </span>
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button className="opacity-50 hover:opacity-100 text-sm">&times;</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
