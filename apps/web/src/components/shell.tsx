"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Music2,
  ReceiptText,
  UserRound,
  Radio,
  Library,
  CalendarDays,
  ArrowUpRight,
  LogOut,
  Disc3,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "@/lib/i18n";
import { signOut, api, ApiFailure } from "@/lib/api";
import { isDemo, sendVerification, refreshMusician } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { useDashboard } from "@/lib/queries";
import { useMusicianSlug, menuHref, profileHref, guestHref } from "@/lib/navigation";
import { useMutation } from "@tanstack/react-query";
import { cx, Loading, ErrorNotice, Button, Notice, SelectField } from "./ui";
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const portal = pathname.startsWith("/portal");
  const slug = useMusicianSlug();
  const guestMenu = menuHref(slug);
  const { t, locale, setLocale } = useLocale();
  const nav = portal
    ? ([
        ["/portal", "Live", Radio],
        ["/portal/repertorio", "Repertoire", Library],
        ["/portal/shows", "Shows", CalendarDays],
        ["/portal/perfil", "Profile", UserRound],
      ] as const)
    : ([
        [guestMenu, "Menu", Music2],
        [guestHref("/pedidos", slug), "My requests", ReceiptText],
        [profileHref(slug), "The show", UserRound],
      ] as const);
  const bottom = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState(80);
  const router = useRouter();
  const client = useQueryClient();
  useEffect(() => {
    if (!bottom.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setNavHeight(entry.target.getBoundingClientRect().height),
    );
    observer.observe(bottom.current);
    return () => observer.disconnect();
  }, []);
  const active = (href: string) => {
    const path = href.split("?")[0];
    return path === "/" || path === "/portal" ? pathname === path : pathname.startsWith(path);
  };
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {isDemo && <div className="bg-surface-inverse px-4 py-2 text-center text-[11px] tracking-wide text-inverse">
        {t("Local demo")} <span className="mx-2 opacity-40">/</span>{" "}
        {t("No real payments")}
      </div>}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-content items-center justify-between gap-4 px-gutter">
          <Link
            href={guestMenu}
            className="flex items-center gap-2.5"
            aria-label="Musica a la carta"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-action text-action-foreground">
              <Music2 size={22} />
            </span>
            <span className="text-lg font-semibold leading-[1.05] tracking-tight">
              musica
              <span className="block text-[11px] font-medium tracking-[.11em]">
                a la carta
              </span>
            </span>
          </Link>
          <nav
            className="hidden items-center gap-2 md:flex"
            aria-label={t("Menu")}
          >
            {nav.map(([href, label, Icon]) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={cx(
                  "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                  active(href)
                    ? "bg-action text-action-foreground"
                    : "text-muted hover:bg-surface-hover",
                )}
              >
                <Icon size={16} />
                {t(label)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <SelectField
              label={t("Language")}
              value={locale}
              onChange={(value) => setLocale(value as typeof locale)}
              compact
              options={[
                {value: "es-AR", label: "ES"},
                {value: "en", label: "EN"},
                {value: "pt-BR", label: "PT"},
                {value: "it", label: "IT"},
                {value: "fr", label: "FR"},
              ]}
            />
            {portal ? (
              <button
                onClick={async () => {
                  if (isDemo) {
                    try {await api("/demo/logout", {method: "POST", role: "musician"});} catch {}
                  }
                  await signOut();
                  client.removeQueries({ queryKey: ["musician-dashboard"] });
                  router.push("/ingresar");
                }}
                aria-label={t("Sign out")}
                className="flex size-11 items-center justify-center rounded-full border border-border"
              >
                <LogOut size={17} />
              </button>
            ) : (
              <Link
                href="/ingresar"
                className="hidden items-center gap-2 rounded-full border border-border px-4 py-3 text-xs font-semibold lg:flex"
              >
                {t("Musician access")}
                <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </div>
      </header>
      <main
        id="main"
        className="mx-auto min-h-[70vh] max-w-content px-gutter py-7 md:py-10"
      >
        {children}
      </main>
      <footer className="mx-auto flex max-w-content items-center justify-between border-t border-border px-gutter py-7 text-xs text-muted">
        <span className="flex items-center gap-2">
          <Disc3 size={14} /> Musica a la carta
        </span>
        <Link
          href={portal ? guestMenu : "/ingresar"}
          className="underline underline-offset-4"
        >
          {t(portal ? "Open guest view" : "Musician access")}
        </Link>
      </footer>
      <div className="md:hidden" style={{ height: navHeight }} />
      <nav
        ref={bottom}
        aria-label={t("Menu")}
        className="pb-safe fixed inset-x-0 bottom-0 z-30 flex min-h-bottom-nav justify-around border-t border-border bg-background/95 px-3 backdrop-blur md:hidden"
      >
        {nav.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={cx(
              "flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium",
              active(href) ? "text-foreground" : "text-muted",
            )}
          >
            <span
              className={cx(
                "rounded-full px-4 py-1",
                active(href) && "bg-surface-hover",
              )}
            >
              <Icon size={21} strokeWidth={active(href) ? 2 : 1.5} />
            </span>
            <span className="text-center">{t(label)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
export function PortalGuard({children}: {children: ReactNode}) {
  const auth = useAuth();
  const query = useDashboard();
  const router = useRouter();
  useEffect(() => {
    if (auth.musicianReady && !auth.error && !auth.musician) router.replace("/ingresar");
    if (query.error instanceof ApiFailure && query.error.code === "PROFILE_REQUIRED") router.replace("/ingresar?setup=1");
  }, [auth.musicianReady, auth.musician, auth.error, query.error, router]);
  if (auth.error) return <ErrorNotice error={auth.error}/>;
  if (!auth.musicianReady || !auth.musician || query.isPending || (query.error instanceof ApiFailure && query.error.code === "PROFILE_REQUIRED")) return <Loading/>;
  if (query.error) return <ErrorNotice error={query.error} retry={() => query.refetch()}/>;
  return <><VerificationNotice/>{children}</>;
}

function VerificationNotice() {
  const auth = useAuth();
  const {t} = useLocale();
  const [sent, setSent] = useState(false);
  const send = useMutation({mutationFn: sendVerification, onSuccess: () => setSent(true)});
  const refresh = useMutation({mutationFn: refreshMusician});
  if (isDemo || !auth.musician || auth.musician.emailVerified) return null;
  return <section className="mb-6 rounded-card border border-control-border bg-surface-subtle p-5">
    <p className="text-sm font-semibold">{t("Verify your email before opening a show.")}</p>
    <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" busy={send.isPending} onClick={() => send.mutate()}>{t("Send verification email")}</Button><Button variant="ghost" busy={refresh.isPending} onClick={() => refresh.mutate()}>{t("I verified my email")}</Button></div>
    {sent && <p role="status" className="mt-3 text-xs text-muted">{t("Verification email sent. Check your inbox.")}</p>}
    <ErrorNotice error={send.error || refresh.error}/>
  </section>;
}

export function SkipLink() {
  const { t } = useLocale();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-surface focus:p-3"
    >
      {t("Skip to content")}
    </a>
  );
}
