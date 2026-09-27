import { act } from '@testing-library/react';
import { vi } from 'vitest';
import type { Note } from '../types/Note.type';

export const STORAGE_KEY = 'sticky-notes';

// Matches FAKE_LATENCY in src/api/api.tsx and SAVE_DEBOUNCE_MS in useNotes
export const API_LATENCY_MS = 400;
export const SAVE_DEBOUNCE_MS = 500;

export const makeNote = (overrides: Partial<Note> = {}): Note => ({
    id: 'note-1',
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    text: '',
    color: '#FEF08A',
    zIndex: 1,
    ...overrides,
});

export const seedStorage = (notes: unknown) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));

export const readStorage = (): Note[] =>
    JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Note[];

// Advance fake timers inside act so React flushes the resulting state updates
export const advance = (ms: number) =>
    act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });

/**
 * jsdom does no layout: every rect and clientWidth is 0. This stubs the one
 * layout the board relies on, so geometry (clamping, trash hit-testing) can be
 * exercised with real numbers:
 *
 *   x: 20        820       1020
 *      ┌─────────┬─────────┐  y: 100
 *      │ notes   │  trash  │
 *      │ 800x600 │ 200x600 │
 *      └─────────┴─────────┘  y: 700
 *
 * Classes are used here only to decide which element gets which box; tests
 * themselves query by role and label.
 */
export const BOARD_LAYOUT = {
    board: { left: 20, top: 100, width: 1000, height: 600 },
    notesArea: { left: 20, top: 100, width: 800, height: 600 },
    trash: { left: 820, top: 100, width: 200, height: 600 },
};

const boxFor = (el: Element) => {
    if (el.classList.contains('board')) return BOARD_LAYOUT.board;
    if (el.classList.contains('notes-area')) return BOARD_LAYOUT.notesArea;
    if (el.classList.contains('delete-zone')) return BOARD_LAYOUT.trash;
    return null;
};

export const mockBoardLayout = () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        const { left, top, width, height } = boxFor(this) ?? { left: 0, top: 0, width: 0, height: 0 };
        return {
            x: left, y: top, left, top, width, height,
            right: left + width,
            bottom: top + height,
            toJSON: () => ({}),
        };
    });
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
        return boxFor(this)?.width ?? 0;
    });
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(function (this: Element) {
        return boxFor(this)?.height ?? 0;
    });
};
