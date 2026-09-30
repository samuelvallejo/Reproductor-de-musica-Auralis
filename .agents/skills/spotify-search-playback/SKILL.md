---
name: spotify-search-playback
description: Integrate Spotify search, PKCE and Web Playback SDK with the linked playlist. Use for authentication, refresh tokens, devices and mixed Spotify/MP3 playback.
---

# Spotify: búsqueda y reproducción Premium

Lee [la referencia](references/spotify.md) para OAuth/SDK y [el contrato](../../../docs/domain-contract.md) para nodos.

Usa PKCE S256 y state aleatorio de un solo uso, ligado al origen, con caducidad. Redirect URI exacta HTTPS o loopback 127.0.0.1, nunca localhost. No uses Client Secret ni Client Credentials. Retira el código de URL antes de recursos externos. Tokens en memoria; recargar exige reconectar. Verifier temporal en sessionStorage, borrado tras callback.

Renueva antes de caducar y tras un 401 una sola vez. Comparte refresh concurrente y conserva refresh token cuando Spotify omite sustituto. Maneja 429/Retry-After, debounce, cancelación y timeout. Normaliza título, artistas, portada, duración, URI y enlace y guarda esos metadatos en cada nodo, sin stream descargable.

Crea Spotify.Player con getOAuthToken renovable. Espera ready/device_id; distingue sesión de dispositivo. Maneja not_ready, initialization_error, authentication_error, account_error, playback_error y autoplay_failed. Activa activateElement desde el gesto antes de awaits. Autoplay denegado conserva dispositivo y solicita reproducir.

PUT /v1/me/player/play?device_id=... recibe URI del nodo, como cola de un elemento. Anterior/siguiente recorren enlaces propios y envían nueva URI; nextTrack/previousTrack recorrerían otra cola. Pausa/seek/volumen usan SDK. Estado/progreso proceden de eventos y getCurrentState. Serializa comandos e ignora cargas obsoletas. Fin avanza un nodo o repite; pasar a MP3 pausa SDK antes de HTMLAudioElement.

Spotify no expone PCM: decoración estática; Web Audio solo para MP3. Prueba PKCE/state, refresh, URI/device, controles, fin/autoplay y mezcla con fixtures explícitos. Confirma búsqueda y audio Premium real por separado antes de afirmar integración verificada.
