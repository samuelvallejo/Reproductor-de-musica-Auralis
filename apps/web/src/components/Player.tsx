import { useEffect, useRef } from 'react';
import { Heart, Import, ListMusic, Pause, Play, Repeat, SkipBack, SkipForward, Volume2, VolumeX, ExternalLink, Music2, Mic2 } from 'lucide-react';
import { audio, useAudio } from '../lib/audio';
import { library, useLibrary } from '../lib/library';
import { spotify, useSpotify } from '../lib/spotify-session';
import { Cover } from './Cover';

export const formatTime = (seconds: number | null | undefined) => {
  if (seconds == null || !Number.isFinite(seconds)) return '—:—';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};
function Spectrum() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { status } = useAudio();
  const source = useLibrary().active.entries.find(entry => entry.nodeId === library.active.currentNode?.nodeId)?.track.source;
  const reactive = source === 'local' && status === 'playing';
  useEffect(() => {
    const element = canvas.current; const context = element?.getContext('2d'); if (!element || !context) return;
    let frame = 0;
    const data = new Uint8Array(64);
    const draw = () => {
      const width = element.width; const height = element.height;
      context.clearRect(0, 0, width, height);
      const gradient = context.createLinearGradient(0, 0, width, 0); gradient.addColorStop(0, '#4cdbdf'); gradient.addColorStop(0.5, '#b6b2f4'); gradient.addColorStop(1, '#efa6a6');
      context.fillStyle = gradient;
      if (reactive) audio.getAnalyser()?.getByteFrequencyData(data);
      for (let i = 0; i < 36; i++) {
        const amplitude = reactive ? (data[i] ?? 0) / 255 : 0.08;
        const barHeight = Math.max(3, amplitude * height * 0.94);
        context.beginPath(); context.roundRect(i * (width / 36), (height - barHeight) / 2, 3, barHeight, 2); context.fill();
      }
      if (reactive && !matchMedia('(prefers-reduced-motion: reduce)').matches) frame = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(frame);
  }, [status, reactive]);
  return <canvas ref={canvas} width={360} height={70} className="spectrum" role="img" aria-label={source === 'spotify' ? 'Decoración del reproductor Spotify' : status === 'playing' ? 'Visualización del audio que se está reproduciendo' : 'Visualización de audio en pausa'} />;
}

