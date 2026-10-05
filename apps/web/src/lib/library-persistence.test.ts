import { describe, expect, it } from 'vitest';
import { LinkedSequence, PlaylistController, trackSchema } from '@auralis/playlist-core';
import { decodeLibrary, encodeLibrary, pruneStarterPlaylists } from './library-persistence';

const local = {
  source: 'local', trackId: 'saved-local', title: 'Existing MP3', artists: ['Existing artist', 'Guest'],
  coverUrl: null, durationMs: 32000, album: 'Existing album', year: '2026',
  assetId: 'unchanged-blob-key', fileName: 'existing.mp3', mimeType: 'audio/mpeg', fileSize: 12345,
};
const remote = {
  source: 'spotify', trackId: 'spotify:existing', title: 'Existing Spotify', artists: ['Artist'],
  coverUrl: 'https://example.com/cover.png', durationMs: 100000,
  spotifyUri: 'spotify:track:existing', spotifyUrl: 'https://open.spotify.com/track/existing',
};
function previousFormat() {
  return {
    version: 1, activeId: 'saved-playlist',
    playlists: [{ schemaVersion: 1, playlistId: 'saved-playlist', name: 'Previously saved', artwork: 2,
      entries: [{ nodeId: 'local-node', track: local }, { nodeId: 'spotify-node', track: remote }, { nodeId: 'repeat-node', track: local }],
      currentNodeId: 'spotify-node' }],
    catalog: [local, remote], favoriteIds: ['saved-local'], historyIds: ['spotify:existing', 'saved-local'],
  };
}
describe('Existing library compatibility', () => {
  it('roundtrips the old IndexedDB record without changing IDs, order or MP3 asset references', () => {
    const wire = previousFormat();
    const saved = decodeLibrary(structuredClone(wire));
    expect(saved.playlists).toBeInstanceOf(LinkedSequence);
    expect(saved.catalog).toBeInstanceOf(LinkedSequence);
    expect(saved.favoriteIds).toBeInstanceOf(LinkedSequence);
    expect(saved.historyIds).toBeInstanceOf(LinkedSequence);
    expect(saved.catalog.at(0)?.artists).toBeInstanceOf(LinkedSequence);
    const snapshot = saved.playlists.at(0)!;
    const controller = PlaylistController.restore(snapshot);
    expect(controller.currentNode?.nodeId).toBe('spotify-node');
    expect(controller.previous()?.nodeId).toBe('local-node');
    expect(controller.next()?.nodeId).toBe('spotify-node');
    expect(controller.next()?.nodeId).toBe('repeat-node');
    controller.list.assertInvariants();
    expect(encodeLibrary(saved)).toEqual(wire);
    // IndexedDB structured clone receives plain records, never class prototypes.
    expect(structuredClone(encodeLibrary(saved))).toEqual(wire);
  });
  it('does not share artist nodes between input, duplicate songs and view snapshots', () => {
    const source = trackSchema.parse(local);
    const controller = new PlaylistController('identity', 'Metadata copies');
    const first = controller.insertAt(0, source); const second = controller.insertAt(1, source);
    source.artists.append('Changed');
    const view = controller.snapshot();
    view.entries.at(0)!.track.artists.clear();
    expect([...first.value.artists]).toEqual(['Existing artist', 'Guest']);
    expect([...second.value.artists]).toEqual(['Existing artist', 'Guest']);
    expect(first.value.artists).not.toBe(second.value.artists);
  });
  it('rejects corrupt records and duplicate node IDs before restoring a playlist', () => {
    expect(() => decodeLibrary({ ...previousFormat(), version: 2 })).toThrow();
    expect(() => decodeLibrary({ ...previousFormat(), playlists: null })).toThrow();
    expect(() => decodeLibrary({ ...previousFormat(), catalog: [{ ...local, artists: [] }] })).toThrow();
    expect(() => decodeLibrary({ ...previousFormat(), catalog: [{ ...remote, spotifyUri: 'not-a-uri' }] })).toThrow();
    const playlist = previousFormat().playlists[0]!;
    expect(() => PlaylistController.restore({ ...playlist, entries: [playlist.entries[0], playlist.entries[0]] })).toThrow();
  });
  it('keeps old Audius metadata and local neighbors while removing obsolete streams', () => {
    const old = previousFormat();
    const archived = { ...remote, source: 'audius', trackId: 'old-audius', streamUrl: 'https://example.com/old.mp3' };
    const saved = decodeLibrary({ ...old, catalog: [local, archived] });
    const migrated = saved.catalog.at(1)!;
    expect(migrated.source).toBe('legacy'); expect(migrated).not.toHaveProperty('streamUrl');
    expect(saved.catalog.at(0)).toMatchObject({ assetId: 'unchanged-blob-key' });
  });
});

describe('User-created playlists only', () => {
  it('stores and reloads an empty library without creating a playlist', () => {
    const wire = { version: 1, activeId: '', playlists: [], catalog: [], favoriteIds: [], historyIds: [], starterPlaylistsRemoved: true };
    expect(encodeLibrary(decodeLibrary(wire))).toEqual(wire);
  });
  it('prunes only empty starter playlists once, preserving populated and later user-created names', () => {
    const wire = previousFormat();
    const template = wire.playlists[0]!;
    const saved = decodeLibrary({ ...wire, playlists: [
      template,
      { ...template, playlistId: 'empty-concentration', name: 'Concentración', artwork: 1, entries: [], currentNodeId: null },
      { ...template, playlistId: 'populated-night', name: 'Noches de ciudad', artwork: 2 },
      { ...template, playlistId: 'empty-days', name: 'Días claros', artwork: 3, entries: [], currentNodeId: null },
      { ...template, playlistId: 'renamed', name: 'My own playlist', artwork: 3, entries: [], currentNodeId: null },
    ] });
    const migrated = pruneStarterPlaylists(saved);
    expect([...migrated.playlists].map(value => value.playlistId)).toEqual(['saved-playlist', 'populated-night', 'renamed']);
    expect(migrated.starterPlaylistsRemoved).toBe(true);
    const later = decodeLibrary({ ...wire, starterPlaylistsRemoved: true, playlists: [
      { ...template, playlistId: 'user-concentration', name: 'Concentración', artwork: 1, entries: [], currentNodeId: null },
    ] });
    expect(pruneStarterPlaylists(later).playlists.length).toBe(1);
  });
});
