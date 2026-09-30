import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Compass, ExternalLink, Heart, Home, Info, Library, ListMusic, LoaderCircle, MoreHorizontal, Music2, Pencil, Plus, Search, Sparkles, SunMoon, Trash2, Upload, X } from 'lucide-react';
import { type PlaylistSnapshot, type Track, type SearchResponse } from '@auralis/playlist-core';
import { library, useLibrary } from './lib/library';
import { audio, useAudio } from './lib/audio';
import { importMp3 } from './lib/import-audio';
import { searchMusic, SearchError } from './lib/search';
import { spotify, useSpotify } from './lib/spotify-session';
import { useTheme } from './lib/theme';
import { Cover } from './components/Cover';
import { Modal } from './components/Modal';
import { BottomPlayer, formatTime, Player } from './components/Player';

type Tab = 'home' | 'explore' | 'library' | 'favorites';
type Dialog = { type: 'create' | 'rename' | 'delete' | 'queue' | 'inspector' | 'settings' | 'import' } | { type: 'insert'; tracks: Track[] };
const navigation = [{ id: 'home', label: 'Inicio', icon: Home }, { id: 'explore', label: 'Explorar', icon: Compass }, { id: 'library', label: 'Biblioteca', icon: Library }, { id: 'favorites', label: 'Favoritos', icon: Heart }] as const;

function TrackRow({ track, nodeId, position, active, onAdd, onRemove }: { track: Track; nodeId?: string; position?: number; active?: boolean; onAdd: (track: Track) => void; onRemove?: () => void }) {
  const { favorites } = useLibrary(); const { status } = useAudio();
  const favorite = favorites.some(item => item.trackId === track.trackId);
  return <div className={`track-row ${active ? 'selected' : ''}`} data-node-id={nodeId}>
    {position !== undefined && <span className="track-index">{String(position).padStart(2, '0')}</span>}
    <button className="track-select" aria-label={nodeId ? `Seleccionar ${track.title}` : `Agregar ${track.title}`} onClick={() => nodeId ? void audio.selectAndPlay(nodeId) : onAdd(track)}>
      <Cover track={track} artwork={position ? position % 4 : 0} />
      <span className="track-text"><strong>{track.title}</strong><small>{track.artists.join(', ')}</small><span className="source-label">{track.source === 'spotify' ? 'Spotify' : track.source === 'legacy' ? 'Catálogo anterior' : 'MP3 local'}</span></span>
    </button>
    {active && status === 'playing' ? <span className="playing-bars" aria-label="Reproduciendo"><i /><i /><i /></span> : <span className="track-duration">{formatTime(track.durationMs == null ? null : track.durationMs / 1000)}</span>}
    <button className={`icon-button row-heart ${favorite ? 'is-favorite' : ''}`} onClick={() => library.toggleFavorite(track)} aria-label={favorite ? `Quitar ${track.title} de favoritos` : `Guardar ${track.title} en favoritos`}><Heart size={16} fill={favorite ? 'currentColor' : 'none'} /></button>
    <details className="track-menu"><summary aria-label={`Opciones de ${track.title}`}><MoreHorizontal size={19} /></summary><div className="menu-popover">
      <button onClick={() => onAdd(track)}><Plus size={15} /> Añadir a playlist</button>
      {track.source === 'spotify' && <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Ver en Spotify</a>}
      {onRemove && <button className="danger-text" onClick={onRemove}><Trash2 size={15} /> Eliminar de esta lista</button>}
    </div></details>
  </div>;
}

