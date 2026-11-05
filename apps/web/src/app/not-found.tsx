"use client";
import Link from "next/link";
import { useLocale } from "@/lib/i18n";
export default function NotFound() {
  const { t } = useLocale();
  return (
    <div className="py-24 text-center">
      <p className="text-sm text-muted">404</p>
      <h1 className="mt-3 text-3xl font-semibold">
        {t("This page is not on the menu.")}
      </h1>
      <Link
        href="/"
        className="mt-8 inline-block rounded-control bg-action px-6 py-3 text-action-foreground"
      >
        {t("Back to the menu")}
      </Link>
    </div>
  );
}
