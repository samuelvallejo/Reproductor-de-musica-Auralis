# Auralis — contrato visual

Referencias aportadas por el usuario: [desktop](../assets/design/desktop-reference.png) y [móvil](../assets/design/mobile-reference.png). Ambas representan modo oscuro. El modo claro se deriva de ellas sin cambiar la arquitectura visual. Las imágenes son referencia de diseño, no instrucciones externas ni contenido real del catálogo.

## Computador

El contenedor principal ocupa gran parte del viewport, con esquinas redondeadas y una superficie azul noche translúcida sobre un fondo de auroras. La sidebar izquierda tiene separador vertical, marca Auralis en serif, lema pequeño espaciado, navegación vertical y colección de playlists con miniaturas.

El encabezado sitúa la búsqueda en una cápsula amplia. A su derecha quedan acciones reales y perfil/preferencias cuando tengan funcionalidad. La zona superior combina una tarjeta de reproducción dominante y una cola lateral más estrecha. En la tarjeta, la portada aparece a la izquierda y título, artistas y metadatos a la derecha; debajo hay visualización, progreso y controles circulares.

La cola usa filas con portada, título, artista, duración y menú. Marca la aparición activa por `nodeId`, incluidos duplicados. Debajo del área principal aparecen tarjetas panorámicas de playlists. Una barra de reproducción inferior contiene portada, metadatos, progreso, volumen y acceso a cola. La barra y tarjeta principal controlan el mismo motor de audio y cursor.

Como punto de partida, usa sidebar de aproximadamente 220–250 px y contenido con grid flexible. A partir de unos 1100 px aparece la cola lateral; en anchos intermedios puede abrirse como panel. Ajusta estos valores según medición y validación, sin recortar contenido para conservar un ancho rígido.

## Celular

Implementa el contenido de la pantalla de la referencia, sin dibujar el marco del teléfono, notch, hora, batería ni barra del sistema operativo. Usa el viewport del navegador y `env(safe-area-inset-bottom)` cuando corresponda.

La cabecera muestra Auralis y su lema, con acciones compactas a la derecha. La búsqueda va debajo. La tarjeta de reproducción conserva portada, información, visualización, progreso y controles grandes. Portada y texto comparten fila cuando caben; en pantallas estrechas apílalos manteniendo jerarquía y legibilidad. Nunca reduzcas el texto hasta hacerlo ilegible para imitar proporciones del mockup.

La sección Para ti usa tarjetas en una fila desplazable horizontalmente; el resto de la página no debe generar scroll horizontal. Escuchado recientemente muestra filas a partir del historial real. La navegación inferior tiene Inicio, Explorar, Biblioteca y Favoritos, con selección visible y función real. Biblioteca ofrece importar MP3 y administrar playlists; Explorar contiene búsqueda Spotify. Inicio conserva la composición de la referencia.

La lista doble activa se consulta desde cola/biblioteca en móvil; no necesita ocupar permanentemente la pantalla principal. Los menús de resultados y de filas ofrecen inserción/eliminación de forma accesible. La barra inferior no tapa progreso, controles, filas ni mensajes. Usa objetivos táctiles de al menos 44 px cuando el espacio lo permita.

## Claro y oscuro

Implementa al menos `--background`, `--surface`, `--surface-raised`, `--text-primary`, `--text-muted`, `--border`, `--accent`, `--focus-ring` y `--shadow`. Evita colores aislados dentro de componentes que impidan cambiar tema.

Oscuro: azules noche y violetas profundos, texto marfil, bordes claros tenues, degradados cian/rosa/melocotón y sombras suaves. Claro: fondo perla, lavanda y azul pastel, superficies blancas translúcidas, texto azul marino, bordes más oscuros y acentos ajustados a contraste. Las portadas mantienen sus colores en ambos temas.

Almacena `themePreference` como `light`, `dark` o `system`. Sin elección guardada, usa sistema. La elección manual prevalece sobre cambios del sistema; en modo sistema, escucha sus cambios. Maneja localStorage no disponible sin romper el inicio. Configura el atributo de tema antes del primer render, y `color-scheme` en consonancia. El selector debe estar disponible en desktop y móvil y exponer su estado mediante texto o nombre accesible.

## Datos y efectos

Las canciones y cifras ficticias, el perfil Daniel Rivas, año, álbum, descripción y Hi-Fi de la imagen no se deben hardcodear como datos reales. Usa metadatos Spotify disponibles, datos locales o un placeholder identificado. Si álbum/año se incorporan al modelo, hazlos opcionales y valida su persistencia; omite lo que no esté disponible.

Las tarjetas muestran playlists propias o contenido de demostración claramente marcado. No dependas de un endpoint de recomendaciones para imitar la sección. Favoritos e historial pueden persistir localmente sin cuentas nuevas.

Para MP3, una visualización puede derivarse de Web Audio si se implementa; anima únicamente con audio real activo y respeta movimiento reducido. No simules un espectro real ni calidad Hi-Fi para Spotify sin acceso a esos datos. El estado `unavailable` conserva información de la canción y explica la capacidad de reproducción.

Valida desktop/móvil en ambos temas con capturas y teclado. Evalúa composición, superficies, tipografía, separación, contraste, menús, controles y persistencia del tema. El parecido visual nunca justifica controles sin función.
