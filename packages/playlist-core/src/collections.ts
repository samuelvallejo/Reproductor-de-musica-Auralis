import { DoublyLinkedList } from './linked-list.js';

/** Ordered values backed exclusively by our own doubly linked nodes. */
export class LinkedSequence<T> implements Iterable<T> {
  private readonly nodes = new DoublyLinkedList<T>();
  private nextId = 0;
  get length() { return this.nodes.size; }
  get size() { return this.nodes.size; }
  static from<T>(values: Iterable<T>) {
    const sequence = new LinkedSequence<T>();
    for (const value of values) sequence.append(value);
    return sequence;
  }
  append(value: T) { this.nodes.append(value, String(this.nextId++)); return this; }
  prepend(value: T) { this.nodes.prepend(value, String(this.nextId++)); return this; }
  insertAt(index: number, value: T) { this.nodes.insertAt(index, value, String(this.nextId++)); return this; }
  at(index: number): T | undefined {
    const position = index < 0 ? this.length + index : index;
    return Number.isInteger(position) && position >= 0 && position < this.length ? this.nodes.nodeAt(position).value : undefined;
  }
  removeAt(index: number): T {
    const node = this.nodes.nodeAt(index);
    this.nodes.removeById(node.nodeId); return node.value;
  }
  removeFirst(predicate: (value: T) => boolean) {
    for (const node of this.nodes) {
      if (predicate(node.value)) { this.nodes.removeById(node.nodeId); return true; }
    }
    return false;
  }
  clear() { this.nodes.clear(); }
  find(predicate: (value: T) => boolean): T | undefined {
    for (const value of this) if (predicate(value)) return value;
    return undefined;
  }
  some(predicate: (value: T) => boolean) {
    for (const value of this) if (predicate(value)) return true;
    return false;
  }
  forEach(visit: (value: T, index: number) => void) {
    let index = 0;
    for (const value of this) visit(value, index++);
  }
  map<R>(transform: (value: T, index: number) => R): LinkedSequence<R> {
    const result = new LinkedSequence<R>();
    this.forEach((value, index) => result.append(transform(value, index)));
    return result;
  }
  filter(predicate: (value: T) => boolean) {
    const result = new LinkedSequence<T>();
    for (const value of this) if (predicate(value)) result.append(value);
    return result;
  }
  slice(start = 0, end = this.length) {
    const result = new LinkedSequence<T>();
    const normalize = (index: number) => Math.min(this.length, Math.max(0, index < 0 ? this.length + index : index));
    const first = normalize(start); const last = normalize(end);
    let index = 0;
    for (const value of this) { if (index >= last) break; if (index++ >= first) result.append(value); }
    return result;
  }
  join(separator = ',') {
    let text = ''; let first = true;
    for (const value of this) { if (!first) text += separator; text += String(value); first = false; }
    return text;
  }
  *[Symbol.iterator](): Generator<T> { for (const node of this.nodes) yield node.value; }
  *reverse(): Generator<T> { for (const node of this.nodes.reverse()) yield node.value; }
  assertInvariants() { this.nodes.assertInvariants(); }
}

class SetNode<T> {
  previous: SetNode<T> | null = null;
  next: SetNode<T> | null = null;
  active = true;
  constructor(readonly value: T) {}
}

/** Own insertion-ordered unique values, including callback identity. Lookup O(n). */
export class LinkedSet<T> implements Iterable<T> {
  private head: SetNode<T> | null = null;
  private tail: SetNode<T> | null = null;
  private count = 0;
  get size() { return this.count; }
  constructor(values?: Iterable<T>) { if (values) for (const value of values) this.add(value); }
  private find(value: T) {
    let node = this.head;
    while (node) { if (node.value === value || Object.is(node.value, value)) return node; node = node.next; }
    return null;
  }
  has(value: T) { return this.find(value) !== null; }
  add(value: T) {
    if (this.has(value)) return this;
    const node = new SetNode(value); node.previous = this.tail;
    if (this.tail) this.tail.next = node; else this.head = node;
    this.tail = node; this.count++; return this;
  }
  delete(value: T) {
    const node = this.find(value); if (!node) return false;
    if (node.previous) node.previous.next = node.next; else this.head = node.next;
    if (node.next) node.next.previous = node.previous; else this.tail = node.previous;
    node.active = false; this.count--; return true;
  }
  clear() {
    let node = this.head;
    while (node) { node.active = false; node = node.next; }
    this.head = this.tail = null; this.count = 0;
  }
  *[Symbol.iterator](): Generator<T> {
    let node = this.head;
    while (node) { if (node.active) yield node.value; node = node.next; }
  }
  forEach(visit: (value: T) => void) { for (const value of this) visit(value); }
}
