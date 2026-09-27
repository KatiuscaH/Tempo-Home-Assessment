import type { Note } from "../types/Note.type";
import { MIN_NOTE_HEIGHT, MIN_NOTE_WIDTH } from "../consts/NoteSize";

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = Point & Size;

const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), Math.max(min, max));

// Keeps the whole note inside the board
export const clampNoteRect = (rect: Rect, bounds: Size): Point => ({
    x: clamp(rect.x, 0, bounds.width - rect.width),
    y: clamp(rect.y, 0, bounds.height - rect.height),
});

// Keeps the size above the minimum and the bottom-right corner inside the board
export const clampNoteSize = (rect: Rect, bounds: Size): Size => ({
    width: clamp(rect.width, MIN_NOTE_WIDTH, bounds.width - rect.x),
    height: clamp(rect.height, MIN_NOTE_HEIGHT, bounds.height - rect.y),
});

export type Bounds = { left: number; top: number; right: number; bottom: number };

// Edges count as inside, so a drop exactly on the trash border still deletes
export const isPointInRect = (point: Point, rect: Bounds): boolean =>
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom;

// Reassigns z-indexes to 1..n, preserving the current stacking order
export const normalizeZIndexes = (notes: Note[]): Note[] => {
    const order = [...notes]
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(note => note.id);

    return notes.map(note => ({ ...note, zIndex: order.indexOf(note.id) + 1 }));
};

// Moves a note to the top while keeping z-indexes bounded to 1..n.
// Returns the same array when nothing changes, so React skips the re-render and save.
export const bringNoteToFront = (notes: Note[], id: string): Note[] => {
    const target = notes.find(note => note.id === id);
    if (!target) return notes;

    const isOnTop = notes.every(note => note.id === id || note.zIndex < target.zIndex);
    if (isOnTop) return notes;

    const topZIndex = Math.max(...notes.map(note => note.zIndex)) + 1;
    return normalizeZIndexes(
        notes.map(note => (note.id === id ? { ...note, zIndex: topZIndex } : note))
    );
};

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

export const isNote = (value: unknown): value is Note => {
    if (typeof value !== "object" || value === null) return false;

    const note = value as Record<string, unknown>;

    return (
        typeof note.id === "string" &&
        typeof note.text === "string" &&
        typeof note.color === "string" &&
        isFiniteNumber(note.x) &&
        isFiniteNumber(note.y) &&
        isFiniteNumber(note.width) &&
        isFiniteNumber(note.height) &&
        isFiniteNumber(note.zIndex) &&
        note.width > 0 &&
        note.height > 0
    );
};
