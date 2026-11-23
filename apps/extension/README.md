# Extensión de Chrome

Intercepta las descargas de Chrome y manda el enlace al linkgrabber del descargador, como la extensión de
JDownloader. Habla con la web por `POST /api/jd`, así que el servidor no necesita nada más.

## Instalar

1. Abre `chrome://extensions` y activa el **Modo de desarrollador**.
2. **Cargar descomprimida** y elige esta carpeta (`apps/extension`).
3. En las opciones de la extensión revisa la URL del descargador (por defecto `http://192.168.20.188:3008`) y pulsa
   **Probar conexión**.

Tras un `git pull` que cambie la extensión, pulsa el botón de recargar de la extensión en `chrome://extensions`.

## Uso

- Cualquier descarga de Chrome se cancela en cuanto empieza y su enlace va al linkgrabber. La notificación abre el
  linkgrabber al hacer clic.
- Clic en el icono de la barra: activa o desactiva la intercepción (badge `ON`/`OFF`).
- Clic derecho en un enlace, **Enviar al descargador**: lo manda aunque la intercepción esté desactivada.
- Si el descargador no responde, la descarga vuelve a hacerse en Chrome y sale un aviso.
- No se interceptan las descargas `blob:` y `data:` (las generan las propias páginas), las de la web del descargador
  ni las de los hosts excluidos.

JDownloader descarga desde el servidor, sin las cookies del navegador: lo que solo se puede descargar con sesión
iniciada fallará allí. Para eso, desactiva la intercepción o añade el host a los excluidos.
