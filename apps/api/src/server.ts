import 'dotenv/config';
import { createApp } from './app.js';
import { LinkedSequence } from '@auralis/playlist-core';

const origins = new LinkedSequence<string>();
if (process.env.ALLOWED_ORIGINS !== undefined) {
  let value = '';
  for (const character of process.env.ALLOWED_ORIGINS + ',') {
    if (character === ',') { if (value.trim()) origins.append(value.trim()); value = ''; }
    else value += character;
  }
} else if (process.env.NODE_ENV !== 'production') {
  origins.append('http://127.0.0.1:5173').append('http://localhost:5173');
}
const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
const server = createApp(undefined, origins).listen(port, '0.0.0.0', () => { console.log(`Auralis API listening on port ${port}; music provider: Spotify PKCE`); });
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
