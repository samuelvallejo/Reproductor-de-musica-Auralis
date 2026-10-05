import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { LinkedSet } from '@auralis/playlist-core';

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const scopes = 'streaming user-read-private user-read-email user-modify-playback-state user-read-playback-state';
const pendingKey = 'auralis.spotify.pkce';
const pendingSchema = z.object({ state: z.string(), verifier: z.string(), clientId: z.string(), redirectUri: z.url(), created: z.number() });
const tokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1).optional(), expires_in: z.number().positive(), token_type: z.string(), scope: z.string().optional() });
export interface SpotifyState { paused: boolean; position: number; duration: number; track_window: { current_track: { uri: string } } }
interface SpotifyPlayer {
  addListener(event: string, listener: (event: never) => void): boolean;
  connect(): Promise<boolean>; disconnect(): void; activateElement(): Promise<void>;
  pause(): Promise<void>; resume(): Promise<void>; seek(position: number): Promise<void>; setVolume(volume: number): Promise<void>;
  getCurrentState(): Promise<SpotifyState | null>;
}
declare global {
  interface Window {
    Spotify?: { Player: new (options: { name: string; volume: number; getOAuthToken: (callback: (token: string) => void) => void }) => SpotifyPlayer };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}
interface SessionView { authenticated: boolean; connecting: boolean; deviceId: string | null; displayName: string | null; error: string | null }
export class SpotifyError extends Error { constructor(message: string, readonly retryAfterSeconds?: number) { super(message); } }
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
function playbackFailure(event: unknown) {
  const parsed = z.object({ message: z.string() }).safeParse(event);
  const detail = parsed.success ? parsed.data.message.replace(/https?:\/\/\S+/g, '[URL]').replace(/Bearer\s+\S+/gi, '[token]').replace(/[A-Za-z0-9_-]{40,}/g, '[identifier]').slice(0, 240) : '';
  return `Spotify no pudo reproducir esta canción.${detail ? ` ${detail}` : ''} Si persiste, prueba Chrome o Edge con contenido protegido habilitado.`;
}
let sdkLoading: Promise<void> | null = null;
function loadSdk() {
  if (window.Spotify) return Promise.resolve();
  if (sdkLoading) return sdkLoading;
  sdkLoading = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new SpotifyError('El SDK no respondió. Usa Chrome o Edge y permite el contenido protegido.')), 20000);
    window.onSpotifyWebPlaybackSDKReady = () => { clearTimeout(timeout); resolve(); };
    const script = document.createElement('script'); script.src = 'https://sdk.scdn.co/spotify-player.js'; script.async = true;
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new SpotifyError('No pudimos cargar el reproductor de Spotify. Revisa la conexión o los bloqueadores.')); };
    document.head.append(script);
  }).catch(error => { sdkLoading = null; throw error; });
  return sdkLoading;
}
class SpotifySession {
  private view: SessionView = { authenticated: false, connecting: false, deviceId: null, displayName: null, error: null };
  private listeners = new LinkedSet<() => void>();
  private states = new LinkedSet<(state: SpotifyState | null) => void>();
  private token: { access: string; refresh: string; expires: number; clientId: string } | null = null;
  private refreshing: Promise<string> | null = null;
  private boot: Promise<void> | null = null;
  private player: SpotifyPlayer | null = null;
  private connecting: Promise<void> | null = null;
  private generation = 0;
  private commands: Promise<void> = Promise.resolve();
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  onState(listener: (state: SpotifyState | null) => void) { this.states.add(listener); return () => { this.states.delete(listener); }; }
  private update(change: Partial<SessionView>) { this.view = { ...this.view, ...change }; this.listeners.forEach(listener => listener()); }
  private async config() {
    const response = await fetch(`${apiBase}/api/spotify/config`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new SpotifyError('Configura SPOTIFY_CLIENT_ID en apps/api/.env y reinicia el servidor.');
    return z.object({ clientId: z.string().regex(/^[a-fA-F0-9]{32}$/) }).parse(await response.json());
  }
  async authorize() {
    try {
      this.update({ error: null });
      if (!window.isSecureContext) throw new SpotifyError('Spotify requiere HTTPS o la dirección local 127.0.0.1.');
      if (location.hostname === 'localhost') { location.assign(location.href.replace('localhost', '127.0.0.1')); return; }
      const { clientId } = await this.config();
      const verifier = random(); const state = random(); const redirectUri = `${location.origin}/spotify/callback`;
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      sessionStorage.setItem(pendingKey, JSON.stringify({ verifier, state, clientId, redirectUri, created: Date.now() }));
      const query = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, state, code_challenge_method: 'S256', code_challenge: base64url(new Uint8Array(digest)), scope: scopes });
      location.assign(`https://accounts.spotify.com/authorize?${query}`);
    } catch (error) { this.update({ error: error instanceof Error ? error.message : 'No pudimos iniciar sesión.' }); }
  }
  bootstrap() { return this.boot ??= this.callback(); }
  private async callback() {
    if (location.pathname !== '/spotify/callback') return;
    const query = new URLSearchParams(location.search);
    // Remove the authorization code before loading any SDK, images or external links.
    history.replaceState(null, '', '/');
    try {
      const raw = sessionStorage.getItem(pendingKey); sessionStorage.removeItem(pendingKey);
      const pending = pendingSchema.parse(JSON.parse(raw || 'null'));
      if (Date.now() - pending.created > 600000 || pending.created > Date.now() || query.get('state') !== pending.state || pending.redirectUri !== `${location.origin}/spotify/callback`) throw new SpotifyError('La autorización caducó o no coincide. Conecta Spotify de nuevo.');
      if (query.has('error')) throw new SpotifyError('No se concedieron los permisos de Spotify. Puedes volver a conectar.');
      const code = query.get('code'); if (!code) throw new SpotifyError('Spotify no devolvió un código de autorización.');
      this.update({ connecting: true, error: null });
      const data = await this.exchange(new URLSearchParams({ grant_type: 'authorization_code', client_id: pending.clientId, code, redirect_uri: pending.redirectUri, code_verifier: pending.verifier }));
      if (!data.refresh_token) throw new SpotifyError('Spotify no devolvió un token de renovación. Vuelve a conectar.');
      this.token = { access: data.access_token, refresh: data.refresh_token, expires: Date.now() + data.expires_in * 1000, clientId: pending.clientId };
      this.update({ authenticated: true });
      const profile = z.object({ display_name: z.string().nullable().optional(), product: z.string().optional() }).parse(await (await this.request('/me')).json());
      this.update({ displayName: profile.display_name || 'Tu cuenta Spotify' });
      if (profile.product && profile.product !== 'premium') throw new SpotifyError('La reproducción dentro de Auralis requiere Spotify Premium. Tus MP3 siguen disponibles.');
      await this.connect();
    } catch (error) { this.update({ connecting: false, error: error instanceof SpotifyError ? error.message : 'No pudimos completar la autorización de Spotify. Conecta de nuevo.' }); }
  }
  private async exchange(body: URLSearchParams) {
    let response: Response;
    try { response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', body, signal: AbortSignal.timeout(15000) }); }
    catch { throw new SpotifyError('No pudimos contactar con Spotify para autorizar la sesión.'); }
    if (!response.ok) throw new SpotifyError('La autorización de Spotify caducó o fue rechazada. Conecta de nuevo.');
    return tokenSchema.parse(await response.json());
  }
  async accessToken(force = false): Promise<string> {
    if (!this.token) throw new SpotifyError('Conecta Spotify para buscar y reproducir canciones.');
    if (this.refreshing) return this.refreshing;
    if (!force && this.token.expires - Date.now() > 60000) return this.token.access;
    const current = this.token;
    this.refreshing = this.exchange(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: current.refresh, client_id: current.clientId })).then(data => {
      if (this.token !== current) throw new SpotifyError('La sesión cambió. Conecta de nuevo.');
      this.token = { ...current, access: data.access_token, refresh: data.refresh_token || current.refresh, expires: Date.now() + data.expires_in * 1000 };
      return data.access_token;
    }).catch(error => { if (this.token === current) { this.disconnect(); this.update({ error: error instanceof Error ? error.message : 'La sesión caducó. Conecta de nuevo.' }); } throw error; }).finally(() => { this.refreshing = null; });
    return this.refreshing;
  }
  async request(path: string, options: RequestInit = {}) {
    const send = async (force: boolean) => {
      const headers = new Headers(options.headers); headers.set('Authorization', `Bearer ${await this.accessToken(force)}`);
      const timeout = AbortSignal.timeout(15000);
      return fetch(`https://api.spotify.com/v1${path}`, { ...options, headers, signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout });
    };
    let response = await send(false);
    if (response.status === 401) response = await send(true);
    if (!response.ok) {
      if (response.status === 401) { this.disconnect(); throw new SpotifyError('Tu sesión caducó. Conecta Spotify de nuevo.'); }
      if (response.status === 429) { const retry = Math.min(3600, Math.max(1, Number(response.headers.get('Retry-After')) || 60)); throw new SpotifyError(`Spotify pide esperar ${retry} segundos.`, retry); }
      if (response.status === 403) throw new SpotifyError('Spotify denegó el acceso. Comprueba Premium, los permisos y los usuarios autorizados de tu aplicación.');
      if (response.status === 404) { this.update({ deviceId: null }); throw new SpotifyError('El dispositivo Auralis no está disponible. Reconecta el reproductor de Spotify.'); }
      throw new SpotifyError('Spotify no pudo completar esta operación. Vuelve a intentarlo.');
    }
    return response;
  }
  connect() { return this.connecting ??= this.createPlayer().finally(() => { this.connecting = null; }); }
  private async createPlayer() {
    if (this.view.deviceId && this.player) return;
    this.update({ connecting: true, error: null });
    try {
      await this.accessToken(); await loadSdk();
      this.player?.disconnect();
      const player = new window.Spotify!.Player({ name: 'Auralis', volume: 0.75, getOAuthToken: callback => { void this.accessToken().then(callback).catch(() => { this.update({ error: 'La sesión caducó. Conecta Spotify de nuevo.' }); }); } });
      this.player = player;
      const ready = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new SpotifyError('Spotify no entregó un dispositivo. Reintenta y comprueba contenido protegido, Premium y permisos.')), 20000);
        const fail = (message: string) => { if (this.player !== player) return; clearTimeout(timeout); this.update({ connecting: false, deviceId: null, error: message }); this.states.forEach(listener => listener(null)); reject(new SpotifyError(message)); };
        player.addListener('ready', ({ device_id }: { device_id: string }) => { if (this.player !== player) return; clearTimeout(timeout); this.update({ deviceId: device_id, connecting: false, error: null }); resolve(); });
        player.addListener('not_ready', () => { if (this.player === player) { this.update({ deviceId: null, error: 'El dispositivo Auralis se desconectó. Pulsa reconectar.' }); this.states.forEach(listener => listener(null)); } });
        player.addListener('initialization_error', () => fail('Tu navegador no pudo iniciar Spotify. Usa Chrome o Edge y permite el contenido protegido.'));
        player.addListener('authentication_error', () => { fail('Spotify rechazó la sesión. Conecta Spotify de nuevo.'); this.token = null; this.update({ authenticated: false }); });
        player.addListener('account_error', () => fail('El Web Playback SDK requiere una cuenta Spotify Premium.'));
        player.addListener('playback_error', event => { this.update({ error: playbackFailure(event) }); this.states.forEach(listener => listener(null)); });
        player.addListener('autoplay_failed', () => { this.update({ error: 'Pulsa reproducir para activar el audio en este navegador.' }); this.states.forEach(listener => listener(null)); });
        player.addListener('player_state_changed', (state: SpotifyState | null) => { if (this.player === player) this.states.forEach(listener => listener(state)); });
        void player.connect().then(connected => { if (!connected) fail('No pudimos conectar el dispositivo Auralis. Reintenta.'); }).catch(() => fail('No pudimos conectar el dispositivo Auralis.'));
      });
      await ready;
    } catch (error) { this.player?.disconnect(); this.player = null; this.update({ connecting: false, deviceId: null, error: error instanceof Error ? error.message : 'No pudimos conectar el dispositivo.' }); throw error; }
  }
  activate() { void this.player?.activateElement().catch(() => { this.update({ error: 'Pulsa reproducir para activar el audio.' }); }); }
  private enqueue(command: () => Promise<void>) {
    const operation = this.commands.catch(() => {}).then(command); this.commands = operation.catch(() => {}); return operation;
  }
  play(uri: string, position: number, volume: number) {
    const generation = ++this.generation;
    return this.enqueue(async () => {
      if (generation !== this.generation) return;
      if (!this.player || !this.view.deviceId) throw new SpotifyError('Conecta el dispositivo Auralis antes de reproducir.');
      this.update({ error: null }); await this.player.setVolume(volume);
      if (generation !== this.generation) return;
      await this.request(`/me/player/play?device_id=${encodeURIComponent(this.view.deviceId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uris: [uri], position_ms: Math.round(position * 1000) }) });
    });
  }
  pause() { ++this.generation; return this.enqueue(async () => { await this.player?.pause(); }); }
  seek(seconds: number) { const generation = this.generation; return this.enqueue(async () => { if (generation === this.generation) await this.player?.seek(Math.round(seconds * 1000)); }); }
  volume(value: number) { return this.enqueue(async () => { await this.player?.setVolume(value); }); }
  getState() { return this.player?.getCurrentState() ?? Promise.resolve(null); }
  disconnect() {
    ++this.generation; this.player?.disconnect(); this.player = null; this.token = null;
    this.update({ authenticated: false, connecting: false, deviceId: null, displayName: null, error: null }); this.states.forEach(listener => listener(null));
  }
}
export const spotify = new SpotifySession();
export const useSpotify = () => useSyncExternalStore(spotify.subscribe, spotify.getSnapshot);
