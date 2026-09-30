import { useSyncExternalStore } from 'react';
import type { PlaybackStatus, Track } from '@auralis/playlist-core';
import { library } from './library';
import { loadAsset } from './storage';
import { spotify, type SpotifyState } from './spotify-session';

interface AudioView { status: PlaybackStatus; progress: number; duration: number; volume: number; repeat: boolean; error: string | null }
class AudioEngine {
  readonly element = new Audio();
  private view: AudioView = { status: 'idle', progress: 0, duration: 0, volume: 0.75, repeat: false, error: null };
  private listeners = new Set<() => void>();
  private selection = '';
  private version = 0;
  private track: Track | null = null;
  private localUrl: string | null = null;
  private autoplay = false;
  private loading: Promise<void> = Promise.resolve();
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sdkStarted = false;
  private endArmed = false;
  private lastState: { position: number; duration: number; at: number } | null = null;
  private polling = false;
  constructor() {
    this.element.volume = 0.75; this.element.preload = 'metadata';
    this.element.addEventListener('timeupdate', () => { if (this.track?.source === 'local') this.update({ progress: this.element.currentTime }); });
    this.element.addEventListener('durationchange', () => { if (this.track?.source === 'local') this.update({ duration: Number.isFinite(this.element.duration) ? this.element.duration : 0 }); });
    this.element.addEventListener('playing', () => { if (this.track?.source === 'local') { this.update({ status: 'playing', error: null }); library.recordPlayed(this.track); } });
    this.element.addEventListener('pause', () => { if (this.track?.source === 'local' && this.view.status === 'playing') this.update({ status: 'paused' }); });
    this.element.addEventListener('error', () => { if (this.track?.source === 'local' && this.element.getAttribute('src')) this.update({ status: 'error', error: 'No pudimos reproducir este audio. Vuelve a intentarlo.' }); });
    this.element.addEventListener('ended', () => { if (this.track?.source === 'local') this.ended(); });
    spotify.onState(state => this.sdkState(state));
    setInterval(() => {
      if (this.track?.source !== 'spotify' || !this.sdkStarted || this.polling) return;
      const version = this.version; this.polling = true;
      void spotify.getState().then(state => { if (version === this.version) this.sdkState(state); }).catch(() => {}).finally(() => { this.polling = false; });
    }, 500);
    library.subscribe(() => {
      const key = `${library.active.playlistId}:${library.active.currentNode?.nodeId ?? ''}`;
      if (key === this.selection) return;
      const shouldPlay = this.autoplay || this.view.status === 'playing';
      this.autoplay = false; this.selection = key;
      this.loading = this.load(library.active.currentNode?.value ?? null, shouldPlay);
    });
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(update: Partial<AudioView>) { this.view = { ...this.view, ...update }; this.listeners.forEach(listener => listener()); }
  private sdkState(state: SpotifyState | null) {
    if (this.track?.source !== 'spotify' || !this.sdkStarted) return;
    if (!state) {
      if (this.view.status === 'loading' && !spotify.getSnapshot().error) return;
      this.endArmed = false;
      this.update({ status: 'paused', error: spotify.getSnapshot().error || 'El dispositivo de Spotify no está activo. Reconecta y pulsa reproducir.' }); return;
    }
    const uri = state.track_window.current_track.uri;
    const previous = this.lastState;
    const finished = this.endArmed && previous && state.paused && state.position < 100 && previous.position + (Date.now() - previous.at) >= previous.duration - 1200;
    if (finished) { this.endArmed = false; this.sdkStarted = false; this.ended(); return; }
    if (uri !== this.track.spotifyUri) return;
    if (!state.paused) { this.endArmed = true; this.lastState = { position: state.position, duration: state.duration, at: Date.now() }; if (this.view.status !== 'playing') library.recordPlayed(this.track); }
    this.update({ status: state.paused ? 'paused' : 'playing', progress: state.position / 1000, duration: state.duration / 1000, error: state.paused ? this.view.error : null });
  }
  private ended() {
    if (this.view.repeat) { this.update({ progress: 0 }); this.element.currentTime = 0; void this.play(); return; }
    this.autoplay = true;
    if (!library.next()) { this.autoplay = false; this.update({ status: 'paused', progress: this.view.duration }); }
  }
  private async load(track: Track | null, shouldPlay: boolean) {
    const version = ++this.version;
    this.track = track; this.sdkStarted = false; this.endArmed = false; this.lastState = null;
    this.element.pause(); this.element.removeAttribute('src'); this.element.load();
    if (this.localUrl) { URL.revokeObjectURL(this.localUrl); this.localUrl = null; }
    this.update({ status: track ? 'loading' : 'idle', duration: (track?.durationMs ?? 0) / 1000, progress: 0, error: null });
    try {
      await spotify.pause();
      if (version !== this.version || !track) return;
      if (track.source === 'legacy') { this.update({ status: 'unavailable' }); return; }
      if (track.source === 'spotify') {
        this.update({ status: 'paused' }); if (shouldPlay) await this.play(); return;
      }
      const asset = await loadAsset(track.assetId);
      if (version !== this.version) return;
      if (!asset) throw new Error('El archivo local no está disponible en este navegador. Impórtalo de nuevo.');
      this.localUrl = URL.createObjectURL(asset.audio); this.element.src = this.localUrl;
      this.update({ status: 'paused' }); if (shouldPlay) await this.play();
    } catch (error) { if (version === this.version) this.update({ status: 'error', error: error instanceof Error ? error.message : 'No pudimos cargar el audio.' }); }
  }
  async play() {
    const version = this.version;
    if (this.track?.source === 'spotify') {
      try {
        if (!spotify.getSnapshot().deviceId) throw new Error('Conecta Spotify y espera al dispositivo Auralis antes de reproducir.');
        this.update({ status: 'loading', error: null });
        this.sdkStarted = true; this.endArmed = false; this.lastState = null;
        await spotify.play(this.track.spotifyUri, this.view.progress >= this.view.duration ? 0 : this.view.progress, this.view.volume);
        // The SDK state, rather than the HTTP 204 response, determines whether audio is playing.
        if (version === this.version && this.view.status === 'loading') this.update({ status: 'paused' });
      } catch (error) { if (version === this.version) { this.sdkStarted = false; this.update({ status: 'paused', error: error instanceof Error ? error.message : 'No pudimos reproducir con Spotify.' }); } }
      return;
    }
    if (!this.element.getAttribute('src')) return;
    try {
      if (!this.context) { this.context = new AudioContext(); this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 128; this.context.createMediaElementSource(this.element).connect(this.analyser); this.analyser.connect(this.context.destination); }
      await this.context.resume(); await this.element.play();
    } catch { if (version === this.version) this.update({ status: 'paused', error: 'Pulsa reproducir para activar el audio en este navegador.' }); }
  }
  async toggle() { spotify.activate(); await this.loading; if (this.view.status === 'playing') this.pause(); else await this.play(); }
  async selectAndPlay(nodeId: string) {
    spotify.activate();
    if (library.active.currentNode?.nodeId === nodeId) { await this.loading; if (this.view.status !== 'playing') await this.play(); return; }
    this.autoplay = true; library.select(nodeId); await this.loading; this.autoplay = false;
  }
  next() { spotify.activate(); this.autoplay = this.view.status === 'playing'; if (!library.next()) this.autoplay = false; }
  previous() { spotify.activate(); this.autoplay = this.view.status === 'playing'; if (!library.previous()) this.autoplay = false; }
  pause() {
    this.autoplay = false; this.endArmed = false;
    this.element.pause(); if (this.view.status === 'playing' || this.view.status === 'loading') this.update({ status: 'paused' });
    void spotify.pause().catch(() => { if (this.track?.source === 'spotify') this.update({ error: 'No pudimos pausar Spotify. Reconecta el dispositivo.' }); });
  }
  seek(seconds: number) {
    if (!Number.isFinite(seconds)) return;
    const value = Math.max(0, Math.min(seconds, this.view.duration));
    if (this.track?.source === 'spotify') {
      const version = this.version; this.endArmed = false;
      void spotify.seek(value).then(() => { if (version === this.version) this.update({ progress: value }); }).catch(() => { this.update({ error: 'No pudimos cambiar la posición en Spotify.' }); });
    } else if (this.element.getAttribute('src')) { this.element.currentTime = value; this.update({ progress: value }); }
  }
  setVolume(volume: number) {
    if (!Number.isFinite(volume)) return;
    const value = Math.max(0, Math.min(1, volume)); this.element.volume = value; this.update({ volume: value });
    if (this.track?.source === 'spotify') void spotify.volume(value).catch(() => { this.update({ error: 'No pudimos cambiar el volumen de Spotify.' }); });
  }
  toggleRepeat() { this.update({ repeat: !this.view.repeat }); }
  getAnalyser() { return this.track?.source === 'local' ? this.analyser : null; }
}
export const audio = new AudioEngine();
export const useAudio = () => useSyncExternalStore(audio.subscribe, audio.getSnapshot);
