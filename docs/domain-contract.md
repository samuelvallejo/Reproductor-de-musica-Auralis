# Domain and playback contract

Este contrato fija decisiones comunes para evitar que cada integración invente su propio modelo. Al construir el proyecto, conviértelo en tipos y comportamiento comprobados, no en una segunda implementación independiente.

## Modelos

```typescript
type TrackSource = 'spotify' | 'local' | 'legacy';

interface TrackMetadata {
  trackId: string;
  source: TrackSource;
  title: string;
  artists: string[];
  coverUrl: string | null;
  durationMs: number | null;
}

interface SpotifyTrack extends TrackMetadata {
  source: 'spotify';
  spotifyUri: string;
  spotifyUrl: string;
}

interface LegacyTrack extends TrackMetadata {
  source: 'legacy';
}

interface LocalTrack extends TrackMetadata {
  source: 'local';
  assetId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

type Track = SpotifyTrack | LocalTrack | LegacyTrack;

interface PlaylistNode<T> {
  readonly nodeId: string;
  value: T;
  previous: PlaylistNode<T> | null;
  next: PlaylistNode<T> | null;
}

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'unavailable' | 'error';
```

`trackId` identifica la canción; `nodeId` identifica su aparición en una playlist. Repetir una canción crea un nodo nuevo. `assetId` identifica el Blob local compartido; una URL `blob:` es temporal y no pertenece al modelo persistido. Para portadas locales, almacena el Blob por separado y mantén `coverUrl` nulo en la persistencia; genera una URL temporal en el adaptador visual.

## Lista y controlador

Implementa `DoublyLinkedList<T>` con `head`, `tail`, `size`, `prepend`, `append`, `insertAt`, `removeById`, `getNodeById`, `clear` e iteración en ambas direcciones. `PlaylistController` mantiene `currentNode` de la lista activa y proporciona `select`, `next`, `previous` y operaciones de edición que preserven el cursor. Encapsula las mutaciones: los componentes no editan enlaces.

- El dominio usa índices base cero: `insertAt(index, value)` admite enteros entre `0` y `size`, inclusive. Rechaza fracciones, negativos, `NaN`, infinito y valores superiores a `size` antes de mutar.
- La interfaz muestra posiciones desde `1` hasta `size + 1`; traduce una única vez a `index = position - 1`.
- La primera inserción selecciona el nuevo nodo. Las siguientes mantienen el nodo actual.
- `next()` y `previous()` recorren exactamente un enlace. En el extremo devuelven `null` y conservan la selección; los botones de la UI se deshabilitan. No hay recorrido circular por defecto.
- Eliminar el actual selecciona su sucesor, o su predecesor si no existe sucesor, o `null` si queda vacía. Eliminar otro nodo mantiene el actual.
- Cambiar de playlist detiene el proveedor anterior y restaura un cursor válido de la nueva lista, usando `head` si no existe una selección persistida válida.
- Al terminar un audio se intenta avanzar un nodo; en el último se detiene. Un nodo sin audio queda seleccionado con estado `unavailable`; no simules reproducción ni lo saltes automáticamente.

## Invariantes y coste

Una lista vacía tiene tamaño cero y extremos nulos. Una no vacía cumple `head.previous === null`, `tail.next === null`, enlaces recíprocos, nodos únicos y exactamente `size` nodos alcanzables en cada dirección. Ningún cursor apunta a un nodo separado. Una lista lineal no contiene ciclos.

`prepend`, `append` y navegación del cursor son O(1). La inserción interior busca desde el extremo más cercano, O(min(index, size - index)); ajustar enlaces es O(1). Buscar/eliminar por identificador es O(n) salvo un índice `Map` mantenido de forma consistente; con ese índice, localizar y retirar es O(1). Iterar y serializar son O(n). Memoria O(n). Cuenta también el coste de obtener el nodo: no presentes una eliminación por búsqueda como O(1).

## Persistencia y renderizado

Serializa una versión de esquema, `playlistId`, nombre, entradas ordenadas `{ nodeId, track }` y `currentNodeId`. Rehidrata creando nodos y reconstruyendo ambos enlaces; preserva sus identificadores. No serialices referencias circulares ni confíes en una lista de objetos sin enlaces como dominio activo.

Un arreglo derivado por iteración sirve para renderizar y persistir, pero nunca decide navegación o modificaciones. Publica snapshots inmutables con una nueva versión tras cada mutación para que React detecte cambios. Guarda Blobs de MP3 en un almacén IndexedDB separado y elimina un Blob solo cuando ninguna playlist lo referencia. Reporta errores de cuota y persistencia sin indicar falsamente que el guardado terminó.

## Compatibilidad del catálogo anterior

Entradas Audius migran a legacy sin stream, conservando metadatos, nodos, orden, cursor y MP3. Spotify con URI válida se conserva. Tokens y device_id no entran en dominio ni IndexedDB. Los nuevos trackId tienen prefijo spotify:.
