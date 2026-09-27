import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Board } from './Board';
import {
    API_LATENCY_MS,
    BOARD_LAYOUT,
    SAVE_DEBOUNCE_MS,
    advance,
    makeNote,
    mockBoardLayout,
    readStorage,
    seedStorage,
} from '../test/helpers';
import type { Note } from '../types/Note.type';

type Point = { x: number; y: number };

const { notesArea, trash } = BOARD_LAYOUT;

// Converts board-relative note coordinates to viewport coordinates
const toClient = (p: Point): Point => ({ x: notesArea.left + p.x, y: notesArea.top + p.y });

const renderBoard = async (notes: Note[] = []) => {
    seedStorage(notes);
    mockBoardLayout();
    render(<Board />);
    await advance(API_LATENCY_MS);
};

const pointer = ({ x, y }: Point) => ({ clientX: x, clientY: y, pointerId: 1, button: 0 });

const clickBoard = (at: Point) => {
    const board = screen.getByRole('region', { name: 'Notes board' });
    fireEvent.pointerDown(board, pointer(at));
    fireEvent.click(board, pointer(at));
};

// Drives a drag through the note's handle the way a user would: press, move, release
const startDrag = (noteIndex = 0) => {
    const note = screen.getAllByRole('article', { name: 'Sticky note' })[noteIndex];
    const handle = within(note).getByLabelText('Move note');
    const grab = toClient({ x: 110, y: 110 }); // inside a note seeded at (100, 100)

    fireEvent.pointerDown(handle, pointer(grab));

    return {
        note,
        moveTo: (to: Point) => fireEvent.pointerMove(handle, pointer(to)),
        releaseAt: (at: Point) => fireEvent.pointerUp(handle, pointer(at)),
        cancel: () => fireEvent.pointerCancel(handle, pointer(grab)),
    };
};

const notes = () => screen.queryAllByRole('article', { name: 'Sticky note' });

beforeEach(() => {
    vi.useFakeTimers();
});

describe('Board — creating notes', () => {
    it('creates a note where the user clicks, in board coordinates', async () => {
        await renderBoard();

        clickBoard(toClient({ x: 150, y: 120 }));

        expect(notes()).toHaveLength(1);
        expect(notes()[0]).toHaveStyle({ left: '150px', top: '120px' });
    });

    it('keeps a note created near the bottom-right corner fully on the board', async () => {
        await renderBoard();

        clickBoard(toClient({ x: 790, y: 590 }));

        // 800x600 board minus a 200x200 note
        expect(notes()[0]).toHaveStyle({ left: '600px', top: '400px' });
    });

    it('does not create a note when the user presses, drags across the board and releases', async () => {
        // The browser still fires "click" after press → move → release on the same element
        await renderBoard();
        const board = screen.getByRole('region', { name: 'Notes board' });

        fireEvent.pointerDown(board, pointer(toClient({ x: 100, y: 100 })));
        fireEvent.click(board, pointer(toClient({ x: 300, y: 250 })));

        expect(notes()).toHaveLength(0);
    });

    it('still creates a note when the hand jitters a couple of pixels during a click', async () => {
        await renderBoard();
        const board = screen.getByRole('region', { name: 'Notes board' });

        fireEvent.pointerDown(board, pointer(toClient({ x: 100, y: 100 })));
        fireEvent.click(board, pointer(toClient({ x: 102, y: 103 })));

        expect(notes()).toHaveLength(1);
    });

    it('does not create a note when clicking on an existing note', async () => {
        await renderBoard([makeNote()]);

        fireEvent.click(screen.getByRole('textbox', { name: 'Note text' }));

        expect(notes()).toHaveLength(1);
    });
});

describe('Board — trash zone', () => {
    it('deletes a note released with the pointer inside the trash, and persists it', async () => {
        await renderBoard([makeNote({ id: 'doomed' })]);

        const drag = startDrag();
        drag.moveTo({ x: trash.left + 50, y: 300 });
        drag.releaseAt({ x: trash.left + 50, y: 300 });

        expect(notes()).toHaveLength(0);

        await advance(SAVE_DEBOUNCE_MS + API_LATENCY_MS);
        expect(readStorage()).toEqual([]);
    });

    it('lets the note visually slide over the trash while dragging', async () => {
        // Regression: clamping to the notes area alone made the note stop at the trash
        // border, so dropping into the trash looked impossible
        await renderBoard([makeNote()]);

        const drag = startDrag();
        drag.moveTo({ x: trash.left + 100, y: 210 });

        const left = parseFloat(drag.note.style.left);
        expect(left).toBeGreaterThan(notesArea.width - 200);
    });

    it('decides on the pointer position, not the note: releasing just outside the trash keeps the note', async () => {
        await renderBoard([makeNote()]);

        const drag = startDrag();
        const justOutside = { x: trash.left - 1, y: 300 };
        drag.moveTo(justOutside);
        drag.releaseAt(justOutside);

        expect(notes()).toHaveLength(1);
    });

    it('pulls a note left overlapping the trash back fully inside the notes area', async () => {
        await renderBoard([makeNote()]);

        const drag = startDrag();
        const justOutside = { x: trash.left - 1, y: 300 };
        drag.moveTo(justOutside);
        expect(parseFloat(drag.note.style.left)).toBeGreaterThan(600); // overlapping the trash

        drag.releaseAt(justOutside);

        expect(notes()[0]).toHaveStyle({ left: '600px' });
    });

    it('does not delete when the drag is cancelled over the trash (e.g. an interrupted touch)', async () => {
        await renderBoard([makeNote()]);

        const drag = startDrag();
        drag.moveTo({ x: trash.left + 50, y: 300 });
        drag.cancel();

        expect(notes()).toHaveLength(1);
    });
});

describe('Board — boundary clamping while dragging', () => {
    it('stops the note at the top-left edge instead of letting it disappear off the board', async () => {
        await renderBoard([makeNote()]);

        const drag = startDrag();
        drag.moveTo({ x: -500, y: -500 });

        expect(drag.note).toHaveStyle({ left: '0px', top: '0px' });
    });

    it('stops the note at the bottom and right edges of the whole board', async () => {
        await renderBoard([makeNote()]);

        const drag = startDrag();
        drag.moveTo({ x: 5000, y: 5000 });

        // Right edge is the board (notes + trash): 1000 - 200. Bottom: 600 - 200
        expect(drag.note).toHaveStyle({ left: '800px', top: '400px' });
    });

    it('brings the dragged note on top of the others', async () => {
        await renderBoard([
            makeNote({ id: 'bottom', zIndex: 1 }),
            makeNote({ id: 'top', zIndex: 2 }),
        ]);

        const drag = startDrag(0);

        expect(drag.note).toHaveStyle({ zIndex: '2' });
        expect(notes()[1]).toHaveStyle({ zIndex: '1' });
    });
});
