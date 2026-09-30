# Railway backend

Configura instalación y build reproducibles del workspace y un start que ejecute el JavaScript compilado del API. Confirma el directorio de salida generado por el `tsconfig` real. No utilices el servidor de desarrollo como proceso de producción.

Escucha `Number(process.env.PORT)` y host `0.0.0.0`; usa un puerto alternativo solo en desarrollo. Railway documenta estos requisitos en [Application failed to respond](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond).

Publica un dominio HTTPS e implementa `/health`, sin necesidad de contactar Spotify en cada chequeo. Configura la ruta en [Healthchecks](https://docs.railway.com/deployments/healthchecks); ese chequeo verifica activación del despliegue, no monitoreo permanente ni disponibilidad del catálogo Spotify.


El alcance inicial no depende del disco del contenedor: archivos MP3 y playlists viven en IndexedDB. Si se solicita almacenamiento compartido futuro, diseña persistencia duradera y permisos antes de recibir archivos; no uses una carpeta temporal como biblioteca de producción.
