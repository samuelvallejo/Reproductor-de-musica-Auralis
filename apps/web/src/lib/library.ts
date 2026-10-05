import { useSyncExternalStore } from 'react';
import { cloneTrack, LinkedSequence, LinkedSet, PlaylistController, StringMap, type PlaylistSnapshot, type Track } from '@auralis/playlist-core';
import { decodeLibrary, encodeLibrary, pruneStarterPlaylists } from './library-persistence';
import { loadLibrary, saveLibrary } from './storage';

export interface LibraryView {
  playlists: LinkedSequence<PlaylistSnapshot>; active: PlaylistSnapshot; catalog: LinkedSequence<Track>;
  favorites: LinkedSequence<Track>; history: LinkedSequence<Track>; ready: boolean;
  saveStatus: 'saved' | 'saving' | 'error'; error: string | null;
}

class LibraryStore {
  controllers = new StringMap<PlaylistController>();
  private activeId = '';
  private catalog = new StringMap<Track>();
  private favoriteIds = new LinkedSet<string>();
  private historyIds = new LinkedSequence<string>();
  private ready = false;
  private error: string | null = null;
  private saveStatus: LibraryView['saveStatus'] = 'saved';
  private listeners = new LinkedSet<() => void>();
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private writes: Promise<void> = Promise.resolve();
  private view: LibraryView;
  // Empty selection is a UI placeholder, never a saved or visible playlist.
  private readonly emptySelection = new PlaylistController('', 'Tu próxima playlist');
  constructor() { this.view = this.makeView(); }
  get active() {
    const controller = this.controllers.get(this.activeId);
    return controller ?? this.emptySelection;
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private catalogSelection(ids: Iterable<string>) {
    const selected = new LinkedSequence<Track>();
    for (const id of ids) { const track = this.catalog.get(id); if (track) selected.append(cloneTrack(track)); }
    return selected;
  }
  private makeView(): LibraryView {
    return {
      playlists: LinkedSequence.from(this.controllers.values()).map(value => value.snapshot()),
      active: this.active.snapshot(), catalog: LinkedSequence.from(this.catalog.values()).map(cloneTrack),
      favorites: this.catalogSelection(this.favoriteIds), history: this.catalogSelection(this.historyIds),
      ready: this.ready, saveStatus: this.saveStatus, error: this.error,
    };
  }
  private publish() { this.view = this.makeView(); this.listeners.forEach(listener => listener()); }
  private serialize() {
    return encodeLibrary({
      version: 1, playlists: LinkedSequence.from(this.controllers.values()).map(controller => controller.snapshot()),
      activeId: this.activeId, catalog: LinkedSequence.from(this.catalog.values()),
      favoriteIds: LinkedSequence.from(this.favoriteIds), historyIds: this.historyIds, starterPlaylistsRemoved: true,
    });
  }
  private changed() {
    this.saveStatus = 'saving'; this.publish(); clearTimeout(this.saveTimer);
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
    let migrated = false;
    try {
      const data = await loadLibrary();
      if (data) {
        const previous = decodeLibrary(data);
        const identities = new StringMap<boolean>();
        for (const playlist of previous.playlists) {
          if (identities.has(playlist.playlistId)) throw new Error('Duplicate playlist identity');
          identities.set(playlist.playlistId, true);
        }
        const saved = pruneStarterPlaylists(previous);
        migrated = saved.playlists.length !== previous.playlists.length;
        const restored = new StringMap<PlaylistController>();
        for (const playlist of saved.playlists) {
          if (restored.has(playlist.playlistId)) throw new Error('Duplicate playlist identity');
          restored.set(playlist.playlistId, PlaylistController.restore(playlist));
        }
        const firstId = restored.keys().next().value ?? '';
        const catalog = new StringMap<Track>();
        for (const track of saved.catalog) catalog.set(track.trackId, track);
        // Commit only after all records and node links have been validated.
        this.controllers = restored;
        this.activeId = restored.has(saved.activeId) ? saved.activeId : firstId;
        this.catalog = catalog;
        this.favoriteIds = new LinkedSet(saved.favoriteIds);
        this.historyIds = saved.historyIds;
      }
    } catch {
      this.error = 'Tu biblioteca guardada no pudo abrirse. Puedes seguir en esta sesión; no se sobrescribirá hasta que hagas un cambio.';
      this.saveStatus = 'error';
    }
    this.ready = true; this.publish();
    if (migrated && this.saveStatus !== 'error') await this.flush();
  }
  setActive(id: string) { if (!this.controllers.has(id)) return; this.activeId = id; this.changed(); }
  create(name: string) {
    const value = name.trim(); if (!value || value.length > 80) throw new Error('El nombre debe tener entre 1 y 80 caracteres.');
    const playlist = new PlaylistController(crypto.randomUUID(), value, this.controllers.size % 4);
    this.controllers.set(playlist.playlistId, playlist); this.activeId = playlist.playlistId; this.changed();
  }
  rename(name: string) {
    if (!this.controllers.has(this.activeId)) throw new Error('Primero crea una playlist.');
    const value = name.trim(); if (!value || value.length > 80) throw new Error('El nombre debe tener entre 1 y 80 caracteres.');
    this.active.name = value; this.changed();
  }
  deletePlaylist() {
    if (!this.controllers.has(this.activeId)) return;
    this.controllers.delete(this.activeId);
    const firstId = this.controllers.keys().next().value ?? '';
    this.activeId = firstId; this.changed();
  }
  register(track: Track) { this.catalog.set(track.trackId, cloneTrack(track)); this.changed(); }
  removeFromLibrary(trackId: string) {
    if (!this.catalog.delete(trackId)) return;
    this.favoriteIds.delete(trackId);
    this.historyIds = this.historyIds.filter(id => id !== trackId);
    // Playlist nodes own their metadata; keep them and their shared MP3 assets.
    this.changed();
  }
  insert(track: Track, index: number, playlistId = this.activeId) {
    const playlist = this.controllers.get(playlistId);
    if (!playlist) throw new Error('La playlist ya no existe.');
    playlist.insertAt(index, track); this.catalog.set(track.trackId, cloneTrack(track)); this.changed();
  }
  prependTracks(tracks: LinkedSequence<Track>) {
    const playlist = this.controllers.get(this.activeId);
    if (!playlist) throw new Error('Crea una playlist para agregar tus canciones.');
    const copies = tracks.map(cloneTrack);
    const empty = !playlist.list.head;
    // Prepending in reverse retains the chosen order inside a multi-file batch.
    for (const track of copies.reverse()) {
      playlist.insertAt(0, track); this.catalog.set(track.trackId, cloneTrack(track));
    }
    if (empty) playlist.currentNode = playlist.list.head;
    if (copies.length) this.changed();
  }
  move(nodeId: string, targetId: string, placement: 'before' | 'after') {
    const moved = placement === 'before' ? this.active.moveBefore(nodeId, targetId) : this.active.moveAfter(nodeId, targetId);
    if (moved) this.changed();
    return moved;
  }
  remove(nodeId: string) { this.active.remove(nodeId); this.changed(); }
  select(nodeId: string) { this.active.select(nodeId); this.changed(); }
  next() { const node = this.active.next(); if (node) this.changed(); return node; }
  previous() { const node = this.active.previous(); if (node) this.changed(); return node; }
  toggleFavorite(track: Track) {
    this.catalog.set(track.trackId, cloneTrack(track));
    if (this.favoriteIds.has(track.trackId)) this.favoriteIds.delete(track.trackId); else this.favoriteIds.add(track.trackId);
    this.changed();
  }
  recordPlayed(track: Track) {
    // Playing a retained playlist node must not restore a removed library entry.
    if (!this.catalog.has(track.trackId)) return;
    this.catalog.set(track.trackId, cloneTrack(track));
    this.historyIds.removeFirst(id => id === track.trackId);
    this.historyIds.prepend(track.trackId);
    while (this.historyIds.length > 20) this.historyIds.removeAt(this.historyIds.length - 1);
    this.changed();
  }
}
export const library = new LibraryStore();
export const useLibrary = () => useSyncExternalStore(library.subscribe, library.getSnapshot);
