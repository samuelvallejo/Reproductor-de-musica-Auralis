import { DoublyLinkedList, type PlaylistNode } from './linked-list.js';
import { cloneTrack, playlistSnapshotSchema, type PlaylistSnapshot, type Track } from './models.js';
import { LinkedSequence } from './collections.js';
import { encodePlaylist } from './persistence.js';

export class PlaylistController {
  readonly list = new DoublyLinkedList<Track>();
  currentNode: PlaylistNode<Track> | null = null;
  constructor(readonly playlistId: string, public name: string, public artwork = 0) {}
  insertAt(index: number, track: Track, nodeId?: string) {
    const node = this.list.insertAt(index, cloneTrack(track), nodeId);
    this.currentNode ??= node;
    return node;
  }
  select(id: string) { const node = this.list.getNodeById(id); if (!node) throw new Error('Track no longer belongs to this playlist'); this.currentNode = node; return node; }
  next() { const node = this.currentNode?.next ?? null; if (node) this.currentNode = node; return node; }
  previous() { const node = this.currentNode?.previous ?? null; if (node) this.currentNode = node; return node; }
  moveBefore(id: string, beforeId: string | null) { return this.list.moveBefore(id, beforeId); }
  moveAfter(id: string, afterId: string | null) { return this.list.moveAfter(id, afterId); }
  remove(id: string) {
    const node = this.list.getNodeById(id);
    if (node === this.currentNode && node) this.currentNode = node.next ?? node.previous;
    return this.list.removeById(id);
  }
  snapshot(): PlaylistSnapshot {
    return { schemaVersion: 1, playlistId: this.playlistId, name: this.name, artwork: this.artwork,
      entries: LinkedSequence.from(this.list).map(node => ({ nodeId: node.nodeId, track: cloneTrack(node.value) })),
      currentNodeId: this.currentNode?.nodeId ?? null };
  }
  serialize() { return encodePlaylist(this.snapshot()); }
  static restore(input: unknown) {
    const data = playlistSnapshotSchema.parse(input);
    const controller = new PlaylistController(data.playlistId, data.name, data.artwork);
    for (const entry of data.entries) controller.insertAt(controller.list.size, entry.track, entry.nodeId);
    controller.currentNode = (data.currentNodeId && controller.list.getNodeById(data.currentNodeId)) || controller.list.head;
    return controller;
  }
}
