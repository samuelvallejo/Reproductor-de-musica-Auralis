import { describe, expect, it } from 'vitest';
import { DoublyLinkedList, PlaylistController, type LocalTrack } from './index.js';
const track = (title: string): LocalTrack => ({ trackId: title, source: 'local', title, artists: ['Test artist'], coverUrl: null, durationMs: 1000, assetId: title, fileName: `${title}.mp3`, mimeType: 'audio/mpeg', fileSize: 100 });

describe('DoublyLinkedList', () => {
  it('inserts at both endpoints and interior with reciprocal links', () => {
    const list = new DoublyLinkedList<string>();
    const middle = list.append('B'); const first = list.prepend('A'); const last = list.append('D'); const third = list.insertAt(2, 'C');
    expect([...list].map(node => node.value)).toEqual(['A', 'B', 'C', 'D']);
    expect([...list.reverse()].map(node => node.value)).toEqual(['D', 'C', 'B', 'A']);
    expect(first.next).toBe(middle); expect(middle.previous).toBe(first); expect(third.next).toBe(last); expect(last.previous).toBe(third);
    expect(first.previous).toBeNull(); expect(last.next).toBeNull(); list.assertInvariants();
  });
  it.each([-1, .5, NaN, Infinity, 2])('rejects invalid insertion %s without mutation', index => {
    const list = new DoublyLinkedList<string>(); list.append('A');
    expect(() => list.insertAt(index, 'B')).toThrow(RangeError); expect(list.size).toBe(1); list.assertInvariants();
  });
  it('removes endpoints, middle and last and rejects reused IDs', () => {
    const list = new DoublyLinkedList<string>(); list.append('A', 'a'); list.append('B', 'b'); list.append('C', 'c');
    expect(() => list.append('duplicate', 'a')).toThrow(); list.removeById('b'); list.assertInvariants();
    list.removeById('a'); list.assertInvariants(); list.removeById('c'); list.assertInvariants();
    expect(list.head).toBeNull(); expect(list.tail).toBeNull(); expect(list.removeById('missing')).toBeNull();
  });
  it('preserves invariants across 1200 deterministic mixed operations', () => {
    const list = new DoublyLinkedList<number>(); const oracle: { id: string; value: number }[] = [];
    let seed = 123456;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
    for (let value = 0; value < 1200; value++) {
      if (random() < .65 || !oracle.length) {
        const index = Math.floor(random() * (oracle.length + 1)); const id = `node-${value}`;
        list.insertAt(index, value, id); oracle.splice(index, 0, { id, value });
      } else {
        const index = Math.floor(random() * oracle.length); const [removed] = oracle.splice(index, 1); list.removeById(removed!.id);
        expect(list.getNodeById(removed!.id)).toBeNull();
      }
      list.assertInvariants();
      expect([...list].map(node => ({ id: node.nodeId, value: node.value }))).toEqual(oracle);
      expect([...list.reverse()].map(node => node.value)).toEqual(oracle.map(node => node.value).reverse());
    }
    list.clear(); list.assertInvariants(); expect(list.size).toBe(0);
  });
});

describe('PlaylistController', () => {
  it('migrates old catalog entries without losing neighboring local nodes or selection', () => {
    const local = track('Local');
    const restored = PlaylistController.restore({ schemaVersion: 1, playlistId: 'old', name: 'Existing', artwork: 0, currentNodeId: 'old-node', entries: [
      { nodeId: 'old-node', track: { trackId: 'old-song', source: 'audius', title: 'Old song', artists: ['Old artist'], coverUrl: null, durationMs: 123000, audiusId: 'old', audiusUrl: 'https://audius.co/old', streamUrl: 'https://api.audius.co/old/stream' } },
      { nodeId: 'local-node', track: local },
    ] });
    expect(restored.currentNode?.value.source).toBe('legacy'); expect(restored.currentNode?.nodeId).toBe('old-node');
    expect(restored.currentNode?.value).not.toHaveProperty('streamUrl');
    restored.next(); expect(restored.currentNode?.value).toEqual(local); restored.list.assertInvariants();
  });
  it('navigates references and keeps its cursor at boundaries', () => {
    const playlist = new PlaylistController('id', 'Music');
    expect(playlist.next()).toBeNull();
    const first = playlist.insertAt(0, track('A')); const second = playlist.insertAt(1, track('B'));
    expect(playlist.currentNode).toBe(first); expect(playlist.previous()).toBeNull(); expect(playlist.currentNode).toBe(first);
    expect(playlist.next()).toBe(second); expect(playlist.next()).toBeNull(); expect(playlist.currentNode).toBe(second); expect(playlist.previous()).toBe(first);
  });
  it('selects successor, predecessor and null when deleting the cursor', () => {
    const playlist = new PlaylistController('id', 'Music');
    const a = playlist.insertAt(0, track('A')); const b = playlist.insertAt(1, track('B')); const c = playlist.insertAt(2, track('C'));
    playlist.remove(a.nodeId); expect(playlist.currentNode).toBe(b);
    playlist.select(c.nodeId); playlist.remove(c.nodeId); expect(playlist.currentNode).toBe(b);
    playlist.remove(b.nodeId); expect(playlist.currentNode).toBeNull(); playlist.list.assertInvariants();
  });
  it('keeps duplicate tracks independent and copies metadata', () => {
    const playlist = new PlaylistController('id', 'Music'); const original = track('A');
    const first = playlist.insertAt(0, original); const second = playlist.insertAt(1, original);
    original.title = 'Changed'; expect(first.value.title).toBe('A'); expect(first.nodeId).not.toBe(second.nodeId);
    playlist.remove(second.nodeId); expect(playlist.currentNode).toBe(first); expect(playlist.list.size).toBe(1);
  });
  it('roundtrips order, identity and selection and rejects corrupt snapshots', () => {
    const playlist = new PlaylistController('id', 'Music'); const a = playlist.insertAt(0, track('A')); const b = playlist.insertAt(1, track('B'));
    playlist.select(b.nodeId); const snapshot = JSON.parse(JSON.stringify(playlist.snapshot())) as unknown;
    const restored = PlaylistController.restore(snapshot); expect(restored.snapshot()).toEqual(playlist.snapshot()); restored.list.assertInvariants();
    expect(restored.currentNode?.previous?.nodeId).toBe(a.nodeId);
    expect(() => PlaylistController.restore({ ...playlist.snapshot(), schemaVersion: 9 })).toThrow();
    expect(() => PlaylistController.restore({ ...playlist.snapshot(), entries: [playlist.snapshot().entries[0], playlist.snapshot().entries[0]] })).toThrow();
  });
});
