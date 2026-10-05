# Auralis

Reproductor full stack TypeScript con lista doblemente enlazada, diseño Auralis desktop/móvil, temas claro/oscuro, Spotify PKCE/Web Playback SDK y MP3. Código en inglés, interfaz en español.

## Iniciar

Con Node 22.12–24 y npm, desde esta carpeta:

    npm.cmd ci
    npm.cmd run dev

En otros sistemas usa npm. En Windows puedes abrir [Start-Auralis.cmd](Start-Auralis.cmd). Mantén la terminal abierta. Frontend: [http://127.0.0.1:5173](http://127.0.0.1:5173). API a través del frontend: [health](http://127.0.0.1:5173/health). El .env API se crea desde .env.example y editarlo reinicia el servidor durante dev. El proxy de Vite lee PORT de apps/api/.env, con 3001 por defecto. Esta copia local usa 3002 porque otro servicio ocupa 3001; si cambias PORT, reinicia npm.cmd run dev para actualizar ambos servidores.

## Configurar Spotify

1. Abre el [Dashboard](https://developer.spotify.com/dashboard), tu aplicación y Settings.
2. Activa Web API y Web Playback SDK. En Redirect URIs registra exactamente http://127.0.0.1:5173/spotify/callback y pulsa Save. Usa 127.0.0.1, no localhost; consulta [Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).
3. Pon Client ID público en apps/api/.env, línea SPOTIFY_CLIENT_ID=tu_client_id. No copies Client Secret: [PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow) no lo utiliza. El .env real se excluye de ZIP/repositorio.
4. En Development Mode revisa Users Management y habilita la cuenta que usarás si corresponde. Una cuenta no permitida puede iniciar sesión y recibir 403; consulta [quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).
5. Pulsa Conectar Spotify, inicia sesión Premium y acepta streaming, user-read-private, user-read-email, user-modify-playback-state y user-read-playback-state. El [SDK requiere Premium](https://developer.spotify.com/documentation/web-playback-sdk/reference).
6. Spotify conectado significa que SDK entregó device_id Auralis. Busca, añade a playlist y pulsa reproducir. Si autoplay falla pulsa de nuevo. Usa Chrome/Edge con contenido protegido si navegador integrado no admite SDK.

Client ID configurado no acredita autorización. /health configured true solo verifica configuración; el dispositivo requiere ready. No usamos previews: enviamos URI completa a Auralis.

## Sesión y controles

Búsqueda usa token del usuario y valida metadatos. Insertar crea nodo con título, artistas, portada, duración, URI y enlace Spotify. Anterior/siguiente siguen previous/next del dominio y envían nueva URI, sin recorrer una cola remota distinta. Pausa/seek/volumen usan SDK. Eventos y getCurrentState determinan estado/progreso; un 204 no acredita sonido. Comandos se serializan y cargas obsoletas se ignoran. Fin avanza un nodo o repite.

PKCE usa SHA-256, state de un solo uso y verifier sessionStorage por diez minutos. Callback valida origen/state y retira código de URL. Tokens viven solo en memoria; refresh antes de caducar o tras un 401 una vez, compartido entre operaciones. Se conserva refresh token cuando Spotify omite sustituto. Al recargar/cerrar/desconectar se reconecta, conservando biblioteca.

## MP3 y playlists

Importa varios MP3 reales de hasta 50 MB, desde Inicio/Biblioteca o arrastrando dentro del diálogo. Conserva ID3, portada y duración, valida y decodifica. Mezcla Spotify/MP3 y elige la playlist y la ubicación: al inicio (seleccionada por defecto), al final o en una posición base uno. Una importación de varios archivos conserva el orden del lote. Si todavía no tienes playlists, solicita un nombre para crear la primera. Repetir canciones crea nodos distintos. Probar sesión agrega tres MP3 originales de 32 segundos, identificados como muestras.

Reordena la cola arrastrando el asa de seis puntos de cada canción con mouse o tacto; la línea indica dónde se soltará. Con el asa enfocada, ↑ y ↓ también mueven el nodo. Se cambian los enlaces de la lista doblemente enlazada, conservando IDs, metadatos y la canción que está sonando. El nuevo orden se guarda en IndexedDB.

Una biblioteca nueva empieza sin playlists: el usuario las crea, nombra, renombra y elimina, incluso la última. Si agrega música sin tener una playlist, solo se solicita el nombre de la primera. Al abrir una biblioteca anterior se retiran una sola vez las listas de ejemplo vacías Concentración, Noches de ciudad y Días claros. Se conservan las que tienen canciones y las listas del usuario; no se borran MP3 ni portadas.

MP3/portadas se guardan en IndexedDB separados de snapshots. No se suben a Railway; cada navegador/origen tiene su biblioteca. Eliminar nodos conserva archivos en Biblioteca. Tema en localStorage. Web Audio analiza solo MP3; Spotify tiene decoración estática sin PCM.

En Canciones de tu biblioteca, abre los tres puntos y pulsa Eliminar de la biblioteca. Retira esa entrada, sus favoritos y su historial; conserva las apariciones ya agregadas a playlists, sus enlaces y el MP3 guardado para que sigan sonando. Reproducirlas no restaura la entrada eliminada. Puedes agregarla de nuevo explícitamente desde una playlist, volver a buscarla en Spotify o importar el MP3 original. La operación no borra archivos del computador.

Audius fue eliminado. Entradas antiguas conservan metadatos como Catálogo anterior, sin stream. No se borran playlists/MP3 ni se sustituyen canciones. Spotify con URI válida se reproduce al conectar.

## Estructura y costes

| Carpeta | Responsabilidad |
| --- | --- |
| packages/playlist-core | Modelos, lista doblemente enlazada y cursor |
| apps/api | Configuración pública, health, CORS y límites |
| apps/web | PKCE, búsqueda, SDK, MP3, IndexedDB y UI |
| tests | Desktop/móvil, MP3 reales y Spotify simulado |
| .agents/skills | Seis skills de mantenimiento |

Todas las colecciones de estado son propias: DoublyLinkedList, LinkedSequence, LinkedSet y StringMap. El paquete de dominio no tiene dependencias externas. Navegar/enlazar/desenlazar un nodo conocido cuesta O(1); buscar ID en nuestra tabla hash cuesta O(1) esperado y O(n) en el peor caso, con inserción O(1) esperado amortizado. Inserción interior: O(min(index, size − index)) para localizar. Recorrer/serializar: O(n); memoria O(n). Los snapshots de UI son listas propias; los arrays se limitan a contratos de transporte y persistencia. Consulta [implementaciones y límites](docs/own-collections.md).

## Comprobar

    npm.cmd run typecheck
    npm.cmd run lint
    npm.cmd test
    npm.cmd exec playwright install chromium
    npm.cmd run test:e2e
    npm.cmd run build

Playwright inicia dev o lo reutiliza. Fixtures Spotify prueban contratos, no sonido real del catálogo. MP3 sí se reproduce en Chromium. Consulta [verificación](docs/verification.md), [dominio](docs/domain-contract.md), [diseño](docs/design-spec.md) y [arte](docs/artwork.md).

## Vercel y Railway

Construye desde raíz del workspace con lockfile. Railway: railway.json, npm ci, npm run build:api y npm run start:api; host 0.0.0.0/PORT, health /health. Define NODE_ENV=production, SPOTIFY_CLIENT_ID público y ALLOWED_ORIGINS exactos.

Vercel: vercel.json, npm ci, npm run build:web, salida apps/web/dist y rewrite /spotify/callback a index.html. Define VITE_API_BASE_URL como origen HTTPS Railway sin /api. Registra https://<tu-dominio-vercel>/spotify/callback en Spotify. Variables VITE son públicas. Comprueba callback, device_id, búsqueda, audio, CORS y MP3 tras publicar. No hay servicios públicos desplegados.
Verificación manual: el usuario confirmó que las canciones Spotify se escuchan en Chrome/Edge. El navegador integrado devolvió Playback error; utiliza Chrome/Edge para esta reproducción. Consulta docs/verification.md para distinguir esta comprobación de los fixtures automatizados.
