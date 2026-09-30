# Verificación Spotify

30 de septiembre de 2026. Sustituye la verificación anterior Audius.

- TypeScript estricto, ESLint y builds de las tres capas comprobados.
- 17 unitarias: invariantes/cursor, 1200 operaciones, inserción/eliminación/duplicados/persistencia, migración Audius, configuración/CORS/rutas retiradas.
- 20 E2E desktop/móvil: MP3 reales con importación/seek/volumen/repeat/navegación/eliminación/recarga; PKCE S256, scopes, callback, state incorrecto, refresh tras 401 conservando token, URI/device, controles, mezcla MP3, autoplay y fin sin doble avance.
- Cinco capturas actuales, ambos temas desktop/móvil y tablet oscuro, sin errores JS. Sin overflow 320/375/768/1440.
- Servidor local configurado con Client ID público: health provider spotify/configured true; sin Client Secret.

Spotify usa SDK/HTTP simulados en las pruebas: verifica contratos, no audio real. MP3 sí se reproduce. La autorización manual PKCE se completó con la cuenta del usuario tras corregir la Redirect URI. El SDK emitió ready y Auralis mostró Spotify conectado. La búsqueda real basket case devolvió diez resultados de Spotify. La reproducción en el navegador integrado devolvió playback_error del SDK. El usuario confirmó posteriormente que Spotify sí se escucha en Chrome/Edge; esta verificación de audio procede de su prueba manual. Se añadió diagnóstico de error SDK y recomendación de Chrome/Edge con contenido protegido.

No hay despliegue público verificado. Recargar pide reconectar por tokens en memoria. Capturas muestran audio original de muestra.

Resultado final: autorización, device_id y búsqueda observados directamente por el agente; reproducción Spotify en Chrome/Edge confirmada por el usuario. El navegador integrado mantuvo Playback error y progreso cero. Usa Chrome/Edge para reproducir Spotify; los MP3 y las playlists conservan su funcionamiento.
