import type { MusicianProfile, MusicRequest, Song, SongFolder, Show } from '@musica/contracts';

export interface Actor { id: string; role: 'guest' | 'musician'; musicianId?: string; emailVerified?: boolean }
export interface StoredRequest extends MusicRequest { guestId: string; musicianId: string; capacityRetained: boolean }
export interface StoredSong extends Song { musicianId: string }
export interface StoredShow extends Show { musicianId: string }
export interface StoredSession { actor: Actor; expiresAt: number }
export interface DemoState {
  schemaVersion: 1;
  profiles: MusicianProfile[];
  folders?: Record<string, SongFolder[]>;
  songs: StoredSong[];
  shows: StoredShow[];
  requests: StoredRequest[];
  sessions: Record<string, StoredSession>;
  idempotency: Record<string, { fingerprint: string; requestId: string }>;
  assets: Record<string, { musicianId: string; kind: 'avatar' | 'banner' | 'receipt'; requestId?: string; file: string }>;
}
export class DomainError extends Error {
  constructor(public code: string, message: string, public status = 409) { super(message); }
}
function migrateDemoState(state: DemoState) {
  state.folders ??= {};
  for (const song of state.songs) {
    song.folderId ??= null;
    delete (song as StoredSong & { genre?: string }).genre;
  }
  // Upgrade persisted demo totals to an additive dedication price without changing historical request quotes.
  for (const profile of state.profiles) {
    profile.cbu ??= '';
    delete (profile as MusicianProfile & {phone?:string}).phone;
    const legacy = profile as MusicianProfile & { dedicationPrice?: number; repeatLimit?: number };
    if (legacy.dedicationSurcharge === undefined) {
      if (legacy.dedicationPrice !== undefined && legacy.dedicationPrice < profile.standardPrice) {
        legacy.dedicationSurcharge = 0;
        legacy.pricingReviewRequired = true;
      } else {
        legacy.dedicationSurcharge = (legacy.dedicationPrice ?? profile.standardPrice) - profile.standardPrice;
        delete legacy.dedicationPrice;
      }
    }
    delete legacy.repeatLimit;
  }
}
export function expireHolds(state: DemoState, now: number) {
  migrateDemoState(state);
  // Upgrade existing demo claims without fabricating bank verification.
  const legacyClaims = state.requests.filter(r => r.status === 'review_pending')
    .sort((a, b) => (a.claimedAt || a.createdAt).localeCompare(b.claimedAt || b.createdAt));
  for (const request of legacyClaims) {
    const show = state.shows.find(s => s.id === request.showId);
    request.status = show?.status === 'finished' ? 'not_performed' : 'queued';
    if (request.status === 'queued') request.queueRank = Math.max(0, ...state.requests.filter(r => r.showId === request.showId).map(r => r.queueRank)) + 1;
    request.version++;
    if (show) show.version++;
  }
  for (const request of state.requests) {
    if (request.status === 'held' && Date.parse(request.expiresAt) <= now) {
      request.status = 'expired'; request.capacityRetained = false; request.version++;
    }
  }
  for (const show of state.shows) {
    show.occupiedCount = state.requests.filter(r => r.showId === show.id && r.capacityRetained).length;
  }
}
export function assertMusician(actor: Actor): string {
  if (actor.role !== 'musician' || !actor.musicianId) throw new DomainError('FORBIDDEN', 'No tenés acceso a esta acción.', 403);
  return actor.musicianId;
}
export function publicRequest(request: StoredRequest): MusicRequest {
  const { guestId: _guest, musicianId: _musician, capacityRetained: _capacity, ...result } = request;
  return result;
}
export function publicSong(song: StoredSong): Song { return { id: song.id, title: song.title, artist: song.artist, folderId: song.folderId ?? null, enabled: song.enabled }; }
export function publicShow(show: StoredShow): Show { const { musicianId: _musician, ...result } = show; return result; }
export const activeStatuses = new Set(['open', 'paused', 'closed']);
const SHOW_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Advance scheduled shows on ordinary reads/writes, so a permanent QR never needs a new destination. */
export function reconcileScheduledShows(state: DemoState, now: number) {
  migrateDemoState(state);
  for (const profile of state.profiles) {
    const shows = state.shows.filter(show => show.musicianId === profile.id);
    const active = shows.find(show => activeStatuses.has(show.status));
    const latest = shows.filter(show => Number.isFinite(Date.parse(show.date)) && Date.parse(show.date) <= now && now < Date.parse(show.date) + SHOW_WINDOW_MS)
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
    const scheduled = latest?.status === 'finished' ? undefined : latest;
    const ready = scheduled && (scheduled.status !== 'draft' || !profile.pricingReviewRequired && !!profile.alias && !!profile.accountName && profile.standardPrice >= 100 && scheduled.songIds.some(id => state.songs.some(song => song.id === id && song.musicianId === profile.id && song.enabled)));
    if (active && (now >= Date.parse(active.date) + SHOW_WINDOW_MS || latest && latest.id !== active.id && Date.parse(latest.date) > Date.parse(active.date) && (latest.status === 'finished' || ready))) {
      active.status = 'finished'; active.version++;
      for (const request of state.requests.filter(request => request.showId === active.id && request.status === 'held')) {request.status = 'expired';request.capacityRetained = false;request.version++;}
    }
    if (scheduled?.status === 'draft' && ready && !shows.some(show => show.id !== scheduled.id && activeStatuses.has(show.status))) {scheduled.status = 'open';scheduled.version++;}
  }
  expireHolds(state, now);
}
