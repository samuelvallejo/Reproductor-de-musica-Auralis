import { StringMap } from './string-map.js';

export class PlaylistNode<T> {
  previous: PlaylistNode<T> | null = null;
  next: PlaylistNode<T> | null = null;
  constructor(readonly nodeId: string, readonly value: T) {}
}

/** Own nodes determine order; our hash table only indexes identity. Memory O(n). */
export class DoublyLinkedList<T> implements Iterable<PlaylistNode<T>> {
  head: PlaylistNode<T> | null = null;
  tail: PlaylistNode<T> | null = null;
  private nodes = new StringMap<PlaylistNode<T>>();
  get size() { return this.nodes.size; }
  constructor(private readonly createId: () => string = () => crypto.randomUUID()) {}

  prepend(value: T, id = this.createId()) { return this.insertAt(0, value, id); }
  append(value: T, id = this.createId()) { return this.insertAt(this.size, value, id); }

  /** Interior lookup O(min(index, size-index)); relinking and endpoint insertion O(1). */
  insertAt(index: number, value: T, id = this.createId()): PlaylistNode<T> {
    if (!Number.isInteger(index) || index < 0 || index > this.size) throw new RangeError('Invalid insertion index');
    if (!id || this.nodes.has(id)) throw new Error('Node identifiers must be unique');
    const following = index === this.size ? null : this.nodeAt(index);
    const preceding = following ? following.previous : this.tail;
    const node = new PlaylistNode(id, value);
    node.previous = preceding;
    node.next = following;
    if (preceding) preceding.next = node; else this.head = node;
    if (following) following.previous = node; else this.tail = node;
    this.nodes.set(id, node);
    return node;
  }

  nodeAt(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= this.size) throw new RangeError('Invalid node index');
    let node: PlaylistNode<T> | null;
    if (index < this.size / 2) {
      node = this.head;
      for (let i = 0; i < index; i++) node = node?.next ?? null;
    } else {
      node = this.tail;
      for (let i = this.size - 1; i > index; i--) node = node?.previous ?? null;
    }
    if (!node) throw new Error('Broken list invariant');
    return node;
  }

  getNodeById(id: string) { return this.nodes.get(id) ?? null; }

  /** Relink the existing node; null means the end. Size and IDs stay unchanged. */
  moveBefore(id: string, beforeId: string | null): boolean {
    const node = this.getNodeById(id);
    const following = beforeId === null ? null : this.getNodeById(beforeId);
    if (!node || (beforeId !== null && !following)) throw new Error('Move requires nodes from this list');
    if (node === following || node.next === following) return false;
    if (node.previous) node.previous.next = node.next; else this.head = node.next;
    if (node.next) node.next.previous = node.previous; else this.tail = node.previous;
    const preceding = following ? following.previous : this.tail;
    node.previous = preceding; node.next = following;
    if (preceding) preceding.next = node; else this.head = node;
    if (following) following.previous = node; else this.tail = node;
    return true;
  }
  /** null means the beginning; moving relative to itself is a no-op. */
  moveAfter(id: string, afterId: string | null): boolean {
    const node = this.getNodeById(id);
    const preceding = afterId === null ? null : this.getNodeById(afterId);
    if (!node || (afterId !== null && !preceding)) throw new Error('Move requires nodes from this list');
    if (node === preceding) return false;
    const following = preceding ? preceding.next : this.head;
    return this.moveBefore(id, following?.nodeId ?? null);
  }

  /** Expected O(1) identity lookup; O(1) relinking, O(n) worst-case collisions. */
  removeById(id: string): PlaylistNode<T> | null {
    const node = this.getNodeById(id);
    if (!node) return null;
    if (node.previous) node.previous.next = node.next; else this.head = node.next;
    if (node.next) node.next.previous = node.previous; else this.tail = node.previous;
    this.nodes.delete(id);
    node.previous = node.next = null;
    return node;
  }

  clear() { for (const node of this.nodes.values()) node.previous = node.next = null; this.nodes.clear(); this.head = this.tail = null; }
  *[Symbol.iterator](): Generator<PlaylistNode<T>> { let node = this.head; while (node) { yield node; node = node.next; } }
  *reverse(): Generator<PlaylistNode<T>> { let node = this.tail; while (node) { yield node; node = node.previous; } }

  assertInvariants() {
    if (this.head?.previous || this.tail?.next) throw new Error('Invalid endpoint links');
    const visited = new StringMap<boolean>();
    let previous: PlaylistNode<T> | null = null;
    for (const node of this) {
      if (visited.has(node.nodeId)) throw new Error('Cycle detected');
      if (node.previous !== previous || this.nodes.get(node.nodeId) !== node) throw new Error('Broken reciprocal link');
      visited.set(node.nodeId, true); previous = node;
    }
    if (visited.size !== this.size || previous !== this.tail || (!this.size && (this.head || this.tail))) throw new Error('Invalid list size');
    let count = 0;
    let next: PlaylistNode<T> | null = null;
    for (const node of this.reverse()) { if (node.next !== next) throw new Error('Broken reverse link'); next = node; count++; }
    if (count !== this.size || next !== this.head) throw new Error('Invalid reverse traversal');
  }
}
