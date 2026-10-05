import { LinkedSequence, type Track } from '@auralis/playlist-core';

export interface LyricsLine { time: number; text: string }
export interface TrackLyrics { plain: string | null; synced: LinkedSequence<LyricsLine>; instrumental: boolean }

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function parseSyncedLyrics(source: string): LinkedSequence<LyricsLine> {
  const lines = new LinkedSequence<LyricsLine>();
  for (const line of source.split(/\r?\n/)) {
    const timestamps = new LinkedSequence<number>();
    const text = line.replace(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g, (_match, minutes: string, seconds: string, fraction = '0') => {
      const centiseconds = Number(fraction.padEnd(2, '0').slice(0, 3));
      timestamps.append(Number(minutes) * 60 + Number(seconds) + centiseconds / (fraction.length === 3 ? 1000 : 100));
      return '';
    }).trim();
    timestamps.forEach(time => { if (text) lines.append({ time, text }); });
  }
  return lines;
}

export async function fetchLyrics(track: Track, signal: AbortSignal): Promise<TrackLyrics> {
  const artist = track.artists.join(', ');
  const params = new URLSearchParams({ track_name: track.title, artist_name: artist });
  if (track.album) params.set('album_name', track.album);
  if (track.durationMs) params.set('duration', String(Math.round(track.durationMs / 1000)));
  const response = await fetch(`https://lrclib.net/api/get?${params}`, {
    signal,
    headers: { 'Lrclib-Client': 'Auralis/1.0.0 (https://auralis-music-player.vercel.app)' },
  });
  if (response.status === 404) return { plain: null, synced: new LinkedSequence(), instrumental: false };
  if (response.status === 429) throw new Error('La búsqueda de letras está limitada por un momento. Espera unos segundos y vuelve a intentarlo.');
  if (!response.ok) throw new Error('No pudimos consultar las letras. Comprueba tu conexión e inténtalo de nuevo.');
  const record = readRecord(await response.json());
  if (!record) throw new Error('La respuesta de letras no tiene un formato válido.');
  const plain = typeof record.plainLyrics === 'string' && record.plainLyrics.trim() ? record.plainLyrics : null;
  const synced = typeof record.syncedLyrics === 'string' ? parseSyncedLyrics(record.syncedLyrics) : new LinkedSequence<LyricsLine>();
  return { plain, synced, instrumental: record.instrumental === true };
}
