---
name: music-player-responsive-ui
description: "Implement the Auralis reference designs as a semantic HTML music player with responsive desktop/mobile layouts and persistent light/dark themes. Use for UI composition, playlist controls, accessibility, and visual verification."
---

# Interfaz adaptable del reproductor

Lee [la especificación visual](../../../docs/design-spec.md) y observa [la referencia desktop](../../../assets/design/desktop-reference.png) y [la referencia móvil](../../../assets/design/mobile-reference.png). Son los diseños Auralis obligatorios aportados por el usuario. Implementa sus componentes como HTML/CSS funcional, no como una captura de pantalla puesta de fondo.

## Composición Auralis

- Computador: sidebar izquierda con marca y playlists; encabezado con búsqueda; tarjeta central grande de reproducción; cola a la derecha; tarjetas de playlists debajo y barra inferior de reproducción.
- Celular: marca y encabezado, búsqueda, tarjeta principal, tarjetas Para ti, escuchado recientemente y navegación inferior Inicio/Explorar/Biblioteca/Favoritos. La cola se abre desde un control accesible; no comprimas la sidebar desktop dentro del móvil.
- Estilo: auroras azul/violeta/rosa, paneles de vidrio con bordes finos, títulos serif, texto funcional sans serif y acentos cian/melocotón. El botón principal es circular con degradado. Respeta proporciones y jerarquía de las referencias.

## Temas

Define tokens semánticos CSS para fondo, superficies, texto, bordes, sombras y controles. El oscuro reproduce la referencia y el claro usa superficies perla/lavanda, texto azul oscuro y auroras pastel manteniendo la misma composición. No apliques un filtro de inversión global.

Usa un selector claro/oscuro y, si se ofrece, sistema. Guarda la elección en localStorage; si no hay elección, resuelve `prefers-color-scheme`. Aplica el tema antes de pintar el contenido. Refleja `color-scheme` para controles nativos y mantén contraste en ambos temas. Cambiar tema conserva audio, cursor, playlist, consulta y foco.

Usa HTML semántico: encabezados, navegación, formularios, listas, botones y controles de audio etiquetados. Incluye un `index.html`; React/TSX genera el contenido HTML. CSS Grid/Flexbox y media queries adaptan la composición sin duplicar controladores.

## Interacción

Ofrece agregar al inicio, al final y en posición para resultados Spotify y archivos importados. Muestra rango válido base uno, valida entradas y convierte al índice del dominio una sola vez. Ofrece eliminar una aparición por `nodeId`; no retires todas las copias de la canción por su ID del proveedor.

Anterior/siguiente invocan el controlador y muestran título, artistas, portada y procedencia del nodo actual. Diferencia selección y reproducción mediante estado visible. Los nodos Spotify sin audio mantienen navegación y enlace para abrir en Spotify. Deshabilita controles que no están disponibles y comunica su motivo cuando sea necesario.

Incluye crear/renombrar/seleccionar playlists, selector MP3, búsqueda, contador, progreso, volumen y estados de error útiles. Integra agregar/importar mediante la cabecera de biblioteca, el botón de playlists y los menús de fila, conservando la composición. Un panel académico opcional muestra IDs abreviados y enlaces de los nodos, generado a partir del dominio; conserva los detalles técnicos dentro de ese panel.

Los nombres, tiempos, perfil, insignia Hi-Fi y cifras de las maquetas son ejemplos visuales: utiliza datos reales y omite indicadores que no puedas acreditar. Los botones de favoritos y las pestañas que se conserven deben funcionar. El login Spotify se solicitó para PKCE/SDK; no inventes perfil ni recomendaciones por la maqueta. Si incluyes aleatorio/repetición, implementa su comportamiento y documenta cómo conserva la navegación por nodos.

## Accesibilidad y verificación

Mantén foco visible y orden de teclado; gestiona foco al abrir/cerrar diálogos. Etiqueta iconos, sliders y estado de la canción, sin depender solo del color. Al eliminar la fila enfocada, mueve el foco a un control válido. Usa anuncios breves para inserción, eliminación y búsqueda fallida.

Verifica 375, 768 y 1440 píxeles en claro y oscuro y ausencia de desbordamiento a 320. Prueba títulos largos, muchos artistas, portada ausente, listas vacías y botones de extremos. Reserva espacio para la barra fija y zonas seguras del móvil; comprueba que no tape la última fila. Revisa con navegador real, teclado y capturas de desktop/móvil comparadas con las referencias; un build exitoso no demuestra corrección visual. Valida preferencia inicial del sistema, persistencia tras recarga y cambio de tema durante reproducción.
