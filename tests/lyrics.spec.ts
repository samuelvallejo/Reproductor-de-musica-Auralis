import { test, expect } from '@playwright/test';
import path from 'node:path';

test('opens the lyrics from the player toolbar and follows the current song', async ({ page }) => {
  await page.route('https://lrclib.net/api/get?**', route => route.fulfill({ json: {
    plainLyrics: 'First test line\nSecond test line',
    syncedLyrics: '[00:00.00]First test line\n[00:01.00]Second test line',
    instrumental: false,
  } }));
  await page.goto('/');
  await expect(page.getByTestId('current-title')).toHaveText('Un mundo más tuyo.');
  await page.getByRole('button', { name: 'Nueva playlist', exact: true }).click();
  await page.getByLabel('Nombre de la playlist').fill('My music');
  await page.getByRole('button', { name: 'Crear playlist', exact: true }).last().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Importa tu primera canción', exact: true }).click();
  await page.getByLabel('Seleccionar archivos MP3').setInputFiles(path.resolve('apps/web/public/samples/orbit.mp3'));
  const insertButton = page.getByRole('button', { name: 'Añadir a playlist', exact: true });
  await insertButton.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('region', { name: 'Reproductor principal' }).getByRole('button', { name: 'Ver letra de la canción', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Órbita');
  await expect(page.locator('.synced-lyrics p')).toHaveText(['First test line', 'Second test line']);
  await expect(page.locator('.current-lyric')).toHaveText('First test line');
  await expect(page.locator('.lyrics-attribution')).toContainText('LRCLIB');
});
