import { test, expect } from '@playwright/test';

test('opens a pre-refactor library, keeps MP3 blobs and node IDs, and saves edits in the same format', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('current-title')).toBeVisible();
  await page.evaluate(async () => {
    const audio = await (await fetch('/samples/orbit.mp3')).blob();
    const local = { source: 'local', trackId: 'old-local', title: 'Existing local song', artists: ['Existing artist'],
      coverUrl: null, durationMs: 32000, assetId: 'old-asset', fileName: 'orbit.mp3', mimeType: 'audio/mpeg', fileSize: audio.size };
    const remote = { source: 'spotify', trackId: 'spotify:existing', title: 'Existing Spotify song', artists: ['Remote artist'],
      coverUrl: null, durationMs: 123000, spotifyUri: 'spotify:track:existing', spotifyUrl: 'https://open.spotify.com/track/existing' };
    const stored = { version: 1, activeId: 'old-playlist', playlists: [
      { schemaVersion: 1, playlistId: 'old-playlist', name: 'My previous playlist', artwork: 0, currentNodeId: 'old-local-node',
        entries: [{ nodeId: 'old-local-node', track: local }, { nodeId: 'old-spotify-node', track: remote }, { nodeId: 'old-repeat-node', track: local }] },
      { schemaVersion: 1, playlistId: 'other-playlist', name: 'Other playlist', artwork: 1, currentNodeId: null, entries: [] },
    ], catalog: [local, remote], favoriteIds: ['old-local'], historyIds: ['spotify:existing'] };
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('auralis-library', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const transaction = db.transaction(['state', 'assets'], 'readwrite');
        transaction.objectStore('state').put(stored, 'library');
        transaction.objectStore('assets').put({ audio, cover: null }, 'old-asset');
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      };
    });
  });
  await page.reload();
  await expect(page.getByTestId('current-title')).toHaveText('Existing local song');
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await expect.poll(async () => Number(await page.getByLabel('Progreso de reproducción', { exact: true }).inputValue())).toBeGreaterThan(.2);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.getByRole('button', { name: 'Favoritos', exact: true }).click();
  await expect(page.locator('.collection-list .track-text strong')).toHaveText(['Existing local song']);
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  const rows = page.getByTestId('queue-list').locator('.track-row');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toHaveAttribute('data-node-id', 'old-local-node');
  await expect(rows.nth(1)).toHaveAttribute('data-node-id', 'old-spotify-node');
  await expect(rows.nth(2)).toHaveAttribute('data-node-id', 'old-repeat-node');
  await rows.nth(1).locator('summary').click();
  await rows.nth(1).getByRole('button', { name: 'Eliminar de esta lista' }).click();
  await page.waitForTimeout(400); await page.reload();
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveAttribute('data-node-id', 'old-local-node');
  await expect(rows.nth(1)).toHaveAttribute('data-node-id', 'old-repeat-node');
  await page.getByRole('button', { name: 'Ver estructura de lista doble' }).click();
  await expect(page.locator('.node-card').first()).toContainText('next: old-repe');
  await expect(page.locator('.node-card').last()).toContainText('previous: old-loca');
});
