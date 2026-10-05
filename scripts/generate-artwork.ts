import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LinkedSequence } from '@auralis/playlist-core';

interface Palette {
  name: string;
  dark: string;
  mid: string;
  pink: string;
  peach: string;
  cyan: string;
}

const output = fileURLToPath(new URL('../apps/web/public/artwork/', import.meta.url));
mkdirSync(output, { recursive: true });
const palettes = new LinkedSequence<Palette>()
  .append({ name: 'orbit', dark: '#061b37', mid: '#516cad', pink: '#e28bad', peach: '#f6c2a5', cyan: '#53cdda' })
  .append({ name: 'dawn', dark: '#463753', mid: '#b57691', pink: '#f7b4a0', peach: '#ffd59d', cyan: '#82aaab' })
  .append({ name: 'night', dark: '#080e2f', mid: '#314c88', pink: '#bd6fa4', peach: '#e9a9c8', cyan: '#5baac2' })
  .append({ name: 'coast', dark: '#1b2d52', mid: '#675d8b', pink: '#e7aab2', peach: '#fbcbac', cyan: '#5aabc7' });
for (const { name, dark, mid, pink, peach, cyan } of palettes) {
  let stars = '';
  for (let index = 0; index < 90; index += 1) {
    stars += `<circle cx="${(index * 137 + 41) % 700}" cy="${(index * 83 + 20) % 510}" r="${index % 3 === 0 ? 1.3 : .7}" fill="#fff0eb" opacity="${.25 + index % 4 * .12}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 700">
  <defs>
    <linearGradient id="sky" x2=".5" y2="1"><stop stop-color="${dark}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${pink}"/></linearGradient>
    <radialGradient id="planet" cx=".22" cy=".76" r=".86"><stop stop-color="${peach}"/><stop offset=".36" stop-color="${pink}"/><stop offset=".69" stop-color="${mid}"/><stop offset="1" stop-color="${cyan}"/></radialGradient>
    <linearGradient id="river" x2="1" y2=".6"><stop stop-color="${cyan}"/><stop offset=".46" stop-color="${peach}"/><stop offset="1" stop-color="${pink}"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".065"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter>
  </defs>
  <g filter="url(#grain)"><path fill="url(#sky)" d="M0 0h700v700H0z"/>${stars}
  <ellipse cx="410" cy="255" rx="200" ry="197" fill="${cyan}" opacity=".15" filter="url(#glow)"/>
  <circle cx="422" cy="245" r="165" fill="url(#planet)"/>
  <path d="M302 130 Q473 237 550 350" fill="none" stroke="${peach}" opacity=".13" stroke-width="30"/>
  <circle cx="219" cy="358" r="125" fill="url(#planet)"/>
  <path d="M92 0v495" stroke="${cyan}" stroke-width="8" opacity=".35" filter="url(#glow)"/><path d="M92 0v495" stroke="#d7f2f2" stroke-width="1.5"/>
  <path d="M0 484L64 420l76 58 59-53 81 79 72-18 72 18 57-52 42 13 38-21 58 45 83-18v229H0z" fill="${dark}"/>
  <path d="M0 542l93-68 52 49 77-31 109 67 72-23 66 28 105-54 126 34v156H0z" fill="${mid}" opacity=".65"/>
  <path d="M0 603l108-38 96 17 117-19 130 44 115-20 134 28v85H0z" fill="${dark}"/>
  <path d="M295 566q99 31 25 50t60 84h156q-161-39-103-58t-35-66z" fill="url(#river)" opacity=".88"/>
  <path d="M0 657l118-56 117 43 51-7-29 63H0z" fill="${dark}"/>
  <path d="M43 585l50-35 28 13M98 570l11 19 58 11M563 544l22-21 18 13M496 612l68-18 36 17" fill="none" stroke="${cyan}" opacity=".3" stroke-width="2"/>
  </g></svg>`;
  writeFileSync(`${output}/${name}.svg`, svg);
}
writeFileSync(fileURLToPath(new URL('../apps/web/public/favicon.svg', import.meta.url)), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g"><stop stop-color="#f3b7bf"/><stop offset="1" stop-color="#65d5de"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="#10182f"/><path d="M13 47L29 15h6l16 32h-9l-4-9H25l-4 9zm16-17h6l-3-8z" fill="url(#g)"/></svg>');
console.log('Four original Auralis vector artworks generated.');
