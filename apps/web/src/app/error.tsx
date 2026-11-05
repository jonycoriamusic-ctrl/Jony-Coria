"use client";
import { ErrorNotice, Button } from "@/components/ui";
import { useLocale } from "@/lib/i18n";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useLocale();
  return (
    <div className="py-20">
      <ErrorNotice error={new Error("Something went wrong")} />
      <Button onClick={reset}>{t("Try again")}</Button>
    </div>
  );
}
