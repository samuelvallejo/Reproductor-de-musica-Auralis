import { test, expect, type Page, type BrowserContext, type Locator } from '@playwright/test';
import path from 'node:path';

async function createPlaylist(page: Page, name = 'My playlist') {
  await page.getByRole('button', { name: 'Nueva playlist', exact: true }).click();
  await page.getByLabel('Nombre de la playlist').fill(name);
  await page.getByRole('button', { name: 'Crear playlist', exact: true }).last().click();
}
async function prepareQueue(page: Page) {
  await page.goto('/'); await createPlaylist(page);
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await page.getByRole('button', { name: 'Importar MP3', exact: true }).click();
  await page.getByLabel('Seleccionar archivos MP3').setInputFiles(['orbit', 'liquid-light', 'blue-hour'].map(name => path.resolve('apps/web/public/samples', name + '.mp3')));
  const insertion = page.getByRole('button', { name: 'Añadir a playlist', exact: true });
  await insertion.click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const queue = page.getByTestId('queue-list');
  await expect(queue.locator('.track-text strong')).toHaveText(['Órbita', 'Luz líquida', 'La hora azul']);
  return queue;
}

test('adds MP3 tracks at the start, end, or a selected position', async ({ page }) => {
  await page.goto('/'); await createPlaylist(page);
  const queue = page.getByTestId('queue-list');
  const addMp3 = async (track: string, mode: 'start' | 'end' | 'position', position?: number) => {
    await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
    await page.getByRole('button', { name: 'Importar MP3', exact: true }).click();
    await page.getByLabel('Seleccionar archivos MP3').setInputFiles(path.resolve('apps/web/public/samples', `${track}.mp3`));
    await expect(page.getByRole('heading', { name: 'Dale un lugar a tu música' })).toBeVisible();
    if (mode !== 'start') await page.getByRole('radio', { name: mode === 'end' ? 'Al final' : 'En cualquier posición' }).check();
    if (mode === 'position') await page.getByLabel('Posición de inserción').fill(String(position));
    await page.getByRole('button', { name: 'Añadir a playlist', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  };

  await addMp3('orbit', 'start');
  await addMp3('blue-hour', 'end');
  await addMp3('liquid-light', 'position', 2);
  await expect(queue.locator('.track-text strong')).toHaveText(['Órbita', 'Luz líquida', 'La hora azul']);
});

test('starts with no demo playlists and allows deleting the last user playlist', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Crear mi primera playlist' })).toBeVisible();
  await expect(page.locator('.sidebar-playlist')).toHaveCount(0);
  await createPlaylist(page, 'Concentración');
  await expect(page.locator('.sidebar-playlist')).toHaveCount(1);
  await expect(page.locator('.sidebar-playlist')).toContainText('Concentración');
  await page.waitForTimeout(400); await page.reload();
  await expect(page.locator('.sidebar-playlist')).toHaveCount(1);
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await page.getByRole('button', { name: 'Eliminar playlist', exact: true }).click();
  await page.getByRole('button', { name: 'Eliminar esta playlist', exact: true }).click();
  await expect(page.locator('.sidebar-playlist')).toHaveCount(0);
  await page.waitForTimeout(400); await page.reload();
  await expect(page.getByRole('button', { name: 'Crear mi primera playlist' })).toBeVisible();
});

async function touchDrag(page: Page, context: BrowserContext, handle: Locator, target: Locator) {
  await handle.scrollIntoViewIfNeeded();
  const from = await handle.boundingBox(); const to = await target.boundingBox();
  if (!from || !to) throw new Error('Missing touch drag bounds');
  const session = await context.newCDPSession(page);
  const point = { x: from.x + from.width / 2, y: from.y + from.height / 2, id: 1 };
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, x: to.x + 65, y: to.y + 8 }] });
    await expect(target).toHaveAttribute('data-drop-placement', 'before');
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await session.detach(); }
}

test('drags the existing node and keeps active MP3 playback and stored identities', async ({ page, context }, testInfo) => {
  const queue = await prepareQueue(page);
  const source = queue.locator('.track-row').nth(2);
  const sourceId = await source.getAttribute('data-node-id');
  await queue.getByRole('button', { name: 'Seleccionar Órbita', exact: true }).click();
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  const progress = page.getByLabel('Progreso de reproducción', { exact: true });
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(.2);
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await queue.scrollIntoViewIfNeeded();
  if (testInfo.project.name === 'mobile') {
    await touchDrag(page, context, source.locator('.drag-handle'), queue.locator('.track-row').first());
  } else {
    await source.locator('.drag-handle').dragTo(queue.locator('.track-row').first(), { targetPosition: { x: 70, y: 4 } });
  }
  await expect(queue.locator('.track-text strong')).toHaveText(['La hora azul', 'Órbita', 'Luz líquida']);
  await expect(queue.locator('.track-row').first()).toHaveAttribute('data-node-id', sourceId!);
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await expect(page.getByTestId('current-title')).toHaveText('Órbita');
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Canción anterior', exact: true }).click();
  await expect(page.getByTestId('current-title')).toHaveText('La hora azul');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.waitForTimeout(400); await page.reload();
  await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await expect(queue.locator('.track-text strong')).toHaveText(['La hora azul', 'Órbita', 'Luz líquida']);
  await expect(queue.locator('.track-row').first()).toHaveAttribute('data-node-id', sourceId!);
});

