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

## Refactor de estructuras propias — 2026-10-01

Se sustituyeron las colecciones del estado por DoublyLinkedList, LinkedSequence,
LinkedSet y StringMap propias. Artistas, resultados y snapshots de UI también
usan nodos. El dominio quedó sin dependencias externas. En ese momento el
generador de muestras estaba escrito en Python y usaba su propia LinkedList;
después se migró junto con las demás herramientas auxiliares a TypeScript.

Comprobaciones realizadas en la copia de OneDrive:
- npm.cmd run typecheck: correcto, incluidos frontend, API, dominio y pruebas.
- npm.cmd run lint: correcto, con reglas que restringen colecciones nativas.
- npm.cmd run build: correcto.
- npm.cmd test: 29 pruebas aprobadas.
- PLAYWRIGHT_CHANNEL=chrome y npm.cmd run test:e2e: 22 pruebas aprobadas
  en escritorio y móvil. Chrome instalado se usó porque no estaba descargado
  el ejecutable de Chromium que requiere esta versión de Playwright.
- La versión Python anterior pasó comprobaciones de sintaxis y recorridos de
  LinkedList antes de su migración posterior a TypeScript.
- Biblioteca anterior: IDs, orden, selección, metadatos, favoritos y assetId
  comprobados en roundtrip; pruebas de navegador conservaron y reprodujeron
  el Blob MP3 anterior y guardaron cambios en el mismo formato.

Las pruebas Spotify emplearon API/SDK simulados. Este refactor no añade una
nueva comprobación de sonido del catálogo real ni un despliegue público.
Se conserva el formato IndexedDB versión 1. El código previo quedó respaldado
en work/auralis-before-own-collections-2026-10-01 del espacio de trabajo Codex;
ese respaldo excluye dependencias, compilados, archivos .env y repositorio Git.

## Arrastre y playlists del usuario — 2026-10-01

Se añadió reordenamiento con mouse, tacto y flechas del teclado. La operación
reubica el mismo nodo mediante enlaces; conserva nodeId, metadatos, tamaño,
cursor y reproducción. Las incorporaciones van directamente al inicio, sin
formulario de posición. Una biblioteca nueva no crea playlists automáticamente;
se permite crear y eliminar incluso la última. La limpieza de ejemplos vacíos
se ejecuta una vez y conserva listas pobladas, las del usuario y assets MP3.

- Typecheck, ESLint y build: correctos.
- 35 pruebas unitarias aprobadas. Incluyen extremos, enlaces en ambos sentidos,
  operaciones inválidas sin mutación, identidad y cursor, persistencia vacía,
  migración única y 2.000 movimientos contrastados con un oráculo independiente.
- 30 casos E2E verificados en Chrome de escritorio y móvil, entre la ejecución
  general y las comprobaciones dirigidas de arrastre. Se corrigió la prueba
  móvil para usar tacto real y mostrar origen/destino dentro de la pantalla.
  Cubren orden al recargar, identidad guardada, MP3 que sigue sonando durante
  el movimiento, teclado, incorporación al inicio, creación y eliminación de
  listas, limpieza antigua y regresiones de Spotify/MP3.
- Capturas de interfaz nueva y cola en escritorio/móvil y ambos temas,
  revisadas visualmente sin errores JavaScript. Las pruebas de diseño también
  comprueban 320, 375, 768 y 1440 píxeles.
- Comprobación local detectó otro servicio en 3001. La copia de escritorio usa
  PORT=3002 y el proxy de Vite lee ese puerto de apps/api/.env. Health y
  /api/spotify/config respondieron 200 a través del frontend, con proveedor
  Spotify y Client ID configurado; no se alteraron credenciales.

Spotify en estas pruebas usa API/SDK simulados; no se hizo una nueva prueba
manual del audio de su catálogo ni un despliegue público. Se conserva el
formato IndexedDB versión 1, ampliado con un marcador opcional de limpieza.
El respaldo de fuentes previo a este cambio está en
work/auralis-before-drag-and-drop-2026-10-01 del espacio de trabajo Codex.

