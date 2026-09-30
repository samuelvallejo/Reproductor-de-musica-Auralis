import { useEffect, useState } from 'react';
import type { Track } from '@auralis/playlist-core';
import { loadAsset } from '../lib/storage';

export function Cover({ track, artwork = 0, className = '' }: { track?: Track | null; artwork?: number; className?: string }) {
  const [localCover, setLocalCover] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const assetId = track?.source === 'local' ? track.assetId : null;
  useEffect(() => {
    let active = true; let url: string | null = null;
    setLocalCover(null); setFailed(false);
    if (assetId) void loadAsset(assetId).then(asset => { if (active && asset?.cover) { url = URL.createObjectURL(asset.cover); setLocalCover(url); } }).catch(() => undefined);
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [assetId, track?.coverUrl]);
  const fallback = `/artwork/${['orbit-cover.png', 'dawn.svg', 'night.svg', 'coast.svg'][artwork % 4]}`;
  return <img className={`cover ${className}`} src={failed ? fallback : localCover || track?.coverUrl || fallback} alt={track ? `Portada de ${track.title}` : 'Paisaje imaginario de Auralis'} onError={() => setFailed(true)} loading="lazy" />;
}
