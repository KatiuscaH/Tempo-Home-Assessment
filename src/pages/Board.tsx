import { useRef } from "react";
import { StickyNote } from "../components/StickyNote"
import { useNotes } from "../hooks/useNotes.hook";
import { clampNoteRect, type Point, type Size } from "../utils/notes.utils";
import { DEFAULT_NOTE_HEIGHT, DEFAULT_NOTE_WIDTH } from "../consts/NoteSize";

// Max pointer movement (px) between press and release that still counts as a click
const CLICK_MOVE_TOLERANCE = 5;

export const Board = () => {
    const {
        notes,
        addNote,
        updateNote,
        bringToFront,
        deleteNote,
        moveNoteInside,
        loading
    } = useNotes();

    const boardRef = useRef<HTMLDivElement>(null);
    const notesAreaRef = useRef<HTMLDivElement>(null);
    const deleteZoneRef = useRef<HTMLDivElement>(null);
    const pressStartRef = useRef<Point | null>(null);

    // Remember where a press on the empty board started, so a drag isn't treated as a click
    const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        pressStartRef.current =
            e.target === e.currentTarget && e.button === 0
                ? { x: e.clientX, y: e.clientY }
                : null;
    };

    const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const pressStart = pressStartRef.current;
        pressStartRef.current = null;

        // Only create a note when the board itself was clicked
        if (e.target !== e.currentTarget || !pressStart) {
            return;
        }

        // The browser still fires click after press → move → release; ignore that
        const moved = Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y);
        if (moved > CLICK_MOVE_TOLERANCE) {
            return;
        }

        const board = e.currentTarget;
        const rect = board.getBoundingClientRect();

        // Keep the new note fully inside the board when clicking near an edge
        const position = clampNoteRect(
            {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                width: DEFAULT_NOTE_WIDTH,
                height: DEFAULT_NOTE_HEIGHT,
            },
            { width: board.clientWidth, height: board.clientHeight }
        );

        addNote(position)
    }

    // Notes may be dragged over the notes area and the delete zone, but not off the board.
    // Measured from the notes-area origin, since note positions are relative to it.
    const getDragBounds = (): Size | null => {
        if (!boardRef.current || !notesAreaRef.current) return null;

        const boardRect = boardRef.current.getBoundingClientRect();
        const notesAreaRect = notesAreaRef.current.getBoundingClientRect();

        return {
            width: boardRect.right - notesAreaRect.left,
            height: notesAreaRef.current.clientHeight,
        };
    };

    const handleDragEnd = (noteId: string, pointer: { x: number; y: number }) => {
        if (!deleteZoneRef.current || !notesAreaRef.current) return

        const rect = deleteZoneRef.current.getBoundingClientRect();

        if (
            pointer.x >= rect.left &&
            pointer.x <= rect.right &&
            pointer.y >= rect.top &&
            pointer.y <= rect.bottom
        ) {
            deleteNote(noteId)
            return;
        }

        // Not dropped on the trash: pull the note back fully inside the notes area
        moveNoteInside(noteId, {
            width: notesAreaRef.current.clientWidth,
            height: notesAreaRef.current.clientHeight,
        });
    }

    if (loading) return <div className="board">Loading...</div>;

    return (
        <div ref={boardRef} className="board">
            <div ref={notesAreaRef} className="notes-area" onPointerDown={handleBoardPointerDown} onClick={handleBoardClick}>
                {!notes.length && <p className="empty-hint">Click to add a note</p>}
                {notes.map(note => (
                    <StickyNote key={note.id} note={note} onUpdate={updateNote} onBringToFront={() => bringToFront(note.id)} onDragEnd={handleDragEnd} getDragBounds={getDragBounds} />
                ))}
            </div>
            <div ref={deleteZoneRef} className="delete-zone">🗑️<span>Drop here to delete</span></div>
        </div>
    )
}