function Progress({ compact = false }: { compact?: boolean }) {
  const { duration, progress, status } = useAudio();
  const available = status !== 'idle' && status !== 'unavailable' && status !== 'error';
  return <div className={`progress ${compact ? 'progress-compact' : ''}`}>
    <span>{formatTime(progress)}</span>
    <input aria-label={compact ? 'Progreso de reproducción inferior' : 'Progreso de reproducción'} type="range" min="0" max={duration || 1} step="0.1" value={Math.min(progress, duration || 1)} disabled={!available} onChange={event => audio.seek(Number(event.target.value))} style={{ '--progress': `${duration ? progress / duration * 100 : 0}%` } as React.CSSProperties} />
    <span>{duration ? formatTime(duration) : '—:—'}</span>
  </div>;
}
export function Player({ onImport, onExplore, onQueue, onLyrics }: { onImport: () => void; onExplore: () => void; onQueue: () => void; onLyrics: () => void }) {
  const view = useLibrary(); const state = useAudio(); const session = useSpotify();
  const track = library.active.currentNode?.value;
  const playing = state.status === 'playing';
  const playable = Boolean(track && track.source !== 'legacy' && state.status !== 'loading' && (track.source !== 'spotify' || session.deviceId));
  const favorite = track && view.favorites.some(item => item.trackId === track.trackId);
  return <section className="player glass" aria-label="Reproductor principal">
    <div className="player-top">
      <div className="hero-art"><Cover track={track} artwork={view.active.artwork} /><span className="art-tag"><Music2 size={12} /> {track?.source === 'legacy' ? 'Catálogo anterior' : track?.source === 'spotify' ? 'Spotify' : track ? 'Tu biblioteca' : 'Tu próximo universo'}</span></div>
      <div className="track-detail">
        <div className="eyebrow"><span className={`status-dot ${playing ? 'is-playing' : ''}`} />{playing ? 'REPRODUCIENDO AHORA' : track ? 'LISTA PARA TI' : 'HECHO PARA ESCUCHAR'}</div>
        <h1 data-testid="current-title">{track?.title ?? 'Un mundo más tuyo.'}</h1>
        <p className="artist">{track?.artists.join(', ') ?? 'La banda sonora la eliges tú.'}</p>
        <div className="track-tags"><span>{track?.source === 'legacy' ? 'Catálogo anterior' : track?.source === 'spotify' ? 'Spotify' : track ? 'MP3 local' : 'Tu música'}</span>{track?.album && <span className="album-name">{track.album}</span>}{track?.year && <span>{track.year}</span>}<span className="quality-tag">{track ? formatTime((track.durationMs ?? 0) / 1000) : 'Sin límites'}</span></div>
        <p className="player-description">{track?.source === 'legacy' ? 'Esta entrada proviene del catálogo anterior y conserva sus metadatos. Busca una canción en Spotify para escucharla aquí.' : track?.source === 'spotify' ? 'Escucha dentro de Auralis con tu cuenta Spotify Premium.' : track ? `En ${view.active.name}. Hay lugares a los que solo llega una canción.` : 'Descubre una canción en Spotify o trae tus MP3. Haz de este espacio tu lugar favorito.'}</p>
        {!track && <button className="text-button" onClick={onImport}><Import size={15} /> Importa tu primera canción</button>}
        <Spectrum />
      </div>
    </div>
    <Progress />
    <div className="transport">
      <div className="transport-side transport-left">
        <button className="round-button side-control" onClick={onQueue} aria-label="Abrir cola de reproducción"><ListMusic size={22} /></button>
        <button className={`round-button side-control ${state.repeat ? 'active-control' : ''}`} aria-label="Repetir canción" aria-pressed={state.repeat} onClick={() => audio.toggleRepeat()}><Repeat size={21} /></button>
      </div>
      <div className="transport-center">
        <button className="transport-step" aria-label="Canción anterior" disabled={!library.active.currentNode?.previous} onClick={() => audio.previous()}><SkipBack size={29} fill="currentColor" /></button>
        <button className="play-button" aria-label={playing ? 'Pausar' : 'Reproducir'} disabled={!playable} onClick={() => void audio.toggle()}>{playing ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" />}</button>
        <button className="transport-step" aria-label="Canción siguiente" disabled={!library.active.currentNode?.next} onClick={() => audio.next()}><SkipForward size={29} fill="currentColor" /></button>
      </div>
      <div className="transport-side transport-right">
        <button className="round-button side-control lyrics-button" aria-label="Ver letra de la canción" title="Ver letra" disabled={!track} onClick={onLyrics}><Mic2 size={19} /></button>
        <div className="transport-volume-control">
          <button className="round-button side-control" aria-label={state.volume ? 'Silenciar' : 'Activar sonido'} aria-pressed={state.volume === 0} onClick={() => audio.setVolume(state.volume ? 0 : 0.75)}>
            {state.volume ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <input className="transport-volume-slider" aria-label="Volumen de reproducción" type="range" min="0" max="1" step="0.01" value={state.volume} onChange={event => audio.setVolume(Number(event.target.value))} />
        </div>
      </div>
    </div>
    <div className="mobile-volume"><Volume2 size={15} /><input aria-label="Volumen" type="range" min="0" max="1" step="0.01" value={state.volume} onChange={event => audio.setVolume(Number(event.target.value))} /><button className="icon-button lyrics-button" aria-label="Ver letra de la canción" title="Ver letra" disabled={!track} onClick={onLyrics}><Mic2 size={19} /></button></div>
    {track?.source === 'spotify' && !session.deviceId && <button className="outline-button" disabled={session.connecting} onClick={() => { audio.pause(); void library.flush().then(() => session.authenticated ? spotify.connect() : spotify.authorize()).catch(() => {}); }}>{session.connecting ? 'Conectando…' : 'Conectar Spotify para escuchar'}</button>}
    {state.error && <p className="audio-error" role="alert">{state.error}</p>}
    {track?.source === 'spotify' && <a className="provider-link" href={track.spotifyUrl} target="_blank" rel="noopener noreferrer">Ver canción y artista en Spotify <ExternalLink size={13} /></a>}
    {!track && <button className="empty-explore" onClick={onExplore}>O encuentra música en Spotify <ExternalLink size={12} /></button>}
    {track && <button className={`hero-favorite icon-button ${favorite ? 'is-favorite' : ''}`} aria-label={favorite ? 'Quitar canción de favoritos' : 'Guardar canción en favoritos'} onClick={() => library.toggleFavorite(track)}><Heart size={20} fill={favorite ? 'currentColor' : 'none'} /></button>}
  </section>;
}

export function BottomPlayer({ onQueue, onLyrics }: { onQueue: () => void; onLyrics: () => void }) {
  const view = useLibrary(); const state = useAudio(); const session = useSpotify(); const track = library.active.currentNode?.value;
  const favorite = track && view.favorites.some(item => item.trackId === track.trackId);
  return <footer className="bottom-player glass" aria-label="Barra de reproducción">
    <div className="bottom-track"><Cover track={track} artwork={view.active.artwork} /><div><strong>{track?.title ?? 'Tu música te espera'}</strong><span>{track?.artists.join(', ') ?? 'Auralis · Un mundo más tuyo'}</span></div>{track && <button className={`icon-button ${favorite ? 'is-favorite' : ''}`} aria-label="Favorito desde barra inferior" aria-pressed={Boolean(favorite)} onClick={() => library.toggleFavorite(track)}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></button>}</div>
    <button className="icon-button bottom-play" aria-label={state.status === 'playing' ? 'Pausar desde barra inferior' : 'Reproducir desde barra inferior'} disabled={!track || track.source === 'legacy' || state.status === 'loading' || (track.source === 'spotify' && !session.deviceId)} onClick={() => void audio.toggle()}>{state.status === 'playing' ? <Pause size={19} /> : <Play size={19} />}</button>
    <Progress compact />
    <div className="bottom-actions"><button className="icon-button" onClick={onQueue} aria-label="Mostrar cola"><ListMusic size={20} /></button><button className="icon-button lyrics-button" onClick={onLyrics} aria-label="Ver letra de la canción" title="Ver letra" disabled={!track}><Mic2 size={19} /></button><button className="icon-button" onClick={() => audio.setVolume(state.volume ? 0 : 0.75)} aria-label={state.volume ? 'Silenciar' : 'Activar sonido'}>{state.volume ? <Volume2 size={20} /> : <VolumeX size={20} />}</button><input aria-label="Volumen" type="range" min="0" max="1" step="0.01" value={state.volume} onChange={event => audio.setVolume(Number(event.target.value))} /></div>
  </footer>;
}
