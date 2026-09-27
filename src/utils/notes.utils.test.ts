import { describe, expect, it } from 'vitest';
import {
    bringNoteToFront,
    clampNoteRect,
    clampNoteSize,
    isNote,
    isPointInRect,
    normalizeZIndexes,
} from './notes.utils';
import { MIN_NOTE_HEIGHT, MIN_NOTE_WIDTH } from '../consts/NoteSize';
import { makeNote } from '../test/helpers';

const BOARD = { width: 800, height: 600 };
const NOTE_SIZE = { width: 200, height: 200 };

describe('clampNoteRect — a note must never leave the board', () => {
    it('leaves a note that is already inside untouched', () => {
        expect(clampNoteRect({ x: 300, y: 200, ...NOTE_SIZE }, BOARD)).toEqual({ x: 300, y: 200 });
    });

    it.each([
        ['left', { x: -50, y: 200 }, { x: 0, y: 200 }],
        ['top', { x: 300, y: -50 }, { x: 300, y: 0 }],
        // Right/bottom limits depend on the note size: the whole note must stay visible,
        // not just its top-left corner
        ['right', { x: 750, y: 200 }, { x: 600, y: 200 }],
        ['bottom', { x: 300, y: 550 }, { x: 300, y: 400 }],
        ['corner', { x: 5000, y: 5000 }, { x: 600, y: 400 }],
    ])('stops at the %s edge', (_edge, position, expected) => {
        expect(clampNoteRect({ ...position, ...NOTE_SIZE }, BOARD)).toEqual(expected);
    });

    it('allows a note to sit exactly flush with the edge', () => {
        expect(clampNoteRect({ x: 600, y: 400, ...NOTE_SIZE }, BOARD)).toEqual({ x: 600, y: 400 });
    });

    it('pins a note larger than the board to the top-left, so its drag handle stays reachable', () => {
        // max < min here; the note can't fit, so prefer keeping the handle (top-left) on screen
        const tiny = { width: 100, height: 100 };
        expect(clampNoteRect({ x: 50, y: 50, ...NOTE_SIZE }, tiny)).toEqual({ x: 0, y: 0 });
    });
});

describe('clampNoteSize — resizing respects a minimum and the board edge', () => {
    it('never shrinks below the minimum, so the note stays usable', () => {
        expect(clampNoteSize({ x: 0, y: 0, width: 10, height: 10 }, BOARD))
            .toEqual({ width: MIN_NOTE_WIDTH, height: MIN_NOTE_HEIGHT });
    });

    it('caps growth at the remaining space to the right and below the note', () => {
        expect(clampNoteSize({ x: 500, y: 450, width: 900, height: 900 }, BOARD))
            .toEqual({ width: 300, height: 150 });
    });
});

describe('isPointInRect — trash zone hit test', () => {
    const trash = { left: 820, top: 100, right: 1020, bottom: 700 };

    it('detects a pointer inside the trash', () => {
        expect(isPointInRect({ x: 900, y: 400 }, trash)).toBe(true);
    });

    it('treats the border as inside, so a drop right on the edge still deletes', () => {
        expect(isPointInRect({ x: 820, y: 100 }, trash)).toBe(true);
        expect(isPointInRect({ x: 1020, y: 700 }, trash)).toBe(true);
    });

    it.each([
        ['one pixel left of it', { x: 819, y: 400 }],
        ['above it', { x: 900, y: 99 }],
        ['below it', { x: 900, y: 701 }],
    ])('does not delete when the pointer is %s', (_where, point) => {
        expect(isPointInRect(point, trash)).toBe(false);
    });
});

describe('z-index management — stacking stays bounded', () => {
    const zOf = (notes: ReturnType<typeof makeNote>[]) =>
        Object.fromEntries(notes.map(n => [n.id, n.zIndex]));

    it('moves the chosen note on top while keeping the others in their relative order', () => {
        const notes = [
            makeNote({ id: 'a', zIndex: 1 }),
            makeNote({ id: 'b', zIndex: 2 }),
            makeNote({ id: 'c', zIndex: 3 }),
        ];

        expect(zOf(bringNoteToFront(notes, 'a'))).toEqual({ b: 1, c: 2, a: 3 });
    });

    it('never grows past the number of notes, no matter how often notes are clicked', () => {
        // The original bug: every click did max + 1, so z-index grew without limit
        let notes = [makeNote({ id: 'a', zIndex: 1 }), makeNote({ id: 'b', zIndex: 2 })];

        for (let i = 0; i < 1000; i++) {
            notes = bringNoteToFront(notes, i % 2 ? 'b' : 'a');
        }

        expect(Math.max(...notes.map(n => n.zIndex))).toBe(2);
    });

    it('returns the same array when the note is already on top, so React skips the re-render and save', () => {
        const notes = [makeNote({ id: 'a', zIndex: 1 }), makeNote({ id: 'b', zIndex: 2 })];

        expect(bringNoteToFront(notes, 'b')).toBe(notes);
    });

    it('returns the same array for an unknown id', () => {
        const notes = [makeNote({ id: 'a' })];

        expect(bringNoteToFront(notes, 'missing')).toBe(notes);
    });

    it('closes gaps left by deleted notes, preserving stacking order', () => {
        const notes = [
            makeNote({ id: 'a', zIndex: 40 }),
            makeNote({ id: 'b', zIndex: 7 }),
            makeNote({ id: 'c', zIndex: 99 }),
        ];

        expect(zOf(normalizeZIndexes(notes))).toEqual({ b: 1, a: 2, c: 3 });
    });
});

describe('isNote — only well-formed notes are accepted from storage', () => {
    it('accepts a complete note', () => {
        expect(isNote(makeNote())).toBe(true);
    });

    it.each([
        ['null', null],
        ['a string', 'note'],
        ['a missing color', { ...makeNote(), color: undefined }],
        ['a numeric string position', { ...makeNote(), x: '100' }],
        // JSON turns NaN/Infinity into null
        ['a null coordinate', { ...makeNote(), y: null }],
        ['zero width (invisible, impossible to grab)', { ...makeNote(), width: 0 }],
        ['negative height', { ...makeNote(), height: -20 }],
    ])('rejects %s', (_case, value) => {
        expect(isNote(value)).toBe(false);
    });
});
