import type { Locale } from "@musica/contracts";

export function browserTimeZone(fallback: string): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) {
      new Intl.DateTimeFormat(undefined, { timeZone: zone });
      return zone;
    }
  } catch {
    // Some browsers do not expose a usable IANA zone.
  }
  return fallback;
}

export function formatZonedDate(
  input: string | Date,
  locale: Locale,
  timeZone: string,
  options: Intl.DateTimeFormatOptions | boolean = false,
): string {
  const value = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(value.getTime())) return "—";
  const formatOptions: Intl.DateTimeFormatOptions =
    typeof options === "boolean"
      ? {
          weekday: "short",
          day: "numeric",
          month: "short",
          ...(options ? { hour: "2-digit", minute: "2-digit" } : {}),
        }
      : options;
  return new Intl.DateTimeFormat(locale === "en" ? "en-AU" : locale, {
    ...formatOptions,
    timeZone,
  }).format(value);
}
