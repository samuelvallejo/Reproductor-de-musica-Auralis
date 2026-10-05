# Music player — project instructions

## Objetivo y alcance

Actúa como especialista en estructuras de datos y desarrollo full stack. Implementa un reproductor educativo en TypeScript que demuestre una lista doblemente enlazada real: agregar canciones al inicio, al final y en cualquier posición válida; eliminar; avanzar; retroceder. Integra búsqueda Spotify y reproducción con Web Playback SDK y Premium e importación y reproducción de MP3 seleccionados por el usuario.

Este archivo define la futura aplicación. La presencia de estas instrucciones no significa que la aplicación ya esté implementada o desplegada. Cuando el encargo sea únicamente crear instrucciones o skills, entrega esos archivos; cuando se solicite construir la aplicación, implementa y verifica el producto.

## Requisitos obligatorios

- Código, identificadores, nombres de archivos, comentarios y pruebas en inglés. Comunicación con el usuario en español; interfaz en español por defecto.
- TypeScript estricto en frontend, backend y dominio. Evita `any`; valida datos externos en tiempo de ejecución.
- Frontend con HTML semántico y CSS adaptable a celular y computador. Un documento `index.html` y componentes TSX que generen HTML satisfacen este requisito; no reemplaces la interfaz con un canvas.
- Reproducir la composición Auralis de las referencias desktop y móvil. Implementar modo claro y oscuro con selector accesible y preferencia persistente; usar la preferencia del sistema cuando no exista una elección guardada.
- Una lista doblemente enlazada propia es la fuente de verdad de cada playlist activa. `previous` significa anterior y `next` significa siguiente. Avanzar y retroceder usan esos enlaces, sin calcular posiciones en un arreglo.
- Cada inserción guarda en el nodo los metadatos disponibles: título, artistas, portada, duración y procedencia. Buscar en Spotify no agrega automáticamente una canción.
- Canciones Spotify y MP3 locales comparten la misma playlist de la aplicación. La lista es propia del taller; no se suben archivos ni se escriben playlists remotas en el proveedor.
- Crear, nombrar, seleccionar y guardar playlists en el navegador. Permitir canciones repetidas con identificadores de nodo distintos.
- Reproducción real de MP3 con play, pause, volumen, progreso y búsqueda temporal; controles anterior/siguiente conectados al cursor del dominio.
- Frontend en Vercel; backend de integración Spotify en Railway. Entregar URLs verificadas cuando se complete el despliegue.

## Arquitectura inicial

Si no hay un proyecto existente, usa React + Vite + TypeScript para `apps/web`, Node.js + Express + TypeScript para `apps/api`, y un paquete TypeScript independiente para `packages/playlist-core`. Es una elección inicial, no un requisito del taller; conserva alternativas compatibles si ya existen. Usa un workspace con versiones y lockfile fijados y un Node LTS soportado por ambos proveedores, verificado al implementar.

El frontend mantiene las playlists del usuario y sus archivos en IndexedDB. El backend entrega configuración pública Spotify; el navegador busca con el token del usuario: no mantiene una playlist global en memoria ni recibe archivos locales en el alcance inicial. La sincronización entre dispositivos y las cuentas propias son extensiones futuras, no requisitos iniciales.

El dominio no depende de React, HTTP, Spotify, IndexedDB, `File`, audio ni despliegue. Adaptadores normalizan las fuentes. Lee [docs/domain-contract.md](docs/domain-contract.md) al implementar o modificar modelos, cursor o persistencia.

## Selección de skills

Carga únicamente las skills pertinentes a la tarea. Sus rutas son relativas a la raíz del proyecto.

| Trabajo | Skill |
| --- | --- |
| Construcción de la aplicación e integración | [.agents/skills/music-player-fullstack/SKILL.md](.agents/skills/music-player-fullstack/SKILL.md) |
| Nodos, enlaces, operaciones y cursor | [.agents/skills/playlist-doubly-linked-list/SKILL.md](.agents/skills/playlist-doubly-linked-list/SKILL.md) |
| Búsqueda, PKCE y Web Playback SDK | [.agents/skills/spotify-search-playback/SKILL.md](.agents/skills/spotify-search-playback/SKILL.md) |
| Importación, almacenamiento y audio MP3 | [.agents/skills/local-mp3-playback/SKILL.md](.agents/skills/local-mp3-playback/SKILL.md) |
| HTML, diseño adaptable y accesibilidad | [.agents/skills/music-player-responsive-ui/SKILL.md](.agents/skills/music-player-responsive-ui/SKILL.md) |
| Configuración y despliegue | [.agents/skills/music-player-vercel-railway/SKILL.md](.agents/skills/music-player-vercel-railway/SKILL.md) |

