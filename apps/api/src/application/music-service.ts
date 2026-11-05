import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { CreateRequestInput, DashboardResponse, MenuResponse, MusicianProfile, ProfileInput, RequestStatus, ShowInput, SongInput } from '@musica/contracts';
import { activeStatuses, assertMusician, DomainError, expireHolds, reconcileScheduledShows, publicRequest, publicShow, publicSong, type Actor, type DemoState, type StoredRequest } from '../domain/model.js';
import type { Repository } from './repository.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const checkVersion = (expected: number | undefined, current: number) => { if (expected !== undefined && expected !== current) throw new DomainError('STALE_VERSION', 'La información cambió. Actualizá e intentá de nuevo.'); };
export class MusicService {
  constructor(readonly repository: Repository, private now: () => number = Date.now) {}
  private run<T>(work: (state: DemoState) => T | Promise<T>) { return this.repository.transact(state => { reconcileScheduledShows(state, this.now()); return work(state); }); }
  async session(role: 'guest' | 'musician') {
    const token = randomBytes(32).toString('base64url');
    const actor: Actor = role === 'musician' ? { id: 'demo-jony', role, musicianId: 'jony' } : { id: randomUUID(), role };
    await this.run(s => { s.sessions[hash(token)] = { actor, expiresAt: this.now() + 7 * 86400000 }; });
    return { token, role, demo: true as const };
  }
  authenticate(token: string) {
    return this.run(s => {
      const session = s.sessions[hash(token)];
      if (!session || session.expiresAt <= this.now()) throw new DomainError('UNAUTHORIZED', 'Tu sesión venció. Volvé a ingresar.', 401);
      return session.actor;
    });
  }
  logout(token: string) { return this.run(s => { delete s.sessions[hash(token)]; }); }
  menu(slug = 'jony'): Promise<MenuResponse> {
    return this.run(s => {
      const profile = s.profiles.find(p => p.slug === slug);
      if (!profile) throw new DomainError('NOT_FOUND', 'No encontramos al músico.', 404);
      const { alias: _alias, cbu: _cbu, accountName: _name, ...publicProfile } = profile;
      const show = s.shows.find(item => item.musicianId === profile.id && activeStatuses.has(item.status));
      const songs = s.songs.filter(song => song.musicianId === profile.id && song.enabled && !!show && show.songIds.includes(song.id)).map(song => {
        const requestCount = show ? s.requests.filter(r => r.showId === show.id && r.songId === song.id && r.capacityRetained).length : 0;
        return { ...publicSong(song), requestCount, available: !!show && show.status === 'open' && show.occupiedCount < show.capacity };
      });
      return { demo: true, profile: publicProfile, folders: s.folders?.[profile.id] ?? [], show: show ? publicShow(show) : null, songs, remaining: show ? Math.max(0, show.capacity - show.occupiedCount) : 0, serverTime: new Date(this.now()).toISOString() };
    });
  }
  dashboard(actor: Actor): Promise<DashboardResponse> {
    const musicianId = assertMusician(actor);
    return this.run(s => ({ demo: true, profile: s.profiles.find(p => p.id === musicianId)!, folders: s.folders?.[musicianId] ?? [], songs: s.songs.filter(song => song.musicianId === musicianId).map(publicSong), shows: s.shows.filter(show => show.musicianId === musicianId).map(publicShow), requests: s.requests.filter(r => r.musicianId === musicianId).map(publicRequest), activeShowId: s.shows.find(show => show.musicianId === musicianId && activeStatuses.has(show.status))?.id ?? null }));
  }
  showRequests(actor:Actor,id:string) {
    const uid=assertMusician(actor);
    return this.run(s=>{if(!s.shows.some(show=>show.id===id&&show.musicianId===uid))throw new DomainError('NOT_FOUND','No encontramos ese show.',404);return s.requests.filter(r=>r.showId===id&&r.capacityRetained).map(publicRequest);});
  }
  private owned(s: DemoState, actor: Actor, id: string): StoredRequest {
    const request = s.requests.find(r => r.id === id);
    if (!request || (actor.role === 'guest' ? request.guestId !== actor.id : request.musicianId !== assertMusician(actor))) throw new DomainError('NOT_FOUND', 'No encontramos ese pedido.', 404);
    return request;
  }
  requests(actor: Actor) { return this.run(s => s.requests.filter(r => actor.role === 'guest' ? r.guestId === actor.id : r.musicianId === assertMusician(actor)).map(publicRequest)); }
  request(actor: Actor, id: string) { return this.run(s => publicRequest(this.owned(s, actor, id))); }
  reserve(actor: Actor, input: CreateRequestInput, key: string) {
    if (actor.role !== 'guest') throw new DomainError('FORBIDDEN', 'Usá el acceso de invitado para pedir una canción.', 403);
    return this.run(s => {
      const identity = hash(`${actor.id}:reserve:${key}`), fingerprint = hash(JSON.stringify(input));
      const existing = s.idempotency[identity];
      if (existing) {
        if (existing.fingerprint !== fingerprint) throw new DomainError('IDEMPOTENCY_CONFLICT', 'Ese intento ya corresponde a otro pedido.');
        return publicRequest(this.owned(s, actor, existing.requestId));
      }
      const show = s.shows.find(item => item.id === input.showId);
      if (!show || show.status !== 'open') throw new DomainError('SHOW_CLOSED', 'Los pedidos están cerrados por ahora.');
      const profile = s.profiles.find(p => p.id === show.musicianId)!;
      const song = s.songs.find(item => item.id === input.songId && item.musicianId === show.musicianId && item.enabled);
      if (!song || !show.songIds.includes(song.id)) throw new DomainError('SONG_UNAVAILABLE', 'Esta canción no está disponible.');
      if (profile.pricingReviewRequired) throw new DomainError('PRICING_REVIEW_REQUIRED', 'El músico está actualizando sus precios. Intentá más tarde.');
      if (show.occupiedCount >= show.capacity) throw new DomainError('CAPACITY_FULL', 'Se completaron los lugares de esta noche.');
      if (s.requests.some(r => r.guestId === actor.id && r.showId === show.id && r.status === 'held')) throw new DomainError('ACTIVE_HOLD', 'Ya tenés una reserva pendiente. Revisá Mis pedidos.');
      const amount = profile.standardPrice + (input.type === 'dedication' ? profile.dedicationSurcharge : 0);
      if (input.expectedPrice !== amount) throw new DomainError('PRICE_CHANGED', 'El precio cambió. Revisá el nuevo total.');
      const request: StoredRequest = { id: randomUUID(), musicianId: show.musicianId, guestId: actor.id, showId: show.id, songId: song.id, songTitle: song.title, artist: song.artist, musicianSlug: profile.slug, musicianName: profile.stageName, guestName: input.guestName || 'Invitado', type: input.type, dedication: input.type === 'dedication' ? input.dedication!.trim() : '', amount, songPrice: profile.standardPrice, dedicationSurcharge: input.type === 'dedication' ? profile.dedicationSurcharge : 0, status: 'held', createdAt: new Date(this.now()).toISOString(), expiresAt: new Date(this.now() + 10 * 60000).toISOString(), claimedAt: null, confirmedAt: null, receiptUrl: null, queueRank: 0, version: 1, capacityRetained: true, alias: profile.alias, cbu: profile.cbu, accountName: profile.accountName };
      s.requests.push(request); show.occupiedCount++; show.version++;
      s.idempotency[identity] = { fingerprint, requestId: request.id };
      return publicRequest(request);
    });
  }
  claim(actor: Actor, id: string) {
    if (actor.role !== 'guest') throw new DomainError('FORBIDDEN', 'Esta acción corresponde al invitado.', 403);
    return this.run(s => {
      const request = this.owned(s, actor, id);
      if (['queued', 'playing', 'played'].includes(request.status)) return publicRequest(request);
      if (request.status !== 'held') throw new DomainError('HOLD_EXPIRED', 'La reserva venció. Si transferiste, hablá con el músico.');
      request.status = 'queued'; request.claimedAt = new Date(this.now()).toISOString(); request.version++;
      request.queueRank = Math.max(0, ...s.requests.filter(r => r.showId === request.showId).map(r => r.queueRank)) + 1;
      const show = s.shows.find(item => item.id === request.showId)!;
      show.version++;
      return publicRequest(request);
    });
  }
  cancel(actor: Actor, id: string) {
    return this.run(s => {
      const request = this.owned(s, actor, id);
      if (request.status === 'cancelled') return publicRequest(request);
      if (request.status !== 'held') throw new DomainError('REVIEW_REQUIRED', 'Si ya transferiste, coordiná directamente con el músico.');
      request.status = 'cancelled'; request.capacityRetained = false; request.version++;
      expireHolds(s, this.now()); return publicRequest(request);
    });
  }
  perform(actor: Actor, id: string, status: 'playing' | 'played' | 'not_performed') {
    assertMusician(actor);
    return this.run(s => {
      const request = this.owned(s, actor, id);
      if (request.status === status) return publicRequest(request);
      const show = s.shows.find(item => item.id === request.showId)!;
      if (status === 'playing' && (request.status !== 'queued' || show.status === 'finished')) throw new DomainError('INVALID_STATE', 'Esta canción no está lista para tocar.');
      if (status === 'playing' && s.requests.some(r => r.showId === request.showId && r.status === 'playing')) throw new DomainError('ALREADY_PLAYING', 'Terminá la canción actual antes de empezar otra.');
      if (status === 'played' && request.status !== 'playing') throw new DomainError('INVALID_STATE', 'Primero iniciá esta canción.');
      if (status === 'not_performed' && !['review_pending','queued','playing'].includes(request.status)) throw new DomainError('INVALID_STATE', 'No se puede cambiar este pedido.');
      request.status = status; request.version++; show.version++;
      return publicRequest(request);
    });
  }
  updateProfile(actor: Actor, input: Partial<ProfileInput>) {
    const musicianId = assertMusician(actor);
    return this.run(s => {
      const profile = s.profiles.find(p => p.id === musicianId)!;
      checkVersion(input.version, profile.version);
      const { version: _version, ...updates } = input;
      Object.assign(profile, updates);
      if (input.dedicationSurcharge !== undefined) { profile.pricingReviewRequired = false; delete (profile as MusicianProfile & {dedicationPrice?:number}).dedicationPrice; }
      if (profile.standardPrice + profile.dedicationSurcharge > 100000000) throw new DomainError('INVALID_PRICE','El total supera el máximo permitido.',422);
      profile.version++;
      return profile;
    });
  }
  saveSong(actor: Actor, input: Partial<SongInput>, id?: string) {
    const musicianId = assertMusician(actor);
    return this.run(s => {
      if (input.folderId && !s.folders?.[musicianId]?.some(folder => folder.id === input.folderId)) throw new DomainError('INVALID_FOLDER', 'Elegí una carpeta de tu repertorio.', 422);
      if (id) {
        const song = s.songs.find(item => item.id === id && item.musicianId === musicianId);
        if (!song) throw new DomainError('NOT_FOUND', 'No encontramos esa canción.', 404);
        Object.assign(song, input); delete (song as typeof song & { genre?: string }).genre; return publicSong(song);
      }
      const song = { id: randomUUID(), musicianId, title: input.title!, artist: input.artist!, folderId: input.folderId ?? null, enabled: input.enabled ?? true };
      if (s.songs.filter(item => item.musicianId === musicianId).length >= 2000) throw new DomainError('CATALOG_TOO_LARGE', 'El repertorio admite hasta 2000 canciones.', 422);
      s.songs.push(song);
      return publicSong(song);
    });
  }
  importSongs(actor: Actor, rows: SongInput[], folderId: string | null = null) {
    const musicianId = assertMusician(actor);
    return this.run(s => {
      if (folderId && !s.folders?.[musicianId]?.some(folder => folder.id === folderId)) throw new DomainError('INVALID_FOLDER', 'Elegí una carpeta de tu repertorio.', 422);
      const known = new Set(s.songs.filter(song => song.musicianId === musicianId).map(song => `${song.title.toLocaleLowerCase()}:${song.artist.toLocaleLowerCase()}`));
      let added = 0;
      const existingCount = s.songs.filter(item => item.musicianId === musicianId).length;
      for (const row of rows) { const key = `${row.title.toLocaleLowerCase()}:${row.artist.toLocaleLowerCase()}`; if (known.has(key)) continue; if(existingCount+added>=2000)throw new DomainError('CATALOG_TOO_LARGE','El repertorio admite hasta 2000 canciones.',422);s.songs.push({ ...row, folderId, enabled: row.enabled ?? true, id: randomUUID(), musicianId }); known.add(key); added++; }
      return { added };
    });
  }
  saveFolder(actor: Actor, name: string, id?: string) {
    const musicianId = assertMusician(actor);
    return this.run(s => {
      const folders = (s.folders ??= {})[musicianId] ??= [];
      const existing = id ? folders.find(folder => folder.id === id) : undefined;
      if (id && !existing) throw new DomainError('NOT_FOUND', 'No encontramos esa carpeta.', 404);
      if (folders.some(folder => folder.id !== id && folder.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new DomainError('FOLDER_EXISTS', 'Ya tenés una carpeta con ese nombre.', 409);
      if (existing) { existing.name = name; return existing; }
      if (folders.length >= 100) throw new DomainError('FOLDER_LIMIT', 'Podés crear hasta 100 carpetas.', 422);
      const folder = { id: randomUUID(), name }; folders.push(folder); return folder;
    });
  }
  deleteFolder(actor: Actor, id: string) {
    const musicianId = assertMusician(actor);
    return this.run(s => {
      const folders = s.folders?.[musicianId] ?? [];
      const index = folders.findIndex(folder => folder.id === id);
      if (index < 0) throw new DomainError('NOT_FOUND', 'No encontramos esa carpeta.', 404);
      folders.splice(index, 1);
      for (const song of s.songs) if (song.musicianId === musicianId && song.folderId === id) song.folderId = null;
      return { deleted: true };
    });
  }
  saveShow(actor: Actor, input: Partial<ShowInput>, id?: string) {
    const musicianId = assertMusician(actor);
    return this.run(s => {
      const show = id ? s.shows.find(item => item.id === id && item.musicianId === musicianId) : undefined;
      if (id && !show) throw new DomainError('NOT_FOUND', 'No encontramos ese show.', 404);
      if (show) {
        checkVersion(input.version, show.version);
        if (show.status === 'finished') throw new DomainError('SHOW_CLOSED', 'No se puede editar un show finalizado.');
        if (input.capacity !== undefined && input.capacity < show.capacity) {
          if (input.capacity < show.occupiedCount) throw new DomainError('CAPACITY_BELOW_COMMITTED', 'El cupo no puede ser menor que los pedidos existentes.');
          const played = s.requests.filter(request => request.showId === show.id && request.status === 'played').length;
          const minimum = Math.max(1, show.occupiedCount, Math.min(show.capacity, played + 1));
          if (input.capacity < minimum) throw new DomainError('CAPACITY_TOO_LOW', 'El cupo debe respetar los pedidos existentes y dejar un lugar sobre las canciones ya cantadas.',422);
        }
      }
      const songIds = input.songIds ?? show?.songIds ?? s.songs.filter(song => song.musicianId === musicianId && song.enabled).map(song => song.id);
      if (songIds.some(id => !s.songs.some(song => song.id === id && song.musicianId === musicianId))) throw new DomainError('INVALID_SONG', 'El repertorio contiene una canción inválida.', 422);
      if (show) { const { version: _version, ...updates } = input; if (updates.date) updates.date = new Date(updates.date).toISOString(); Object.assign(show, updates, { songIds }); show.version++; return publicShow(show); }
      const created = { id: randomUUID(), musicianId, title: input.title!, venue: input.venue!, date: new Date(input.date!).toISOString(), capacity: input.capacity!, songIds, status: 'draft' as const, occupiedCount: 0, version: 1 };
      s.shows.push(created); return publicShow(created);
    });
  }
  showAction(actor: Actor, id: string, action: 'open'|'pause'|'resume'|'close'|'finish') {
    const musicianId = assertMusician(actor);
    return this.run(s => {
      const show = s.shows.find(item => item.id === id && item.musicianId === musicianId);
      if (!show) throw new DomainError('NOT_FOUND', 'No encontramos ese show.', 404);
      if (action === 'open' || action === 'resume') {
        if (s.profiles.find(profile => profile.id === musicianId)?.pricingReviewRequired) throw new DomainError('PRICING_REVIEW_REQUIRED', 'Revisá los precios antes de abrir el show.',422);
        if (show.status === 'finished') throw new DomainError('SHOW_CLOSED', 'Creá otro show para empezar una nueva noche.');
        if (s.shows.some(item => item.musicianId === musicianId && item.id !== id && activeStatuses.has(item.status))) throw new DomainError('ACTIVE_SHOW_EXISTS', 'Ya tenés un show activo. Finalizalo antes de abrir otro.');
        if (!show.songIds.some(id => s.songs.some(song => song.id === id && song.enabled))) throw new DomainError('EMPTY_CATALOG', 'Agregá canciones antes de abrir el show.');
        show.status = 'open';
      } else if (action === 'pause') { if (show.status !== 'open' && show.status !== 'paused') throw new DomainError('INVALID_STATE', 'Este show no está abierto.'); show.status = 'paused'; }
      else if (action === 'close') { if (!activeStatuses.has(show.status)) throw new DomainError('INVALID_STATE', 'Este show no está activo.'); show.status = 'closed'; }
      else { show.status = 'finished'; for (const r of s.requests.filter(r => r.showId === id && r.status === 'held')) { r.status = 'expired'; r.capacityRetained = false; r.version++; } expireHolds(s, this.now()); }
      show.version++; return publicShow(show);
    });
  }
  reorder(actor: Actor, id: string, requestIds: string[]) {
    const musicianId = assertMusician(actor);
    return this.run(s => {
      const show = s.shows.find(item => item.id === id && item.musicianId === musicianId);
      if (!show) throw new DomainError('NOT_FOUND', 'No encontramos ese show.', 404);
      const queued = s.requests.filter(r => r.showId === id && r.status === 'queued');
      if (requestIds.length !== queued.length || new Set(requestIds).size !== requestIds.length || requestIds.some(id => !queued.some(r => r.id === id))) throw new DomainError('QUEUE_CHANGED', 'La fila cambió. Actualizá antes de reordenar.');
      requestIds.forEach((id, index) => { const r = queued.find(r => r.id === id)!; r.queueRank = index + 1; r.version++; });
      show.version++; return queued.sort((a,b) => a.queueRank-b.queueRank).map(publicRequest);
    });
  }
  attachAsset(actor: Actor, assetId: string, kind: 'avatar'|'banner'|'receipt', file: string, requestId?: string) {
    return this.run(s => {
      if (kind === 'receipt') {
        if (actor.role !== 'guest' || !requestId) throw new DomainError('FORBIDDEN', 'No tenés acceso.', 403);
        const request = this.owned(s, actor, requestId);
        const old = Object.entries(s.assets).find(([, asset]) => asset.requestId === requestId);
        if (old) delete s.assets[old[0]];
        s.assets[assetId] = { musicianId: request.musicianId, kind, requestId, file };
        request.receiptUrl = `/api/v1/requests/${requestId}/receipt`; request.version++;
        return publicRequest(request);
      }
      const musicianId = assertMusician(actor); const profile = s.profiles.find(p => p.id === musicianId)!;
      const old = Object.entries(s.assets).find(([, asset]) => asset.kind === kind && asset.musicianId === musicianId);
      if (old) delete s.assets[old[0]];
      s.assets[assetId] = { musicianId, kind, file };
      profile[kind === 'avatar' ? 'avatarUrl' : 'bannerUrl'] = `/api/v1/public/media/${assetId}`; profile.version++;
      return profile;
    });
  }
  asset(actor: Actor | null, assetId?: string, requestId?: string) {
    return this.run(s => {
      if (requestId) { if (!actor) throw new DomainError('UNAUTHORIZED', 'Ingresá para ver el comprobante.', 401); this.owned(s, actor, requestId); const asset = Object.values(s.assets).find(asset => asset.kind === 'receipt' && asset.requestId === requestId); if (!asset) throw new DomainError('NOT_FOUND', 'No hay comprobante.', 404); return asset; }
      const asset = s.assets[assetId!];
      if (!asset || asset.kind === 'receipt') throw new DomainError('NOT_FOUND', 'No encontramos esa imagen.', 404);
      return asset;
    });
  }
  removeProfileAsset(actor: Actor, kind: 'avatar'|'banner') {
    const musicianId = assertMusician(actor);
    return this.run(s => { for (const [id, asset] of Object.entries(s.assets)) if (asset.musicianId === musicianId && asset.kind === kind) delete s.assets[id]; const profile = s.profiles.find(p => p.id === musicianId)!; profile[kind === 'avatar' ? 'avatarUrl' : 'bannerUrl'] = ''; profile.version++; return profile; });
  }
}
