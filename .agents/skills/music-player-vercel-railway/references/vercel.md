# Vercel frontend

Consulta [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite). Configura el proyecto como frontend Vite, con instalación reproducible, build del workspace y salida correspondiente a `apps/web/dist` cuando se construya desde la raíz. Si cambia la raíz configurada, ajusta rutas y comandos en conjunto.

`VITE_API_BASE_URL` es público y se incorpora al build; cambiarlo requiere reconstrucción. El frontend llama a `${apiBaseUrl}/api/spotify/config`, usando el origen HTTPS de Railway. No definas secretos en variables Vite.

Si se usa navegación cliente con rutas, configura el fallback de SPA recomendado por Vercel. No agregues rewrites innecesarios a un producto de una sola página. Comprueba recarga directa de cada ruta implementada y carga de assets con el build publicado.

La biblioteca IndexedDB se guarda por origen: una preview, localhost y producción tienen bibliotecas distintas. Eso no es sincronización remota. Incluye esta explicación en la documentación de la aplicación.