test('reorders with a real touch gesture on the handle', async ({ page, context }) => {
  const queue = await prepareQueue(page);
  await queue.scrollIntoViewIfNeeded();
  const handle = queue.getByRole('button', { name: 'Arrastrar La hora azul', exact: true });
  const target = queue.locator('.track-row').first();
  await touchDrag(page, context, handle, target);
  await expect(queue.locator('.track-text strong')).toHaveText(['La hora azul', 'Órbita', 'Luz líquida']);
  await expect(page.getByRole('status')).toContainText('Orden actualizado');
});

test('uses mouse pointers from the grip icon without starting native HTML drag', async ({ page }, testInfo) => {
  const queue = await prepareQueue(page);
  // Cover both the narrow home queue and the full library queue.
  if (testInfo.project.name === 'desktop') await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await queue.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    document.body.dataset.nativeDragStarts = '0';
    document.addEventListener('dragstart', () => {
      document.body.dataset.nativeDragStarts = String(Number(document.body.dataset.nativeDragStarts) + 1);
    }, { capture: true });
  });
  const source = queue.locator('.track-row').nth(2);
  const sourceId = await source.getAttribute('data-node-id');
  const icon = source.locator('.drag-handle svg');
  const target = queue.locator('.track-row').first();
  const from = await icon.boundingBox(); const to = await target.boundingBox();
  if (!from || !to) throw new Error('Missing pointer drag bounds');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 70, to.y + 8, { steps: 8 });
  await expect(target).toHaveAttribute('data-drop-placement', 'before');
  await expect(queue).toHaveAttribute('data-reordering', 'true');
  await expect(page.locator('body')).toHaveAttribute('data-native-drag-starts', '0');
  await page.mouse.up();
  await expect(queue.locator('.track-text strong')).toHaveText(['La hora azul', 'Órbita', 'Luz líquida']);
  await expect(queue.locator('.track-row').first()).toHaveAttribute('data-node-id', sourceId!);
});

test('cancels pointer reordering with Escape or a release outside the queue', async ({ page }) => {
  const queue = await prepareQueue(page); await queue.scrollIntoViewIfNeeded();
  const handle = queue.getByRole('button', { name: 'Arrastrar La hora azul', exact: true });
  const target = queue.locator('.track-row').first();
  const from = await handle.boundingBox(); const to = await target.boundingBox();
  if (!from || !to) throw new Error('Missing pointer drag bounds');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(to.x + 70, to.y + 8, { steps: 5 });
  await expect(target).toHaveAttribute('data-drop-placement', 'before');
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(queue.locator('.track-text strong')).toHaveText(['Órbita', 'Luz líquida', 'La hora azul']);
  await expect(queue).not.toHaveAttribute('data-reordering', 'true');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(to.x + 70, to.y + 8, { steps: 5 });
  await expect(target).toHaveAttribute('data-drop-placement', 'before');
  await page.mouse.move(2, 2); await page.mouse.up();
  await expect(queue.locator('.track-text strong')).toHaveText(['Órbita', 'Luz líquida', 'La hora azul']);
  await expect(queue).not.toHaveAttribute('data-reordering', 'true');
});

test('cleans empty old starters once while preserving user playlists and populated starters', async ({ page }) => {
  await page.goto('/'); await expect(page.getByTestId('current-title')).toBeVisible();
  await page.evaluate(async () => {
    const template = { schemaVersion: 1, artwork: 0, currentNodeId: null, entries: [] };
    const track = { source: 'legacy', trackId: 'keep', title: 'Keep this song', artists: ['Artist'], coverUrl: null, durationMs: 1000 };
    const saved = { version: 1, activeId: 'concentration', playlists: [
      { ...template, playlistId: 'universe', name: 'Mi universo' },
      { ...template, playlistId: 'concentration', name: 'Concentración', artwork: 1 },
      { ...template, playlistId: 'night', name: 'Noches de ciudad', artwork: 2, entries: [{ nodeId: 'kept-node', track }], currentNodeId: 'kept-node' },
      { ...template, playlistId: 'days', name: 'Días claros', artwork: 3 },
      { ...template, playlistId: 'mine', name: 'My own empty playlist' },
    ], catalog: [track], favoriteIds: [], historyIds: [] };
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('auralis-library', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result; const transaction = db.transaction('state', 'readwrite');
        transaction.objectStore('state').put(saved, 'library');
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      };
    });
  });
  await page.reload();
  await expect(page.locator('.sidebar-playlist')).toHaveCount(3);
  await expect(page.locator('.sidebar-playlist')).toContainText(['Mi universo', 'Noches de ciudad', 'My own empty playlist']);
  await page.waitForTimeout(400); await page.reload();
  await expect(page.locator('.sidebar-playlist')).toHaveCount(3);
});
