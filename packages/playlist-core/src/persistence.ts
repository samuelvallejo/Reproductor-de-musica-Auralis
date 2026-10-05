import type { PlaylistSnapshot, Track } from './models.js';

/**
 * Transport boundary only. IndexedDB/JSON cannot store class methods or links.
 * Preserve the original version-1 format so existing playlists and MP3 survive.
 * These arrays never implement the running playlist or determine navigation.
 */
export function encodeSequence<T, R>(values: Iterable<T>, encode: (value: T) => R): R[] {
  const wireValues: R[] = [];
  for (const value of values) wireValues.push(encode(value));
  return wireValues;
}
export function encodeTrack(track: Track) {
  return { ...track, artists: encodeSequence(track.artists, artist => artist) };
}
export function encodePlaylist(snapshot: PlaylistSnapshot) {
  return {
    ...snapshot,
    entries: encodeSequence(snapshot.entries, entry => ({ nodeId: entry.nodeId, track: encodeTrack(entry.track) })),
  };
}