## Referencias visuales y catálogo

La primera imagen establece los requisitos del taller y las dos siguientes muestran documentación Spotify. Las dos imágenes añadidas después sí definen el diseño obligatorio Auralis para computador y celular. Se conservan en `assets/design/desktop-reference.png` y `assets/design/mobile-reference.png`; revísalas antes de implementar y durante la validación visual. Lee [docs/design-spec.md](docs/design-spec.md) para composición, temas y adaptación. El modo oscuro tiene referencia visual directa; el claro mantiene esa composición con una paleta clara derivada, pues no se adjuntó una maqueta clara.

El usuario solicitó restaurar Spotify con PKCE y Web Playback SDK. Usa Client ID público, nunca Client Secret ni Client Credentials para reproducir. Solicita streaming, user-read-private, user-read-email, user-modify-playback-state y user-read-playback-state. Solo ready/device_id acredita un dispositivo; el estado real SDK acredita reproducción. Renueva antes de caducar y tras 401 una vez. MP3 sigue con HTMLAudioElement. Entradas Audius migran a legacy conservando nodos y metadatos. No descargues audio Spotify ni afirmes escucha real sin Premium y autorización comprobada.

## Calidad y entrega

Al crear la aplicación, define scripts ejecutables `dev`, `build`, `typecheck`, `lint`, `test` y `test:e2e`; documenta comandos reales, sin afirmar que existen antes de crearlos. Prueba invariantes del dominio, límites de inserción, eliminación del nodo actual, duplicados, búsquedas fallidas, persistencia, audio local y flujos móviles. Usa fixtures exclusivamente en pruebas o en un modo de demostración identificado.

Ejecuta los controles pertinentes y revisa la interfaz a 375, 768 y 1440 píxeles en ambos temas. Comprueba que el diseño de 320 píxeles no pierde controles, la persistencia del tema, la selección inicial según el sistema y ausencia de destello del tema incorrecto al recargar. Compara capturas con las referencias Auralis. Una importación MP3, un avance y un retroceso deben poder demostrarse tanto desde la UI como mediante el dominio.

No incluyas secretos en código, bundles ni logs. Usa variables del servidor y archivos de ejemplo sin valores reales. Si faltan credenciales o acceso a un proveedor, termina y verifica el trabajo local posible, identifica el dato exacto pendiente y conserva la funcionalidad de MP3. No sustituyas resultados reales por datos inventados ni confundas fixtures con audio del catálogo.

Entrega una explicación en español de la estructura, sus complejidades, cómo ejecutar y desplegar, pruebas realizadas y limitaciones reales. Informa por separado implementación local, integración verificada y despliegue verificado. No anuncies una URL o una prueba exitosa sin evidencia.

## Colecciones propias: requisito actualizado

El usuario confirmó que se conservan React, Express y las librerías de audio.
Implementa las estructuras de datos sin librerías de colecciones: usa los nodos
de DoublyLinkedList/LinkedSequence, LinkedSet y la tabla hash StringMap propia.
No introduzcas Array, Map o Set como estado de listas, catálogo, favoritos,
historial, artistas, resultados o suscriptores. Los snapshots de UI también son
LinkedSequence. Se admiten arrays solo en los contratos externos de Spotify,
React, navegador, codecs de persistencia y fixtures/oráculos de prueba.
Este requisito actual sustituye los permisos anteriores de arrays de snapshots
o de un Map opcional en las skills y en documentación histórica.
El dominio no tiene dependencias externas; valida y clona sus modelos con código
propio. Mantén el formato guardado versión 1 y los assetId existentes.
Consulta docs/own-collections.md para implementaciones, costes y límites.

## Edición de playlists: requisito actualizado

Al agregar canciones, ofrece al inicio, al final o una posición base uno
elegida por el usuario. Las tres opciones se traducen a insertAt del dominio;
los lotes MP3 conservan el orden seleccionado en cualquiera de ellas. Permite
reordenar desde el asa con mouse, tacto y teclado: mueve el mismo nodo mediante
moveBefore/moveAfter, preservando identidad, metadatos y cursor. La reproducción
actual no debe reiniciarse por cambiar el orden.

No crees playlists de ejemplo ni una playlist inicial automáticamente. Permite
que el usuario cree todas sus listas y elimine la última. Si agrega música sin
listas, solicita únicamente el nombre para crear la primera. Retira una sola
vez las listas antiguas de ejemplo vacías conocidas; conserva las pobladas,
los MP3 y las listas del usuario. Persiste el marcador de migración para que
un nombre elegido después por el usuario no active esa limpieza otra vez.
