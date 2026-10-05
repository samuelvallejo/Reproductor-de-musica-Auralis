import { describe, expect, it } from 'vitest';
import { DoublyLinkedList, LinkedSequence, PlaylistController, type LocalTrack } from './index.js';

describe('Moving existing doubly linked nodes', () => {
  it('moves head, tail and interior without replacing identities or values', () => {
    const list = new DoublyLinkedList<string>();
    const a = list.append('A', 'a'); const b = list.append('B', 'b'); const c = list.append('C', 'c');
    expect(list.moveBefore('c', 'a')).toBe(true);
    expect(list.head).toBe(c); expect(c.next).toBe(a); expect(a.previous).toBe(c);
    list.assertInvariants();
    expect(list.moveAfter('c', 'b')).toBe(true);
    expect(list.tail).toBe(c); expect(c.previous).toBe(b); expect(b.next).toBe(c);
    expect(list.getNodeById('c')).toBe(c); expect(list.size).toBe(3);
    list.moveAfter('b', null); expect(list.head).toBe(b);
    list.moveBefore('b', null); expect(list.tail).toBe(b);
    expect([...list].map(node => node.value)).toEqual(['A', 'C', 'B']);
    list.assertInvariants();
  });
  it('treats self, adjacent and endpoint moves as no-ops and rejects stale IDs atomically', () => {
    const list = new DoublyLinkedList<string>(); const a = list.append('A', 'a'); list.append('B', 'b');
    expect(list.moveBefore('a', 'a')).toBe(false);
    expect(list.moveAfter('a', 'a')).toBe(false);
    expect(list.moveBefore('a', 'b')).toBe(false);
    expect(list.moveAfter('b', 'a')).toBe(false);
    expect(list.moveBefore('b', null)).toBe(false);
    expect(list.moveAfter('a', null)).toBe(false);
    expect(() => list.moveBefore('a', 'missing')).toThrow();
    expect(() => list.moveAfter('missing', 'b')).toThrow();
    expect(list.head).toBe(a); expect(list.size).toBe(2); list.assertInvariants();
    const single = new DoublyLinkedList<string>(); single.append('Only', 'only');
    expect(single.moveBefore('only', null)).toBe(false);
    expect(single.moveAfter('only', null)).toBe(false); single.assertInvariants();
  });
  it('retains cursor identity and follows the new neighbors after reordering', () => {
    const track = (title: string): LocalTrack => ({
      source: 'local', trackId: title, title, artists: new LinkedSequence<string>().append('Artist'),
      coverUrl: null, durationMs: 1000, assetId: title, fileName: title + '.mp3', mimeType: 'audio/mpeg', fileSize: 10,
    });
    const controller = new PlaylistController('playlist', 'Reordering');
    const a = controller.insertAt(0, track('A'), 'a'); const b = controller.insertAt(1, track('B'), 'b');
    const c = controller.insertAt(2, track('C'), 'c');
    controller.select(b.nodeId); controller.moveAfter(b.nodeId, c.nodeId);
    expect(controller.currentNode).toBe(b);
    expect(controller.previous()).toBe(c); expect(controller.previous()).toBe(a);
    expect(controller.next()).toBe(c); expect(controller.next()).toBe(b);
    const restored = PlaylistController.restore(controller.serialize());
    expect(restored.currentNode?.nodeId).toBe('b');
    expect([...restored.list].map(node => node.nodeId)).toEqual(['a', 'c', 'b']);
    restored.list.assertInvariants();
  });
  it('preserves links across 2000 mixed moves using an independent array oracle', () => {
    const list = new DoublyLinkedList<number>(); const oracle: string[] = [];
    for (let index = 0; index < 25; index++) { const id = 'node-' + index; list.append(index, id); oracle.push(id); }
    let seed = 41932;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % 25; };
    for (let step = 0; step < 2000; step++) {
      const sourceId = 'node-' + random(); const targetId = 'node-' + random();
      const after = step % 2 === 0;
      const reference = list.getNodeById(sourceId);
      if (after) list.moveAfter(sourceId, targetId); else list.moveBefore(sourceId, targetId);
      if (sourceId !== targetId) {
        oracle.splice(oracle.indexOf(sourceId), 1);
        oracle.splice(oracle.indexOf(targetId) + (after ? 1 : 0), 0, sourceId);
      }
      list.assertInvariants(); expect(list.getNodeById(sourceId)).toBe(reference);
      expect([...list].map(node => node.nodeId)).toEqual(oracle);
    }
  });
});
