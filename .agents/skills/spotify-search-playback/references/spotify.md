# Referencias Spotify

Consultadas el 30 de septiembre de 2026:

- [PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Refresh](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens)
- [SDK y Premium](https://developer.spotify.com/documentation/web-playback-sdk/reference)
- [Reproducción URI/device](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback)
- [Búsqueda](https://developer.spotify.com/documentation/web-api/reference/search)
- [Redirect URI](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)
- [Development mode](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)

Backend /health informa configuración, no autorización; /api/spotify/config entrega clientId público. El navegador llama a Spotify con token de usuario. PKCE no usa secreto. Railway no guarda tokens ni MP3.
