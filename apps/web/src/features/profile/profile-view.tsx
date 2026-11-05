"use client";
import Link from "next/link";
import type { PublicProfile } from "@musica/contracts";
import {
  MapPin,
  Mail,
  Globe,
  Instagram,
  ArrowUpRight,
  Music2,
} from "lucide-react";
import { usePublicProfile, useMenu } from "@/lib/queries";
import { useMusicianSlug, menuHref } from "@/lib/navigation";
import { useLocale } from "@/lib/i18n";
import { Loading, ErrorNotice, ExternalLink, cx } from "@/components/ui";
export function Avatar({
  profile,
  large = false,
}: {
  profile: Pick<PublicProfile, "avatarUrl" | "stageName">;
  large?: boolean;
}) {
  return profile.avatarUrl ? (
    <img
      src={profile.avatarUrl}
      alt={profile.stageName}
      className={cx(
        "shrink-0 rounded-full border-4 border-surface object-cover",
        large ? "size-28" : "size-16",
      )}
    />
  ) : (
    <div
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full border-4 border-surface bg-surface-inverse font-medium text-inverse",
        large ? "size-28 text-4xl" : "size-16 text-xl",
      )}
      aria-label={profile.stageName}
    >
      {profile.stageName.slice(0, 1)}
    </div>
  );
}
export function ProfileCover({ profile }: { profile: PublicProfile }) {
  return (
    <div className="relative h-44 overflow-hidden rounded-sheet bg-surface-inverse sm:h-64">
      <img
        src={profile.bannerUrl || "/stage.svg"}
        alt=""
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-overlay to-transparent" />
    </div>
  );
}
export function ContactLinks({ profile }: { profile: PublicProfile }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap gap-2">
      {profile.socialLinks.map((link, i) => (
        <ExternalLink key={`${link.platform}-${i}`} href={link.url}>
          {link.platform.toLowerCase() === "instagram" ? (
            <Instagram size={17} />
          ) : (
            <ArrowUpRight size={17} />
          )}{" "}
          {link.platform}
        </ExternalLink>
      ))}
      {profile.website && (
        <ExternalLink href={profile.website}>
          <Globe size={17} />
          {t("Website")}
        </ExternalLink>
      )}
      {profile.publicEmail && (
        <ExternalLink href={`mailto:${profile.publicEmail}`}>
          <Mail size={17} />
          {t("Email")}
        </ExternalLink>
      )}
      {profile.whatsapp && (
        <ExternalLink
          href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`}
        >
          WhatsApp
        </ExternalLink>
      )}
    </div>
  );
}
export function PublicProfileView({ slug: explicitSlug }: { slug?: string }) {
  const slug = useMusicianSlug(explicitSlug);
  const query = usePublicProfile(slug);
  const menu = useMenu(slug);
  const { t } = useLocale();
  if (!slug) return <p className="py-16 text-center text-muted">{t("Scan your musician’s QR to explore the menu.")}</p>;
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorNotice error={query.error} retry={() => query.refetch()} />;
  const p = query.data;
  if (slug && p.slug !== slug)
    return <ErrorNotice error={new Error("Not found")} />;
  return (
    <div className="mx-auto max-w-4xl">
      <ProfileCover profile={p} />
      <div className="relative mx-5 -mt-14 sm:mx-10">
        <Avatar profile={p} large />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[.16em] text-muted">
              {t("Live music, chosen by you.")}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              {p.stageName}
            </h1>
            {p.location && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                <MapPin size={15} />
                {p.location}
              </p>
            )}
          </div>
          <Link
            href={menuHref(p.slug)}
            className="inline-flex items-center gap-2 rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-action-foreground"
          >
            <Music2 size={17} />
            {t("Request a song")}
          </Link>
        </div>
        <div className="mt-9 grid gap-10 border-t border-border pt-8 md:grid-cols-[1.3fr_1fr]">
          <section>
            <h2 className="mb-4 text-lg font-semibold">{t("About")}</h2>
            <p className="whitespace-pre-line text-base leading-8 text-muted">
              {p.bio}
            </p>
          </section>
          <section>
            <h2 className="mb-4 text-lg font-semibold">
              {t("Connect with the musician")}
            </h2>
            <ContactLinks profile={p} />
          </section>
        </div>
        <section className="my-10 rounded-card border border-border bg-surface-subtle p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            {t("The show")}
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {menu.data?.show?.title || t("No active show")}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {menu.data?.show?.venue || t("Come back for the next show.")}
          </p>
        </section>
      </div>
    </div>
  );
}
