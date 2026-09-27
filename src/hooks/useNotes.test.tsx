import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotes } from './useNotes.hook';
import type { Note } from '../types/Note.type';
import {
    API_LATENCY_MS,
    SAVE_DEBOUNCE_MS,
    STORAGE_KEY,
    advance,
    makeNote,
    readStorage,
    seedStorage,
} from '../test/helpers';

// Time from the last change until the data is actually in storage
const DEBOUNCED_SAVE_MS = SAVE_DEBOUNCE_MS + API_LATENCY_MS;

const renderLoadedHook = async (seed: Note[] = []) => {
    seedStorage(seed);
    const hook = renderHook(() => useNotes());
    await advance(API_LATENCY_MS);

    // Spy after seeding so only writes made by the hook are counted
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    return { ...hook, writes };
};

const zIndexes = (notes: Note[]) => notes.map(n => n.zIndex).sort((a, b) => a - b);

beforeEach(() => {
    vi.useFakeTimers();
});

describe('useNotes — loading', () => {
    it('reports loading while the API responds, then exposes the stored notes', async () => {
        seedStorage([makeNote({ id: 'a' })]);
        const { result } = renderHook(() => useNotes());

        await advance(0);
        expect(result.current.loading).toBe(true);
        expect(result.current.notes).toEqual([]);

        await advance(API_LATENCY_MS);
        expect(result.current.loading).toBe(false);
        expect(result.current.notes.map(n => n.id)).toEqual(['a']);
    });

    it('does not write the freshly loaded notes straight back to storage', async () => {
        // Nothing changed, so a write would be wasted work — and before this was fixed,
        // an empty initial state could race with the load and wipe saved notes
        const { writes } = await renderLoadedHook([makeNote()]);

        await advance(DEBOUNCED_SAVE_MS * 2);

        expect(writes).not.toHaveBeenCalled();
    });
});

describe('useNotes — state transitions', () => {
    it('adds a note on top of the existing ones', async () => {
        const { result } = await renderLoadedHook([
            makeNote({ id: 'a', zIndex: 1 }),
            makeNote({ id: 'b', zIndex: 2 }),
        ]);

        act(() => result.current.addNote({ x: 10, y: 20 }));

        const added = result.current.notes[2];
        expect(added).toMatchObject({ x: 10, y: 20, text: '', zIndex: 3 });
    });

    it('updates only the targeted note', async () => {
        const { result } = await renderLoadedHook([makeNote({ id: 'a' }), makeNote({ id: 'b' })]);

        act(() => result.current.updateNote('a', { text: 'hello' }));

        expect(result.current.notes.map(n => n.text)).toEqual(['hello', '']);
    });

    it('keeps z-indexes unique after deleting and then adding', async () => {
        // Regression: deleting the bottom note left z = {2, 3}; the next note got
        // length + 1 = 3 and collided with an existing note
        const { result } = await renderLoadedHook([
            makeNote({ id: 'a', zIndex: 1 }),
            makeNote({ id: 'b', zIndex: 2 }),
            makeNote({ id: 'c', zIndex: 3 }),
        ]);

        act(() => result.current.deleteNote('a'));
        act(() => result.current.addNote({ x: 0, y: 0 }));

        expect(zIndexes(result.current.notes)).toEqual([1, 2, 3]);
    });

    it('brings a note to front without z-index growing over repeated clicks', async () => {
        const { result } = await renderLoadedHook([
            makeNote({ id: 'a', zIndex: 1 }),
            makeNote({ id: 'b', zIndex: 2 }),
        ]);

        for (let i = 0; i < 50; i++) {
            act(() => result.current.bringToFront(i % 2 ? 'b' : 'a'));
        }

        expect(zIndexes(result.current.notes)).toEqual([1, 2]);
    });

    it('treats clicking the top note as a no-op: same state object, nothing saved', async () => {
        // Every pointerdown calls bringToFront, so this path runs constantly
        const { result, writes } = await renderLoadedHook([
            makeNote({ id: 'a', zIndex: 1 }),
            makeNote({ id: 'b', zIndex: 2 }),
        ]);
        const before = result.current.notes;

        act(() => result.current.bringToFront('b'));
        await advance(DEBOUNCED_SAVE_MS);

        expect(result.current.notes).toBe(before);
        expect(writes).not.toHaveBeenCalled();
    });

    it('pulls a note that ended up over the trash back inside the notes area', async () => {
        const { result } = await renderLoadedHook([makeNote({ id: 'a', x: 700, y: 100 })]);

        act(() => result.current.moveNoteInside('a', { width: 800, height: 600 }));

        expect(result.current.notes[0]).toMatchObject({ x: 600, y: 100 });
    });
});

