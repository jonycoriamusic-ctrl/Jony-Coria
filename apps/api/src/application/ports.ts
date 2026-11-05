import type { Actor } from '../domain/model.js';
import type { MusicService } from './music-service.js';
import type { MusicianProfile } from '@musica/contracts';
export type MusicApplication = Pick<MusicService, 'menu'|'dashboard'|'showRequests'|'requests'|'request'|'reserve'|'claim'|'cancel'|'perform'|'updateProfile'|'saveSong'|'importSongs'|'saveFolder'|'deleteFolder'|'saveShow'|'showAction'|'reorder'|'attachAsset'|'asset'|'removeProfileAsset'> & {
  onboard?: (actor: Actor, input: {stageName:string;slug:string}) => Promise<MusicianProfile>;
};
export interface MediaStore {
  save(buffer: Buffer, kind: 'avatar'|'banner'|'receipt'): Promise<{id:string;file:string}>;
  read(file: string): Promise<Buffer>;
  remove(file: string): Promise<void>;
}
export interface IdentityProvider { authenticate(token: string): Promise<Actor> }
