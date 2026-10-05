import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LinkedSequence } from '@auralis/playlist-core';
const output = new URL('../test-results/screenshots/', import.meta.url);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, colorScheme: 'dark' });
const page = await context.newPage();
const errors = new LinkedSequence<string>();
page.on('pageerror', error => errors.append(error.message));
await page.goto('http://127.0.0.1:5173');
await page.getByRole('button', { name: 'Probar sesión' }).click();
await page.getByTestId('current-title').filter({ hasText: 'Órbita' }).waitFor();
await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
await page.getByRole('button', { name: 'Pausar', exact: true }).waitFor();
await page.getByRole('button', { name: 'Cerrar aviso' }).click();
await page.waitForTimeout(1200);
const viewports = new LinkedSequence<{ name: string; width: number; height: number; theme: 'dark' | 'light' }>()
  .append({ name: 'desktop-dark', width: 1440, height: 1080, theme: 'dark' })
  .append({ name: 'desktop-light', width: 1440, height: 1080, theme: 'light' })
  .append({ name: 'mobile-dark', width: 375, height: 1060, theme: 'dark' })
  .append({ name: 'mobile-light', width: 375, height: 1060, theme: 'light' })
  .append({ name: 'tablet-dark', width: 768, height: 1080, theme: 'dark' });
for (const { name, width, height, theme } of viewports) {
  await page.setViewportSize({ width, height });
  await page.getByRole('combobox', { name: 'Tema de la aplicación' }).selectOption(theme);
  await page.waitForTimeout(350);
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: true });
}
console.log(JSON.stringify({ screenshots: viewports.length, browserErrors: errors.join('\n') }));
await browser.close();
