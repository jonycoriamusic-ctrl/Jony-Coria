"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MusicRequest, RequestStatus } from "@musica/contracts";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Upload,
  Clock3,
  Music2,
  Heart,
  FileImage,
  CheckCircle2,
} from "lucide-react";
import { useRequests, useRequest, useCommand } from "@/lib/queries";
import { useLocale } from "@/lib/i18n";
import type { Role } from "@/lib/api";
import { isDemo } from "@/lib/auth";
import { useMusicianSlug, guestHref, menuHref } from "@/lib/navigation";
import { useReceiptImage } from "./application/use-receipt-image";
import {
  requestStatusLabels as statusKeys,
  secondsRemaining,
} from "./domain/request";
import {
  Button,
  Loading,
  ErrorNotice,
  Empty,
  SectionTitle,
  Notice,
  cx,
  Modal,
} from "@/components/ui";
export function StatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useLocale();
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        status === "playing" || status === "queued"
          ? "bg-action text-action-foreground"
          : "bg-status text-status-foreground",
      )}
    >
      {status === "played" ? (
        <Check size={12} />
      ) : (
        <span className="size-1.5 rounded-full bg-current" />
      )}
      {t(statusKeys[status])}
    </span>
  );
}
export function ReceiptPreview({
  url,
  role,
  onClose,
}: {
  url: string;
  role: Role;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { src, error } = useReceiptImage(url, role);
  return (
    <Modal title={t("View receipt")} onClose={onClose}>
      {error ? (
        <ErrorNotice error={error} />
      ) : src ? (
        <img
          src={src}
          alt={t("View receipt")}
          className="max-h-[65vh] w-full rounded-control object-contain"
        />
      ) : (
        <Loading />
      )}
    </Modal>
  );
}
export function RequestList() {
  const slug = useMusicianSlug();
  const query = useRequests();
  const { t, money, date } = useLocale();
  if (query.isPending) return <Loading />;
  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle eyebrow="Musica a la carta" title={t("My requests")} />
      <ErrorNotice error={query.error} retry={() => query.refetch()} />
      {query.data?.length ? (
        <div className="space-y-3">
          {[...query.data].reverse().map((r) => (
            <Link
              key={r.id}
              href={guestHref(`/pedidos/${r.id}`, r.musicianSlug || slug)}
              className="flex items-center gap-4 rounded-card border border-border p-5 hover:bg-surface-subtle"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-control bg-surface-hover">
                <Music2 size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <StatusBadge status={r.status} />
                <h2 className="mt-2 truncate font-semibold">{r.songTitle}</h2>
                <p className="mt-1 text-xs text-muted">
                  {r.artist} · {date(r.createdAt)}
                  {r.musicianName && <span className="mt-1 block">{r.musicianName}</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{money(r.amount)}</p>
                <ArrowUpRightIcon />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        !query.error && (
          <Empty
            title={t("Nothing here yet")}
            description={t("Your requests will appear here.")}
          >
            <Link
              href={menuHref(slug)}
              className="rounded-control bg-action px-6 py-3 text-sm font-semibold text-action-foreground"
            >
              {t("Explore the menu")}
            </Link>
          </Empty>
        )
      )}
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={17} className="ml-auto mt-3 text-muted" />;
}
export function RequestDetail({ id }: { id: string }) {
  const currentSlug = useMusicianSlug();
  const query = useRequest(id);
  const command = useCommand<MusicRequest>();
  const upload = useCommand<MusicRequest>();
  const { t, money } = useLocale();
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState<"alias" | "cbu" | null>(null);
  const [preview, setPreview] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [fileError, setFileError] = useState<unknown>();
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorNotice error={query.error} retry={() => query.refetch()} />;
  const request = query.data;
  const slug = request.musicianSlug || currentSlug;
  const seconds = secondsRemaining(request.expiresAt, now);
  const amount = money(request.amount);
  const active = ["held", "queued", "playing"].includes(request.status);
  async function copyBankDetail(value: string, kind: "alias" | "cbu") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setFileError(new Error("Clipboard unavailable"));
    }
  }
  async function attach(file?: File) {
    if (!file) return;
    setFileError(undefined);
    if (file.size > 4 * 1024 * 1024) {
      setFileError(new Error("Image too large"));
      return;
    }
    const form = new FormData();
    form.set("file", file);
    upload.mutate({
      path: `/requests/${id}/receipt`,
      body: form,
      role: "guest",
    });
  }
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={guestHref("/pedidos", slug)}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted"
      >
        <ArrowLeft size={16} />
        {t("My requests")}
      </Link>
      <SectionTitle title={t("Your request")} eyebrow={request.musicianName}>
        <StatusBadge status={request.status} />
      </SectionTitle>
      <div className="rounded-sheet border border-border p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-card bg-surface-inverse text-inverse">
            <Music2 size={28} />
          </div>
          <div>
            <p className="text-xs text-muted">{t("Selected song")}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {request.songTitle}
            </h2>
            <p className="mt-1 text-sm text-muted">{request.artist}</p>
          </div>
        </div>
        {request.dedication && (
          <div className="mt-6 flex gap-3 rounded-control bg-surface-subtle p-4">
            <Heart size={18} className="mt-1 shrink-0" />
            <p className="whitespace-pre-wrap text-sm leading-6">
              “{request.dedication}”
            </p>
          </div>
        )}
        <div className="my-6 space-y-2 border-y border-border py-5 text-sm">
          {request.songPrice !== undefined && <p className="flex items-center justify-between"><span className="text-muted">{t("Song price")}</span><span>{money(request.songPrice)}</span></p>}
          {request.type === "dedication" && request.dedicationSurcharge !== undefined && <p className="flex items-center justify-between"><span className="text-muted">{t("Dedication add-on")}</span><span>+ {money(request.dedicationSurcharge)}</span></p>}
          <p className="flex items-center justify-between border-t border-border pt-3"><span className="text-muted">{t("Total")}</span><strong className="text-2xl font-semibold">{amount}</strong></p>
        </div>
        {request.status === "held" ? (
          <>
            <div className="mb-5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted">
                <Clock3 size={16} />
                {t("Your reservation expires in")}
              </span>
              <strong className="tabular-nums">
                {Math.floor(seconds / 60)}:
                {String(seconds % 60).padStart(2, "0")}
              </strong>
            </div>
            {isDemo && <Notice>{t("This is a demo. Do not transfer money.")}</Notice>}
            <h3 className="mb-2 mt-7 text-lg font-semibold">
              {t("Pay by bank transfer")}
            </h3>
            <p className="mb-6 text-sm leading-6 text-muted">
              {t("Transfer the exact amount, then let the musician know.")}
            </p>
            <div className="space-y-4 rounded-card bg-surface-subtle p-5">
              <div>
                <p className="text-xs text-muted">{t("Account holder")}</p>
                <p className="mt-1 text-sm font-semibold">
                  {request.accountName}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">{t("Transfer alias")}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="break-all text-sm font-semibold">
                    {request.alias}
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => copyBankDetail(request.alias, "alias")}
                    aria-label={t("Copy alias")}
                    className="shrink-0 px-2"
                  >
                    {copied === "alias" ? <Check size={17} /> : <Copy size={17} />}
                  </Button>
                </div>
              </div>
              {request.cbu && (
                <div>
                  <p className="text-xs text-muted">CBU</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="break-all text-sm font-semibold tabular-nums">{request.cbu}</p>
                    <Button
                      variant="ghost"
                      onClick={() => copyBankDetail(request.cbu!, "cbu")}
                      aria-label={t("Copy CBU")}
                      className="shrink-0 px-2"
                    >
                      {copied === "cbu" ? <Check size={17} /> : <Copy size={17} />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-surface-hover">
              {request.status === "played" || request.status === "queued" ? (
                <CheckCircle2 size={25} />
              ) : request.status === "playing" ? (
                <Music2 size={25} />
              ) : (
                <Clock3 size={25} />
              )}
            </div>
            <h3 className="text-xl font-semibold">
              {t(statusKeys[request.status])}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              {t(
                request.status === "queued"
                  ? "Your transfer is accepted in good faith. Your song is in the queue."
                  : request.status === "not_performed" ||
                      request.status === "expired"
                    ? "Talk to the musician to arrange it."
                    : "Your night, your soundtrack.",
              )}
            </p>
          </div>
        )}
        {active && (
          <div className="mt-6">
            <label className="flex cursor-pointer items-center gap-3 rounded-control border border-dashed border-control-border/50 p-4 hover:bg-surface-hover">
              <Upload size={20} />
              <div className="flex-1">
                <span className="block text-sm font-semibold">
                  {t(
                    upload.isPending
                      ? "Working…"
                      : request.receiptUrl
                        ? "Receipt uploaded"
                        : "Upload receipt",
                  )}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {t("Optional")} · JPG, PNG, WebP · 4 MB
                </span>
              </div>
              <input
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp"
                disabled={upload.isPending}
                onChange={(e) => {
                  attach(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-muted">
              {t(
                "You can attach a receipt for reference. No approval is needed.",
              )}
            </p>
          </div>
        )}
        {request.receiptUrl && (
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() => setPreview(true)}
          >
            <FileImage size={17} />
            {t("View receipt")}
          </Button>
        )}
        <ErrorNotice error={command.error || upload.error || fileError} />
        {request.status === "held" && (
          <Button
            busy={command.isPending}
            disabled={upload.isPending || seconds === 0}
            className="mt-5 w-full"
            onClick={() =>
              command.mutate({
                path: `/requests/${id}/claim`,
                body: {},
                role: "guest",
              })
            }
          >
            {t("I have transferred")}
            <ArrowRight size={17} />
          </Button>
        )}
        {request.status === "held" && (
          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => setCancelling(true)}
          >
            {t("Cancel reservation")}
          </Button>
        )}
        {!active && (
          <Link
            href={menuHref(slug)}
            className="mt-6 flex justify-center rounded-control border border-border px-5 py-3 text-sm font-semibold"
          >
            {t("Request another song")}
          </Link>
        )}
      </div>
      {cancelling && (
        <Modal
          title={t("Cancel reservation")}
          onClose={() => setCancelling(false)}
        >
          <p className="mb-6 text-sm leading-6 text-muted">
            {t(
              "Only cancel if you have not transferred. If you already paid, submit your transfer instead.",
            )}
          </p>
          <ErrorNotice error={command.error} />
          <Button
            className="w-full"
            busy={command.isPending}
            onClick={() =>
              command.mutate(
                { path: `/requests/${id}/cancel`, role: "guest", body: {} },
                { onSuccess: () => setCancelling(false) },
              )
            }
          >
            {t("I have not transferred. Cancel reservation.")}
          </Button>
        </Modal>
      )}
      {preview && request.receiptUrl && (
        <ReceiptPreview
          url={request.receiptUrl}
          role="guest"
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}
