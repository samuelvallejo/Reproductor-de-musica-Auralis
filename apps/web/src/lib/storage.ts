import { openDB } from 'idb';

export interface AudioAsset { audio: Blob; cover: Blob | null }
const database = () => openDB('auralis-library', 1, { upgrade(db) { db.createObjectStore('state'); db.createObjectStore('assets'); } });
export async function loadLibrary(): Promise<unknown> { const db = await database(); try { return await db.get('state', 'library'); } finally { db.close(); } }
export async function saveLibrary(value: unknown) { const db = await database(); try { await db.put('state', value, 'library'); } finally { db.close(); } }
export async function saveAsset(id: string, asset: AudioAsset) { const db = await database(); try { await db.put('assets', asset, id); } finally { db.close(); } }
export async function loadAsset(id: string): Promise<AudioAsset | undefined> { const db = await database(); try { return await db.get('assets', id); } finally { db.close(); } }
