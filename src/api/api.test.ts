import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notesApi } from './api';
import { API_LATENCY_MS, STORAGE_KEY, makeNote, readStorage, seedStorage } from '../test/helpers';

// localStorage is user-editable and survives app versions, so everything read
// from it is treated as untrusted input
describe('notesApi.fetchNotes — loading untrusted storage', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    const fetchNotes = async () => {
        const result = notesApi.fetchNotes();
        await vi.advanceTimersByTimeAsync(API_LATENCY_MS);
        return result;
    };

    it('returns an empty board on first visit', async () => {
        expect(await fetchNotes()).toEqual([]);
    });

    it('recovers from corrupt JSON instead of crashing the app', async () => {
        localStorage.setItem(STORAGE_KEY, '{not json');

        expect(await fetchNotes()).toEqual([]);
    });

    it('ignores valid JSON that is not a list of notes', async () => {
        seedStorage({ notes: [makeNote()] });

        expect(await fetchNotes()).toEqual([]);
    });

    it('keeps the valid notes and drops only the broken ones', async () => {
        // Losing every note because one is corrupt would be worse than losing one
        seedStorage([makeNote({ id: 'good' }), { id: 'broken', x: 'oops' }, null]);

        expect((await fetchNotes()).map(n => n.id)).toEqual(['good']);
    });

    it('normalizes stored z-indexes so the in-memory invariant (1..n) holds from the start', async () => {
        seedStorage([makeNote({ id: 'a', zIndex: 50 }), makeNote({ id: 'b', zIndex: 3 })]);

        const notes = await fetchNotes();

        expect(notes.find(n => n.id === 'a')?.zIndex).toBe(2);
        expect(notes.find(n => n.id === 'b')?.zIndex).toBe(1);
    });
});

describe('notesApi saving', () => {
    it('saveNotesImmediately writes synchronously, which is required inside pagehide', () => {
        // The browser may kill the page right after pagehide, so no awaiting is allowed
        notesApi.saveNotesImmediately([makeNote({ id: 'a' })]);

        expect(readStorage().map(n => n.id)).toEqual(['a']);
    });

    it('does not throw when storage is full, so a failed save never breaks the UI', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('Quota exceeded', 'QuotaExceededError');
        });
        const logError = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => notesApi.saveNotesImmediately([makeNote()])).not.toThrow();
        expect(logError).toHaveBeenCalled();
    });
});
