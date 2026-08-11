"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";

export interface ConfirmConfig {
  type: "confirm";
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  /** Optional custom content rendered below the message (e.g. image previews) */
  content?: ReactNode;
}

export interface PromptConfig {
  type: "prompt";
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type ModalConfig = (ConfirmConfig | PromptConfig) & { resolve: (value: any) => void };

interface ModalContextType {
  showConfirm: (config: Omit<ConfirmConfig, "type" | "resolve">) => Promise<boolean>;
  showPrompt: (config: Omit<PromptConfig, "type" | "resolve">) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when a prompt modal opens
  useEffect(() => {
    if (modal?.type === "prompt" && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [modal]);

  // Body scroll lock & close on Escape
  useEffect(() => {
    if (modal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modal]);

  useEffect(() => {
    if (!modal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        modal.resolve(null);
        setModal(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [modal]);

  // Handle enter key in prompt input
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      modal?.resolve(inputValue);
      setModal(null);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      modal?.resolve(null);
      setModal(null);
    }
  };

  const showConfirm = useCallback(
    (config: Omit<ConfirmConfig, "type" | "resolve">): Promise<boolean> => {
      return new Promise((resolve) => {
        setModal({ ...config, type: "confirm", resolve });
      });
    },
    []
  );

  const showPrompt = useCallback(
    (config: Omit<PromptConfig, "type" | "resolve">): Promise<string | null> => {
      return new Promise((resolve) => {
        setInputValue(config.defaultValue || "");
        setModal({ ...config, type: "prompt", resolve });
      });
    },
    []
  );

  const handleConfirm = () => {
    if (!modal) return;
    if (modal.type === "confirm") {
      modal.resolve(true);
    } else {
      modal.resolve(inputValue);
    }
    setModal(null);
  };

  const handleCancel = () => {
    if (!modal) return;
    modal.resolve(null);
    setModal(null);
  };

  // Backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <ModalContext.Provider value={{ showConfirm, showPrompt }}>
      {children}

      {/* Modal overlay */}
      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

          {/* Modal */}
          <div className="relative w-full max-w-sm animate-slide-up">
            <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden">
              {/* Gradient accent */}
              <div
                className={`h-[2px] w-full ${
                  modal.type === "confirm" && modal.variant === "danger"
                    ? "bg-gradient-to-r from-rose-500/80 to-red-500/40"
                    : "bg-gradient-to-r from-violet-500/80 to-fuchsia-500/40"
                }`}
              />

              <div className="p-5">
                {/* Icon */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                      modal.type === "confirm" && modal.variant === "danger"
                        ? "border-rose-500/20 bg-rose-500/10"
                        : "border-violet-500/20 bg-violet-500/10"
                    }`}
                  >
                    {modal.type === "confirm" && modal.variant === "danger" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-rose-400">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-violet-400">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white/90">{modal.title}</h3>
                  </div>
                </div>

                {/* Message */}
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  {modal.message}
                </p>

                {/* Custom content (e.g. image previews) */}
                {modal.type === "confirm" && modal.content && (
                  <div className="mb-4">{modal.content}</div>
                )}

                {/* Prompt input */}
                {modal.type === "prompt" && (
                  <div className="mb-4">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder={modal.placeholder}
                      className="w-full rounded-xl border border-white/[0.06] bg-zinc-800/50 px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-violet-500/40 focus:bg-zinc-800/80 focus:ring-1 focus:ring-violet-500/10"
                    />
                  </div>
                )}

                {/* Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex-1 rounded-xl border border-white/[0.06] bg-zinc-800/40 px-4 py-2.5 text-xs font-medium text-zinc-400 transition-all hover:bg-zinc-700/40 hover:text-zinc-200"
                  >
                    {modal.cancelLabel || "Cancel"}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-xs font-medium transition-all ${
                      modal.type === "confirm" && modal.variant === "danger"
                        ? "border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                        : "border-violet-500/20 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                    }`}
                  >
                    {modal.confirmLabel || (modal.type === "confirm" ? "Confirm" : "Apply")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