function Queue({ onAdd, onImport, onInspect, onNotify }: { onAdd: (track: Track) => void; onImport: () => void; onInspect: () => void; onNotify: (message: string) => void }) {
  const { active } = useLibrary();
  return <section className="queue glass" aria-label="Cola de reproducción">
    <div className="queue-header"><h2>Cola de reproducción</h2><span>{active.entries.length}</span></div>
    <div className="queue-subhead"><span>{active.name}</span><button className="icon-button" aria-label="Ver estructura de lista doble" onClick={onInspect}><BookOpen size={17} /></button></div>
    <div className="queue-list" data-testid="queue-list">
      {active.entries.length ? active.entries.map((entry, index) => <TrackRow key={entry.nodeId} track={entry.track} nodeId={entry.nodeId} position={index + 1} active={entry.nodeId === active.currentNodeId} onAdd={onAdd} onRemove={() => { library.remove(entry.nodeId); onNotify('Canción eliminada de la playlist.'); }} />)
        : <div className="queue-empty"><div className="empty-orbit"><ListMusic size={28} /></div><h3>Un espacio para tus canciones</h3><p>Agrega un descubrimiento de Spotify o un MP3 que ya sea parte de ti.</p><button className="outline-button" onClick={onImport}><Plus size={16} /> Agregar música</button></div>}
    </div>
    <div className="queue-footer"><span><span className="tiny-dot" /> Lista doblemente enlazada</span><button className="text-button" onClick={onInspect}>Ver nodos <ArrowRight size={13} /></button></div>
  </section>;
}

function InsertForm({ tracks, onClose, onNotify }: { tracks: Track[]; onClose: () => void; onNotify: (message: string) => void }) {
  const view = useLibrary(); const [playlistId, setPlaylistId] = useState(view.active.playlistId);
  const [mode, setMode] = useState<'start' | 'end' | 'position'>('end'); const [position, setPosition] = useState(1); const [error, setError] = useState('');
  const target = view.playlists.find(item => item.playlistId === playlistId); const size = target?.entries.length ?? 0;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      const index = mode === 'start' ? 0 : mode === 'end' ? size : position - 1;
      if (!Number.isInteger(index) || index < 0 || index > size) throw new Error(`Elige una posición entre 1 y ${size + 1}.`);
      for (const [offset, track] of tracks.entries()) library.insert(track, index + offset, playlistId);
      onNotify(`${tracks.length === 1 ? 'Canción agregada' : `${tracks.length} canciones agregadas`} a ${target?.name}.`); onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No pudimos agregar la canción.'); }
  };
  return <form className="modal-body" onSubmit={submit}>
    <div className="insert-preview"><Cover track={tracks[0]} /><div><strong>{tracks.length === 1 ? tracks[0]?.title : `${tracks.length} canciones seleccionadas`}</strong><p>{tracks.length === 1 ? tracks[0]?.artists.join(', ') : 'Se agregarán en el orden seleccionado.'}</p></div></div>
    <label className="field-label">Playlist<select value={playlistId} onChange={event => setPlaylistId(event.target.value)}>{view.playlists.map(item => <option key={item.playlistId} value={item.playlistId}>{item.name} · {item.entries.length} canciones</option>)}</select></label>
    <fieldset className="insertion-options"><legend>¿Dónde quieres agregarla?</legend>{[{ value: 'start', label: 'Al inicio' }, { value: 'end', label: 'Al final' }, { value: 'position', label: 'En posición' }].map(option => <label key={option.value}><input type="radio" name="insertion-mode" value={option.value} checked={mode === option.value} onChange={() => setMode(option.value as typeof mode)} /><span>{option.label}</span></label>)}</fieldset>
    {mode === 'position' && <label className="field-label">Posición (1 a {size + 1})<input aria-label="Posición de inserción" type="number" min="1" max={size + 1} step="1" required value={position} onChange={event => setPosition(Number(event.target.value))} /></label>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button full-width" type="submit"><Plus size={17} /> Añadir a playlist</button>
  </form>;
}

function PlaylistNameForm({ rename = false, onClose, onNotify }: { rename?: boolean; onClose: () => void; onNotify: (message: string) => void }) {
  const [name, setName] = useState(rename ? library.active.name : ''); const [error, setError] = useState('');
  return <form className="modal-body" onSubmit={event => { event.preventDefault(); try { if (rename) library.rename(name); else { audio.pause(); library.create(name); } onNotify(rename ? 'Nombre actualizado.' : 'Tu nueva playlist está lista.'); onClose(); } catch (failure) { setError((failure as Error).message); } }}>
    <p className="muted">Dale un nombre a ese lugar al que siempre quieres volver.</p><label className="field-label">Nombre de la playlist<input autoFocus maxLength={80} required value={name} onChange={event => setName(event.target.value)} placeholder="Por ejemplo, Noches de lluvia" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full-width">{rename ? 'Guardar nombre' : 'Crear playlist'}</button>
  </form>;
}

