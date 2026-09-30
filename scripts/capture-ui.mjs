import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const output = new URL('../screenshots/', import.meta.url);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, colorScheme: 'dark' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://127.0.0.1:5173');
await page.getByRole('button', { name: 'Probar sesión' }).click();
await page.getByTestId('current-title').filter({ hasText: 'Órbita' }).waitFor();
await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
await page.getByRole('button', { name: 'Pausar', exact: true }).waitFor();
await page.getByRole('button', { name: 'Cerrar aviso' }).click();
await page.waitForTimeout(1200);
for (const [name, width, height, theme] of [
  ['desktop-dark', 1440, 1080, 'dark'], ['desktop-light', 1440, 1080, 'light'],
  ['mobile-dark', 375, 1060, 'dark'], ['mobile-light', 375, 1060, 'light'],
  ['tablet-dark', 768, 1080, 'dark'],
]) {
  await page.setViewportSize({ width, height });
  await page.getByRole('combobox', { name: 'Tema de la aplicación' }).selectOption(theme);
  await page.waitForTimeout(350);
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: true });
}
console.log(JSON.stringify({ screenshots: 5, browserErrors: errors }));
await browser.close();
