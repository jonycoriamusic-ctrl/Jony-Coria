"use client";
import { useState } from "react";
import Link from "next/link";
import { MARKET_SETTINGS, AU_TIME_ZONES, marketOf, type Market, type MusicianProfile, type SocialLink } from "@musica/contracts";
import {
  Camera,
  Plus,
  X,
  ArrowUpRight,
  Check,
  ImageIcon,
  Upload,
  Globe2,
  Pencil,
} from "lucide-react";
import { useDashboard, useCommand } from "@/lib/queries";
import { isDemo } from "@/lib/auth";
import { useLocale } from "@/lib/i18n";
import { publicMediaUrl } from "@/lib/public-media";
import { SOCIAL_PLATFORMS, socialPlatform } from "@/lib/social-platforms";
import {
  Button,
  Field,
  TextArea,
  SectionTitle,
  Loading,
  ErrorNotice,
  Notice,
  SelectField,
  inputClass,
} from "@/components/ui";
import { Avatar } from "@/features/profile/profile-view";
import { useToast } from "@/components/toast-provider";
function ProfileForm({ profile }: { profile: MusicianProfile }) {
  const toast = useToast();
  const { t, money } = useLocale();
  const command = useCommand<MusicianProfile>();
  const media = useCommand<MusicianProfile>();
  const [draft, setDraft] = useState(profile);
  const market = marketOf(draft.market);
  const currency = MARKET_SETTINGS[market].currency;
  const [standard, setStandard] = useState(String(profile.standardPrice / 100));
  const [dedication, setDedication] = useState(
    String(profile.dedicationSurcharge / 100),
  );
  const songCents = Math.round(Number(standard) * 100);
  const dedicationCents = Math.round(Number(dedication) * 100);
  const [saved, setSaved] = useState(false);
  const [fileError, setFileError] = useState<unknown>();
  const socialOptions = [
    { value: "", label: t("Choose platform") },
    ...SOCIAL_PLATFORMS.map(({ name, group, icon: Icon }) => ({
      value: name,
      label: name,
      icon: <Icon size={20} aria-hidden="true" />,
      group: t(group === "music" ? "Music platforms" : group === "social" ? "Social networks" : group === "messaging" ? "Messaging" : "Creator links"),
    })),
    { value: "__other__", label: t("Other platform"), icon: <Globe2 size={20} aria-hidden="true" />, group: t("Creator links") },
  ];
  function field(key: keyof MusicianProfile, value: unknown) {
    setSaved(false);
    setDraft((prev) => ({ ...prev, [key]: value }));
  }
  async function upload(kind: "avatar" | "banner", file?: File) {
    if (!file) return;
    setFileError(undefined);
    if (file.size > 4 * 1024 * 1024) {
      setFileError(new Error("Image too large"));
      toast.error("Image too large");
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
              location: market === "AU" ? "Australia" : "Argentina",
              publicEmail: draft.publicEmail,
              whatsapp: draft.whatsapp,
              website: draft.website,
              socialLinks: draft.socialLinks.filter(
                (l) => l.platform.trim() && l.platform !== "Other" && l.url.trim(),
              ),
              standardPrice: Math.round(Number(standard) * 100),
              dedicationSurcharge: Math.round(Number(dedication) * 100),
              alias: draft.alias,
              cbu: draft.cbu,
              accountName: draft.accountName,
              market,
              timeZone: draft.timeZone || MARKET_SETTINGS[market].defaultTimeZone,
              payId: draft.payId || "",
              payIdType: draft.payIdType || "email",
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
          <div className="relative h-44 overflow-hidden rounded-control bg-surface-inverse sm:h-64">
            <img
              src={profile.bannerUrl ? publicMediaUrl(profile.bannerUrl, profile.version) : "/stage.svg"}
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
          <div className="relative -mt-12 mb-7 ml-4 inline-block sm:ml-6">
            <Avatar profile={profile} large />
            <label
              title={t("Profile photo")}
              className="absolute bottom-1 right-1 flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-surface bg-action text-action-foreground shadow-raised focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2 hover:bg-action-hover"
            >
              <Pencil size={16} aria-hidden="true" />
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
          </div>
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
          </div>
        </section>
        <section className="rounded-card border border-border p-5 sm:p-7">
          <h2 className="mb-5 text-lg font-semibold">{t("Location")}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label={t("Country")} value={market} onChange={(value) => {
              const next = value as Market;
              setDraft((prev) => ({...prev, market: next, timeZone: MARKET_SETTINGS[next].defaultTimeZone}));
              setStandard(""); setDedication("0"); setSaved(false);
            }} options={[{value:"AR",label:t("Argentina")},{value:"AU",label:t("Australia")}]}/>
            {market === "AU" && <SelectField label={t("Show time zone")} value={draft.timeZone?.startsWith("Australia/") ? draft.timeZone : MARKET_SETTINGS.AU.defaultTimeZone} onChange={(value) => field("timeZone", value)} options={AU_TIME_ZONES.map(zone => ({value:zone,label:zone.replace("Australia/", "")}))}/>}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">{t("Prices and payment details use the musician’s country, not the guest’s location.")}</p>
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
              placeholder={`${MARKET_SETTINGS[market].phonePrefix}…`}
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
            {draft.socialLinks.map((link, index) => {
              const selectedPlatform = socialPlatform(link.platform);
              const isOther = !!link.platform && !selectedPlatform;
              const updateLink = (change: Partial<SocialLink>) => field(
                "socialLinks",
                draft.socialLinks.map((item, i) => i === index ? { ...item, ...change } : item),
              );
              const removeLink = () => field(
                "socialLinks",
                draft.socialLinks.filter((_, i) => i !== index),
              );
              return <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-control border border-border p-3 sm:grid-cols-[minmax(12rem,14rem)_minmax(0,1fr)_auto] sm:border-0 sm:p-0">
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex min-h-11 items-center justify-between sm:hidden">
                    <span className="text-sm font-medium">{t("Platform")} {index + 1}</span>
                    <Button variant="ghost" aria-label={t("Remove")} className="shrink-0 px-2" onClick={removeLink}><X size={18} /></Button>
                  </div>
                  <SelectField
                    label={`${t("Platform")} ${index + 1}`}
                    value={selectedPlatform?.name ?? (isOther ? "__other__" : "")}
                    onChange={(value) => updateLink({ platform: value === "__other__" ? "Other" : value })}
                    options={socialOptions}
                    shortMenu
                    className="mt-2 min-w-0 [&>span]:hidden sm:mt-0 sm:[&>span]:block"
                  />
                  {isOther && <input
                    aria-label={`${t("Custom platform")} ${index + 1}`}
                    placeholder={t("Custom platform")}
                    className={`${inputClass} mt-2`}
                    value={link.platform === "Other" ? "" : link.platform}
                    onChange={(e) => updateLink({ platform: e.target.value || "Other" })}
                    maxLength={40}
                    required
                  />}
                </div>
                <input
                  aria-label={`${t("Link")} ${index + 1}`}
                  type="url"
                  placeholder={selectedPlatform?.urlHint ?? "https://…"}
                  className={`${inputClass} col-span-2 min-w-0 sm:col-span-1 sm:mt-6`}
                  value={link.url}
                  onChange={(e) => updateLink({ url: e.target.value })}
                  required={Boolean(link.platform)}
                />
                <div className="hidden sm:block"><Button variant="ghost" aria-label={t("Remove")} className="mt-6 px-2" onClick={removeLink}><X size={18} /></Button></div>
              </div>;
            })}
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
              label={`${t("Standard price")} (${currency})`}
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
              label={`${t("Dedication add-on")} (${currency})`}
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
          <p className="mt-4 text-sm text-muted">{t("Dedication total")}: {money(songCents, market)} + {money(dedicationCents, market)} = <strong className="text-foreground">{money(songCents + dedicationCents, market)}</strong></p>
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
            {market === "AR" ? <><Field
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
            /></> : <>
              <SelectField label="PayID" value={draft.payIdType || "email"} onChange={(value) => field("payIdType", value)} options={[{value:"email",label:t("Email")},{value:"phone",label:t("Australian mobile")}]}/>
              <Field label={draft.payIdType === "phone" ? t("Australian mobile") : t("PayID email")} type={draft.payIdType === "phone" ? "tel" : "email"} placeholder={draft.payIdType === "phone" ? "04… or +614…" : "name@example.com"} value={draft.payId || ""} onChange={(e) => field("payId", e.target.value)} required maxLength={254}/>
            </>}
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
