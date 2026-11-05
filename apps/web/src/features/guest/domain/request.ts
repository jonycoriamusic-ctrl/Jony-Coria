import type {
  PublicProfile,
  RequestStatus,
  RequestType,
} from "@musica/contracts";
// Presentation calculations only; the server remains authoritative.
export function quotedPrice(
  profile: Pick<PublicProfile, "standardPrice" | "dedicationSurcharge">,
  type: RequestType,
) {
  return profile.standardPrice + (type === "dedication" ? profile.dedicationSurcharge : 0);
}
export function secondsRemaining(expiresAt: string, now: number) {
  return Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1000));
}
export const requestStatusLabels: Record<RequestStatus, string> = {
  held: "Reserved",
  review_pending: "In the queue",
  queued: "In the queue",
  playing: "Playing now",
  played: "Played",
  expired: "Expired",
  cancelled: "Cancelled",
  not_performed: "Not performed",
};
