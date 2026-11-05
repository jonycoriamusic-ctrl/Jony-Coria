"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Search,
  ArrowUpRight,
  ArrowRight,
  Music2,
  Heart,
  MapPin,
  Disc3,
  Check,
  Plus,
} from "lucide-react";
import type {
  MenuResponse,
  MenuSong,
  MusicRequest,
  RequestType,
} from "@musica/contracts";
import { useReservation } from "./application/use-reservation";
import { quotedPrice } from "./domain/request";
import { useMenu } from "@/lib/queries";
import { useMusicianSlug, profileHref } from "@/lib/navigation";
import { useLocale } from "@/lib/i18n";
import {
  Button,
  Field,
  TextArea,
  Modal,
  Empty,
  Loading,
  ErrorNotice,
  cx,
} from "@/components/ui";
import { Avatar } from "@/features/profile/profile-view";
export function ReserveDialog({
  song,
  menu,
  onClose,
}: {
  song: MenuSong;
  menu: MenuResponse;
  onClose: () => void;
}) {
  const { t, money } = useLocale();
  const [type, setType] = useState<RequestType>("standard");
  const [name, setName] = useState("");
  const [dedication, setDedication] = useState("");
  const amount = quotedPrice(menu.profile, type);
  const mutation = useReservation({
    showId: menu.show?.id || "",
    songId: song.id,
    type,
    dedication: type === "dedication" ? dedication : "",
    guestName: name,
    expectedPrice: amount,
  });
  return (
    <Modal title={t("Your request")} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="mb-6 flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-card bg-surface-inverse text-inverse">
            <Music2 size={27} />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{song.title}</h3>
            <p className="mt-1 text-sm text-muted">{song.artist}</p>
          </div>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3">
          {(["standard", "dedication"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={cx(
                "rounded-card border p-4 text-left transition-colors",
                type === value
                  ? "border-foreground bg-surface-subtle ring-1 ring-focus"
                  : "border-border",
              )}
            >
              <span className="mb-3 block">
                {value === "standard" ? (
                  <Music2 size={20} />
                ) : (
                  <Heart size={20} />
                )}
              </span>
              <span className="block text-sm font-medium">
                {t(
                  value === "standard"
                    ? "Standard request"
                    : "With a dedication",
                )}
              </span>
              <span className="mt-1 block font-semibold">{money(quotedPrice(menu.profile, value))}</span>
              {value === "dedication" && <span className="mt-1 block text-xs leading-5 text-muted">{money(menu.profile.standardPrice)} + {money(menu.profile.dedicationSurcharge)}</span>}
            </button>
          ))}
        </div>
        <div className="space-y-5">
          <Field
            label={t("Your name")}
            hint={t("Optional")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoComplete="given-name"
          />
          {type === "dedication" && (
            <>
              <TextArea
                label={t("Your message")}
                placeholder={t("A little message, a lasting memory.")}
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                maxLength={280}
                required
              />
              <p className="-mt-3 text-right text-xs text-muted">
                {dedication.length}/280
              </p>
            </>
          )}
        </div>
        <ErrorNotice error={mutation.error} />
        <div className="my-6 space-y-2 border-t border-border pt-5 text-sm">
          <p className="flex justify-between"><span>{t("Song price")}</span><span>{money(menu.profile.standardPrice)}</span></p>
          {type === "dedication" && <p className="flex justify-between"><span>{t("Dedication add-on")}</span><span>+ {money(menu.profile.dedicationSurcharge)}</span></p>}
          <p className="flex justify-between border-t border-border pt-3 text-base font-semibold"><span>{t("Total")}</span><strong>{money(amount)}</strong></p>
        </div>
        <Button
          type="submit"
          busy={mutation.isPending}
          className="w-full"
          disabled={type === "dedication" && !dedication.trim()}
        >
          {t("Reserve this song")}
          <ArrowRight size={17} />
        </Button>
        <p className="mt-3 text-center text-xs leading-5 text-muted">
          {t("No account needed. Just good music.")}
        </p>
      </form>
    </Modal>
  );
}
export function MenuView({slug: explicitSlug}: {slug?: string} = {}) {
  const slug = useMusicianSlug(explicitSlug);
  const query = useMenu(slug);
  const { t, money } = useLocale();
  const [search, setSearch] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [selected, setSelected] = useState<MenuSong | null>(null);
  if (!slug) return <div className="mx-auto max-w-2xl py-16 text-center"><Music2 className="mx-auto mb-6" size={36}/><h1 className="text-4xl font-semibold tracking-tight">Musica a la carta</h1><p className="mt-5 text-lg text-muted">{t("Scan your musician’s QR to explore the menu.")}</p><Link href="/ingresar" className="mt-8 inline-flex rounded-control bg-action px-6 py-3 font-semibold text-action-foreground">{t("Musician access")}</Link></div>;
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorNotice error={query.error} retry={() => query.refetch()} />;
  const menu = query.data;
  if (menu.profile.slug !== slug) return <Empty title={t("Not found")}/>;
  if (menu.profile.pricingReviewRequired) return <Empty title={t("Prices are being updated")} description={t("Please try again later.")}/>;
  const folders = (menu.folders ?? []).filter((folder) => menu.songs.some((song) => song.folderId === folder.id));
  const activeFolderId = folders.some((folder) => folder.id === folderId) ? folderId : null;
  const songs = menu.songs.filter(
    (s) =>
      (activeFolderId === null || s.folderId === activeFolderId) &&
      `${s.title} ${s.artist}`
        .toLocaleLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(
          search
            .toLocaleLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""),
        ),
  );
  const open = menu.show?.status === "open" && menu.remaining > 0;
  return (
    <>
      <section className="relative mb-9 overflow-hidden rounded-sheet bg-surface-inverse text-inverse">
        <img
          src={menu.profile.bannerUrl || "/stage.svg"}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-photo-scrim" />
        <div className="relative flex min-h-64 flex-col justify-between p-6 sm:min-h-80 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-inverse/30 bg-surface-inverse/40 px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest">
              <span className="size-1.5 rounded-full bg-inverse" />
              {t(menu.show?.status === "open" ? "Live tonight" : "The show")}
            </span>
            <span className="text-xs tracking-wide">
              {menu.show?.venue || "Musica a la carta"}
            </span>
          </div>
          <div className="mt-10 flex items-end justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[.2em] text-inverse">
                {t("Live music, chosen by you.")}
              </p>
              <h1 className="text-5xl font-semibold tracking-tighter sm:text-7xl">
                {menu.profile.stageName}
                <span className="ml-2 inline-block text-2xl font-normal sm:text-4xl">
                  / {t("Live").toLowerCase()}
                </span>
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-inverse">
                {menu.show ? menu.show.title : t("No active show")}
              </p>
            </div>
            <Link
              href={profileHref(menu.profile.slug)}
              aria-label={t("Public profile")}
              className="flex size-12 shrink-0 items-center justify-center rounded-full border border-inverse/40 hover:bg-inverse/10"
            >
              <ArrowUpRight size={22} />
            </Link>
          </div>
        </div>
      </section>
      <div className="grid min-w-0 grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_290px]">
        <section className="min-w-0">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-muted">
                {t("Your night, your soundtrack.")}
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                {t("Menu")}
              </h2>
            </div>
            <span className="rounded-full bg-surface-hover px-3 py-2 text-xs font-medium">
              {menu.songs.length} {t("songs")}
            </span>
          </div>
          {!open && (
            <div
              role="status"
              className="mb-5 rounded-control border border-control-border p-4 text-sm"
            >
              {t(
                !menu.show
                  ? "No active show"
                  : menu.show.status === "paused"
                    ? "Requests are paused"
                    : menu.remaining <= 0
                      ? "The show is full"
                      : "Requests are closed",
              )}
            </div>
          )}
          <label className="relative block">
            <Search className="absolute left-4 top-3.5 text-muted" size={20} />
            <input
              aria-label={t("Search songs or artists")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search songs or artists")}
              className="h-12 w-full rounded-full border border-border bg-surface-subtle pl-12 pr-4 text-sm outline-none focus:border-foreground focus:ring-1 focus:ring-focus"
            />
          </label>
          {folders.length > 0 && (
            <div className="my-5 flex gap-2 overflow-x-auto pb-1" aria-label={t("Folders")}>
              {[{id: null, name: t("All")}, ...folders].map((folder) => (
                <button
                  key={folder.id ?? "all"}
                  onClick={() => setFolderId(folder.id)}
                  aria-pressed={activeFolderId === folder.id}
                  className={cx(
                    "shrink-0 rounded-full border px-4 py-2 text-xs font-medium",
                    activeFolderId === folder.id
                      ? "border-foreground bg-action text-action-foreground"
                      : "border-border hover:bg-surface-hover",
                  )}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          )}
          {songs.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {songs.map((song, index) => (
                <button
                  key={song.id}
                  onClick={() => setSelected(song)}
                  disabled={!open || !song.available}
                  className="group flex min-h-28 items-center gap-3.5 rounded-card border border-border p-4 text-left transition-colors hover:border-control-border disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <div
                    className={cx(
                      "flex size-12 shrink-0 items-center justify-center rounded-control",
                      index % 3 === 0
                        ? "bg-surface-inverse text-inverse"
                        : "bg-surface-hover",
                    )}
                  >
                    <Disc3 size={24} strokeWidth={1} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">
                      {song.title}
                    </h3>
                    <p className="mt-1 truncate text-xs text-muted">
                      {song.artist}
                    </p>
                    <p className="mt-2 text-xs">
                      {song.available ? (
                        <>
                          <span className="text-muted">{t("From")} </span>
                          <span className="font-medium">
                            {money(menu.profile.standardPrice)}
                          </span>
                        </>
                      ) : (
                        t("Unavailable")
                      )}
                    </p>
                  </div>
                  <Plus
                    size={17}
                    className="shrink-0 text-muted group-hover:text-foreground"
                  />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title={t(menu.show ? "No songs found" : "No active show")}
              description={t(menu.show ? "Try another title or artist." : "The next show will appear here.")}
            />
          )}
        </section>
        <aside className="space-y-5 lg:sticky lg:top-28">
          <div className="rounded-card border border-border p-6">
            <div className="mb-5 flex items-center gap-3">
              <Avatar profile={menu.profile} />
              <div>
                <p className="text-base font-semibold">
                  {menu.profile.stageName}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                  <MapPin size={12} />
                  {menu.profile.location || "Argentina"}
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-2 border-t border-border pt-5">
              <strong className="text-4xl font-semibold tracking-tight">
                {menu.remaining.toString().padStart(2, "0")}
              </strong>
              <span className="text-sm text-muted">{t("places left")}</span>
            </div>
            <div className="my-4 h-1 overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full bg-action transition-all"
                style={{
                  width: `${menu.show ? Math.min(100, (menu.remaining / menu.show.capacity) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="space-y-3 text-sm">
              <p className="flex justify-between">
                <span className="text-muted">{t("Song price")}</span>
                <strong className="font-medium">
                  {money(menu.profile.standardPrice)}
                </strong>
              </p>
              <p className="flex justify-between">
                <span className="text-muted">{t("Dedication add-on")}</span>
                <strong className="font-medium">
                  + {money(menu.profile.dedicationSurcharge)}
                </strong>
              </p>
              <p className="flex justify-between border-t border-border pt-3 font-semibold"><span>{t("Dedication total")}</span><strong>{money(quotedPrice(menu.profile, "dedication"))}</strong></p>
            </div>
          </div>
          <div className="rounded-card bg-surface-subtle p-6">
            <h3 className="mb-5 text-sm font-semibold">{t("How it works")}</h3>
            {[
              ["Choose your song", "Choose from the musician’s repertoire."],
              ["Make it personal", "Add a dedication for someone special."],
              ["Transfer & enjoy", "Tap I have transferred to join the queue."],
            ].map(([title, description], i) => (
              <div key={title} className="mb-5 flex gap-3 last:mb-0">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-[10px]">
                  0{i + 1}
                </span>
                <div>
                  <p className="text-xs font-semibold">{t(title)}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {t(description)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
      {selected && (
        <ReserveDialog
          song={selected}
          menu={menu}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
