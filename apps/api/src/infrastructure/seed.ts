import type { DemoState } from '../domain/model.js';
export function seedState(now = Date.now()): DemoState {
  const profile = { id: 'jony', slug: 'jony', stageName: 'Jony', bio: 'Una guitarra, buenas canciones y una noche para compartir. Elegí la tuya y la hacemos parte del show.', location: 'Buenos Aires, Argentina', avatarUrl: '', bannerUrl: '', publicEmail: '', whatsapp: '', website: '', socialLinks: [], standardPrice: 300000, dedicationSurcharge: 150000, version: 1, alias: 'DEMO.NO.TRANSFERIR', cbu: '', accountName: 'Cuenta de demostración — no transferir' };
  const titles = [
    ['De música ligera','Soda Stereo'], ['Flaca','Andrés Calamaro'],
    ['11 y 6','Fito Páez'], ['Zona de promesas','Gustavo Cerati'],
    ['Seguir viviendo sin tu amor','Luis Alberto Spinetta'], ['Trátame suavemente','Soda Stereo'],
    ['El amor después del amor','Fito Páez'], ['Color esperanza','Diego Torres'],
    ['A Dios le pido','Juanes'], ['Persiana americana','Soda Stereo'],
    ['Bésame mucho','Consuelo Velázquez'], ['Stand by Me','Ben E. King'],
    ['Perfect','Ed Sheeran'], ['La balsa','Los Gatos'],
    ['Crimen','Gustavo Cerati'], ['Zamba para olvidar','Daniel Toro'],
  ];
  const songs = titles.map(([title, artist], i) => ({ id: `song-${i+1}`, musicianId: 'jony', title: title!, artist: artist!, folderId: null, enabled: true }));
  const show = { id: 'show-tonight', musicianId: 'jony', title: 'Una noche, tus canciones', venue: 'Bar de la Esquina', date: new Date(now).toISOString(), capacity: 20, status: 'open' as const, songIds: songs.map(s => s.id), occupiedCount: 0, version: 1 };
  return { schemaVersion: 1, profiles: [profile], folders: {}, songs, shows: [show], requests: [], sessions: {}, idempotency: {}, assets: {} };
}
