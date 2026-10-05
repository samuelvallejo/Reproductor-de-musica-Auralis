import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

async function openLibrary(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nueva playlist', exact: true }).click();
  await page.getByLabel('Nombre de la playlist').fill('My songs');
  await page.getByRole('button', { name: 'Crear playlist', exact: true }).last().click();
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
}

test('removes a library entry persistently while preserving its playing playlist node and MP3', async ({ page }) => {
  await openLibrary(page);
  await page.getByRole('button', { name: 'Importar MP3', exact: true }).click();
  await page.getByLabel('Seleccionar archivos MP3').setInputFiles(['orbit', 'liquid-light'].map(name => path.resolve('apps/web/public/samples', name + '.mp3')));
  const insertButton = page.getByRole('button', { name: 'Añadir a playlist', exact: true });
  await insertButton.click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const catalog = page.locator('.collection-list');
  const queue = page.getByTestId('queue-list');
  await expect(queue.locator('.track-row')).toHaveCount(2);
  const nodeId = await queue.locator('.track-row').first().getAttribute('data-node-id');
  await catalog.getByRole('button', { name: 'Guardar Órbita en favoritos', exact: true }).click();
  await queue.getByRole('button', { name: 'Seleccionar Órbita', exact: true }).click();
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await expect.poll(async () => Number(await page.getByLabel('Progreso de reproducción', { exact: true }).inputValue())).toBeGreaterThan(.2);
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  const orbit = catalog.locator('.track-row').filter({ hasText: 'Órbita' });
  await orbit.locator('summary').click();
  await orbit.getByRole('button', { name: 'Eliminar de la biblioteca', exact: true }).click();
  await expect(catalog.locator('.track-text strong')).toHaveText(['Luz líquida']);
  await expect(catalog.locator('summary')).toBeFocused();
  await expect(queue.locator('.track-row')).toHaveCount(2);
  await expect(queue.locator('.track-row').first()).toHaveAttribute('data-node-id', nodeId!);
  await page.getByRole('button', { name: 'Favoritos', exact: true }).click();
  await expect(page.locator('.collection-list .track-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await expect(page.getByTestId('current-title')).toHaveText('Órbita');
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await expect(page.locator('.recent-section .track-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.waitForTimeout(400); await page.reload();
  await expect(page.getByTestId('current-title')).toHaveText('Órbita');
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await expect(catalog.locator('.track-text strong')).toHaveText(['Luz líquida']);
  await expect(queue.locator('.track-row').first()).toHaveAttribute('data-node-id', nodeId!);
  await queue.locator('.track-row').first().locator('summary').click();
  await queue.locator('.track-row').first().getByRole('button', { name: 'Añadir a playlist', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Añadir a playlist', exact: true }).click();
  await expect(catalog.locator('.track-text strong')).toHaveText(['Luz líquida', 'Órbita']);
  await expect(queue.locator('.track-row')).toHaveCount(3);
});

test('removes a Spotify metadata entry and the last library row without changing playlist links', async ({ page }) => {
  await page.goto('/'); await expect(page.getByTestId('current-title')).toBeVisible();
  await page.evaluate(async () => {
    const track = { source: 'spotify', trackId: 'spotify:fixture', title: 'Fixture track', artists: ['Fixture artist'],
      durationMs: 123000, coverUrl: null, spotifyUri: 'spotify:track:fixture', spotifyUrl: 'https://open.spotify.com/track/fixture' };
    const playlist = { schemaVersion: 1, playlistId: 'mine', name: 'My songs', artwork: 0, currentNodeId: 'first',
      entries: [{ nodeId: 'first', track }, { nodeId: 'repeat', track }] };
    const saved = { version: 1, activeId: 'mine', playlists: [playlist], catalog: [track], favoriteIds: [track.trackId], historyIds: [track.trackId], starterPlaylistsRemoved: true };
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('auralis-library', 1); open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result; const transaction = db.transaction('state', 'readwrite');
        transaction.objectStore('state').put(saved, 'library');
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      };
    });
  });
  await page.reload(); await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  const catalog = page.locator('.collection-list');
  await catalog.locator('summary').click();
  await catalog.getByRole('button', { name: 'Eliminar de la biblioteca', exact: true }).click();
  await expect(catalog.locator('.track-row')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Importar MP3', exact: true })).toBeFocused();
  await expect(page.getByTestId('queue-list').locator('.track-row')).toHaveCount(2);
  await page.waitForTimeout(400); await page.reload();
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await expect(catalog.locator('.track-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver estructura de lista doble' }).click();
  await expect(page.locator('.node-card').first()).toContainText('next: repeat');
  await expect(page.locator('.node-card').last()).toContainText('previous: first');
});
