# Abrir Auralis en Visual Studio Code

Haz doble clic en Auralis.code-workspace o Open-in-VSCode.cmd. También puedes usar Archivo > Abrir carpeta y elegir esta carpeta completa.

En Terminal > Nueva terminal, desde la raíz:

    npm.cmd ci
    npm.cmd run dev

Necesitas Node 22.13–24. Abre http://127.0.0.1:5173 en Chrome/Edge para escuchar Spotify. Si ya hay un servidor de Auralis usando los puertos 5173/3001, detenlo antes de iniciar esta copia. Instalar dependencias necesita Internet. También hay tareas en Terminal > Ejecutar tarea.

| Ruta | Archivos |
| --- | --- |
| apps/web/index.html | HTML principal |
| apps/web/src | TypeScript, TSX y CSS del frontend |
| apps/api/src | Backend TypeScript |
| packages/playlist-core/src | Lista doblemente enlazada y modelos TypeScript |
| scripts | Generadores y captura de interfaz escritos en TypeScript |
| apps/web/public | Imágenes y audio incluidos |
| tests | Pruebas TypeScript |
| docs y README.md | Arquitectura y configuración |
| AGENTS.md y .agents/skills | Instrucciones y skills |

El backend y las herramientas de desarrollo son TypeScript. FFmpeg solo es necesario si regeneras las muestras MP3, que ya están incluidas. No hace falta para ejecutar el reproductor.

Se conserva el Client ID público en apps/api/.env. PKCE no usa Client Secret. Pulsa Conectar Spotify para autorizar la sesión. Las playlists y MP3 importados viven en IndexedDB del navegador; no son archivos del proyecto. Usar el mismo navegador y origen conserva esa biblioteca.

Incluye fuentes, configuraciones, recursos, documentación y pruebas. node_modules se reconstruye con npm.cmd ci y dist con npm.cmd run build. No se incluyen reportes temporales ni archivos Git del entorno.
