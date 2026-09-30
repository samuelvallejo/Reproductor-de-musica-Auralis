# Original artwork

La portada principal se generó mediante la herramienta integrada **ImageGen**, usando la skill `imagegen`. Está guardada en [apps/web/public/artwork/orbit-cover.png](../apps/web/public/artwork/orbit-cover.png). No depende de una ruta temporal o del directorio interno de Codex.

Prompt utilizado:

```text
Use case: stylized-concept. Asset type: original square album-style default artwork
for the Auralis music player. Create a richly detailed cinematic otherworldly
landscape: two enormous overlapping moons or planets rising above a midnight blue
mountain valley and a still reflective river, a turquoise-blue planet behind and a
luminous pink/peach planet lower left, warm peach sunset and violet atmospheric
haze at the horizon, one very thin vertical beam of pale cyan light near the left
edge, tiny distant stars. Color palette dark navy, cobalt, soft purple, peach-pink
and cyan. Painterly photoreal science-fiction matte painting with textured rocky
mountains and planet surfaces, atmospheric lighting, serene dreamlike luxurious
mood. Square composition, high detail, no frame, no typography, no music controls,
no people, no logos, no watermark. This is artwork only, not an app mockup.
```

Los otros paisajes son SVG originales definidos en `scripts/generate-artwork.mjs`; se regeneran con Node sin servicios externos. Son portadas predeterminadas de playlists o archivos sin portada, no supuestas portadas oficiales de canciones Spotify.

Cuando un MP3 incluye una imagen ID3, esa imagen tiene prioridad. Cuando Spotify devuelve una portada, se utiliza el enlace real provisto por su API. Las dos capturas de diseño originales del usuario se conservan separadas en `assets/design` como referencia de implementación.