export function App() {
  const view = useLibrary();
  const [tab, setTab] = useState<Tab>('home'); const [dialog, setDialog] = useState<Dialog | null>(null);
  const [theme, setTheme] = useTheme(); const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null); const [offset, setOffset] = useState(0);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle'); const [searchError, setSearchError] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0); const [retryVersion, setRetryVersion] = useState(0);
  const [busy, setBusy] = useState(false); const [importError, setImportError] = useState('');
  const [notice, setNotice] = useState(''); const session = useSpotify();
  const connectSpotify = async () => { audio.pause(); await library.flush(); if (session.authenticated && !session.deviceId) { await spotify.connect().catch(() => {}); } else { await spotify.authorize(); } };
  const importInput = useRef<HTMLInputElement>(null); const cards = useRef<HTMLDivElement>(null);
  useEffect(() => { void spotify.bootstrap(); }, []);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timeout); }, [notice]);
  useEffect(() => {
    const controller = new AbortController();
    if (!query.trim()) { setSearchState('idle'); setResult(null); return () => controller.abort(); }
    setSearchState('loading'); setSearchError('');
    const timeout = setTimeout(() => {
      if (Date.now() < cooldownUntil) { setSearchState('error'); setSearchError(`Espera ${Math.ceil((cooldownUntil - Date.now()) / 1000)} segundos antes de otra búsqueda.`); return; }
      void searchMusic(query.trim(), offset, controller.signal).then(response => {
        if (!controller.signal.aborted) { setResult(response); setSearchState('ready'); }
      }).catch(error => {
        if (controller.signal.aborted) return;
        setSearchState('error'); setResult(null);
        setSearchError(error instanceof Error ? error.message : 'No pudimos buscar esta canción.');
        if (error instanceof SearchError && error.retryAfterSeconds) setCooldownUntil(Date.now() + error.retryAfterSeconds * 1000);
      });
    }, 400);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [query, offset, retryVersion, cooldownUntil, session.authenticated]);
  const add = (track: Track) => setDialog({ type: 'insert', tracks: [track] });
  const openImport = () => { setImportError(''); setDialog({ type: 'import' }); };
  const switchPlaylist = (playlist: PlaylistSnapshot) => { audio.pause(); library.setActive(playlist.playlistId); setTab('home'); };
  const processFiles = async (files: FileList | File[]) => {
    setBusy(true); setImportError(''); const tracks: Track[] = []; const failures: string[] = [];
    for (const file of Array.from(files)) {
      try { const track = await importMp3(file); library.register(track); tracks.push(track); }
      catch (error) { failures.push(`${file.name}: ${error instanceof Error ? error.message : 'No pudimos importar el archivo.'}`); }
    }
    setBusy(false);
    if (tracks.length) { if (failures.length) setNotice(failures.join(' ')); setDialog({ type: 'insert', tracks }); }
    else setImportError(failures.join(' '));
  };
  const addSample = async () => {
    setBusy(true);
    try {
      for (const name of ['orbit', 'liquid-light', 'blue-hour']) {
        const response = await fetch(`/samples/${name}.mp3`); if (!response.ok) throw new Error('No pudimos cargar el audio de muestra.');
        const track = await importMp3(new File([await response.blob()], `${name}.mp3`, { type: 'audio/mpeg' }));
        library.insert(track, library.active.list.size);
      }
      setNotice('Sesión de muestra añadida: tres MP3 originales de Auralis. Pulsa reproducir para escucharlos.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'No pudimos cargar la sesión.'); }
    finally { setBusy(false); }
  };
  const queue = <Queue onAdd={add} onImport={openImport} onInspect={() => setDialog({ type: 'inspector' })} onNotify={setNotice} />;
  const trackCollection = tab === 'favorites' ? view.favorites : view.catalog;

  return <div className="app-shell" data-tab={tab}>
    <aside className="sidebar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); setTab('home'); }}>Auralis<span>MÚSICA PARA<br />UN MUNDO MÁS TUYO</span></a>
      <nav aria-label="Navegación principal">{navigation.map(item => <button key={item.id} className={`nav-item ${tab === item.id ? 'current' : ''}`} onClick={() => setTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}><item.icon size={23} strokeWidth={1.5} fill={tab === item.id && item.id === 'home' ? 'currentColor' : 'none'} />{item.label}</button>)}</nav>
      <div className="sidebar-heading"><span>PLAYLISTS</span><button className="icon-button" aria-label="Crear playlist" onClick={() => setDialog({ type: 'create' })}><Plus size={17} /></button></div>
      <div className="sidebar-playlists">{view.playlists.map(playlist => <button key={playlist.playlistId} className={`sidebar-playlist ${playlist.playlistId === view.active.playlistId ? 'chosen' : ''}`} onClick={() => switchPlaylist(playlist)}><Cover track={playlist.entries[0]?.track} artwork={playlist.artwork} /><span>{playlist.name}<small>{playlist.entries.length} {playlist.entries.length === 1 ? 'canción' : 'canciones'}</small></span></button>)}</div>
      <button className="sidebar-promo" onClick={openImport}><span>La música<br />también es<br />un lugar.</span><span className="promo-arrow"><ArrowRight size={18} /></span></button>
      <div className="sidebar-bottom"><span className={`tiny-dot ${view.saveStatus === 'error' ? 'warning' : ''}`} />{view.saveStatus === 'saved' ? 'Tu biblioteca está guardada' : view.saveStatus === 'saving' ? 'Guardando tu música…' : 'Guardado pendiente'}</div>
    </aside>
    <main className="main-content">
      <header className="topbar">
        <a className="mobile-brand" href="#" onClick={event => { event.preventDefault(); setTab('home'); }}>Auralis<span>MÚSICA PARA UN MUNDO MÁS TUYO</span></a>
        <div className="searchbox"><Search size={20} strokeWidth={1.6} /><input aria-label="Buscar canciones en Spotify" placeholder="Buscar canciones, artistas, álbumes…" maxLength={200} value={query} onChange={event => { setQuery(event.target.value); setOffset(0); if (event.target.value) setTab('explore'); }} />{query && <button className="icon-button" aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><X size={16} /></button>}<span className="search-provider">Spotify</span></div>
        <div className="topbar-actions"><button className="outline-button spotify-connect" disabled={session.connecting} onClick={() => session.deviceId ? setDialog({ type: 'settings' }) : void connectSpotify()}>{session.connecting ? 'Conectando…' : session.deviceId ? 'Spotify conectado' : session.authenticated ? 'Reconectar Spotify' : 'Conectar Spotify'}</button><label className="theme-picker" title="Tema de la aplicación"><SunMoon size={20} /><select aria-label="Tema de la aplicación" value={theme} onChange={event => setTheme(event.target.value as typeof theme)}><option value="system">Sistema</option><option value="dark">Oscuro</option><option value="light">Claro</option></select></label><button className="profile-button" aria-label="Información y conexión Spotify" onClick={() => setDialog({ type: 'settings' })}><img src="/artwork/orbit-cover.png" alt="" /><span>Tu espacio<small>Música sin límites</small></span><ChevronRight size={15} /></button></div>
      </header>
      {session.error && <div className="storage-alert" role="alert"><Info size={18} /><span>{session.error}</span><button className="text-button" onClick={() => void connectSpotify()}>Reconectar</button></div>}
      {view.error && <div className="storage-alert" role="alert"><Info size={18} /><span>{view.error}</span><button className="text-button" onClick={() => void library.flush()}>Reintentar</button></div>}
      {!view.ready ? <div className="loading-library"><LoaderCircle className="spin" /> Abriendo tu universo…</div> : <>
        {tab === 'home' ? <>
          <div className="hero-grid"><Player onImport={openImport} onExplore={() => setTab('explore')} onQueue={() => setDialog({ type: 'queue' })} /><div className="desktop-queue">{queue}</div></div>
          <section className="playlist-section" aria-label="Tus playlists"><div className="section-heading"><h2>Playlists para ti <ChevronRight size={20} /></h2><div className="section-actions"><button className="text-button mobile-only" onClick={() => setTab('library')}>Ver todo</button><button className="icon-button desktop-only" aria-label="Playlists anteriores" onClick={() => cards.current?.scrollBy({ left: -300, behavior: 'smooth' })}><ArrowLeft size={18} /></button><button className="icon-button desktop-only" aria-label="Playlists siguientes" onClick={() => cards.current?.scrollBy({ left: 300, behavior: 'smooth' })}><ArrowRight size={18} /></button><button className="icon-button" aria-label="Nueva playlist" onClick={() => setDialog({ type: 'create' })}><Plus size={19} /></button></div></div>
            <div className="playlist-cards" ref={cards}>{view.playlists.map(playlist => <button key={playlist.playlistId} className={`playlist-card ${playlist.playlistId === view.active.playlistId ? 'active-card' : ''}`} onClick={() => switchPlaylist(playlist)}><Cover artwork={playlist.artwork} /><span className="card-shade" /><span className="card-content"><strong>{playlist.name}</strong><small>{playlist.entries.length} canciones · Tu playlist</small></span><span className="card-play"><ChevronRight size={20} /></span></button>)}</div>
          </section>
          <section className="recent-section"><div className="section-heading"><h2>{view.history.length ? 'Escuchado recientemente' : 'Tu primera sesión'} <Sparkles size={18} /></h2>{view.history.length > 0 && <button className="text-button" onClick={() => setTab('library')}>Ver biblioteca <ChevronRight size={15} /></button>}</div>
            {view.history.length ? <div className="collection-list glass">{view.history.slice(0, 5).map(track => <TrackRow key={track.trackId} track={track} onAdd={add} />)}</div> : <div className="welcome-session glass"><div className="session-icon"><Music2 size={25} /></div><div><h3>Escucha cómo se siente Auralis.</h3><p>Prueba tres paisajes sonoros originales o empieza con tus propios MP3.</p><small>Audio de muestra · Compuesto para esta aplicación</small></div><button className="outline-button" disabled={busy} onClick={() => void addSample()}>{busy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />} Probar sesión</button></div>}
          </section>
        </> : tab === 'explore' ? <section className="content-section">
          <div className="page-heading"><div><span className="eyebrow">NUEVOS SONIDOS, NUEVOS LUGARES</span><h1>Encuentra tu próxima canción.</h1><p>Busca en Spotify y dale un lugar en tu playlist.</p></div><span className="provider-badge"><span className="tiny-dot" /> Spotify</span></div>
          {!query.trim() && <div className="explore-empty glass"><Compass size={42} /><h2>¿Qué te apetece escuchar?</h2><p>Escribe una canción o un artista en la búsqueda de arriba.</p><button className="outline-button" onClick={openImport}><Upload size={17} /> También puedes traer tus MP3</button></div>}
          {searchState === 'loading' && <div className="search-status" role="status"><LoaderCircle className="spin" size={22} /> Buscando en Spotify…</div>}
          {!session.authenticated && <div className="welcome-session glass"><div><h3>Conecta tu cuenta Spotify.</h3><p>Autoriza la búsqueda y el reproductor Auralis. La reproducción requiere Premium.</p></div><button className="primary-button" disabled={session.connecting} onClick={() => void connectSpotify()}>Conectar Spotify para buscar</button></div>}
          {searchState === 'error' && <div className="error-panel glass" role="alert"><Info size={29} /><h2>La búsqueda necesita un momento.</h2><p>{searchError}</p><div className="button-group"><button className="outline-button" onClick={() => setRetryVersion(value => value + 1)}>Intentar de nuevo</button><button className="primary-button" onClick={openImport}><Upload size={16} /> Importar MP3</button></div></div>}
          {searchState === 'ready' && result && <><div className="results-heading"><span>{result.tracks.length} canciones en esta página para “{query.trim()}”</span><small>Reproducción con Spotify Premium</small></div><div className="collection-list glass">{result.tracks.length ? result.tracks.map(track => <TrackRow key={track.trackId} track={track} onAdd={add} />) : <div className="empty-state">No encontramos canciones en esta página. Prueba otra búsqueda o avanza de página.</div>}</div><div className="pagination"><button className="outline-button" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 10))}><ArrowLeft size={16} /> Anterior</button><span>Página {Math.floor(offset / 10) + 1}</span><button className="outline-button" disabled={!result.hasMore} onClick={() => setOffset(value => Math.min(1000, value + 10))}>Siguiente <ArrowRight size={16} /></button></div><p className="catalog-note">Añade canciones a tu playlist y escúchalas con tu cuenta Spotify Premium. Los botones anterior y siguiente recorren los nodos de tu lista.</p></>}
        </section> : <section className="content-section">
          <div className="page-heading"><div><span className="eyebrow">{tab === 'favorites' ? 'ESAS CANCIONES QUE SE QUEDAN' : 'UN LUGAR PARA TODO LO QUE SUENA'}</span><h1>{tab === 'favorites' ? 'Tus favoritos.' : 'Tu biblioteca.'}</h1><p>{tab === 'favorites' ? 'Guarda lo que te mueve. Vuelve cuando quieras.' : 'Tu música, tus listas, a tu manera.'}</p></div><button className="primary-button" onClick={openImport}><Upload size={17} /> Importar MP3</button></div>
          {tab === 'library' && <><div className="library-toolbar"><label className="field-label inline-field">Playlist activa<select aria-label="Playlist activa" value={view.active.playlistId} onChange={event => { audio.pause(); library.setActive(event.target.value); }}>{view.playlists.map(item => <option key={item.playlistId} value={item.playlistId}>{item.name}</option>)}</select></label><div className="button-group"><button className="outline-button" onClick={() => setDialog({ type: 'create' })}><Plus size={15} /> Crear</button><button className="icon-button" onClick={() => setDialog({ type: 'rename' })} aria-label="Renombrar playlist"><Pencil size={17} /></button><button className="icon-button" onClick={() => setDialog({ type: 'delete' })} aria-label="Eliminar playlist"><Trash2 size={17} /></button></div></div><div className="library-queue">{queue}</div><div className="section-heading"><h2>Canciones de tu biblioteca</h2><span className="muted">{view.catalog.length}</span></div></>}
          <div className="collection-list glass">{trackCollection.length ? trackCollection.map(track => <TrackRow key={track.trackId} track={track} onAdd={add} />) : <div className="empty-state"><Heart size={30} /><h3>{tab === 'favorites' ? 'Tu próxima favorita está por llegar.' : 'Aquí empieza tu colección.'}</h3><p>{tab === 'favorites' ? 'Pulsa el corazón de una canción para guardarla aquí.' : 'Importa un MP3 o agrega una canción de Spotify.'}</p></div>}</div>
        </section>}
      </>}
    </main>
    <BottomPlayer onQueue={() => setDialog({ type: 'queue' })} />
    <nav className="mobile-nav glass" aria-label="Navegación móvil">{navigation.map(item => <button key={item.id} className={tab === item.id ? 'current' : ''} onClick={() => setTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}><item.icon size={25} strokeWidth={1.5} fill={tab === item.id && item.id === 'home' ? 'currentColor' : 'none'} /><span>{item.label}</span></button>)}</nav>
    {notice && <div className="toast" role="status"><Check size={18} /><span>{notice}</span><button className="icon-button" aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={15} /></button></div>}
    {dialog && <Modal title={{ create: 'Un nuevo lugar para tu música', rename: 'Renombrar playlist', delete: 'Eliminar playlist', queue: 'Tu cola de reproducción', inspector: 'Así se enlaza tu música', settings: 'Tu espacio Auralis', import: 'Trae tu música', insert: 'Dale un lugar a esta canción' }[dialog.type]} onClose={() => { if (!busy) setDialog(null); }} wide={dialog.type === 'inspector' || dialog.type === 'queue'}>
      {dialog.type === 'insert' && <InsertForm tracks={dialog.tracks} onClose={() => setDialog(null)} onNotify={setNotice} />}
      {(dialog.type === 'create' || dialog.type === 'rename') && <PlaylistNameForm rename={dialog.type === 'rename'} onClose={() => setDialog(null)} onNotify={setNotice} />}
      {dialog.type === 'queue' && <div className="modal-body modal-queue">{queue}</div>}
      {dialog.type === 'delete' && <div className="modal-body"><p>Se eliminará la playlist <strong>{view.active.name}</strong>. Tus archivos seguirán en la biblioteca.</p><button className="danger-button full-width" onClick={() => { try { audio.pause(); library.deletePlaylist(); setDialog(null); setNotice('Playlist eliminada.'); } catch (error) { setNotice((error as Error).message); } }}>Eliminar esta playlist</button></div>}
      {dialog.type === 'import' && <div className="modal-body"><p className="muted">Esos archivos que ya son parte de ti, ahora juntos. Permanecen en este navegador.</p><input ref={importInput} className="file-input" aria-label="Seleccionar archivos MP3" type="file" accept=".mp3,audio/mpeg" multiple disabled={busy} onChange={event => { if (event.target.files) void processFiles(event.target.files); }} /><button className="drop-zone" disabled={busy} onClick={() => importInput.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy) void processFiles(event.dataTransfer.files); }}>{busy ? <LoaderCircle className="spin" size={35} /> : <ArrowDownToLine size={35} />}<strong>{busy ? 'Preparando tu música…' : 'Selecciona o arrastra tus MP3'}</strong><span>Hasta 50 MB por archivo · Puedes elegir varios</span></button>{importError && <p className="form-error" role="alert">{importError}</p>}<p className="local-note"><Check size={15} /> Se conservan título, artista y portada si el archivo los incluye.</p></div>}
      {dialog.type === 'inspector' && <div className="modal-body"><p className="muted">La playlist es una lista doblemente enlazada. Avanzar sigue <code>next</code>; retroceder sigue <code>previous</code>. Cada aparición tiene su propio nodo.</p><div className="node-chain"><span className="null-node">null</span>{Array.from(library.active.list, node => <div className="node-pair" key={node.nodeId}><span className="node-arrow">⇄</span><div className={`node-card ${node === library.active.currentNode ? 'current-node' : ''}`}><strong>{node.value.title}</strong><code>{node.nodeId.slice(0, 8)}</code><small>previous: {node.previous?.nodeId.slice(0, 8) ?? 'null'}</small><small>next: {node.next?.nodeId.slice(0, 8) ?? 'null'}</small>{node === library.active.currentNode && <span>← nodo actual</span>}</div></div>)}<span className="node-arrow">⇄</span><span className="null-node">null</span></div><div className="complexity-grid"><span><strong>O(1)</strong>Inicio / final</span><span><strong>O(1)</strong>Anterior / siguiente</span><span><strong>O(n)</strong>Posición interior</span><span><strong>{view.active.entries.length}</strong>Nodos enlazados</span></div><p className="catalog-note">Los extremos son nulos. La estructura es lineal, con enlaces recíprocos. La eliminación por ID utiliza un índice Map y cuesta O(1).</p></div>}
      {dialog.type === 'settings' && <div className="modal-body"><div className="about-brand">Auralis <Sparkles size={23} /></div><p>Conecta Spotify Premium para escuchar dentro de Auralis, reúne tus MP3 y crea tus playlists.</p><div className="connection-status"><span className={`tiny-dot ${session.deviceId ? '' : 'warning'}`} /><strong>{session.deviceId ? `Dispositivo Auralis listo · ${session.displayName}` : session.authenticated ? 'Sesión autorizada · dispositivo no disponible' : 'Spotify sin conectar'}</strong></div><p className="muted">La sesión de Spotify se mantiene mientras esta pestaña está abierta. Al recargar, conecta de nuevo. Tus playlists y MP3 se conservan.</p>{session.error && <p className="form-error">{session.error}</p>}<button className="primary-button full-width" disabled={session.connecting} onClick={() => { if (session.deviceId) { audio.pause(); spotify.disconnect(); } else void connectSpotify(); }}>{session.deviceId ? 'Desconectar Spotify' : session.connecting ? 'Conectando…' : 'Conectar Spotify'}</button><label className="field-label">Apariencia<select value={theme} onChange={event => setTheme(event.target.value as typeof theme)}><option value="system">Seguir el sistema</option><option value="dark">Modo oscuro</option><option value="light">Modo claro</option></select></label><p className="local-note"><Info size={16} /> Tus MP3 permanecen en este navegador. Los tokens de Spotify no se guardan en tu biblioteca.</p><button className="outline-button full-width" onClick={() => setDialog({ type: 'inspector' })}><BookOpen size={16} /> Ver la estructura del taller</button></div>}
    </Modal>}
  </div>;
}
