# Auralis deployment

## Projects

- Vercel frontend: `auralis-music-player`.
- Firebase Hosting frontend: `auralis-music-player-20261002`.
- Supabase backend: `Auralis` (`opcnjsmhiqsrhtjrqjyq`, region `sa-east-1`).
- The Firebase and Vercel projects are separate from StreamGuard.

The Spotify configuration endpoint is the Supabase Edge Function `api` at
`https://opcnjsmhiqsrhtjrqjyq.supabase.co/functions/v1/api`. It returns only the
public Spotify Client ID required by Authorization Code with PKCE. The Spotify
Client Secret is not used or included in the frontend bundle.

The playlist and imported MP3 data remain in each user's browser storage. Auralis
does not upload local MP3 files or send private playlists to the shared database.

## Spotify OAuth setup

Add these exact callback URLs in the Spotify Developer Dashboard for the app:

- `https://auralis-music-player-omega.vercel.app/spotify/callback`
- `https://auralis-music-player-20261002.web.app/spotify/callback`

Keep any development callback already in use. Spotify requires exact redirect URI
matches. The production callbacks were verified to return the SPA entry page.

## Redeploy

From the repository root, build the web app with the public API base URL:

```powershell
$env:VITE_API_BASE_URL = "https://opcnjsmhiqsrhtjrqjyq.supabase.co/functions/v1/api"
npm ci
npm run typecheck
npm test
npm run build:web
npm exec --yes --package=vercel@latest -- vercel deploy --prod --yes
$env:VITE_API_BASE_URL = "https://opcnjsmhiqsrhtjrqjyq.supabase.co/functions/v1/api"
npm run build:web
$env:CI = "true"
firebase deploy --only hosting --project auralis-music-player-20261002
```

The Firebase CLI project selection is also pinned in `.firebaserc`. Do not change
it to a project named StreamGuard.
