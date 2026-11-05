"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { MusicRequest, Show } from "@musica/contracts";
import {
  Radio,
  Plus,
  Minus,
  Pause,
  Play,
  Check,
  ArrowUp,
  ArrowUpRight,
  Music2,
  FileImage,
  Clock3,
} from "lucide-react";
import { useDashboard, useCommand, useShowRequests } from "@/lib/queries";
import { useLocale } from "@/lib/i18n";
import {
  Button,
  Modal,
  SectionTitle,
  Loading,
  ErrorNotice,
  Empty,
  SelectField,
  cx,
} from "@/components/ui";
import { StatusBadge, ReceiptPreview } from "@/features/guest/requests";
function ShowCapacity({ show, playedCount }: { show: Show; playedCount: number }) {
  const { t } = useLocale();
  const command = useCommand();
  const minimum = Math.max(1, show.occupiedCount, Math.min(show.capacity, playedCount + 1));
  function change(delta: number) {
    command.mutate({
      path: `/musician/shows/${show.id}`,
      method: "PATCH",
      body: { capacity: show.capacity + delta, version: show.version },
    });
  }
  return (
    <section
      className="mb-6 rounded-card border border-border p-5"
      aria-label={t("Show capacity")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{t("Show capacity")}</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            {t("Keep one slot beyond songs already played, and never drop below existing requests.")}
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-center gap-3">
          <Button
            variant="secondary"
            className="px-3"
            aria-label={t("Decrease show capacity")}
            disabled={
              command.isPending ||
              show.status === "finished" ||
              show.capacity <= minimum
            }
            onClick={() => change(-1)}
          >
            <Minus size={18} />
          </Button>
          <output
            className="min-w-10 text-center text-2xl font-semibold tabular-nums"
            aria-live="polite"
            aria-label={t("Maximum total requests")}
          >
            {show.capacity}
          </output>
          <Button
            variant="secondary"
            className="px-3"
            aria-label={t("Increase show capacity")}
            disabled={
              command.isPending ||
              show.status === "finished" ||
              show.capacity >= 500
            }
            onClick={() => change(1)}
          >
            <Plus size={18} />
          </Button>
        </div>
      </div>
      {command.isPending && (
        <p role="status" className="mt-3 text-xs text-muted">
          {t("Working…")}
        </p>
      )}
      {show.capacity <= minimum && show.status !== "finished" && (
        <p className="mt-3 text-xs text-muted">
          {t("Minimum capacity")}: {minimum}
        </p>
      )}
      <ErrorNotice error={command.error} />
    </section>
  );
}
export function DashboardView() {
  const query = useDashboard();
  const command = useCommand();
  const { t, money } = useLocale();
  const [tab, setTab] = useState("queue");
  const search = useSearchParams();
  const router = useRouter();
  const selectedShow = search.get("show") || "";
  const setSelectedShow = (id: string) => router.replace(`/portal?show=${encodeURIComponent(id)}`);
  const selected = query.data?.shows.find((show) => show.id === (selectedShow || query.data?.activeShowId)) || query.data?.shows.at(-1);
  const requests = useShowRequests(selected?.id, selected?.status === "finished");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [notPerformed, setNotPerformed] = useState<MusicRequest | null>(null);
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorNotice error={query.error} retry={() => query.refetch()} />;
  const data = query.data;
  const show = selected;
  if (show && requests.isPending) return <Loading/>;
  if (requests.error) return <ErrorNotice error={requests.error} retry={() => requests.refetch()}/>;
  const current = requests.data ?? [];
  const queued = current
    .filter((r) => r.status === "queued")
    .sort((a, b) => a.queueRank - b.queueRank);
  const playing = current.find((r) => r.status === "playing");
  const completed = current.filter((r) =>
    ["played", "not_performed"].includes(r.status),
  );
  const list = tab === "queue" ? queued : completed;
  return (
    <>
      <SectionTitle
        eyebrow={`${data.profile.stageName} / ${t("Musician access")}`}
        title={t("Live")}
      >
        <Link
          href={`/q/${encodeURIComponent(data.profile.slug)}`}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-3 text-xs font-semibold"
        >
          {t("Open guest view")}
          <ArrowUpRight size={15} />
        </Link>
      </SectionTitle>
      <SelectField
        label={t("Show details")}
        value={show?.id || ""}
        onChange={setSelectedShow}
        placeholder={t("No active show")}
        className="mb-6 max-w-md"
        options={[...data.shows].reverse().map((s) => ({value: s.id, label: `${s.title} · ${s.date.slice(0, 10)}`}))}
      />
      {show ? (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-card bg-surface-inverse p-6 text-inverse">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-inverse/60">
                <Radio size={13} />
                {t(
                  show.status === "open"
                    ? "Open"
                    : show.status === "paused"
                      ? "Paused"
                      : "Closed",
                )}
              </p>
              <h2 className="text-xl font-semibold">{show.title}</h2>
              <p className="mt-2 text-sm text-inverse/60">{show.venue}</p>
            </div>
            {["open", "paused"].includes(show.status) && (
              <Button
                variant="secondary"
                className="border-inverse/30 bg-transparent text-inverse hover:bg-inverse/10"
                busy={command.isPending}
                onClick={() =>
                  command.mutate({
                    path: `/musician/shows/${show.id}/action`,
                    body: {
                      action: show.status === "open" ? "pause" : "resume",
                    },
                  })
                }
              >
                {show.status === "open" ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} />
                )}{" "}
                {t(
                  show.status === "open" ? "Pause requests" : "Resume requests",
                )}
              </Button>
            )}
          </div>
          <ShowCapacity key={show.id} show={show} playedCount={current.filter(request => request.status === "played").length} />
          <div className="mb-8 grid grid-cols-3 gap-3">
            {[
              [t("Requests"), show.occupiedCount],
              [t("Remaining"), Math.max(0, show.capacity - show.occupiedCount)],
              [
                t("Completed"),
                completed.filter((r) => r.status === "played").length,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-card border border-border p-4 sm:p-5"
              >
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {String(value).padStart(2, "0")}
                </p>
              </div>
            ))}
          </div>
          {playing && (
            <section className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-card border-2 border-foreground p-5">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
                  <Music2 size={15} />
                  {t("Playing now")}
                </p>
                <h3 className="text-xl font-semibold">{playing.songTitle}</h3>
                <p className="mt-1 text-sm text-muted">{playing.artist}</p>
                {playing.dedication && (
                  <p className="mt-3 text-sm">“{playing.dedication}”</p>
                )}
              </div>
              <Button
                busy={command.isPending}
                onClick={() =>
                  command.mutate({
                    path: `/musician/requests/${playing.id}/performance`,
                    body: { status: "played" },
                  })
                }
              >
                <Check size={16} />
                {t("Mark as played")}
              </Button>
            </section>
          )}
          <div className="mb-5 flex overflow-x-auto border-b border-border">
            {[
              ["queue", "Request queue", queued.length],
              ["done", "Completed", completed.length],
            ].map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setTab(String(key))}
                className={cx(
                  "shrink-0 border-b-2 px-4 py-3 text-sm font-medium",
                  tab === key
                    ? "border-foreground"
                    : "border-transparent text-muted",
                )}
              >
                {t(String(label))}
                <span className="ml-2 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-foreground">
                  {count}
                </span>
              </button>
            ))}
          </div>
          <ErrorNotice error={command.error} />
          {list.length ? (
            <div className="space-y-3">
              {list.map((r, index) => (
                <article
                  key={r.id}
                  className="rounded-card border border-border p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-hover text-sm font-semibold">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="font-semibold">{r.songTitle}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {r.artist}
                          {r.guestName && ` · ${r.guestName}`}
                        </p>
                        <div className="mt-2">
                          <StatusBadge status={r.status} />
                        </div>
                      </div>
                    </div>
                    <strong className="text-sm font-medium">
                      {money(r.amount)}
                    </strong>
                  </div>
                  {r.dedication && (
                    <blockquote className="mt-4 border-l-2 border-border pl-4 text-sm leading-6">
                      {r.dedication}
                    </blockquote>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    {r.receiptUrl && (
                      <Button
                        variant="ghost"
                        className="mr-auto px-2 text-xs"
                        onClick={() => setReceipt(r.receiptUrl)}
                      >
                        <FileImage size={15} />
                        {t("View receipt")}
                      </Button>
                    )}
                    {r.status === "queued" && (
                      <>
                        {index > 0 && (
                          <Button
                            variant="ghost"
                            aria-label={t("Move up")}
                            disabled={command.isPending}
                            onClick={() => {
                              const ids = queued.map((q) => q.id);
                              [ids[index - 1], ids[index]] = [
                                ids[index],
                                ids[index - 1],
                              ];
                              command.mutate({
                                path: `/musician/shows/${show.id}/queue`,
                                method: "PATCH",
                                body: { requestIds: ids },
                              });
                            }}
                          >
                            <ArrowUp size={17} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          onClick={() => setNotPerformed(r)}
                        >
                          {t("Could not perform")}
                        </Button>
                        <Button
                          disabled={!!playing || show.status === "finished"}
                          busy={command.isPending}
                          onClick={() =>
                            command.mutate({
                              path: `/musician/requests/${r.id}/performance`,
                              body: { status: "playing" },
                            })
                          }
                        >
                          <Play size={15} />
                          {t("Start song")}
                        </Button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title={t("Nothing here yet")}
              description={t("Your night, your soundtrack.")}
            />
          )}
        </>
      ) : (
        <Empty title={t("No active show")}>
          <Link
            href="/portal/shows"
            className="rounded-control bg-action px-5 py-3 text-sm text-action-foreground"
          >
            {t("New show")}
          </Link>
        </Empty>
      )}
      {notPerformed && (
        <Modal
          title={t("Could not perform")}
          onClose={() => setNotPerformed(null)}
        >
          <p className="text-sm leading-6 text-muted">
            {t("Talk to the musician to arrange it.")}
          </p>
          <p className="my-5 font-semibold">{notPerformed.songTitle}</p>
          <ErrorNotice error={command.error} />
          <Button
            className="w-full"
            busy={command.isPending}
            onClick={() =>
              command.mutate(
                {
                  path: `/musician/requests/${notPerformed.id}/performance`,
                  body: { status: "not_performed" },
                },
                { onSuccess: () => setNotPerformed(null) },
              )
            }
          >
            {t("Confirm")}
          </Button>
        </Modal>
      )}
      {receipt && (
        <ReceiptPreview
          url={receipt}
          role="musician"
          onClose={() => setReceipt(null)}
        />
      )}
    </>
  );
}
