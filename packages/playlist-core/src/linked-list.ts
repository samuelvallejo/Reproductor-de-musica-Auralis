export class PlaylistNode<T> {
  previous: PlaylistNode<T> | null = null;
  next: PlaylistNode<T> | null = null;
  constructor(readonly nodeId: string, readonly value: T) {}
}

/** Links determine order; the map only accelerates identity lookup. Memory O(n). */
export class DoublyLinkedList<T> implements Iterable<PlaylistNode<T>> {
  head: PlaylistNode<T> | null = null;
  tail: PlaylistNode<T> | null = null;
  private nodes = new Map<string, PlaylistNode<T>>();
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

  private nodeAt(index: number) {
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

  /** Map lookup and removal O(1); no array is used to update order. */
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
    const visited = new Set<string>();
    let previous: PlaylistNode<T> | null = null;
    for (const node of this) {
      if (visited.has(node.nodeId)) throw new Error('Cycle detected');
      if (node.previous !== previous || this.nodes.get(node.nodeId) !== node) throw new Error('Broken reciprocal link');
      visited.add(node.nodeId); previous = node;
    }
    if (visited.size !== this.size || previous !== this.tail || (!this.size && (this.head || this.tail))) throw new Error('Invalid list size');
    let count = 0;
    let next: PlaylistNode<T> | null = null;
    for (const node of this.reverse()) { if (node.next !== next) throw new Error('Broken reverse link'); next = node; count++; }
    if (count !== this.size || next !== this.head) throw new Error('Invalid reverse traversal');
  }
}
