import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  // Read only the local API port; Spotify credentials never enter the client.
  const environment = loadEnv(mode, fileURLToPath(new URL('../api', import.meta.url)), 'PORT');
  const port = Number(environment.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
  const target = 'http://127.0.0.1:' + port;
  return { plugins: [react()], server: { port: 5173, strictPort: true, proxy: { '/api': target, '/health': target } } };
});
