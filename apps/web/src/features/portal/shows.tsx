"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { timeZoneOf } from "@musica/contracts";
import type { Show, Song, DashboardResponse, MusicianProfile } from "@musica/contracts";
import {
  Plus,
  QrCode,
  Download,
  Copy,
  CalendarDays,
  MapPin,
  Users,
  ArrowUpRight,
  Pencil,
  Pause,
  Play,
  Check,
} from "lucide-react";
import { useDashboard, useCommand, useShowRequests } from "@/lib/queries";
import { isDemo } from "@/lib/auth";
import { useLocale } from "@/lib/i18n";
import { downloadQrPrintCard } from "@/lib/qr-print-card";
import { permanentQrUrl } from "@/lib/last-menu";
import { showLocalDateTime, showStartInstant } from "@/lib/show-date-time";
import {
  Button,
  Field,
  Modal,
  SectionTitle,
  Loading,
  ErrorNotice,
  Empty,
  cx,
} from "@/components/ui";
function ShowEditor({
  show,
  songs,
  profile,
  onClose,
}: {
  show?: Show;
  songs: Song[];
  profile: MusicianProfile;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const command = useCommand();
  const timeZone = timeZoneOf(profile.market, profile.timeZone);
  const [title, setTitle] = useState(show?.title || "");
  const [venue, setVenue] = useState(show?.venue || "");
  const [day, setDay] = useState(() => showLocalDateTime(show?.date ?? new Date(), timeZone).day);
  const [startTime, setStartTime] = useState(() => show ? showLocalDateTime(show.date, timeZone).time : "21:00");
  const [dateError, setDateError] = useState("");
  const [capacity, setCapacity] = useState(show?.capacity || 20);
  const [selected, setSelected] = useState(
    show?.songIds || songs.filter((s) => s.enabled).map((s) => s.id),
  );
  return (
    <Modal title={t(show ? "Edit show" : "New show")} onClose={onClose}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const instant = showStartInstant(day, startTime, timeZone);
          if (!instant) {
            setDateError(t("Choose a valid local date and time."));
            return;
          }
          setDateError("");
          command.mutate(
            {
              path: `/musician/shows${show ? "/" + show.id : ""}`,
              method: show ? "PATCH" : "POST",
              body: {
                title,
                venue,
                date: instant,
                capacity,
                songIds: selected,
                ...(show ? { version: show.version } : {}),
              },
            },
            { onSuccess: onClose },
          );
        }}
      >
        <Field
          label={t("Title")}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
        />
        <Field
          label={t("Venue")}
          required
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          maxLength={120}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("Date")}
            type="date"
            required
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
          <Field
            label={`${t("Start time")} (${timeZone.split("/").at(-1)?.replaceAll("_", " ")})`}
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Field
              label={t("Song limit")}
              type="number"
              required
              min={1}
              max={500}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </div>
        </div>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">
            {t("Choose repertoire")}{" "}
            <span className="text-muted">({selected.length})</span>
          </legend>
          <div className="max-h-48 overflow-auto rounded-control border border-border">
            {songs
              .filter((s) => s.enabled || selected.includes(s.id))
              .map((song) => (
                <label
                  key={song.id}
                  className="flex items-center gap-3 border-b border-border px-3 py-3 text-sm last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(song.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, song.id]
                          : selected.filter((id) => id !== song.id),
                      )
                    }
                    className="size-4 accent-foreground"
                  />
                  <span className="truncate">
                    {song.title}{" "}
                    <span className="text-xs text-muted">· {song.artist}</span>
                  </span>
                </label>
              ))}
          </div>
        </fieldset>
        {dateError && <p role="alert" className="text-sm text-foreground">{dateError}</p>}
        <ErrorNotice error={command.error} />
        <Button type="submit" className="w-full" busy={command.isPending}>
          {t("Save changes")}
        </Button>
      </form>
    </Modal>
  );
}
export function QrDialog({
  profile,
  show,
  onClose,
}: {
  profile: MusicianProfile;
  show: Show | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [image, setImage] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<unknown>();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  useEffect(() => {
    const href = permanentQrUrl(profile.slug, location.origin);
    setUrl(href);
    setCopied(false);
    setCopyError(false);
    QRCode.toDataURL(href, {
      width: 800,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setImage)
      .catch(setError);
  }, [profile.slug]);
  return (
    <Modal title={t("Your reusable QR")} onClose={onClose}>
      <div className="text-center">
        <p className="text-sm leading-6 text-muted">
          {t("Print this QR once. It opens the show scheduled for the current date and time.")}
        </p>
        <div className="mt-4 rounded-control bg-surface-subtle p-4 text-left text-sm">
          <span className="block text-xs text-muted">{t("Currently linked show")}</span>
          <strong className="mt-1 block">{show ? show.title : t("No active show")}</strong>
          {show && <span className="mt-1 block text-xs text-muted">{show.venue}</span>}
        </div>
        {image ? (
          <img
            src={image}
            alt={t("Your reusable QR")}
            className="mx-auto my-6 size-64 max-w-full rounded-control border border-border"
          />
        ) : (
          <Loading />
        )}
        <p className="break-all text-xs text-muted">{url}</p>
        <ErrorNotice error={error} />
        {copyError && <p role="alert" className="mt-2 text-xs text-muted">{t("Could not copy link. You can select the URL above.")}</p>}
        {downloadError && <p role="alert" className="mt-2 text-xs text-muted">{t("Could not create print card. Please try again.")}</p>}
        {isDemo && <p className="my-4 text-xs leading-5 text-muted">
          {t("This local QR works on this computer only. A public URL comes after deployment.")}
        </p>}
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <Button
            variant="secondary"
            disabled={!url}
            aria-live="polite"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setCopyError(false);
              } catch {
                setCopied(false);
                setCopyError(true);
              }
            }}
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
            {t(copied ? "Link copied" : "Copy link")}
          </Button>
          <Button
            disabled={!url || !image}
            busy={downloading}
            onClick={async () => {
              setDownloading(true);
              setDownloadError(false);
              try {
                await downloadQrPrintCard(profile, url);
              } catch {
                setDownloadError(true);
              } finally {
                setDownloading(false);
              }
            }}
          >
            <Download size={17} />
            {t("Download print card")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
export function ShowsView() {
  const query = useDashboard();
  const command = useCommand();
  const { t, date, locale } = useLocale();
  const [editing, setEditing] = useState<Show | true | null>(null);
  const [qr, setQr] = useState(false);
  const [finish, setFinish] = useState<Show | null>(null);
  const finishRequests = useShowRequests(finish?.id, finish?.status === "finished");
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorNotice error={query.error} retry={() => query.refetch()} />;
  const data = query.data;
  return (
    <>
      <SectionTitle eyebrow={locale === "en" ? "Music Menu" : "Musica a la carta"} title={t("Shows")}>
        <div className="flex gap-2">
          <Button variant="secondary" aria-label={t("Your reusable QR")} onClick={() => setQr(true)}>
            <QrCode size={17} />
            <span className="hidden sm:inline">{t("Your reusable QR")}</span>
          </Button>
          <Button onClick={() => setEditing(true)}>
            <Plus size={17} />
            {t("New show")}
          </Button>
        </div>
      </SectionTitle>
      <p className="mb-6 text-sm leading-6 text-muted">{t("Set a start date and time for each show. The same QR switches automatically.")}</p>
      <ErrorNotice error={command.error} />
      {data.shows.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {[...data.shows].reverse().map((show) => (
            <article
              key={show.id}
              className="overflow-hidden rounded-card border border-border"
            >
              <div
                className={cx(
                  "flex items-center justify-between border-b border-border px-6 py-4 text-xs",
                  data.activeShowId === show.id
                    ? "bg-action text-action-foreground"
                    : "bg-surface-subtle",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-current" />
                  {t(
                    {
                      draft: Date.parse(show.date) > Date.now() ? "Scheduled" : "Draft",
                      open: "Open",
                      paused: "Paused",
                      closed: "Closed",
                      finished: "Finished",
                    }[show.status],
                  )}
                </span>
                <span>{date(show.date, true, timeZoneOf(data.profile.market, data.profile.timeZone))}</span>
              </div>
              <div className="p-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  {show.title}
                </h2>
                <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                  <MapPin size={15} />
                  {show.venue}
                </p>
                <div className="my-5 flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <Users size={15} />
                    {show.occupiedCount} / {show.capacity}{" "}
                    {t("Requests").toLowerCase()}
                  </span>
                  <span>
                    {show.songIds.length} {t("songs")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/portal?show=${show.id}`}
                    className="inline-flex min-h-11 items-center rounded-control border border-border px-3 text-sm font-semibold"
                  >
                    {t("View requests")}
                  </Link>
                  {show.status !== "finished" && (
                    <>
                      <Button
                        variant="secondary"
                        className="px-3"
                        onClick={() => setEditing(show)}
                      >
                        <Pencil size={15} />
                        {t("Edit show")}
                      </Button>
                      {show.status === "draft" && (
                        <Button
                          busy={command.isPending}
                          disabled={!!data.activeShowId}
                          onClick={() =>
                            command.mutate({
                              path: `/musician/shows/${show.id}/action`,
                              body: { action: "open" },
                            })
                          }
                        >
                          {t("Open now")}
                        </Button>
                      )}
                      {["open", "paused"].includes(show.status) && (
                        <Button
                          variant="secondary"
                          busy={command.isPending}
                          onClick={() =>
                            command.mutate({
                              path: `/musician/shows/${show.id}/action`,
                              body: {
                                action:
                                  show.status === "open" ? "pause" : "resume",
                              },
                            })
                          }
                        >
                          {show.status === "open" ? (
                            <Pause size={15} />
                          ) : (
                            <Play size={15} />
                          )}{" "}
                          {t(
                            show.status === "open"
                              ? "Pause requests"
                              : "Resume requests",
                          )}
                        </Button>
                      )}
                      {show.status !== "draft" && (
                        <Button variant="ghost" onClick={() => setFinish(show)}>
                          {t("Finish show")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title={t("No active show")} />
      )}
      {editing && (
        <ShowEditor
          show={editing === true ? undefined : editing}
          songs={data.songs}
          profile={data.profile}
          onClose={() => setEditing(null)}
        />
      )}
      {qr && <QrDialog profile={data.profile} show={data.shows.find(show => show.id === data.activeShowId) ?? null} onClose={() => setQr(false)} />}
      {finish && (
        <Modal title={t("Finish show")} onClose={() => setFinish(null)}>
          <p className="text-lg font-semibold">{finish.title}</p>
          <p className="my-5 text-sm leading-6 text-muted">
            {t(
              "This closes requests. Unplayed requests remain visible for you to arrange directly.",
            )}
          </p>
          <p className="mb-5 text-sm">
            <strong>
              {
                (finishRequests.data ?? []).filter(
                  (r) =>
                    r.showId === finish.id &&
                    ["review_pending", "queued", "playing"].includes(r.status),
                ).length
              }
            </strong>{" "}
            {t("Outstanding requests")}
          </p>
          <ErrorNotice error={command.error || finishRequests.error} />
          <Button
            className="w-full"
            busy={command.isPending || finishRequests.isPending}
            disabled={!!finishRequests.error}
            onClick={() =>
              command.mutate(
                {
                  path: `/musician/shows/${finish.id}/action`,
                  body: { action: "finish" },
                },
                { onSuccess: () => setFinish(null) },
              )
            }
          >
            {t("Finish show")}
          </Button>
        </Modal>
      )}
    </>
  );
}
