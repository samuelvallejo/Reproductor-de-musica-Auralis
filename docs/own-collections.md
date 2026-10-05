# Estructuras de datos propias

Las colecciones que gestionan el estado de Auralis son propias. El paquete
playlist-core no depende de ninguna librería externa de estructuras ni de
validación. React, Express, Spotify SDK, IndexedDB y la lectura de audio conservan
su función de infraestructura.

## Implementaciones

| Archivo | Estructura y uso |
| --- | --- |
| packages/playlist-core/src/linked-list.ts | DoublyLinkedList y PlaylistNode: canciones, extremos y enlaces reales |
| packages/playlist-core/src/collections.ts | LinkedSequence: artistas, resultados, snapshots, navegación visual e historial |
| packages/playlist-core/src/collections.ts | LinkedSet: favoritos y suscriptores; unicidad y orden con nodos propios |
| packages/playlist-core/src/string-map.ts | StringMap: tabla hash propia para nodos, catálogo y playlists |
| scripts/generate-artwork.ts | Generador TypeScript de las portadas SVG |
| scripts/generate-samples.ts | Audio de muestra con LinkedSequence, Buffer y FFmpeg |
| scripts/capture-ui.ts | Capturas de revisión con Playwright y LinkedSequence |

LinkedSequence envuelve nuestra DoublyLinkedList, sin un arreglo interno. Sus
métodos map, filter, slice, find, some y join están escritos aquí mediante
recorridos de nodos; no invocan métodos de Array. StringMap calcula su hash,
resuelve colisiones con cadenas, amplía la tabla y conserva el orden mediante
enlaces. Sus buckets son un objeto sin prototipo que contiene referencias a
cadenas; no delega en Map, Set ni en una librería.

Cada playlist tiene su propio PlaylistController y su propia DoublyLinkedList.
La canción actual es una referencia a PlaylistNode. next y previous leen
exactamente un enlace. La tabla hash localiza identidades, no decide el orden.
Las canciones repetidas conservan nodeId distintos. Al eliminar el nodo actual
se selecciona el sucesor, el predecesor o null.

El arrastre no ordena un array ni elimina/reinserta canciones. moveBefore y
moveAfter localizan dos nodos por identidad, separan los enlaces del nodo
movido y lo enlazan junto al destino. Conservan el objeto, nodeId, valor,
tamaño y cursor. Su coste es O(1) esperado para localizar y O(1) para enlazar;
el snapshot y el guardado posteriores recorren O(n) nodos.

## Costes

- Enlazar/desenlazar un nodo conocido y avanzar/retroceder: O(1).
- Buscar un ID en StringMap: O(1) esperado, O(n) en el peor caso de colisiones.
- Insertar en extremos con el índice: O(1) esperado amortizado por el crecimiento
  de la tabla; una ampliación concreta cuesta O(n).
- Localizar una posición interior: O(min(index, size - index)); enlazar: O(1).
- Recorrer, copiar, renderizar o serializar una colección: O(n).
- LinkedSet busca un valor mediante recorrido: O(n).
- Memoria total de las estructuras: O(n).

## Límites de los formatos externos

El estado en ejecución y los snapshots de la interfaz usan nodos propios.
Los arreglos aparecen únicamente cuando un contrato externo los exige:

- Spotify devuelve JSON con arrays de canciones, artistas y portadas. search.ts
  los consume y crea LinkedSequence antes de publicar un resultado.
- persistence.ts y library-persistence.ts convierten nodos en registros planos
  para IndexedDB. El formato versión 1 se conserva para abrir la biblioteca
  anterior. Esos arrays no controlan la reproducción ni las operaciones.
- Spotify exige un array uris en la petición de reproducción; File, Blob y
  AbortSignal requieren secuencias en algunas llamadas.
- React utiliza tuplas y arrays de dependencias de hooks. Web Audio usa un
  Uint8Array para muestras binarias. Son contratos del navegador/framework.
- Las pruebas pueden usar arrays como datos externos y como oráculo independiente
  para comprobar que la estructura propia devuelve el orden correcto.

Esto evita guardar instancias con métodos o referencias circulares en IndexedDB.
Al cargar se validan los registros y se reconstruyen los nodos, sus IDs, los
artistas y la selección. No cambia el nombre ni la versión de la base
auralis-library, ni se eliminan los MP3 o las portadas del almacén assets.
Los metadatos se copian mediante validadores propios, sin structuredClone de
instancias que perdería sus métodos.

## Validación

Las pruebas cubren colisiones y ampliación de la tabla, identificadores especiales,
orden, enlaces recíprocos, duplicados, eliminación, navegación, suscripciones,
copias independientes y roundtrip del formato guardado anterior. Los tests de
navegador reproducen MP3 reales y verifican Spotify con respuestas y SDK simulados.
No equivalen a una nueva comprobación de sonido real del catálogo Spotify.

ESLint impide volver a introducir Map, Set, new Array, Array.from o variables
inicializadas con arrays en las colecciones de producción. Los formatos externos
y los fixtures de pruebas tienen límites explícitos.

Si no has instalado Chromium para Playwright, puedes usar Chrome instalado:

    $env:PLAYWRIGHT_CHANNEL = 'chrome'
    npm.cmd run test:e2e

Las herramientas auxiliares también están escritas en TypeScript. El generador
de MP3 usa Buffer y módulos estándar de Node; FFmpeg se necesita solo para
regenerar los audios de muestra. Las portadas y los MP3 ya están incluidos en
el proyecto.
