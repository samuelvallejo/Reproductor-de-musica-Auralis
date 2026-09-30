---
name: music-player-vercel-railway
description: "Prepare, deploy, and verify the music player frontend on Vercel and its TypeScript Spotify API on Railway. Use for workspace builds, environment configuration, CORS, and provider-specific deployment checks."
---

# Despliegue en Vercel y Railway

Lee solo la referencia del proveedor que estés configurando: [Vercel](references/vercel.md) o [Railway](references/railway.md). Usa ambas cuando despliegues la aplicación completa. Verifica la documentación oficial actual al configurar cada servicio.

## Contrato entre servicios

| Variable | Lugar | Contenido |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Build frontend Vercel | Origen HTTPS público de Railway, sin `/api` |
| `ALLOWED_ORIGINS` | Backend Railway | Lista explícita de orígenes frontend separados por coma |
| `PORT` | Backend Railway | Puerto proporcionado por el proveedor |

No incluyas valores reales en `.env.example`, documentación, repositorio ni screenshots. Permite orígenes locales solo en desarrollo. CORS admite frontend publicado y previews aprobados de forma explícita; no uses un comodín para todas las páginas. CORS no autentica ni limita abuso: el endpoint de búsqueda necesita límites de solicitudes y parámetros por separado.

## Preparación y cierre

Comprueba builds desde el workspace con el lockfile. Si un proveedor usa `apps/web` o `apps/api` como raíz, confirma que puede instalar y resolver `packages/playlist-core`; si no, construye desde la raíz con filtros y configura el directorio de salida relativo correcto. Documenta la configuración real, no una receta incompatible con el monorepo.

Cuando el despliegue esté autorizado, utiliza el acceso disponible a las cuentas elegidas. No sustituyas los proveedores pedidos por otro hosting. Si falta autenticación o acceso, termina configuración y validación local y enumera los datos pendientes; estas skills no conceden permisos por sí mismas.

Normalmente publica la API primero, configura su origen en Vercel, publica frontend y actualiza orígenes permitidos con su URL real. Repite la verificación del navegador después de cualquier cambio de variables de build. Configura SPOTIFY_CLIENT_ID público en Railway y registra https://<frontend>/spotify/callback en Spotify. Comprueba rewrite callback Vercel; PKCE no usa secreto.

Verifica HTTPS, `/health`, búsqueda desde el navegador, CORS, importación MP3, persistencia y navegación en ambas vistas. Una respuesta HTTP de la portada no demuestra que la integración funciona. Entrega URLs solo cuando estén verificadas e informa pruebas que requieren credenciales o audio manual por separado.
