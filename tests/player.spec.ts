import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
const sample = (name: string) => path.resolve('apps/web/public/samples', `${name}.mp3`);
async function importTracks(page: Page, names: string[], mode = 'Al final', position?: number) {
  await page.getByRole('button', { name: 'Importa tu primera canción', exact: true }).isVisible().then(async visible => {
    if (visible) await page.getByRole('button', { name: 'Importa tu primera canción', exact: true }).click();
    else { await page.getByRole('button', { name: 'Biblioteca', exact: true }).click(); await page.getByRole('button', { name: 'Importar MP3', exact: true }).click(); }
  });
  await page.getByLabel('Seleccionar archivos MP3').setInputFiles(names.map(sample));
  await expect(page.getByRole('dialog')).toContainText('Dale un lugar a esta canción');
  await page.getByLabel(mode, { exact: true }).check();
  if (position !== undefined) await page.getByLabel('Posición de inserción').fill(String(position));
  await page.getByRole('button', { name: 'Añadir a playlist', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

test('imports real MP3 audio, navigates links, deletes current and persists after reload', async ({ page }) => {
  await page.goto('/'); await importTracks(page, ['orbit', 'liquid-light', 'blue-hour']);
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await expect(page.getByTestId('current-title')).toHaveText('Órbita');
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await expect.poll(async () => Number(await page.getByLabel('Progreso de reproducción', { exact: true }).inputValue())).toBeGreaterThan(.2);
  await page.getByRole('combobox', { name: 'Tema de la aplicación' }).selectOption('light');
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Canción siguiente', exact: true }).click();
  await expect(page.getByTestId('current-title')).toHaveText('Luz líquida');
  await page.getByRole('button', { name: 'Canción anterior', exact: true }).click();
  await expect(page.getByTestId('current-title')).toHaveText('Órbita');
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  const firstRow = page.getByTestId('queue-list').locator('.track-row').first();
  await firstRow.locator('summary').click(); await firstRow.getByRole('button', { name: 'Eliminar de esta lista' }).click();
  await expect(page.getByTestId('queue-list').locator('.track-row')).toHaveCount(2);
  await expect(page.getByTestId('queue-list').locator('.track-row').first()).toContainText('Luz líquida');
  await page.waitForTimeout(400); await page.reload();
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await expect(page.getByTestId('queue-list').locator('.track-row')).toHaveCount(2);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await expect(page.getByTestId('current-title')).toHaveText('Luz líquida');
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
});

test('inserts at beginning and an interior position and exposes the actual links', async ({ page }) => {
  await page.goto('/'); await importTracks(page, ['orbit']);
  await importTracks(page, ['blue-hour'], 'Al inicio');
  await importTracks(page, ['liquid-light'], 'En posición', 2);
  const rows = page.getByTestId('queue-list').locator('.track-text strong');
  await expect(rows).toHaveText(['La hora azul', 'Luz líquida', 'Órbita']);
  await page.getByRole('button', { name: 'Ver estructura de lista doble' }).click();
  await expect(page.locator('.node-card')).toHaveCount(3);
  await expect(page.locator('.node-card').first()).toContainText('previous: null');
  await expect(page.locator('.node-card').last()).toContainText('next: null');
});

test('creates and renames playlists, favorites a track and rejects invalid MP3 files', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Nueva playlist', exact: true }).click();
  await page.getByLabel('Nombre de la playlist').fill('Mi taller'); await page.getByRole('button', { name: 'Crear playlist', exact: true }).last().click();
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await expect(page.getByLabel('Playlist activa')).toContainText('Mi taller');
  await page.getByRole('button', { name: 'Renombrar playlist' }).click(); await page.getByLabel('Nombre de la playlist').fill('Mi taller editado'); await page.getByRole('button', { name: 'Guardar nombre' }).click();
  await expect(page.getByLabel('Playlist activa')).toContainText('Mi taller editado');
  await page.getByRole('button', { name: 'Importar MP3', exact: true }).click();
  await page.getByLabel('Seleccionar archivos MP3').setInputFiles({ name: 'invalid.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('this is not an MP3') });
  await expect(page.getByRole('dialog')).toContainText('invalid.mp3'); await page.getByRole('button', { name: 'Cerrar ventana' }).click();
  await page.getByRole('button', { name: 'Inicio', exact: true }).click(); await importTracks(page, ['orbit']);
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar canción en favoritos', exact: true }).click();
  await page.getByRole('button', { name: 'Favoritos', exact: true }).click(); await expect(page.locator('.collection-list .track-text strong')).toHaveText(['Órbita']);
});

test('seeks real audio, changes volume, repeats on ended and stops after removing the final node', async ({ page }) => {
  await page.goto('/'); await importTracks(page, ['orbit']);
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  const progress = page.getByRole('slider', { name: 'Progreso de reproducción', exact: true });
  const volume = page.getByRole('slider', { name: 'Volumen', exact: true });
  await volume.focus(); await volume.press('Home'); await expect(volume).toHaveValue('0');
  await volume.press('End'); await expect(volume).toHaveValue('1');
  await page.getByRole('button', { name: 'Repetir canción', exact: true }).click();
  await progress.focus(); await progress.press('End');
  await expect.poll(async () => Number(await progress.inputValue())).toBeLessThan(3);
  await expect(page.getByTestId('current-title')).toHaveText('Órbita');
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  const row = page.getByTestId('queue-list').locator('.track-row').first();
  await row.locator('summary').click(); await row.getByRole('button', { name: 'Eliminar de esta lista' }).click();
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await expect(page.getByTestId('current-title')).toHaveText('Un mundo más tuyo.');
  await expect(page.getByRole('button', { name: 'Reproducir', exact: true })).toBeDisabled();
});

test('has no horizontal overflow at 320, 375, 768 and 1440px in both themes', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark']) {
      await page.getByRole('combobox', { name: 'Tema de la aplicación' }).selectOption(theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByTestId('current-title')).toBeVisible();
    }
  }
});
