import { LinkedSequence } from './collections.js';

interface TrackMetadata {
  trackId: string;
  title: string;
  artists: LinkedSequence<string>;
  coverUrl: string | null;
  durationMs: number | null;
  album?: string;
  year?: string;
}
export interface LegacyTrack extends TrackMetadata { source: 'legacy' }
export interface LocalTrack extends TrackMetadata {
  source: 'local'; assetId: string; fileName: string; mimeType: string; fileSize: number;
}
export interface SpotifyTrack extends TrackMetadata {
  source: 'spotify'; spotifyUri: string; spotifyUrl: string;
}
export type Track = LegacyTrack | LocalTrack | SpotifyTrack;
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'unavailable' | 'error';
export interface PlaylistEntry { nodeId: string; track: Track }
export interface PlaylistSnapshot {
  schemaVersion: 1; playlistId: string; name: string; artwork: number;
  entries: LinkedSequence<PlaylistEntry>; currentNodeId: string | null;
}
export interface SearchResponse {
  tracks: LinkedSequence<SpotifyTrack>; offset: number; limit: number; total: number | null; hasMore: boolean;
}

export function readObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected an object');
  return input as Record<string, unknown>;
}
export function readString(input: unknown, minimum = 0, maximum = Infinity): string {
  if (typeof input !== 'string' || input.length < minimum || input.length > maximum) throw new Error('Invalid string');
  return input;
}
export function readNumber(input: unknown, minimum = 0, integer = false): number {
  if (typeof input !== 'number' || !Number.isFinite(input) || input < minimum || (integer && !Number.isInteger(input))) throw new Error('Invalid number');
  return input;
}
export function readBoolean(input: unknown): boolean {
  if (typeof input !== 'boolean') throw new Error('Invalid boolean');
  return input;
}
/** Incoming JSON arrays become our own nodes immediately; no array is retained. */
export function readSequence<T>(input: unknown, parse: (value: unknown) => T): LinkedSequence<T> {
  if (!(input instanceof LinkedSequence) && !Array.isArray(input)) throw new Error('Invalid collection');
  const result = new LinkedSequence<T>();
  for (const value of input as Iterable<unknown>) result.append(parse(value));
  return result;
}
export function readUrl(input: unknown): string {
  const value = readString(input, 1);
  try { new URL(value); } catch { throw new Error('Invalid URL'); }
  return value;
}

function parseTrack(input: unknown): Track {
  const data = readObject(input);
  const artists = readSequence(data.artists, value => readString(value));
  if (!artists.length) throw new Error('A track needs at least one artist');
  const metadata: TrackMetadata = {
    trackId: readString(data.trackId, 1), title: readString(data.title, 1), artists,
    coverUrl: data.coverUrl === null ? null : readString(data.coverUrl),
    durationMs: data.durationMs === null ? null : readNumber(data.durationMs),
  };
  if (data.album !== undefined) metadata.album = readString(data.album);
  if (data.year !== undefined) metadata.year = readString(data.year);
  if (data.source === 'legacy' || data.source === 'audius') return { ...metadata, source: 'legacy' };
  if (data.source === 'local') return {
    ...metadata, source: 'local', assetId: readString(data.assetId, 1),
    fileName: readString(data.fileName), mimeType: readString(data.mimeType), fileSize: readNumber(data.fileSize, 0, true),
  };
  if (data.source === 'spotify') {
    const uri = readString(data.spotifyUri);
    if (!/^spotify:track:[a-zA-Z0-9]+$/.test(uri)) throw new Error('Invalid Spotify URI');
    return { ...metadata, source: 'spotify', spotifyUri: uri, spotifyUrl: readUrl(data.spotifyUrl) };
  }
  throw new Error('Invalid track source');
}
/** Handwritten validation also clones artists, keeping node values independent. */
export const trackSchema = { parse: parseTrack };
export const localTrackSchema = { parse(input: unknown): LocalTrack {
  const track = parseTrack(input); if (track.source !== 'local') throw new Error('Expected a local track'); return track;
} };
export const spotifyTrackSchema = { parse(input: unknown): SpotifyTrack {
  const track = parseTrack(input); if (track.source !== 'spotify') throw new Error('Expected a Spotify track'); return track;
} };
export const legacyTrackSchema = { parse(input: unknown): LegacyTrack {
  const track = parseTrack(input); if (track.source !== 'legacy') throw new Error('Expected a legacy track'); return track;
} };
export const cloneTrack = (track: Track) => parseTrack(track);
export const playlistSnapshotSchema = { parse(input: unknown): PlaylistSnapshot {
  const data = readObject(input);
  if (data.schemaVersion !== 1) throw new Error('Unsupported playlist version');
  const artwork = readNumber(data.artwork, 0, true);
  if (artwork > 3) throw new Error('Invalid artwork');
  return {
    schemaVersion: 1, playlistId: readString(data.playlistId, 1), name: readString(data.name, 1, 80), artwork,
    entries: readSequence(data.entries, value => {
      const entry = readObject(value);
      return { nodeId: readString(entry.nodeId, 1), track: parseTrack(entry.track) };
    }),
    currentNodeId: data.currentNodeId === null ? null : readString(data.currentNodeId),
  };
} };
export const searchResponseSchema = { parse(input: unknown): SearchResponse {
  const data = readObject(input);
  return {
    tracks: readSequence(data.tracks, value => spotifyTrackSchema.parse(value)),
    offset: readNumber(data.offset, 0, true), limit: readNumber(data.limit, 1, true),
    total: data.total === null ? null : readNumber(data.total, 0, true), hasMore: readBoolean(data.hasMore),
  };
} };
