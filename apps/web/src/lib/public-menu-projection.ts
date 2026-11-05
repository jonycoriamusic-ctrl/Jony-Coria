import type { MenuResponse } from "@musica/contracts";
import type { PublicUpdate } from "./public-updates";

export const PUBLIC_RECONCILE_MS = 6000;

export function reconcileMenuResponse(
  menu: MenuResponse,
  signal: { update: PublicUpdate; receivedAt: number } | null,
  queryStartedAt: number,
): MenuResponse {
  if (!signal || queryStartedAt - signal.receivedAt >= PUBLIC_RECONCILE_MS) return menu;
  return applyPublicUpdate(menu, signal.update);
}

export function applyPublicUpdate(menu: MenuResponse, update: PublicUpdate): MenuResponse {
  if (update.showId === undefined) return menu;
  if (update.showId !== menu.show?.id) {
    return menu.show ? { ...menu, show: null, songs: [], folders: [], remaining: 0 } : menu;
  }
  if (!menu.show || typeof update.capacity !== "number" || typeof update.occupiedCount !== "number" || !update.status) return menu;
  const remaining = Math.max(0, update.capacity - update.occupiedCount);
  return {
    ...menu,
    remaining,
    show: { ...menu.show, capacity: update.capacity, occupiedCount: update.occupiedCount, status: update.status },
    songs: menu.songs.map(song => ({ ...song, available: update.status === "open" && remaining > 0 })),
  };
}
