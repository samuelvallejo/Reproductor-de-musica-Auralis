import { describe, expect, it } from 'vitest';
import { LinkedSequence } from '@auralis/playlist-core';
import { parseSyncedLyrics } from './lyrics';

describe('Synced lyrics', () => {
  it('parses timestamps, multiple timestamps and ignores metadata tags', () => {
    const lyrics = parseSyncedLyrics('[ti:Example]\n[00:00.00]First line\n[00:01.25][00:02.500]Shared line\n[00:03.5]Final line');
    expect(lyrics).toBeInstanceOf(LinkedSequence);
    expect([...lyrics]).toEqual([
      { time: 0, text: 'First line' },
      { time: 1.25, text: 'Shared line' },
      { time: 2.5, text: 'Shared line' },
      { time: 3.5, text: 'Final line' },
    ]);
  });

  it('ignores untimed and empty lyric lines', () => {
    expect([...parseSyncedLyrics('[00:01.00]\nNo timestamp\n[00:02.00]   ')]).toEqual([]);
  });
});
