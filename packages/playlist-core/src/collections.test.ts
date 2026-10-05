import { describe, expect, it } from 'vitest';
import { DoublyLinkedList, LinkedSequence, LinkedSet, StringMap } from './index.js';

describe('Own StringMap', () => {
  it('resolves hash collisions and keeps insertion order when updating or deleting', () => {
    const table = new StringMap<number>();
    // Java-style polynomial hashing deliberately gives these keys the same hash.
    table.set('Aa', 1).set('BB', 2).set('AaAa', 3).set('BBBB', 4);
    table.set('Aa', 5);
    expect(table.size).toBe(4); expect(table.get('BB')).toBe(2);
    expect([...table.keys()]).toEqual(['Aa', 'BB', 'AaAa', 'BBBB']);
    expect(table.delete('BB')).toBe(true); expect(table.delete('missing')).toBe(false);
    expect(table.get('Aa')).toBe(5); expect(table.get('AaAa')).toBe(3); expect(table.get('BBBB')).toBe(4);
    table.delete('Aa'); table.delete('BBBB');
    expect([...table.values()]).toEqual([3]);
    table.delete('AaAa'); expect(table.size).toBe(0);
    table.set('BB', 8); expect([...table.keys()]).toEqual(['BB']);
  });
  it('rehashes 1500 entries without losing identity or confusing special object keys', () => {
    const table = new StringMap<object>();
    const reference = { value: 'shared' };
    for (let index = 0; index < 1500; index++) table.set('entry-' + index, reference);
    for (let index = 0; index < 1500; index++) expect(table.get('entry-' + index)).toBe(reference);
    table.set('__proto__', reference).set('constructor', reference).set('toString', reference);
    expect(table.get('__proto__')).toBe(reference);
    for (let index = 0; index < 1500; index += 2) expect(table.delete('entry-' + index)).toBe(true);
    expect(table.size).toBe(753);
    expect([...table.keys()].slice(0, 3)).toEqual(['entry-1', 'entry-3', 'entry-5']);
    table.clear(); expect(table.size).toBe(0); expect([...table.keys()]).toEqual([]);
  });
  it('distinguishes missing entries from present undefined values', () => {
    const table = new StringMap<undefined>();
    table.set('present', undefined);
    expect(table.has('present')).toBe(true); expect(table.has('missing')).toBe(false);
    expect(table.delete('present')).toBe(true); expect(table.has('present')).toBe(false);
  });
});

describe('Own LinkedSequence', () => {
  it('edits ordered values, iterates both ways and bounds-checks positions', () => {
    const values = new LinkedSequence<string>().append('B').prepend('A').append('D').insertAt(2, 'C');
    expect([...values]).toEqual(['A', 'B', 'C', 'D']);
    expect([...values.reverse()]).toEqual(['D', 'C', 'B', 'A']);
    expect(values.at(0)).toBe('A'); expect(values.at(-1)).toBe('D');
    expect(values.at(4)).toBeUndefined(); expect(values.at(.5)).toBeUndefined();
    expect(() => values.insertAt(5, 'invalid')).toThrow(RangeError);
    expect(() => values.removeAt(-1)).toThrow(RangeError);
    expect(values.removeAt(1)).toBe('B');
    expect(values.removeFirst(value => value === 'C')).toBe(true);
    expect(values.removeFirst(value => value === 'missing')).toBe(false);
    expect([...values]).toEqual(['A', 'D']); values.assertInvariants();
    values.clear(); values.assertInvariants(); expect(values.length).toBe(0);
  });
  it('derives independent linked collections without changing the source order', () => {
    const values = new LinkedSequence<number>().append(1).append(2).append(3).append(4);
    const doubled = values.map((value, index) => value * 2 + index);
    const even = values.filter(value => value % 2 === 0);
    expect([...doubled]).toEqual([2, 5, 8, 11]); expect([...even]).toEqual([2, 4]);
    expect([...values.slice(1, 3)]).toEqual([2, 3]);
    expect([...values.slice(-2)]).toEqual([3, 4]);
    expect([...values.slice(3, 1)]).toEqual([]);
    even.clear(); expect(values.length).toBe(4);
    expect(values.join(' / ')).toBe('1 / 2 / 3 / 4');
    expect(values.find(value => value > 2)).toBe(3);
    expect(values.some(value => value === 8)).toBe(false);
    doubled.assertInvariants(); values.assertInvariants();
  });
});

describe('Own LinkedSet', () => {
  it('deduplicates primitives and references while retaining order', () => {
    const reference = {}; const other = {};
    const values = new LinkedSet<unknown>();
    values.add(reference).add(reference).add(other).add(NaN).add(NaN).add(0).add(-0);
    expect(values.size).toBe(4); expect(values.has(NaN)).toBe(true);
    expect(values.delete(reference)).toBe(true); expect(values.delete(reference)).toBe(false);
    expect([...values]).toEqual([other, NaN, 0]);
    values.clear(); expect(values.size).toBe(0); expect([...values]).toEqual([]);
  });
  it('handles listener removal during notification without losing later callbacks', () => {
    const calls: string[] = [];
    const listeners = new LinkedSet<() => void>();
    const second = () => calls.push('second');
    const first = () => { calls.push('first'); listeners.delete(first); listeners.delete(second); };
    const third = () => calls.push('third');
    listeners.add(first).add(second).add(third);
    listeners.forEach(listener => listener());
    expect(calls).toEqual(['first', 'third']); expect(listeners.size).toBe(1);
    listeners.forEach(listener => listener()); expect(calls).toEqual(['first', 'third', 'third']);
  });
});

it('owns node identity independently of duplicate values and detaches removed links', () => {
  const list = new DoublyLinkedList<string>();
  const a = list.append('same', 'a'); const b = list.append('same', 'b');
  const c = list.append('same', 'c');
  list.removeById('b');
  expect(a.next).toBe(c); expect(c.previous).toBe(a);
  expect(b.next).toBeNull(); expect(b.previous).toBeNull();
  expect(list.getNodeById('a')).toBe(a); list.assertInvariants();
});
