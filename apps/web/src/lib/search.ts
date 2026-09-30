import { z } from 'zod';
import { searchResponseSchema, type SearchResponse } from '@auralis/playlist-core';
import { spotify, SpotifyError } from './spotify-session';
export { SpotifyError as SearchError };
const itemSchema = z.object({ id: z.string(), uri: z.string(), name: z.string(), artists: z.array(z.object({ name: z.string() })).min(1), duration_ms: z.number().nonnegative(), external_urls: z.object({ spotify: z.url() }), album: z.object({ name: z.string(), release_date: z.string().optional(), images: z.array(z.object({ url: z.url() })).default([]) }) });
const resultSchema = z.object({ tracks: z.object({ items: z.array(itemSchema.nullable()), total: z.number().int().nonnegative(), next: z.string().nullable(), offset: z.number().int(), limit: z.number().int() }) });
export async function searchMusic(query: string, offset: number, signal: AbortSignal): Promise<SearchResponse> {
  if (!query.trim() || query.length > 200 || !Number.isInteger(offset) || offset < 0 || offset > 1000) throw new SpotifyError('Escribe una búsqueda y una página válidas.');
  const response = await spotify.request(`/search?${new URLSearchParams({ q: query.trim(), type: 'track', limit: '10', offset: String(offset) })}`, { signal });
  const { tracks } = resultSchema.parse(await response.json());
  return searchResponseSchema.parse({ tracks: tracks.items.filter(item => item !== null).map(item => ({ source: 'spotify', trackId: `spotify:${item.id}`, title: item.name, artists: item.artists.map(artist => artist.name), coverUrl: item.album.images[0]?.url || null, durationMs: item.duration_ms, album: item.album.name, year: item.album.release_date?.slice(0, 4), spotifyUri: item.uri, spotifyUrl: item.external_urls.spotify })), offset: tracks.offset, limit: tracks.limit, total: tracks.total, hasMore: tracks.next !== null });
}
