"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Music2, LockKeyhole } from "lucide-react";
import type { SessionResponse, DashboardResponse } from "@musica/contracts";
import { api, json, ApiFailure, saveToken } from "@/lib/api";
import { isDemo, AuthFailure, signInMusician, registerMusician, resetPassword, sendVerification, signOutMusician } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/i18n";
import { Button, Field, ErrorNotice, Notice } from "@/components/ui";

type Mode = "login" | "register" | "reset" | "onboard";
export function LoginView() {
  const {t} = useLocale();
  const router = useRouter();
  const client = useQueryClient();
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState(isDemo ? "jony@demo.local" : "");
  const [password, setPassword] = useState(isDemo ? "musica-demo" : "");
  const [stageName, setStageName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!isDemo && auth.musicianReady && auth.musician && new URLSearchParams(window.location.search).get("setup") === "1") setMode("onboard");
  }, [auth.musicianReady, auth.musician]);

  async function enterPortal(destination = "/portal") {
    setChecking(true);
    try {
      await api<DashboardResponse>("/musician/dashboard", {role: "musician"});
      client.removeQueries({queryKey: ["musician-dashboard"]});
      router.replace(destination);
    } catch (error) {
      if (error instanceof ApiFailure && error.code === "PROFILE_REQUIRED") setMode("onboard");
      else throw error;
    } finally {setChecking(false);}
  }
  const mutation = useMutation({
    mutationFn: async () => {
      setMessage("");
      if (isDemo) {
        const session = await api<SessionResponse>("/demo/login", {method: "POST", body: json({email, password})});
        saveToken("musician", session.token);
        await enterPortal();
      } else if (mode === "reset") {
        await resetPassword(email);
        setMessage("If an account exists, a password reset email has been sent.");
      } else if (mode === "register") {
        if (password !== confirmPassword) throw new AuthFailure("PASSWORD_MISMATCH", "Passwords do not match.");
        await registerMusician(email, password);
        setPassword("");
        setConfirmPassword("");
        setMode("onboard");
        try {await sendVerification(); setMessage("Check your email to verify your account before opening a show.");}
        catch {setMessage("Your account was created. You can resend the verification email from your portal.");}
      } else if (mode === "onboard") {
        await api("/musician/onboard", {method: "POST", role: "musician", body: json({stageName, slug})});
        await enterPortal("/portal/perfil");
      } else {
        await signInMusician(email, password);
        setPassword("");
        await enterPortal();
      }
    },
  });
  // An authenticated user may continue after a reload without recreating an account.
  const continueMutation = useMutation({mutationFn: enterPortal});
  const switchMode = (next: Mode) => {setMode(next);setMessage("");mutation.reset();continueMutation.reset();};
  const action = isDemo ? "Enter the demo" : mode === "register" ? "Create account" : mode === "reset" ? "Send reset email" : mode === "onboard" ? "Create musician profile" : "Sign in";
  return <div className="mx-auto grid max-w-4xl overflow-hidden rounded-sheet border border-border md:grid-cols-2">
    <div className="relative hidden min-h-[530px] bg-surface-inverse p-9 text-inverse md:flex md:flex-col md:justify-between">
      <img src="/stage.svg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-60"/>
      <Music2 className="relative" size={32}/>
      <div className="relative"><p className="mb-3 text-xs uppercase tracking-[.18em] opacity-70">Musica a la carta</p><h1 className="text-4xl font-semibold leading-tight tracking-tight">{t("Your stage. Your music.")}</h1><p className="mt-5 text-sm leading-7 text-inverse/70">{t("Manage your show, one song at a time.")}</p></div>
    </div>
    <div className="p-7 sm:p-10">
      <div className="mb-7 flex size-12 items-center justify-center rounded-full bg-surface-hover"><LockKeyhole size={22}/></div>
      <h2 className="text-3xl font-semibold tracking-tight">{t(mode === "onboard" ? "Create musician profile" : mode === "reset" ? "Reset password" : mode === "register" ? "Create account" : "Musician access")}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{t(isDemo ? "Local demo" : "Your music, your profile, your next show.")}</p>
      {message && <div className="mt-5"><Notice>{t(message)}</Notice></div>}
      <ErrorNotice error={auth.error}/>
      {!isDemo && auth.musician && mode !== "onboard" ? <div className="mt-7 space-y-4">
        <p className="break-all text-sm text-muted">{auth.musician.email}</p>
        <Button className="w-full" busy={continueMutation.isPending || checking} onClick={() => continueMutation.mutate()}>{t("Continue to my portal")}<ArrowRight size={17}/></Button>
        <Button variant="ghost" className="w-full" onClick={async () => {await signOutMusician();switchMode("login");}}>{t("Use another account")}</Button>
        <ErrorNotice error={continueMutation.error}/>
      </div> : <form className="mt-7 space-y-5" onSubmit={(event) => {event.preventDefault();mutation.mutate();}}>
        {mode === "onboard" ? <>
          <Field label={t("Stage name")} autoComplete="nickname" value={stageName} onChange={(event) => { const value=event.target.value;setStageName(value);if(!slugEdited)setSlug(value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60).replace(/-$/,"")); }} required maxLength={80}/>
          <Field label={t("Public profile address")} hint={t("Use 3–60 lowercase letters, numbers or hyphens.")} value={slug} onChange={(event) => {setSlugEdited(true);setSlug(event.target.value.toLowerCase());}} required minLength={3} maxLength={60} pattern="[a-z0-9](?:[a-z0-9-]{1,58})[a-z0-9]" autoCapitalize="none" autoCorrect="off"/>
        </> : <>
          <Field label={t("Email")} type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required/>
          {mode !== "reset" && <Field label={t("Password")} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} required/>}
          {mode === "register" && <Field label={t("Confirm password")} type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required/>}
        </>}
        <ErrorNotice error={mutation.error}/>
        <Button type="submit" className="w-full" busy={mutation.isPending || checking} disabled={!!auth.error}>{t(action)}<ArrowRight size={17}/></Button>
      </form>}
      {!isDemo && !auth.musician && <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
        {mode !== "login" && <button type="button" className="min-h-11 underline underline-offset-4" onClick={() => switchMode("login")}>{t("Sign in")}</button>}
        {mode === "login" && <><button type="button" className="min-h-11 underline underline-offset-4" onClick={() => switchMode("register")}>{t("Create account")}</button><button type="button" className="min-h-11 underline underline-offset-4" onClick={() => switchMode("reset")}>{t("Forgot password?")}</button></>}
      </div>}
      {isDemo && <div className="mt-6 rounded-control bg-surface-subtle p-4 text-xs leading-6 text-muted"><strong className="block font-semibold text-foreground">{t("Demo credentials")}</strong>jony@demo.local<br/>musica-demo</div>}
    </div>
  </div>;
}
