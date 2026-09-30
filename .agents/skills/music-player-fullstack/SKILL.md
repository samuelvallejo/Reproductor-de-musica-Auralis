---
name: music-player-fullstack
description: "Build or integrate the TypeScript music player workshop application with a doubly linked playlist, Spotify PKCE and Web Playback SDK, local MP3 audio, and separate frontend/backend hosting. Use for application-wide implementation work."
---

# Implementar el reproductor full stack

Lee el `AGENTS.md` del proyecto y [el contrato del dominio](../../../docs/domain-contract.md) para integrar capas. Si esta skill se usa fuera del paquete, conserva su alcance y adapta las rutas; no asumas que el repositorio ya contiene la aplicación.

## Arquitectura y ejecución

En un proyecto nuevo, organiza frontend, API y dominio como `apps/web`, `apps/api` y `packages/playlist-core`. Usa React/Vite, Express y TypeScript estricto como opciones iniciales. Los enlaces y el cursor viven en el dominio; el navegador ejecuta una instancia por playlist, mientras la API entrega Client ID público y el navegador normaliza resultados con token de usuario.

Implementa primero el recorrido completo con una canción local: seleccionar MP3, insertar un nodo, reproducir y navegar. Añade la búsqueda real y la normalización Spotify sin cambiar la estructura del dominio. Integra persistencia en IndexedDB y publicación de snapshots para la UI. Cada componente debe invocar acciones del controlador, nunca mutar nodos.

Expón `GET /health` y `GET /api/spotify/config`. Define una respuesta normalizada `{ tracks, offset, limit, total, hasMore }` y errores `{ error: { code, message, retryAfterSeconds? } }`. No expongas tokens de aplicación. Restringe tamaño de consulta y paginación antes de llamar al proveedor. El frontend utiliza `VITE_API_BASE_URL` como origen sin el sufijo `/api`.

No añadas una base de datos remota, registro de usuarios o subida de archivos como requisito del alcance inicial. La biblioteca local se conserva por navegador y origen; documenta esa limitación. PKCE y SDK viven en el navegador; el backend no guarda tokens ni playlists y no requiere Client Secret.

## Integración y verificación

Selecciona las skills específicas únicamente al trabajar en esa capa. El flujo de aceptación debe crear una playlist, buscar una canción real, insertarla en las tres modalidades, importar MP3, avanzar, retroceder, eliminar el actual y recargar conservando el orden y audio local.

Prueba el dominio con pruebas unitarias, API y adaptadores con respuestas controladas, y flujos del navegador con pruebas E2E. Un mock prueba el manejo del contrato, no demuestra acceso real a Spotify. Diferencia búsqueda real, audio real y navegación visual al informar el resultado.

La UI debe seguir las referencias Auralis desktop/móvil y soportar temas claro y oscuro; usa la skill de interfaz y el contrato visual antes de construir sus vistas. El cambio de tema no recrea el dominio ni interrumpe audio o selección.

Para preparar la entrega, registra comandos exactos, variables necesarias, pruebas, decisiones de diseño y URLs comprobadas. Si falta acceso externo, completa el código y las pruebas locales posibles y describe la dependencia pendiente. No cierres una construcción de aplicación entregando únicamente un plan.
