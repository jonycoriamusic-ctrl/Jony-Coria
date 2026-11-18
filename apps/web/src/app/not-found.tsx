"use client";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useLocale } from "@/lib/i18n";
import { menuHref } from "@/lib/navigation";
import { useLastMenu } from "@/lib/use-last-menu";
export default function NotFound() {
  const { t, locale } = useLocale();
  const lastMenu = useLastMenu();
  return (
    <section className="mx-auto max-w-xl py-10 sm:py-20" aria-labelledby="not-found-title">
      <div className="rounded-sheet border border-border bg-surface p-7 sm:p-10">
        <span className="flex size-16 items-center justify-center rounded-full bg-action">
          <BrandMark light className="size-14" />
        </span>
        <p className="mt-9 text-xs font-semibold uppercase tracking-[.18em] text-muted">
          404 / {locale === "en" ? "Music Menu" : "Musica a la carta"}
        </p>
        <h1 id="not-found-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("This page is not on the menu.")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          {t("Scan your musician’s QR to explore the menu.")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {lastMenu && <Link
            href={menuHref(lastMenu.slug)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-action px-5 py-3 text-sm font-semibold text-action-foreground"
          >
            {t("Back to the menu")} · {lastMenu.stageName}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>}
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-border px-5 py-3 text-sm font-semibold hover:bg-surface-hover"
          >
            <Home size={17} aria-hidden="true" />
            {t("Back to home")}
          </Link>
        </div>
      </div>
    </section>
  );
}
