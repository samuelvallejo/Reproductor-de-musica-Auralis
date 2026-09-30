import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

export function createApp(clientId = process.env.SPOTIFY_CLIENT_ID?.trim() || '', origins = ['http://127.0.0.1:5173', 'http://localhost:5173']) {
  const app = express();
  app.disable('x-powered-by'); app.set('trust proxy', 1); app.use(helmet());
  app.use(cors({ origin(origin, callback) { callback(null, !origin || origins.includes(origin)); } }));
  const configured = /^[a-fA-F0-9]{32}$/.test(clientId);
  app.get('/health', (_request, response) => { response.json({ status: 'ok', provider: 'spotify', configured }); });
  app.use('/api', rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }));
  // PKCE requires only this public identifier, never a Client Secret.
  app.get('/api/spotify/config', (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    if (!configured) { response.status(503).json({ error: { code: 'SPOTIFY_NOT_CONFIGURED', message: 'Añade SPOTIFY_CLIENT_ID en apps/api/.env para conectar Spotify.' } }); return; }
    response.json({ clientId });
  });
  app.use((_request, response) => { response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Este recurso no existe.' } }); });
  return app;
}
