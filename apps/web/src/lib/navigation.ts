"use client";
import { useParams, useSearchParams } from "next/navigation";
import { isDemo } from "./auth";

export function useMusicianSlug(explicit?: string): string {
  const params = useParams<{slug?: string}>();
  const search = useSearchParams();
  return explicit || params.slug || search.get("musician") || (isDemo ? "jony" : "");
}
export const menuHref = (slug: string) => slug ? `/q/${encodeURIComponent(slug)}` : "/";
export const profileHref = (slug: string) => slug ? `/m/${encodeURIComponent(slug)}` : "/musico";
export const guestHref = (path: string, slug: string) => slug ? `${path}${path.includes("?") ? "&" : "?"}musician=${encodeURIComponent(slug)}` : path;
