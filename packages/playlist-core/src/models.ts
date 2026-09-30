import { z } from 'zod';

const metadata = {
  trackId: z.string().min(1),
  title: z.string().min(1),
  artists: z.array(z.string()).min(1),
  coverUrl: z.string().nullable(),
  durationMs: z.number().finite().nonnegative().nullable(),
  album: z.string().optional(),
  year: z.string().optional(),
};
export const legacyTrackSchema = z.object({ ...metadata, source: z.literal('legacy') });
export const localTrackSchema = z.object({
  ...metadata, source: z.literal('local'), assetId: z.string().min(1),
  fileName: z.string(), mimeType: z.string(), fileSize: z.number().int().nonnegative(),
});
export const spotifyTrackSchema = z.object({
  ...metadata, source: z.literal('spotify'), spotifyUri: z.string().regex(/^spotify:track:[a-zA-Z0-9]+$/),
  spotifyUrl: z.url(),
});
// Retain metadata from old playlists without retaining the previous API integration.
export const trackSchema = z.preprocess(value => {
  if (value && typeof value === 'object' && 'source' in value && value.source === 'audius') return { ...value, source: 'legacy' };
  return value;
}, z.discriminatedUnion('source', [legacyTrackSchema, localTrackSchema, spotifyTrackSchema]));
export type LegacyTrack = z.infer<typeof legacyTrackSchema>;
export type LocalTrack = z.infer<typeof localTrackSchema>;
export type SpotifyTrack = z.infer<typeof spotifyTrackSchema>;
export type Track = z.infer<typeof trackSchema>;
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'unavailable' | 'error';

export const playlistSnapshotSchema = z.object({
  schemaVersion: z.literal(1), playlistId: z.string().min(1), name: z.string().min(1).max(80),
  artwork: z.number().int().min(0).max(3),
  entries: z.array(z.object({ nodeId: z.string().min(1), track: trackSchema })),
  currentNodeId: z.string().nullable(),
});
export type PlaylistSnapshot = z.infer<typeof playlistSnapshotSchema>;
export const searchResponseSchema = z.object({
  tracks: z.array(spotifyTrackSchema), offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(), total: z.number().int().nonnegative().nullable(), hasMore: z.boolean(),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;
