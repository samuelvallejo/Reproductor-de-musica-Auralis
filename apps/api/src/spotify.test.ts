import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
describe('Spotify public configuration', () => {
  it('reports missing configuration without claiming an authenticated device', async () => {
    const app = createApp('');
    expect((await request(app).get('/health')).body).toEqual({ status: 'ok', provider: 'spotify', configured: false });
    expect((await request(app).get('/api/spotify/config')).status).toBe(503);
  });
  it('returns only the public identifier without caching', async () => {
    const result = await request(createApp('a'.repeat(32))).get('/api/spotify/config');
    expect(result.status).toBe(200); expect(result.body).toEqual({ clientId: 'a'.repeat(32) });
    expect(result.headers['cache-control']).toBe('no-store');
  });
  it('removes old provider endpoints', async () => {
    for (const route of ['/api/audius/search?q=test', '/api/spotify/search?q=test']) expect((await request(createApp('')).get(route)).status).toBe(404);
  });
  it('restricts CORS to configured frontend origins', async () => {
    const app = createApp('');
    expect((await request(app).get('/health').set('Origin', 'http://127.0.0.1:5173')).headers['access-control-allow-origin']).toBe('http://127.0.0.1:5173');
    expect((await request(app).get('/health').set('Origin', 'https://other.example')).headers['access-control-allow-origin']).toBeUndefined();
  });
});
