import {
  encodePlaylist, encodeSequence, encodeTrack, playlistSnapshotSchema, readObject, readSequence, readString, trackSchema,
  type LinkedSequence, type PlaylistSnapshot, type Track,
} from '@auralis/playlist-core';

export interface SavedLibrary {
  version: 1; playlists: LinkedSequence<PlaylistSnapshot>; activeId: string;
  catalog: LinkedSequence<Track>; favoriteIds: LinkedSequence<string>; historyIds: LinkedSequence<string>;
  starterPlaylistsRemoved?: boolean;
}
/** One-time cleanup; populated or renamed playlists and later user creations survive. */
export function pruneStarterPlaylists(saved: SavedLibrary): SavedLibrary {
  if (saved.starterPlaylistsRemoved) return saved;
  const playlists = saved.playlists.filter(playlist => {
    const starter = (playlist.name === 'Concentración' && playlist.artwork === 1)
      || (playlist.name === 'Noches de ciudad' && playlist.artwork === 2)
      || (playlist.name === 'Días claros' && playlist.artwork === 3);
    return !starter || playlist.entries.length > 0;
  });
  return { ...saved, playlists, starterPlaylistsRemoved: true };
}
/** Read the existing IndexedDB format into independently owned linked nodes. */
export function decodeLibrary(input: unknown): SavedLibrary {
  const data = readObject(input);
  if (data.version !== 1) throw new Error('Unsupported library version');
  const playlists = readSequence(data.playlists, value => playlistSnapshotSchema.parse(value));
  if (data.starterPlaylistsRemoved !== undefined && typeof data.starterPlaylistsRemoved !== 'boolean') throw new Error('Invalid migration marker');
  return {
    version: 1, playlists, activeId: readString(data.activeId),
    catalog: readSequence(data.catalog, value => trackSchema.parse(value)),
    favoriteIds: readSequence(data.favoriteIds, value => readString(value)),
    historyIds: readSequence(data.historyIds, value => readString(value)),
    ...(data.starterPlaylistsRemoved === undefined ? {} : { starterPlaylistsRemoved: data.starterPlaylistsRemoved }),
  };
}
/** Wire arrays exist only in the persisted version-1 record, never in live state. */
export function encodeLibrary(data: SavedLibrary) {
  return {
    version: 1, activeId: data.activeId,
    playlists: encodeSequence(data.playlists, encodePlaylist),
    catalog: encodeSequence(data.catalog, encodeTrack),
    favoriteIds: encodeSequence(data.favoriteIds, id => id),
    historyIds: encodeSequence(data.historyIds, id => id),
    ...(data.starterPlaylistsRemoved === undefined ? {} : { starterPlaylistsRemoved: data.starterPlaylistsRemoved }),
  };
}
