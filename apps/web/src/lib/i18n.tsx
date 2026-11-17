"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MARKET_SETTINGS, marketOf, type Locale, type Market } from "@musica/contracts";
import { translations } from "./translations";

export type { Locale } from "@musica/contracts";
export { translations } from "./translations";

export const LOCALE_OPTIONS: ReadonlyArray<{
  value: Locale;
  label: string;
  short: string;
}> = [
  { value: "es-AR", label: "Español (Argentina)", short: "ES" },
  { value: "en", label: "English", short: "EN" },
  { value: "pt-BR", label: "Português (Brasil)", short: "PT" },
  { value: "it", label: "Italiano", short: "IT" },
  { value: "fr", label: "Français", short: "FR" },
];

const LOCALE_STORAGE_KEY = "musica.locale";
const ENGLISH_SITE_HOST = "themusicmenu.netlify.app";
type Variables = Record<string, string | number>;
type DateOptions = Intl.DateTimeFormatOptions | boolean;

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    LOCALE_OPTIONS.some((option) => option.value === value)
  );
}

export function translate(
  locale: Locale,
  key: string,
  variables?: Variables,
): string {
  const message =
    translations[locale][key] ?? translations["es-AR"][key] ?? key;
  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    variables && Object.prototype.hasOwnProperty.call(variables, name)
      ? String(variables[name])
      : placeholder,
  );
}

interface LocaleContextValue {
  locale: Locale;
  suggestedMarket: Market;
  setLocale: (locale: Locale) => void;
  t: (key: string, variables?: Variables) => string;
  money: (cents: number, market?: Market) => string;
  date: (value: string | Date, options?: DateOptions, timeZone?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // A fixed server/client first render avoids hydration mismatch. Restore afterward.
  const [locale, updateLocale] = useState<Locale>("es-AR");
  const [suggestedMarket, setSuggestedMarket] = useState<Market>("AR");

  useEffect(() => {
    try {
      const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(savedLocale)) updateLocale(savedLocale);
      else if (window.location.hostname === ENGLISH_SITE_HOST) updateLocale("en");
    } catch {
      // Private browsing can deny storage. Language switching still works in memory.
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY && isLocale(event.newValue)) {
        updateLocale(event.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const localMarket = (): Market => {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (zone?.startsWith("Australia/")) return "AU";
      return navigator.language.toLowerCase().includes("-au") ? "AU" : "AR";
    };
    fetch("/api/v1/region", {signal: controller.signal})
      .then((response) => response.ok ? response.json() : {})
      .catch(() => ({}))
      .then((result: {country?: string}) => {
        if (controller.signal.aborted) return;
        const market = result.country === "AR" || result.country === "AU" ? result.country : localMarket();
        setSuggestedMarket(market);
        try {
          if (!isLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY))) {
            updateLocale(window.location.hostname === ENGLISH_SITE_HOST || market === "AU" ? "en" : "es-AR");
          }
        } catch { updateLocale(window.location.hostname === ENGLISH_SITE_HOST || market === "AU" ? "en" : "es-AR"); }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === "en"
      ? "Music Menu · Your night, your music"
      : "Musica a la carta · Tu noche, tu música";
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    if (!isLocale(nextLocale)) return;
    updateLocale(nextLocale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // Persistence is optional; blocked storage must not break the interface.
    }
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const viewerTimeZone = MARKET_SETTINGS[suggestedMarket].defaultTimeZone;
    return {
      locale,
      suggestedMarket,
      setLocale,
      t: (key, variables) => translate(locale, key, variables),
      money: (cents, market) =>
        Number.isSafeInteger(cents)
          ? new Intl.NumberFormat(locale === "en" ? "en-AU" : locale, {
              style: "currency",
              currency: MARKET_SETTINGS[marketOf(market)].currency,
              currencyDisplay: "code",
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            }).format(cents / 100)
          : "—",
      date: (input, options = false, timeZone = viewerTimeZone) => {
        const value = input instanceof Date ? input : new Date(input);
        if (Number.isNaN(value.getTime())) return "—";
        const formatOptions: Intl.DateTimeFormatOptions =
          typeof options === "boolean"
            ? {
                weekday: "short",
                day: "numeric",
                month: "short",
                ...(options
                  ? ({ hour: "2-digit", minute: "2-digit" } as const)
                  : {}),
              }
            : options;
        return new Intl.DateTimeFormat(locale, {
          ...formatOptions,
          timeZone,
        }).format(value);
      },
    };
  }, [locale, setLocale, suggestedMarket]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
