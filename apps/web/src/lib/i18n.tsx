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
import type { Locale } from "@musica/contracts";
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
const TIME_ZONE = "America/Argentina/Buenos_Aires";
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
  setLocale: (locale: Locale) => void;
  t: (key: string, variables?: Variables) => string;
  money: (centavos: number) => string;
  date: (value: string | Date, options?: DateOptions) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // A fixed server/client first render avoids hydration mismatch. Restore afterward.
  const [locale, updateLocale] = useState<Locale>("es-AR");

  useEffect(() => {
    try {
      const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(savedLocale)) updateLocale(savedLocale);
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
    document.documentElement.lang = locale;
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
    const moneyFormatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "ARS",
      currencyDisplay: "code",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return {
      locale,
      setLocale,
      t: (key, variables) => translate(locale, key, variables),
      money: (centavos) =>
        Number.isSafeInteger(centavos)
          ? moneyFormatter.format(centavos / 100)
          : "—",
      date: (input, options = false) => {
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
          timeZone: TIME_ZONE,
        }).format(value);
      },
    };
  }, [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
