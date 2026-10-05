import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import path from 'node:path';

const sdkFixture = `
class Player {
  constructor(options) { this.options = options; this.listeners = {}; this.state = null; this.at = 0; this.activation = 0; window.fixturePlayer = this; }
  addListener(name, fn) { this.listeners[name] = fn; return true; }
  emit(name, value) { this.listeners[name]?.(value); }
  async connect() { this.options.getOAuthToken(() => {}); setTimeout(() => this.emit('ready', { device_id: 'fixture-device' }), 10); return true; }
  disconnect() { this.state = null; }
  async activateElement() { this.activation++; }
  async pause() { if (this.state) { this.state = await this.getCurrentState(); this.state.paused = true; this.emit('player_state_changed', this.state); } }
  async resume() { if (this.state) { this.state.paused = false; this.at = Date.now(); this.emit('player_state_changed', this.state); } }
  async seek(ms) { if (this.state) { this.state.position = ms; this.at = Date.now(); this.emit('player_state_changed', this.state); } }
  async setVolume(value) { this.volume = value; }
  async getCurrentState() { return this.state && { ...this.state, position: Math.min(32000, this.state.position + (this.state.paused ? 0 : Date.now() - this.at)) }; }
  start(uri, position) { this.state = { paused: false, position, duration: 32000, track_window: { current_track: { uri } } }; this.at = Date.now(); this.emit('player_state_changed', this.state); }
  finish() { this.state = { ...this.state, paused: true, position: 0 }; this.emit('player_state_changed', this.state); }
}
window.Spotify = { Player }; window.onSpotifyWebPlaybackSDKReady();
`;
interface FixturePlayer { activation: number; volume: number; seek(ms: number): Promise<void>; finish(): void; emit(event: string, value: unknown): void }
declare global { interface Window { fixturePlayer: FixturePlayer } }
async function prepare(page: Page) {
  const authorizations: URL[] = []; const exchanges: URLSearchParams[] = []; const plays: { uri: string; position: number; device: string | null }[] = [];
  await page.route('**/api/spotify/config', route => route.fulfill({ json: { clientId: 'a'.repeat(32) } }));
  await page.route('https://accounts.spotify.com/authorize?**', async route => {
    const url = new URL(route.request().url()); authorizations.push(url);
    const target = `${url.searchParams.get('redirect_uri')}?code=fixture-code&state=${url.searchParams.get('state')}`;
    await route.fulfill({ contentType: 'text/html', body: `<script>location.replace(${JSON.stringify(target)})</script>` });
  });
  await page.route('https://accounts.spotify.com/api/token', async route => {
    const body = new URLSearchParams(route.request().postData() || ''); exchanges.push(body);
    await route.fulfill({ json: { access_token: `fixture-access-${exchanges.length}`, ...(body.get('grant_type') === 'authorization_code' ? { refresh_token: 'fixture-refresh' } : {}), expires_in: 3600, token_type: 'Bearer' } });
  });
  await page.route('https://api.spotify.com/v1/me', route => route.fulfill({ json: { display_name: 'Fixture listener', product: 'premium' } }));
  await page.route('https://sdk.scdn.co/spotify-player.js', route => route.fulfill({ contentType: 'application/javascript', body: sdkFixture }));
  await page.route('https://api.spotify.com/v1/me/player/play?**', async route => {
    const body = route.request().postDataJSON(); const uri = body.uris[0] as string;
    plays.push({ uri, position: body.position_ms, device: new URL(route.request().url()).searchParams.get('device_id') });
    await page.evaluate(({ uri, position }) => (window.fixturePlayer as unknown as { start(uri: string, position: number): void }).start(uri, position), { uri, position: body.position_ms as number });
    await route.fulfill({ status: 204 });
  });
  await page.route('https://api.spotify.com/v1/search?**', route => route.fulfill({ json: { tracks: { items: [1, 2].map(index => ({ id: `fixture${index}`, uri: `spotify:track:fixture${index}`, name: `Spotify fixture ${index}`, artists: [{ name: 'Fixture artist' }], duration_ms: 32000, external_urls: { spotify: `https://open.spotify.com/track/fixture${index}` }, album: { name: 'Fixture album', images: [], release_date: '2026-01-01' } })), total: 2, offset: 0, limit: 10, next: null } } }));
  return { authorizations, exchanges, plays };
}
async function login(page: Page) {
  await page.goto('/'); await page.getByRole('button', { name: 'Conectar Spotify', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Spotify conectado', exact: true })).toBeVisible();
}
async function addSearchTrack(page: Page, index: number) {
  await page.getByLabel('Buscar canciones en Spotify').fill('fixture');
  await page.getByRole('button', { name: `Agregar Spotify fixture ${index}`, exact: true }).click();
  if (await page.getByLabel('Nombre de la playlist').isVisible()) {
    await page.getByLabel('Nombre de la playlist').fill('Spotify playlist');
    await page.getByRole('button', { name: 'Crear playlist', exact: true }).last().click();
  }
  const insertButton = page.getByRole('button', { name: 'Añadir a playlist', exact: true });
  if (await insertButton.isVisible()) await insertButton.click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  if (index === 2) {
    await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
    await expect(page.getByTestId('queue-list').locator('.track-text strong').first()).toHaveText('Spotify fixture 2');
    await page.getByRole('button', { name: 'Arrastrar Spotify fixture 2', exact: true }).press('ArrowDown');
  }
}

test('authorizes with verified PKCE, plays the node URI on Auralis and keeps local MP3 playback', async ({ page }) => {
  const fixture = await prepare(page); await login(page);
  const authorization = fixture.authorizations[0];
  const exchange = fixture.exchanges[0];
  if (!authorization || !exchange) throw new Error('Expected an authorization request and a token exchange.');
  const params = authorization.searchParams;
  const verifier = exchange.get('code_verifier');
  if (!verifier) throw new Error('Expected a PKCE code verifier in the token exchange.');
  expect(params.get('code_challenge_method')).toBe('S256');
  expect(params.get('code_challenge')).toBe(createHash('sha256').update(verifier).digest('base64url'));
  expect(params.get('redirect_uri')).toBe('http://127.0.0.1:5173/spotify/callback');
  for (const scope of ['streaming', 'user-read-private', 'user-read-email', 'user-modify-playback-state']) expect(params.get('scope')).toContain(scope);
  expect(exchange.get('client_secret')).toBeNull(); expect(page.url()).not.toContain('code=');
  await addSearchTrack(page, 1); await addSearchTrack(page, 2);
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  expect(fixture.plays[0]).toEqual({ uri: 'spotify:track:fixture1', position: 0, device: 'fixture-device' });
  const progress = page.getByRole('slider', { name: 'Progreso de reproducción', exact: true });
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(.2);
  await progress.focus(); await progress.press('ArrowRight');
  await page.getByRole('slider', { name: 'Volumen', exact: true }).press('Home');
  await expect.poll(() => page.evaluate(() => window.fixturePlayer.volume)).toBe(0);
  await page.getByRole('button', { name: 'Canción siguiente', exact: true }).click();
  await expect(page.getByTestId('current-title')).toHaveText('Spotify fixture 2');
  await expect.poll(() => fixture.plays.at(-1)?.uri).toBe('spotify:track:fixture2');
  await page.getByRole('button', { name: 'Canción anterior', exact: true }).click();
  await expect(page.getByTestId('current-title')).toHaveText('Spotify fixture 1');
  await expect.poll(() => fixture.plays.at(-1)?.uri).toBe('spotify:track:fixture1');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await page.getByRole('button', { name: 'Importar MP3', exact: true }).click();
  await page.getByLabel('Seleccionar archivos MP3').setInputFiles(path.resolve('apps/web/public/samples/orbit.mp3'));
  await expect(page.getByLabel('Seleccionar archivos MP3')).not.toBeVisible();
  const insertButton = page.getByRole('button', { name: 'Añadir a playlist', exact: true });
  if (await insertButton.isVisible()) await insertButton.click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Canción anterior', exact: true }).click();
  await expect(page.getByTestId('current-title')).toHaveText('Órbita');
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(.2);
  await page.getByRole('button', { name: 'Canción siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'Canción siguiente', exact: true }).click();
  await expect(page.getByTestId('current-title')).toHaveText('Spotify fixture 2');
  await expect.poll(() => fixture.plays.at(-1)?.uri).toBe('spotify:track:fixture2');
  await expect(page.locator('.sidebar-bottom')).toContainText('Tu biblioteca está guardada');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('fixture-access');
  await page.reload(); await expect(page.getByTestId('current-title')).toHaveText('Spotify fixture 2');
  await expect(page.getByRole('button', { name: 'Conectar Spotify para escuchar', exact: true })).toBeVisible();
});

test('refreshes once after 401 and retains a refresh token omitted by Spotify', async ({ page }) => {
  const fixture = await prepare(page); await login(page);
  let requests = 0;
  await page.route('https://api.spotify.com/v1/search?**', route => { requests++; return requests % 2 === 1 ? route.fulfill({ status: 401 }) : route.fulfill({ json: { tracks: { items: [], total: 0, offset: 0, limit: 10, next: null } } }); });
  await page.getByLabel('Buscar canciones en Spotify').fill('first');
  await expect(page.locator('.results-heading')).toContainText('0 canciones');
  await page.getByLabel('Buscar canciones en Spotify').fill('second');
  await expect(page.locator('.results-heading')).toContainText('second');
  expect(fixture.exchanges).toHaveLength(3);
  expect(fixture.exchanges.slice(1).map(body => body.get('refresh_token'))).toEqual(['fixture-refresh', 'fixture-refresh']);
});

test('handles autoplay denial without losing the device and advances exactly one node at the end', async ({ page }) => {
  const fixture = await prepare(page); await login(page); await addSearchTrack(page, 1); await addSearchTrack(page, 2);
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.evaluate(async () => { await (window.fixturePlayer as unknown as { pause(): Promise<void> }).pause(); window.fixturePlayer.emit('autoplay_failed', null); });
  await expect(page.getByRole('alert').first()).toContainText('Pulsa reproducir');
  await expect(page.getByRole('button', { name: 'Spotify conectado', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.evaluate(async () => { await window.fixturePlayer.seek(31900); window.fixturePlayer.finish(); window.fixturePlayer.finish(); });
  await expect(page.getByTestId('current-title')).toHaveText('Spotify fixture 2');
  await expect.poll(() => fixture.plays.at(-1)?.uri).toBe('spotify:track:fixture2');
  expect(fixture.plays.filter(play => play.uri === 'spotify:track:fixture2')).toHaveLength(1);
});

test('rejects a callback with mismatched state before exchanging its code', async ({ page }) => {
  let exchanges = 0;
  await page.route('https://accounts.spotify.com/api/token', route => { exchanges++; return route.fulfill({ status: 400 }); });
  await page.addInitScript(() => sessionStorage.setItem('auralis.spotify.pkce', JSON.stringify({ state: 'expected', verifier: 'a'.repeat(43), clientId: 'a'.repeat(32), redirectUri: 'http://127.0.0.1:5173/spotify/callback', created: Date.now() })));
  await page.goto('/spotify/callback?code=bad-code&state=wrong');
  await expect(page.getByRole('alert')).toContainText('no coincide');
  expect(exchanges).toBe(0); expect(page.url()).not.toContain('code=');
});

test('shows missing configuration and keeps MP3 import available', async ({ page }) => {
  await page.route('**/api/spotify/config', route => route.fulfill({ status: 503 }));
  await page.goto('/'); await page.getByRole('button', { name: 'Conectar Spotify', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('SPOTIFY_CLIENT_ID');
  await expect(page.getByRole('button', { name: 'Importa tu primera canción', exact: true })).toBeEnabled();
});
