"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export type ToastKind = "success" | "info" | "warning" | "error";
type Toast = { id: number; kind: ToastKind; message: string };
type ToastActions = {
  success: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastActions | null>(null);

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  const { t } = useLocale();
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), toast.kind === "error" || toast.kind === "warning" ? 7000 : 5000);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.kind, dismiss]);
  const Icon = toast.kind === "success" ? Check : toast.kind === "warning" ? TriangleAlert : toast.kind === "error" ? XCircle : Info;
  const accent = toast.kind === "success" ? "border-l-toast-success" : toast.kind === "warning" ? "border-l-toast-warning" : toast.kind === "error" ? "border-l-toast-error" : "border-l-control-border";
  return <div
    role={toast.kind === "error" || toast.kind === "warning" ? "alert" : "status"}
    aria-atomic="true"
    className={`pointer-events-auto flex min-h-16 items-start gap-3 rounded-control border border-border border-l-4 bg-surface p-4 text-foreground shadow-raised ${accent}`}
  >
    <Icon size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
    <p className="min-w-0 flex-1 text-sm font-medium leading-5">{t(toast.message)}</p>
    <button
      type="button"
      aria-label={t("Dismiss notification")}
      onClick={() => dismiss(toast.id)}
      className="-m-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <X size={18} aria-hidden="true" />
    </button>
  </div>;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const dismiss = useCallback((id: number) => setToasts(current => current.filter(toast => toast.id !== id)), []);
  const show = useCallback((kind: ToastKind, message: string) => {
    const id = ++nextId.current;
    setToasts(current => [...current.slice(-2), { id, kind, message }]);
  }, []);
  const actions = useMemo<ToastActions>(() => ({
    success: message => show("success", message),
    info: message => show("info", message),
    warning: message => show("warning", message),
    error: message => show("error", message),
  }), [show]);
  return <ToastContext.Provider value={actions}>
    {children}
    <div role="region" className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-5 sm:w-full sm:max-w-sm" aria-label={t("Notifications")}>
      {toasts.map(toast => <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />)}
    </div>
  </ToastContext.Provider>;
}

export function useToast(): ToastActions {
  const actions = useContext(ToastContext);
  if (!actions) throw new Error("useToast must be used within ToastProvider");
  return actions;
}