## Corrección del cursor de arrastre bloqueado — 2026-10-01

El usuario observó el cursor de soltar prohibido del arrastre HTML nativo.
Se sustituyó por Pointer Events propios para mouse, tacto y lápiz, con captura
del puntero y detección de la fila bajo las coordenadas. Los iconos y portadas
de la cola no inician arrastres HTML. Se mantienen la línea de colocación,
el teclado y las operaciones moveBefore/moveAfter sobre los mismos nodos.

Typecheck, ESLint y build pasaron. Ocho pruebas de navegador en Chrome de
escritorio y móvil comprobaron mouse desde el icono del asa sin dragstart
nativo, tacto real, indicador, identidad guardada, recarga, reproducción MP3
continua, cancelación con Escape y liberación fuera de la cola.
Se generaron capturas del arrastre en 375, 768 y 1440 píxeles y ambos temas;
se revisaron la cola estrecha de Inicio y la de Biblioteca. No hubo errores
JavaScript ni desbordamiento horizontal.
La corrección no cambia el formato guardado ni la integración Spotify.

## Eliminar canciones de la biblioteca — 2026-10-01

Se añadió Eliminar de la biblioteca al menú de las filas del catálogo. Retira
la entrada, favoritos e historial y guarda el cambio en IndexedDB. Conserva
los nodos ya incluidos en playlists, sus IDs/enlaces y los MP3 guardados.
Reproducir un nodo conservado no vuelve a registrar automáticamente la canción;
agregarla explícitamente a una playlist sí permite recuperarla en la biblioteca.
El foco pasa a una fila vecina o al botón Importar MP3 cuando queda vacía.
El menú se abre hacia arriba si la barra fija o el borde de la pantalla lo taparía.

Cuatro casos de navegador en escritorio y móvil comprobaron persistencia,
MP3 que continúa sonando al quitar su entrada, reproducción después de recargar,
favoritos/historial, reincorporación explícita, retirada de la última entrada
Spotify de ejemplo y conservación de los enlaces de sus nodos repetidos.
La comprobación Spotify usa metadatos de prueba; el MP3 reproduce audio real.
También pasaron los dos casos previos de importación, reproducción, navegación,
eliminación del nodo actual y recarga, en escritorio y móvil. Typecheck, ESLint
y build se comprobaron; se revisaron capturas del menú en ambas dimensiones.
El texto de eliminación usa un tono más oscuro en modo claro para ser legible.

## Inserción y controles centrados — 2026-10-05

El diálogo permite elegir playlist y agregar al inicio, al final o en una
posición base uno. Las inserciones usan insertAt de la lista propia y los
lotes conservan su orden. Se mantiene el cursor de una playlist poblada.
Anterior, reproducir/pausar y siguiente quedan centrados; cola y repetición
van a la izquierda, letras y volumen a la derecha. La presentación compacta
conserva acceso a los controles sin superposiciones.

- Typecheck, lint, build y 37 pruebas unitarias aprobados.
- Los 44 casos E2E pasan entre la ejecución completa y la repetición dirigida
  de dos casos Spotify tras una recarga del servidor de desarrollo.
- Después del ajuste visual, los 26 casos de reproducción e interacción de
  playlists pasan en escritorio y móvil. Comprueban controles sin solaparse
  a 320, 375, 768, 1100 y 1440 píxeles en claro y oscuro.
- Se revisaron visualmente escritorio, móvil, tablet y diálogo de inserción.
  El navegador de verificación no informó errores JavaScript.

Los casos Spotify usan fixtures API/SDK. Los MP3 se decodifican y reproducen
realmente en el navegador. No se repitió la escucha manual de Spotify Premium.

## Herramientas de desarrollo TypeScript — 2026-10-05

Se migraron ESLint, los generadores de arte/audio y la captura visual a archivos
TypeScript. Se eliminó el duplicado Python de LinkedList. Los scripts ejecutables
usan el borrado experimental de tipos de Node desde la versión 22.13. Las
capturas van a `test-results/`, que ya está excluido del repositorio.
