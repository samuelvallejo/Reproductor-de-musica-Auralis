import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { PlaylistController, playlistSnapshotSchema, trackSchema, type PlaylistSnapshot, type Track } from '@auralis/playlist-core';
import { loadLibrary, saveLibrary } from './storage';

const savedLibrarySchema = z.object({
  version: z.literal(1), playlists: z.array(playlistSnapshotSchema).min(1), activeId: z.string(),
  catalog: z.array(trackSchema), favoriteIds: z.array(z.string()), historyIds: z.array(z.string()),
});
export interface LibraryView {
  playlists: PlaylistSnapshot[]; active: PlaylistSnapshot; catalog: Track[];
  favorites: Track[]; history: Track[]; ready: boolean; saveStatus: 'saved' | 'saving' | 'error'; error: string | null;
}

class LibraryStore {
  controllers = new Map<string, PlaylistController>();
  private activeId = '';
  private catalog = new Map<string, Track>();
  private favoriteIds = new Set<string>();
  private historyIds: string[] = [];
  private ready = false;
  private error: string | null = null;
  private saveStatus: LibraryView['saveStatus'] = 'saved';
  private listeners = new Set<() => void>();
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private writes: Promise<void> = Promise.resolve();
  private view: LibraryView;
  constructor() {
    for (const [artwork, name] of ['Mi universo', 'Concentración', 'Noches de ciudad', 'Días claros'].entries()) {
      const playlist = new PlaylistController(crypto.randomUUID(), name, artwork);
      this.controllers.set(playlist.playlistId, playlist);
      this.activeId ||= playlist.playlistId;
    }
    this.view = this.makeView();
  }
  get active() { const controller = this.controllers.get(this.activeId); if (!controller) throw new Error('No active playlist'); return controller; }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private makeView(): LibraryView {
    return { playlists: Array.from(this.controllers.values(), value => value.snapshot()), active: this.active.snapshot(), catalog: Array.from(this.catalog.values()),
      favorites: Array.from(this.favoriteIds).flatMap(id => this.catalog.get(id) ?? []),
      history: this.historyIds.flatMap(id => this.catalog.get(id) ?? []), ready: this.ready, saveStatus: this.saveStatus, error: this.error };
  }
  private publish() { this.view = this.makeView(); this.listeners.forEach(listener => listener()); }
  private serialize() { return { version: 1, playlists: Array.from(this.controllers.values(), controller => controller.snapshot()), activeId: this.activeId,
    catalog: Array.from(this.catalog.values()), favoriteIds: Array.from(this.favoriteIds), historyIds: [...this.historyIds] }; }
  private changed() {
    this.saveStatus = 'saving'; this.publish();
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => { void this.flush(); }, 200);
  }
  async flush() {
    clearTimeout(this.saveTimer);
    const data = this.serialize();
    this.writes = this.writes.then(async () => {
      try { await saveLibrary(data); this.saveStatus = 'saved'; this.error = null; }
      catch { this.saveStatus = 'error'; this.error = 'No pudimos guardar tu biblioteca. Revisa el espacio o los permisos del navegador y vuelve a intentar.'; }
      this.publish();
    });
    await this.writes;
  }
  async initialize() {
    try {
      const data = await loadLibrary();
      if (data) {
        const saved = savedLibrarySchema.parse(data);
        const restored = new Map<string, PlaylistController>();
        for (const playlist of saved.playlists) {
          if (restored.has(playlist.playlistId)) throw new Error('Duplicate playlist identity');
          restored.set(playlist.playlistId, PlaylistController.restore(playlist));
        }
        this.controllers = restored;
        this.activeId = restored.has(saved.activeId) ? saved.activeId : saved.playlists[0]!.playlistId;
        this.catalog = new Map(saved.catalog.map(track => [track.trackId, track]));
        this.favoriteIds = new Set(saved.favoriteIds);
        this.historyIds = saved.historyIds;
      }
    } catch { this.error = 'Tu biblioteca guardada no pudo abrirse. Puedes seguir en esta sesión; no se sobrescribirá hasta que hagas un cambio.'; this.saveStatus = 'error'; }
    this.ready = true; this.publish();
  }
  setActive(id: string) { if (!this.controllers.has(id)) return; this.activeId = id; this.changed(); }
  create(name: string) {
    const value = name.trim(); if (!value || value.length > 80) throw new Error('El nombre debe tener entre 1 y 80 caracteres.');
    const playlist = new PlaylistController(crypto.randomUUID(), value, this.controllers.size % 4);
    this.controllers.set(playlist.playlistId, playlist); this.activeId = playlist.playlistId; this.changed();
  }
  rename(name: string) { const value = name.trim(); if (!value || value.length > 80) throw new Error('El nombre debe tener entre 1 y 80 caracteres.'); this.active.name = value; this.changed(); }
  deletePlaylist() {
    if (this.controllers.size === 1) throw new Error('Conserva al menos una playlist. Puedes vaciarla eliminando sus canciones.');
    this.controllers.delete(this.activeId); this.activeId = this.controllers.keys().next().value!; this.changed();
  }
  register(track: Track) { this.catalog.set(track.trackId, structuredClone(track)); this.changed(); }
  insert(track: Track, index: number, playlistId = this.activeId) {
    const playlist = this.controllers.get(playlistId);
    if (!playlist) throw new Error('La playlist ya no existe.');
    playlist.insertAt(index, track); this.catalog.set(track.trackId, structuredClone(track)); this.changed();
  }
  remove(nodeId: string) { this.active.remove(nodeId); this.changed(); }
  select(nodeId: string) { this.active.select(nodeId); this.changed(); }
  next() { const node = this.active.next(); if (node) this.changed(); return node; }
  previous() { const node = this.active.previous(); if (node) this.changed(); return node; }
  toggleFavorite(track: Track) { this.catalog.set(track.trackId, structuredClone(track)); if (this.favoriteIds.has(track.trackId)) this.favoriteIds.delete(track.trackId); else this.favoriteIds.add(track.trackId); this.changed(); }
  recordPlayed(track: Track) { this.catalog.set(track.trackId, structuredClone(track)); this.historyIds = [track.trackId, ...this.historyIds.filter(id => id !== track.trackId)].slice(0, 20); this.changed(); }
}
export const library = new LibraryStore();
export const useLibrary = () => useSyncExternalStore(library.subscribe, library.getSnapshot);