describe('useNotes — persistence', () => {
    it('collapses a burst of changes (a drag) into one save of the final state', async () => {
        const { result, writes } = await renderLoadedHook([makeNote({ id: 'a' })]);

        // A drag fires an update per pointermove
        for (let x = 101; x <= 160; x++) {
            act(() => result.current.updateNote('a', { x }));
        }

        await advance(SAVE_DEBOUNCE_MS - 1);
        expect(writes).not.toHaveBeenCalled();

        await advance(1 + API_LATENCY_MS);
        expect(writes).toHaveBeenCalledTimes(1);
        expect(readStorage()[0].x).toBe(160);
    });

    it('restarts the debounce window on every change, so a slow drag is not saved midway', async () => {
        const { result, writes } = await renderLoadedHook([makeNote({ id: 'a' })]);

        act(() => result.current.updateNote('a', { x: 110 }));
        await advance(SAVE_DEBOUNCE_MS - 100);
        act(() => result.current.updateNote('a', { x: 120 }));
        await advance(SAVE_DEBOUNCE_MS - 100);

        expect(writes).not.toHaveBeenCalled();

        await advance(DEBOUNCED_SAVE_MS);
        expect(writes).toHaveBeenCalledTimes(1);
        expect(readStorage()[0].x).toBe(120);
    });

    it('saves pending changes synchronously when the page is hidden or closed', async () => {
        // Without this, closing the tab within the debounce window loses the last edit
        const { result, writes } = await renderLoadedHook([makeNote({ id: 'a' })]);

        act(() => result.current.updateNote('a', { text: 'last words' }));
        window.dispatchEvent(new Event('pagehide'));

        // No timers advanced: it must already be written
        expect(readStorage()[0].text).toBe('last words');

        // ...and the cancelled debounced save must not write a second time
        await advance(DEBOUNCED_SAVE_MS);
        expect(writes).toHaveBeenCalledTimes(1);
    });

    it('flushes when the tab becomes hidden (mobile browsers often skip pagehide)', async () => {
        const { result } = await renderLoadedHook([makeNote({ id: 'a' })]);
        act(() => result.current.updateNote('a', { text: 'switched apps' }));

        const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        visibility.mockRestore();

        expect(readStorage()[0].text).toBe('switched apps');
    });

    it('does not write on pagehide when there is nothing pending', async () => {
        const { writes } = await renderLoadedHook([makeNote()]);

        window.dispatchEvent(new Event('pagehide'));

        expect(writes).not.toHaveBeenCalled();
    });

    it('flushes pending changes on unmount', async () => {
        const { result, unmount } = await renderLoadedHook([makeNote({ id: 'a' })]);

        act(() => result.current.updateNote('a', { text: 'bye' }));
        unmount();

        expect(readStorage()[0].text).toBe('bye');
    });

    it('persists deletions', async () => {
        const { result } = await renderLoadedHook([makeNote({ id: 'a' }), makeNote({ id: 'b' })]);

        act(() => result.current.deleteNote('a'));
        await advance(DEBOUNCED_SAVE_MS);

        expect(readStorage().map(n => n.id)).toEqual(['b']);
        expect(localStorage.getItem(STORAGE_KEY)).not.toContain('"a"');
    });
});
