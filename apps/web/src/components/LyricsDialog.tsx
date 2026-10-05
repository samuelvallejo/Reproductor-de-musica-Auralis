import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Music2 } from 'lucide-react';
import { LinkedSequence } from '@auralis/playlist-core';
import type { Track } from '@auralis/playlist-core';
import { useAudio } from '../lib/audio';
import { fetchLyrics, type LyricsLine, type TrackLyrics } from '../lib/lyrics';
import { library, useLibrary } from '../lib/library';
import { Modal } from './Modal';

type LyricsState = { status: 'loading' } | { status: 'ready'; lyrics: TrackLyrics } | { status: 'error'; message: string };

export function LyricsDialog({ onClose }: { onClose: () => void }) {
  const { active } = useLibrary();
  const { progress } = useAudio();
  const track: Track | null = library.active.currentNode?.value ?? null;
  const [state, setState] = useState<LyricsState>({ status: 'loading' });
  const currentLine = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (!track) { setState({ status: 'error', message: 'Selecciona una canción para buscar su letra.' }); return () => controller.abort(); }
    setState({ status: 'loading' });
    void fetchLyrics(track, controller.signal).then(lyrics => {
      if (!controller.signal.aborted) setState({ status: 'ready', lyrics });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : 'No pudimos buscar esta letra.' });
    });
    return () => controller.abort();
  }, [active.currentNodeId, track?.trackId]);

  const synced = state.status === 'ready' ? state.lyrics.synced : new LinkedSequence<LyricsLine>();
  let activeIndex = -1;
  synced.forEach((line, index) => { if (line.time <= progress) activeIndex = index; });
  useEffect(() => { currentLine.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [activeIndex]);

  return <Modal title="Letra de la canción" onClose={onClose} wide>
    <div className="modal-body lyrics-dialog">
      <div className="lyrics-track"><Music2 size={16} /><span><strong>{track?.title ?? 'Sin canción seleccionada'}</strong><small>{track?.artists.join(', ') ?? active.name}</small></span></div>
      {state.status === 'loading' && <div className="lyrics-status" role="status"><LoaderCircle className="spin" size={22} /> Buscando la letra…</div>}
      {state.status === 'error' && <div className="lyrics-status" role="status">{state.message}</div>}
      {state.status === 'ready' && state.lyrics.instrumental && <div className="lyrics-status">Esta canción es instrumental.</div>}
      {state.status === 'ready' && !state.lyrics.instrumental && !state.lyrics.synced.length && !state.lyrics.plain && <div className="lyrics-status">No encontramos una letra disponible para esta canción.</div>}
      {state.status === 'ready' && state.lyrics.synced.length > 0 && <div className="synced-lyrics" aria-label="Letra sincronizada">{state.lyrics.synced.map((line, index) => <p key={`${line.time}-${index}`} ref={index === activeIndex ? currentLine : undefined} className={index === activeIndex ? 'current-lyric' : ''}>{line.text}</p>)}</div>}
      {state.status === 'ready' && !state.lyrics.synced.length && state.lyrics.plain && <pre className="plain-lyrics">{state.lyrics.plain}</pre>}
      {state.status === 'ready' && <p className="lyrics-attribution">Letras proporcionadas por <a href="https://lrclib.net/" target="_blank" rel="noopener noreferrer">LRCLIB</a></p>}
    </div>
  </Modal>;
}
