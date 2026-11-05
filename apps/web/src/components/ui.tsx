"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useId,
  useMemo,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { X, LoaderCircle, Music2, ArrowUpRight, RefreshCw, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { ApiFailure } from "@/lib/api";
export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");
const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";
export function Button({
  children,
  variant = "primary",
  busy,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-5 py-3 text-sm font-semibold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-45",
        focus,
        variant === "primary"
          ? "bg-action text-action-foreground hover:bg-action-hover"
          : variant === "secondary"
            ? "border border-border bg-surface hover:bg-surface-hover"
            : "hover:bg-surface-hover",
        className,
      )}
    >
      {busy && (
        <LoaderCircle
          size={17}
          className="animate-spin motion-reduce:animate-none"
        />
      )}
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      {...props}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-hover disabled:opacity-40",
        focus,
        props.className,
      )}
    >
      {children}
    </button>
  );
}
export const inputClass = cx(
  "w-full min-h-12 rounded-control border border-control-border bg-surface px-3.5 py-3 text-base outline-none transition-shadow focus:border-foreground focus:ring-1 focus:ring-focus disabled:opacity-50",
  focus,
);
const SelectPortalContext = createContext<{
  container: HTMLDialogElement | null;
  activeClose: { current: (() => void) | null };
} | null>(null);
const emptyOption = "__musica_empty_option__";
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  compact = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  compact?: boolean;
  className?: string;
}) {
  const portalContext = useContext(SelectPortalContext);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || !portalContext) return;
    const close = () => setOpen(false);
    portalContext.activeClose.current = close;
    return () => { if (portalContext.activeClose.current === close) portalContext.activeClose.current = null; };
  }, [open, portalContext]);
  return (
    <div className={cx(label && !compact ? "grid gap-2" : "", className)}>
      {!compact && <span className="text-sm font-medium">{label}</span>}
      <SelectPrimitive.Root
        open={open}
        onOpenChange={setOpen}
        value={value === "" ? options.some((option) => option.value === "") ? emptyOption : undefined : value}
        disabled={options.length === 0}
        onValueChange={(next) => onChange(next === emptyOption ? "" : next)}
      >
        <SelectPrimitive.Trigger
          aria-label={label}
          className={cx(
            "inline-flex items-center justify-between gap-3 border border-control-border bg-surface text-left font-medium text-foreground outline-none transition-colors hover:border-foreground focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 data-[state=open]:border-foreground data-[state=open]:shadow-raised disabled:opacity-50 motion-reduce:transition-none",
            compact ? "min-h-11 min-w-17 rounded-full px-3 text-xs" : "min-h-12 w-full rounded-control px-4 text-base",
          )}
        >
          <span className="min-w-0 flex-1 truncate"><SelectPrimitive.Value placeholder={placeholder ?? label} /></span>
          <SelectPrimitive.Icon className="shrink-0 text-muted"><ChevronDown size={compact ? 14 : 18} strokeWidth={1.8} /></SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal container={portalContext?.container ?? undefined}>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            className="z-50 min-w-[var(--radix-select-trigger-width)] max-w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-border bg-surface text-foreground shadow-overlay"
          >
            <SelectPrimitive.ScrollUpButton className="flex h-8 items-center justify-center text-muted"><ChevronUp size={16} /></SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="max-h-[min(60dvh,var(--radix-select-content-available-height))] p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value === "" ? emptyOption : option.value}
                  className="flex min-h-11 cursor-default select-none items-center justify-between gap-5 rounded-control px-3 py-2.5 text-sm leading-5 outline-none data-[highlighted]:bg-surface-hover data-[state=checked]:font-semibold"
                >
                  <SelectPrimitive.ItemText className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="shrink-0"><Check size={16} strokeWidth={2} /></SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex h-8 items-center justify-center text-muted"><ChevronDown size={16} /></SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
export function Field({
  label,
  hint,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const fieldId = id || props.name || label;
  return (
    <label htmlFor={fieldId} className="grid gap-2 text-sm font-medium">
      {label}
      <input
        {...props}
        id={fieldId}
        className={cx(inputClass, props.className)}
      />
      {hint && <span className="font-normal text-muted text-xs">{hint}</span>}
    </label>
  );
}
export function TextArea({
  label,
  id,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium" htmlFor={id || label}>
      {label}
      <textarea
        {...props}
        id={id || label}
        className={cx(inputClass, "min-h-28 resize-y", props.className)}
      />
    </label>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [selectPortal, setSelectPortal] = useState<HTMLDialogElement | null>(null);
  const activeSelectClose = useRef<(() => void) | null>(null);
  const selectContext = useMemo(() => ({container: selectPortal, activeClose: activeSelectClose}), [selectPortal]);
  const { t } = useLocale();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    setSelectPortal(dialog);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <SelectPortalContext.Provider value={selectContext}>
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (activeSelectClose.current) { activeSelectClose.current(); return; }
        onClose();
      }}
      onKeyDownCapture={(e) => {
        if (e.key === "Escape" && activeSelectClose.current) {
          e.preventDefault();
          e.stopPropagation();
          activeSelectClose.current();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-sheet border border-border bg-surface p-0 text-foreground shadow-overlay backdrop:bg-overlay"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <IconButton label={t("Close")} onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
    </SelectPortalContext.Provider>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-control-border/30 px-6 py-14 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-surface-hover">
        <Music2 size={24} strokeWidth={1.4} />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
          {description}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
export function Loading() {
  return (
    <div
      aria-busy="true"
      className="grid animate-pulse gap-5 motion-reduce:animate-none"
    >
      <div className="h-8 w-48 rounded bg-skeleton" />
      <div className="h-48 rounded-card bg-surface-hover" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-card bg-surface-hover" />
        ))}
      </div>
    </div>
  );
}
const errors: Record<string, string> = {
  AUTH_CONFIGURATION: "Sign-in is not configured. Please contact the site owner.",
  PASSWORD_MISMATCH: "Passwords do not match.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-email": "Check the email address you entered.",
  "auth/email-already-in-use": "This email already has an account. Sign in or reset your password.",
  "auth/weak-password": "Choose a stronger password with at least eight characters.",
  "auth/password-does-not-meet-requirements": "Choose a stronger password with at least eight characters.",
  "auth/too-many-requests": "Too many attempts. Please wait and try again.",
  "auth/network-request-failed": "Connection lost. Try again.",
  "auth/user-disabled": "This account is disabled. Please contact the site owner.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/operation-not-allowed": "Sign-in is not configured. Please contact the site owner.",
  "auth/unauthorized-domain": "Sign-in is not configured. Please contact the site owner.",
  EMAIL_NOT_VERIFIED: "Verify your email before opening a show.",
  EMAIL_VERIFICATION_REQUIRED: "Verify your email before opening a show.",
  SLUG_TAKEN: "This profile address is already taken. Choose another one.",
  PROFILE_REQUIRED: "Create your musician profile to continue.",

  ACTIVE_HOLD:
    "You already have a reservation. Open My requests to continue or cancel it.",
  REVIEW_OVERDUE: "Review pending transfers before resuming requests.",
  VALIDATION_ERROR: "Check the information you entered.",
  INVALID_IMAGE: "Choose a valid JPG, PNG or WebP image within the size limit.",
  SHOW_CLOSED: "Requests are closed",
  CAPACITY_FULL: "The show is full",
  SONG_UNAVAILABLE: "This song is no longer available.",
  HOLD_EXPIRED: "Your reservation has expired.",
  UNAUTHORIZED: "Please sign in again.",
  INVALID_CREDENTIALS: "Incorrect email or password.",
  PRICE_CHANGED: "The price changed. Review the menu and try again.",
  PRICING_REVIEW_REQUIRED: "Review your dedication price before accepting new requests.",
  NETWORK_ERROR: "Connection lost. Try again.",
  ACTIVE_SHOW_EXISTS: "Finish your active show first.",
  CAPACITY_TOO_LOW: "Keep one slot beyond songs already played, and never drop below existing requests.",
  CAPACITY_BELOW_COMMITTED: "The limit cannot be lower than existing requests.",
  STALE_VERSION: "This information changed. Refresh and try again.",
};
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const { t } = useLocale();
  if (!error) return null;
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "";
  return (
    <div
      role="alert"
      className="my-4 flex items-center justify-between gap-3 rounded-control border border-control-border bg-surface-subtle p-4 text-sm"
    >
      <span>{t(errors[code] || "Something went wrong")} </span>
      {retry && (
        <IconButton label={t("Try again")} onClick={retry}>
          <RefreshCw size={18} />
        </IconButton>
      )}
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-control border border-border bg-surface-subtle px-4 py-3 text-sm"
    >
      {children}
    </p>
  );
}
export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        "inline-flex min-h-11 items-center gap-2 rounded-control border border-border px-4 text-sm font-medium hover:bg-surface-hover",
        focus,
      )}
    >
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}
