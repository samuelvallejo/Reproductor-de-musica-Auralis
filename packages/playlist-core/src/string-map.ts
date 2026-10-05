class HashEntry<V> {
  bucketNext: HashEntry<V> | null = null;
  previous: HashEntry<V> | null = null;
  next: HashEntry<V> | null = null;
  active = true;
  constructor(readonly key: string, public value: V) {}
}

/** Own hash table: collision chains and insertion-order links, never Map/Array. */
export class StringMap<V> {
  private buckets: Record<number, HashEntry<V> | null> = Object.create(null);
  private capacity = 16;
  private count = 0;
  private head: HashEntry<V> | null = null;
  private tail: HashEntry<V> | null = null;
  get size() { return this.count; }

  private hash(key: string, capacity = this.capacity) {
    let hash = 0;
    for (let index = 0; index < key.length; index++) hash = (Math.imul(hash, 31) + key.charCodeAt(index)) >>> 0;
    return hash % capacity;
  }
  private find(key: string) {
    let entry = this.buckets[this.hash(key)] ?? null;
    while (entry) { if (entry.key === key) return entry; entry = entry.bucketNext; }
    return null;
  }
  has(key: string) { return this.find(key) !== null; }
  get(key: string): V | undefined { return this.find(key)?.value; }
  set(key: string, value: V) {
    const existing = this.find(key);
    if (existing) { existing.value = value; return this; }
    if ((this.count + 1) / this.capacity > .75) this.resize();
    const entry = new HashEntry(key, value);
    const bucket = this.hash(key);
    entry.bucketNext = this.buckets[bucket] ?? null;
    this.buckets[bucket] = entry;
    entry.previous = this.tail;
    if (this.tail) this.tail.next = entry; else this.head = entry;
    this.tail = entry; this.count++;
    return this;
  }
  delete(key: string) {
    const bucket = this.hash(key);
    let previous: HashEntry<V> | null = null;
    let entry = this.buckets[bucket] ?? null;
    while (entry && entry.key !== key) { previous = entry; entry = entry.bucketNext; }
    if (!entry) return false;
    if (previous) previous.bucketNext = entry.bucketNext; else this.buckets[bucket] = entry.bucketNext;
    if (entry.previous) entry.previous.next = entry.next; else this.head = entry.next;
    if (entry.next) entry.next.previous = entry.previous; else this.tail = entry.previous;
    entry.active = false; this.count--;
    return true;
  }
  clear() {
    let entry = this.head;
    while (entry) { entry.active = false; entry = entry.next; }
    this.buckets = Object.create(null); this.head = this.tail = null; this.count = 0;
  }
  private resize() {
    this.capacity *= 2;
    const buckets: Record<number, HashEntry<V> | null> = Object.create(null);
    let entry = this.head;
    while (entry) {
      const bucket = this.hash(entry.key);
      entry.bucketNext = buckets[bucket] ?? null;
      buckets[bucket] = entry; entry = entry.next;
    }
    this.buckets = buckets;
  }
  *values(): Generator<V> {
    let entry = this.head;
    while (entry) { if (entry.active) yield entry.value; entry = entry.next; }
  }
  *keys(): Generator<string> {
    let entry = this.head;
    while (entry) { if (entry.active) yield entry.key; entry = entry.next; }
  }
}
