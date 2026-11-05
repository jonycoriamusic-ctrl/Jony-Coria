export type Locale = 'es-AR' | 'en' | 'pt-BR' | 'it' | 'fr';
export type RequestType = 'standard' | 'dedication';
export type RequestStatus = 'held' | 'review_pending' | 'queued' | 'playing' | 'played' | 'expired' | 'cancelled' | 'not_performed';
export type ShowStatus = 'draft' | 'open' | 'paused' | 'closed' | 'finished';
export interface SocialLink { platform: string; url: string }
export interface PublicProfile {
  id: string; slug: string; stageName: string; bio: string; location: string;
  avatarUrl: string; bannerUrl: string; publicEmail: string;
  whatsapp: string; website: string; socialLinks: SocialLink[];
  standardPrice: number; dedicationSurcharge: number; pricingReviewRequired?: boolean; version: number;
}
export interface MusicianProfile extends PublicProfile { alias: string; cbu: string; accountName: string }
export interface SongFolder { id: string; name: string }
export interface Song { id: string; title: string; artist: string; folderId: string | null; enabled: boolean }
export interface MenuSong extends Song { available: boolean; requestCount: number }
export interface Show {
  id: string; title: string; venue: string; date: string; capacity: number;
  status: ShowStatus; songIds: string[]; occupiedCount: number; version: number;
}
export interface MusicRequest {
  id: string; showId: string; songId: string; songTitle: string; artist: string;
  musicianSlug?: string; musicianName?: string;
  guestName: string; type: RequestType; dedication: string; amount: number;
  songPrice?: number; dedicationSurcharge?: number;
  status: RequestStatus; createdAt: string; expiresAt: string; claimedAt: string | null;
  confirmedAt: string | null; receiptUrl: string | null; queueRank: number; version: number;
  alias: string; cbu?: string; accountName: string;
}
export interface MenuResponse { demo: boolean; profile: PublicProfile; folders: SongFolder[]; show: Show | null; songs: MenuSong[]; remaining: number; serverTime: string }
export interface DashboardResponse { demo: boolean; profile: MusicianProfile; folders: SongFolder[]; songs: Song[]; shows: Show[]; requests: MusicRequest[]; activeShowId: string | null }
export interface SessionResponse { token: string; role: 'guest' | 'musician'; demo: boolean }
export interface CreateRequestInput { showId: string; songId: string; type: RequestType; dedication?: string; guestName?: string; expectedPrice: number }
export interface ProfileInput { stageName: string; bio: string; location: string; publicEmail: string; whatsapp: string; website: string; socialLinks: SocialLink[]; standardPrice: number; dedicationSurcharge: number; alias: string; cbu: string; accountName: string; version?: number }
export interface SongInput { title: string; artist: string; folderId?: string | null; enabled?: boolean }
export interface ShowInput { title: string; venue: string; date: string; capacity: number; songIds?: string[]; version?: number }
export interface ApiError { error: { code: string; message: string } }
