"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { MenuResponse, PublicProfile, DashboardResponse, MusicRequest } from "@musica/contracts";
import { api } from "./api";
import { useAuth } from "./auth-context";
import { useMusicianSlug } from "./navigation";
import { isDemo } from "./auth";
import { observePublicUpdates, type PublicUpdate } from "./public-updates";
import { applyPublicUpdate, PUBLIC_RECONCILE_MS, reconcileMenuResponse } from "./public-menu-projection";
export const keys = {
  menu: ["public-menu"], profile: ["public-profile"],
  requests: ["guest-requests"], dashboard: ["musician-dashboard"],
} as const;
export function useMenu(explicitSlug?: string) {
  const slug = useMusicianSlug(explicitSlug);
  const client = useQueryClient();
  const [liveConnected, setLiveConnected] = useState(false);
  const latest = useRef<{slug: string; update: PublicUpdate; receivedAt: number} | null>(null);
  useEffect(() => {
    if (isDemo || !slug || !/^[a-z0-9-]{3,60}$/.test(slug)) return;
    setLiveConnected(false);
    let disposed = false, unsubscribe: (() => void) | undefined, refresh: ReturnType<typeof setTimeout> | undefined;
    const key = [...keys.menu, slug];
    observePublicUpdates(slug, update => {
      if (disposed) return;
      setLiveConnected(true);
      latest.current = {slug, update, receivedAt: Date.now()};
      client.setQueryData<MenuResponse>(key, current => current ? applyPublicUpdate(current, update) : current);
      if (!refresh) refresh = setTimeout(() => { refresh = undefined; client.invalidateQueries({queryKey: key}); }, PUBLIC_RECONCILE_MS + 500);
    }, () => {if (!disposed) {latest.current = null;setLiveConnected(false);client.invalidateQueries({queryKey: key});}}).then(stop => {if (disposed) stop(); else unsubscribe = stop;}).catch(() => {if (!disposed) {latest.current = null;setLiveConnected(false);client.invalidateQueries({queryKey: key});}});
    return () => {disposed = true; unsubscribe?.(); if (refresh) clearTimeout(refresh);};
  }, [slug, client]);
  return useQuery({queryKey: [...keys.menu, slug], queryFn: async () => {
    const startedAt = Date.now();
    const menu = await api<MenuResponse>(`/public/menu?slug=${encodeURIComponent(slug)}`);
    return reconcileMenuResponse(menu, latest.current?.slug === slug ? latest.current : null, startedAt);
  }, enabled: !!slug, refetchInterval: isDemo ? 1000 : liveConnected ? 60000 : 15000});
}
export function usePublicProfile(explicitSlug?: string) {
  const slug = useMusicianSlug(explicitSlug);
  return useQuery({queryKey: [...keys.profile, slug], queryFn: () => api<PublicProfile>(`/public/profile?slug=${encodeURIComponent(slug)}`), enabled: !!slug});
}
const activeRequestStatuses = new Set(["held", "review_pending", "queued", "playing"]);

export function useRequests() {
  const auth = useAuth();
  return useQuery({queryKey: [...keys.requests, auth.guest?.uid ?? "initializing"], queryFn: () => {
    if (auth.error) throw auth.error;
    return api<MusicRequest[]>("/requests", {role: "guest"});
  }, enabled: auth.guestReady, refetchInterval: (query) => query.state.data?.some((request) => activeRequestStatuses.has(request.status)) ? 5000 : false});
}
export function useRequest(id: string) {
  const auth = useAuth();
  return useQuery({queryKey: [...keys.requests, auth.guest?.uid ?? "initializing", id], queryFn: () => {
    if (auth.error) throw auth.error;
    return api<MusicRequest>(`/requests/${encodeURIComponent(id)}`, {role: "guest"});
  }, enabled: auth.guestReady, refetchInterval: (query) => query.state.data && activeRequestStatuses.has(query.state.data.status) ? 5000 : false});
}
export function useDashboard() {
  const auth = useAuth();
  return useQuery({queryKey: [...keys.dashboard, auth.musician?.uid ?? "signed-out"], queryFn: () => api<DashboardResponse>("/musician/dashboard", {role: "musician"}), enabled: auth.musicianReady && !!auth.musician, refetchInterval: 30000, retry: 1});
}
export function useShowRequests(showId?: string, finished = false) {
  const auth = useAuth();
  return useQuery({queryKey: [...keys.dashboard, auth.musician?.uid ?? "signed-out", "show-requests", showId ?? "none"], queryFn: () => api<MusicRequest[]>(`/musician/shows/${encodeURIComponent(showId!)}/requests`, {role: "musician"}), enabled: auth.musicianReady && !!auth.musician && !!showId, refetchInterval: finished ? false : 5000});
}
export function useCommand<T = unknown>() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({path, body, method = "POST", role = "musician"}: {path: string; body?: unknown; method?: string; role?: "guest" | "musician"}) => api<T>(path, {method, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body), role}),
    onSuccess: () => client.invalidateQueries(),
  });
}
export function useSongAvailability() {
  const client = useQueryClient();
  const auth = useAuth();
  const dashboardKey = [...keys.dashboard, auth.musician?.uid ?? "signed-out"];
  return useMutation({
    mutationFn: ({id, enabled}: {id: string; enabled: boolean}) => api(`/musician/songs/${id}`, {method: "PATCH", role: "musician", body: JSON.stringify({enabled})}),
    onMutate: async ({id, enabled}) => {
      await client.cancelQueries({queryKey: dashboardKey});
      const previous = client.getQueryData<DashboardResponse>(dashboardKey)?.songs.find((song) => song.id === id)?.enabled;
      client.setQueryData<DashboardResponse>(dashboardKey, (data) => data ? {...data, songs: data.songs.map((song) => song.id === id ? {...song, enabled} : song)} : data);
      return {previous, dashboardKey};
    },
    onError: (_error, {id, enabled}, context) => {
      if (context?.previous === undefined) return;
      client.setQueryData<DashboardResponse>(context.dashboardKey, (data) => data ? {...data, songs: data.songs.map((song) => song.id === id && song.enabled === enabled ? {...song, enabled: context.previous!} : song)} : data);
    },
    onSettled: () => client.invalidateQueries(),
  });
}
