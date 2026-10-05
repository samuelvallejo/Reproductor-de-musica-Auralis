import { LinkedSequence, readNumber, readObject, readSequence, readString, readUrl, spotifyTrackSchema, type SearchResponse, type SpotifyTrack } from '@auralis/playlist-core';
import { spotify, SpotifyError } from './spotify-session';
export { SpotifyError as SearchError };

/** Spotify's JSON arrays are consumed at this boundary, then replaced by nodes. */
function parseSearchResult(input: unknown): SearchResponse {
  const page = readObject(readObject(input).tracks);
  const tracks = new LinkedSequence<SpotifyTrack>();
  const items = readSequence(page.items, value => value);
  for (const value of items) {
    if (value === null) continue;
    const item = readObject(value); const album = readObject(item.album);
    const artists = readSequence(item.artists, artist => readString(readObject(artist).name));
    const images = album.images === undefined ? new LinkedSequence<string>() : readSequence(album.images, image => readUrl(readObject(image).url));
    tracks.append(spotifyTrackSchema.parse({
      source: 'spotify', trackId: 'spotify:' + readString(item.id), title: readString(item.name),
      artists, coverUrl: images.at(0) ?? null, durationMs: readNumber(item.duration_ms),
      album: readString(album.name), year: album.release_date === undefined ? undefined : readString(album.release_date).slice(0, 4),
      spotifyUri: readString(item.uri), spotifyUrl: readUrl(readObject(item.external_urls).spotify),
    }));
  }
  if (page.next !== null) readString(page.next);
  return {
    tracks, offset: readNumber(page.offset, 0, true), limit: readNumber(page.limit, 1, true),
    total: readNumber(page.total, 0, true), hasMore: page.next !== null,
  };
}
export async function searchMusic(query: string, offset: number, signal: AbortSignal): Promise<SearchResponse> {
  if (!query.trim() || query.length > 200 || !Number.isInteger(offset) || offset < 0 || offset > 1000) throw new SpotifyError('Escribe una búsqueda y una página válidas.');
  const response = await spotify.request('/search?' + new URLSearchParams({ q: query.trim(), type: 'track', limit: '10', offset: String(offset) }), { signal });
  return parseSearchResult(await response.json());
}
