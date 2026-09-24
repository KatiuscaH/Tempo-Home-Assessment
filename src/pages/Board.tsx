import { useRef, useState } from "react";
import { StickyNote } from "../components/StickyNote"
import type { Note } from "../types/Note.type";
import { STICKY_NOTE_COLORS } from "../consts/StickyNoteColors";
import { useNotes } from "../hooks/useNotes.hook";

export const Board = () => {
    const {
        notes,
        addNote,
        updateNote,
        bringToFront,
        deleteNote,
        loading
    } = useNotes();

    const deleteZoneRef = useRef<HTMLDivElement>(null);

    // Persist on every change
    const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {

        // Only create a note when the board itself was clicked
        if (e.target !== e.currentTarget) {
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect(); //

        const newNote = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        }

        addNote(newNote)
    }

    const handleDropOnDeleteZone = (e: MouseEvent, noteId: string) => {
        if (!deleteZoneRef.current) return

        const rect = deleteZoneRef.current?.getBoundingClientRect();

        if (
            rect &&
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
        ) {
            // delete note
            deleteNote(noteId)
        }
    }

    if (loading) return <div className="board">Loading...</div>;

    return (
        <div className="board">
            <div className="notes-area" onClick={handleBoardClick}>
                {!notes.length && <p className="empty-hint">Click to add a note</p>}
                {notes.map(note => (
                    <StickyNote key={note.id} note={note} onUpdate={updateNote} onBringToFront={() => bringToFront(note.id)} onDragEnd={handleDropOnDeleteZone} />
                ))}
            </div>
            <div ref={deleteZoneRef} className="delete-zone">🗑️<span>Drop here to delete</span></div>
        </div>
    )
}