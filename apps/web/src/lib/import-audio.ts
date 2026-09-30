import { parseBlob } from 'music-metadata';
import type { LocalTrack } from '@auralis/playlist-core';
import { saveAsset } from './storage';

export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export async function importMp3(file: File): Promise<LocalTrack> {
  if (!file.name.toLowerCase().endsWith('.mp3') || file.size === 0 || file.size > MAX_FILE_SIZE) throw new Error('Selecciona un archivo MP3 válido de hasta 50 MB.');
  const metadata = await parseBlob(file, { duration: true });
  if (!metadata.format.codec?.includes('MPEG') && !metadata.format.container?.includes('MPEG')) throw new Error('El archivo no contiene audio MP3 válido.');
  const duration = await getBrowserDuration(file);
  const assetId = crypto.randomUUID();
  const picture = metadata.common.picture?.[0];
  const cover = picture ? new Blob([new Uint8Array(picture.data)], { type: picture.format }) : null;
  await saveAsset(assetId, { audio: file, cover });
  return {
    source: 'local', trackId: assetId, assetId, title: metadata.common.title || file.name.replace(/\.mp3$/i, ''),
    artists: metadata.common.artists?.length ? metadata.common.artists : [metadata.common.artist || 'Artista desconocido'],
    coverUrl: null, durationMs: duration * 1000, album: metadata.common.album,
    year: metadata.common.year ? String(metadata.common.year) : undefined,
    fileName: file.name, fileSize: file.size, mimeType: 'audio/mpeg',
  };
}
function getBrowserDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(); const url = URL.createObjectURL(blob);
    const cleanup = () => { clearTimeout(timeout); audio.onloadedmetadata = audio.onerror = null; audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('El navegador no pudo leer este MP3.')); }, 15000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => { const duration = audio.duration; cleanup(); if (Number.isFinite(duration) && duration > 0) resolve(duration); else reject(new Error('El archivo no tiene una duración válida.')); };
    audio.onerror = () => { cleanup(); reject(new Error('No pudimos decodificar el MP3. Prueba con otro archivo.')); };
    audio.src = url;
  });
}
