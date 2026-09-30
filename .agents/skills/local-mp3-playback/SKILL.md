---
name: local-mp3-playback
description: "Import, persist, and play user-selected local MP3 files in the TypeScript doubly linked music playlist. Use for browser file selection, audio lifecycle, IndexedDB assets, and mixed-source playback."
---

# Archivos MP3 y reproducción local

Lee [el contrato](../../../docs/domain-contract.md) cuando conectes archivos con nodos. Los archivos se seleccionan en el navegador: no hace falta subirlos a Railway para reproducirlos.

## Importación y biblioteca

Utiliza un selector `input type="file"` que acepte MP3; añade arrastrar y soltar solo como complemento. Valida archivo no vacío, extensión, tamaño configurado y decodificación real; `accept` y MIME por sí solos no garantizan formato. Permite un MIME vacío si la comprobación del archivo y del navegador confirma un MP3. Explica errores por archivo sin perder importaciones válidas.

Obtén duración mediante eventos de metadatos del audio. Lee título, artista y portada de ID3 con una biblioteca mantenida si se incorpora; si faltan etiquetas, usa nombre de archivo, artista desconocido y portada por defecto. Renderiza texto como texto, nunca HTML proporcionado por etiquetas.

Al importar, crea un `assetId`, guarda el Blob en IndexedDB y normaliza un `LocalTrack`. Permite elegir la playlist y añadir al inicio, final o posición como cualquier canción Spotify. Si el guardado falla, informa el modo temporal o solicita reintento; no muestres un guardado exitoso.

Persiste metadatos de playlists y archivos por separado. Rehidrata primero la biblioteca, luego los nodos y el cursor. Los archivos comparten referencias si hay varias apariciones. No guardes MP3 base64 en localStorage ni una ruta del computador: no permiten restaurar acceso al contenido. El almacenamiento corresponde a un navegador y origen y puede ser eliminado por el usuario.

## Motor de audio

Controla una sola instancia activa de `HTMLAudioElement` para audio local. Crea URLs de objeto para los Blobs cuando hagan falta; pausa y descarga la fuente antes de revocar su URL al reemplazarla. No revoques un Blob o portada aún referenciados por otra reproducción o vista. Registra y retira listeners para evitar avances duplicados.

Deriva estados y progreso de eventos reales (`loadedmetadata`, `play`, `pause`, `timeupdate`, `ended`, `error`). Maneja el rechazo de la promesa de `play()`. El cursor seleccionado y el audio que suena deben coincidir, incluso si una carga anterior termina tarde: cancela o ignora operaciones con versión obsoleta.

Eliminar el actual, cambiar de playlist y avanzar deben detener el audio anterior y sincronizar el nuevo nodo. En un nodo Spotify sin proveedor, el audio anterior se detiene y el estado indica no disponible. Al buscar temporalmente, limita `currentTime` a una duración válida; al variar volumen, limita el rango a 0–1.

Verifica un MP3 real de prueba con permiso de uso, reproducción/pause, seek, final de pista, edición durante reproducción, duplicados, recarga, errores de decodificación y limpieza de recursos. Comprueba por separado la reproducción manual en móvil, donde autoplay puede requerir interacción.
