"use client";
import { useState } from "react";
import Link from "next/link";
import type { MusicianProfile, SocialLink } from "@musica/contracts";
import {
  Camera,
  Plus,
  X,
  ArrowUpRight,
  Check,
  ImageIcon,
  Upload,
} from "lucide-react";
import { useDashboard, useCommand } from "@/lib/queries";
import { isDemo } from "@/lib/auth";
import { useLocale } from "@/lib/i18n";
import {
  Button,
  Field,
  TextArea,
  SectionTitle,
  Loading,
  ErrorNotice,
  Notice,
  inputClass,
} from "@/components/ui";
import { Avatar } from "@/features/profile/profile-view";
function ProfileForm({ profile }: { profile: MusicianProfile }) {
  const { t, money } = useLocale();
  const command = useCommand<MusicianProfile>();
  const media = useCommand<MusicianProfile>();
  const [draft, setDraft] = useState(profile);
  const [standard, setStandard] = useState(String(profile.standardPrice / 100));
  const [dedication, setDedication] = useState(
    String(profile.dedicationSurcharge / 100),
  );
  const songCents = Math.round(Number(standard) * 100);
  const dedicationCents = Math.round(Number(dedication) * 100);
  const [saved, setSaved] = useState(false);
  const [fileError, setFileError] = useState<unknown>();
  function field(key: keyof MusicianProfile, value: unknown) {
    setSaved(false);
    setDraft((prev) => ({ ...prev, [key]: value }));
  }
  async function upload(kind: "avatar" | "banner", file?: File) {
    if (!file) return;
    setFileError(undefined);
    if (file.size > 4 * 1024 * 1024) {
      setFileError(new Error("Image too large"));
      return;
    }
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    const baseline = profile.version;
    media.mutate(
      { path: "/musician/profile/media", body: form },
      {
        onSuccess: (data) =>
          setDraft((prev) =>
            prev.version === baseline
              ? { ...prev, version: data.version }
              : prev,
          ),
      },
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        command.mutate(
          {
            path: "/musician/profile",
            method: "PATCH",
            body: {
              stageName: draft.stageName,
              bio: draft.bio,
              location: draft.location,
              publicEmail: draft.publicEmail,
              whatsapp: draft.whatsapp,
              website: draft.website,
              socialLinks: draft.socialLinks.filter(
                (l) => l.platform.trim() && l.url.trim(),
              ),
              standardPrice: Math.round(Number(standard) * 100),
              dedicationSurcharge: Math.round(Number(dedication) * 100),
              alias: draft.alias,
              cbu: draft.cbu,
              accountName: draft.accountName,
              version: draft.version,
            },
          },
          {
            onSuccess: (data) => {
              setSaved(true);
              setDraft(data);
              setStandard(String(data.standardPrice / 100));
              setDedication(String(data.dedicationSurcharge / 100));
            },
          },
        );
      }}
      className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]"
    >
      <div className="space-y-8">
        <section className="rounded-card border border-border p-5 sm:p-7">
          <h2 className="mb-5 text-lg font-semibold">{t("Public profile")}</h2>
          <div className="relative mb-5 h-36 overflow-hidden rounded-control bg-surface-inverse">
            <img
              src={profile.bannerUrl || "/stage.svg"}
              alt=""
              className="h-full w-full object-cover"
            />
            <label className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-xs font-semibold">
              <Camera size={15} />
              {t("Banner image")}
              <input
                aria-label={t("Banner image")}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={media.isPending}
                onChange={(e) => {
                  upload("banner", e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="mb-6 flex items-center gap-3">
            <Avatar profile={profile} />
            <label className="cursor-pointer rounded-control border border-border px-4 py-3 text-xs font-semibold">
              {t("Profile photo")}
              <input
                aria-label={t("Profile photo")}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={media.isPending}
                onChange={(e) => {
                  upload("avatar", e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {profile.avatarUrl && (
              <Button
                variant="ghost"
                className="px-2 text-xs"
                busy={media.isPending}
                onClick={() =>
                  media.mutate(
                    {
                      path: "/musician/profile/media/avatar",
                      method: "DELETE",
                    },
                    {
                      onSuccess: (data) =>
                        setDraft((prev) =>
                          prev.version === profile.version
                            ? { ...prev, version: data.version }
                            : prev,
                        ),
                    },
                  )
                }
              >
                {t("Remove image")}
              </Button>
            )}
          </div>
          {profile.bannerUrl && (
            <Button
              variant="ghost"
              className="mb-4 px-2 text-xs"
              busy={media.isPending}
              onClick={() =>
                media.mutate(
                  { path: "/musician/profile/media/banner", method: "DELETE" },
                  {
                    onSuccess: (data) =>
                      setDraft((prev) =>
                        prev.version === profile.version
                          ? { ...prev, version: data.version }
                          : prev,
                      ),
                  },
                )
              }
            >
              {t("Remove banner")}
            </Button>
          )}
          <ErrorNotice error={media.error || fileError} />
          {media.isPending && <Notice>{t("Working…")}</Notice>}
          <div className="space-y-5">
            <Field
              label={t("Stage name")}
              value={draft.stageName}
              onChange={(e) => field("stageName", e.target.value)}
              required
              maxLength={80}
            />
            <TextArea
              label={t("Biography")}
              value={draft.bio}
              onChange={(e) => field("bio", e.target.value)}
              maxLength={1000}
            />
            <Field
              label={t("Location")}
              value={draft.location}
              onChange={(e) => field("location", e.target.value)}
              maxLength={120}
            />
          </div>
        </section>
        <section className="rounded-card border border-border p-5 sm:p-7">
          <h2 className="text-lg font-semibold">{t("Contact")}</h2>
          <p className="mb-6 mt-2 text-xs leading-5 text-muted">
            {t("These details will be visible to guests.")}
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={t("Public email")}
              type="email"
              value={draft.publicEmail}
              onChange={(e) => field("publicEmail", e.target.value)}
            />
            <Field
              label="WhatsApp"
              type="tel"
              placeholder="+54…"
              value={draft.whatsapp}
              onChange={(e) => field("whatsapp", e.target.value)}
            />
            <Field
              label={t("Website")}
              type="url"
              placeholder="https://…"
              value={draft.website}
              onChange={(e) => field("website", e.target.value)}
            />
          </div>
          <h3 className="mb-4 mt-8 text-sm font-semibold">
            {t("Social links")}
          </h3>
          <div className="space-y-3">
            {draft.socialLinks.map((link, index) => (
              <div key={index} className="flex flex-wrap gap-2 sm:flex-nowrap">
                <input
                  aria-label={`${t("Platform")} ${index + 1}`}
                  placeholder="Instagram"
                  className={`${inputClass} flex-1 sm:max-w-32`}
                  value={link.platform}
                  onChange={(e) =>
                    field(
                      "socialLinks",
                      draft.socialLinks.map((item, i) =>
                        i === index
                          ? { ...item, platform: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`${t("Link")} ${index + 1}`}
                  type="url"
                  placeholder="https://…"
                  className={`${inputClass} min-w-0 flex-[2]`}
                  value={link.url}
                  onChange={(e) =>
                    field(
                      "socialLinks",
                      draft.socialLinks.map((item, i) =>
                        i === index ? { ...item, url: e.target.value } : item,
                      ),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  aria-label={t("Remove")}
                  className="px-2"
                  onClick={() =>
                    field(
                      "socialLinks",
                      draft.socialLinks.filter((_, i) => i !== index),
                    )
                  }
                >
                  <X size={18} />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            className="mt-3 px-0"
            disabled={draft.socialLinks.length >= 10}
            onClick={() =>
              field("socialLinks", [
                ...draft.socialLinks,
                { platform: "", url: "" },
              ])
            }
          >
            <Plus size={16} />
            {t("Add link")}
          </Button>
        </section>
        <section className="rounded-card border border-border p-5 sm:p-7">
          <h2 className="mb-6 text-lg font-semibold">{t("Prices")}</h2>
          {profile.pricingReviewRequired && <Notice>{t("Review your dedication price before accepting new requests.")}</Notice>}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={`${t("Standard price")} (ARS)`}
              type="number"
              min={1}
              step="0.01"
              required
              value={standard}
              onChange={(e) => {
                setStandard(e.target.value);
                setSaved(false);
              }}
            />
            <Field
              label={`${t("Dedication add-on")} (ARS)`}
              type="number"
              min={0}
              step="0.01"
              required
              value={dedication}
              onChange={(e) => {
                setDedication(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <p className="mt-4 text-sm text-muted">{t("Dedication total")}: {money(songCents)} + {money(dedicationCents)} = <strong className="text-foreground">{money(songCents + dedicationCents)}</strong></p>
        </section>
        <section className="rounded-card border border-border p-5 sm:p-7">
          <h2 className="text-lg font-semibold">{t("Bank details")}</h2>
          <p className="mb-6 mt-2 text-xs leading-5 text-muted">
            {t("These details are shown only after a reservation.")}
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={t("Account holder")}
              value={draft.accountName}
              onChange={(e) => field("accountName", e.target.value)}
              required
            />
            <Field
              label={t("Transfer alias")}
              value={draft.alias}
              onChange={(e) => field("alias", e.target.value)}
              required
            />
            <Field
              label="CBU"
              inputMode="numeric"
              pattern="[0-9]{22}"
              maxLength={22}
              value={draft.cbu}
              onChange={(e) => field("cbu", e.target.value)}
              hint={t("Optional. Enter 22 digits.")}
            />
          </div>
          {isDemo && <p className="mt-4 text-xs font-medium">
            {t("This is a demo. Do not transfer money.")}
          </p>}
        </section>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-28">
        <div className="rounded-card border border-border p-5">
          <p className="mb-4 text-sm leading-6 text-muted">
            {t("Your profile connects your music with your audience.")}
          </p>
          <Button
            type="submit"
            busy={command.isPending}
            disabled={media.isPending}
            className="w-full"
          >
            {saved ? <Check size={17} /> : null}
            {t(saved ? "Saved" : "Save changes")}
          </Button>
          <ErrorNotice error={command.error} />
          {saved && (
            <p role="status" className="mt-3 text-center text-xs text-muted">
              {t("Profile updated")}
            </p>
          )}
          <Link
            href={`/m/${profile.slug}`}
            className="mt-4 flex items-center justify-center gap-2 text-xs font-medium"
          >
            {t("Public profile")}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
    </form>
  );
}
export function ProfileEditorView() {
  const query = useDashboard();
  const { t } = useLocale();
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorNotice error={query.error} retry={() => query.refetch()} />;
  return (
    <>
      <SectionTitle eyebrow={t("Settings")} title={t("Profile")} />
      <ProfileForm profile={query.data.profile} />
    </>
  );
}
