// src/components/StickyNote.tsx
import { useRef, useState } from "react";
import "../index.css";
import type { StickyNoteProps } from "../types/Note.type";
import { clampNoteRect, clampNoteSize, type Size } from "../utils/notes.utils";

type Interaction =
    | { type: "drag"; startPointerX: number; startPointerY: number; startX: number; startY: number }
    | { type: "resize"; startPointerX: number; startPointerY: number; startWidth: number; startHeight: number };

export const StickyNote = ({ note, onUpdate, onBringToFront, onDragEnd, getDragBounds }: StickyNoteProps) => {

    const [isDragging, setIsDragging] = useState(false);
    const noteRef = useRef<HTMLDivElement>(null);

    const startInteraction = (e: React.PointerEvent<HTMLDivElement>, kind: Interaction["type"]) => {
        // Primary button / touch / pen only
        if (e.button !== 0) return;

        // Prevent text selection while dragging
        e.preventDefault();

        // Dragging may go over the delete zone; resizing stays inside the notes area,
        // which is the note's offsetParent
        const notesArea = noteRef.current?.offsetParent;
        const bounds: Size | null =
            kind === "drag"
                ? getDragBounds()
                : notesArea
                    ? { width: notesArea.clientWidth, height: notesArea.clientHeight }
                    : null;
        if (!bounds) return;

        // Capture keeps delivering pointer events to this element even when the
        // cursor moves faster than the note or leaves the browser window
        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);
        setIsDragging(true);

        const interaction: Interaction =
            kind === "drag"
                ? {
                    type: "drag",
                    startPointerX: e.clientX,
                    startPointerY: e.clientY,
                    startX: note.x,
                    startY: note.y,
                }
                : {
                    type: "resize",
                    startPointerX: e.clientX,
                    startPointerY: e.clientY,
                    startWidth: note.width,
                    startHeight: note.height,
                };

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const deltaX = moveEvent.clientX - interaction.startPointerX;
            const deltaY = moveEvent.clientY - interaction.startPointerY;

            if (interaction.type === "drag") {
                onUpdate(note.id, clampNoteRect({
                    x: interaction.startX + deltaX,
                    y: interaction.startY + deltaY,
                    width: note.width,
                    height: note.height,
                }, bounds));
            } else {
                onUpdate(note.id, clampNoteSize({
                    x: note.x,
                    y: note.y,
                    width: interaction.startWidth + deltaX,
                    height: interaction.startHeight + deltaY,
                }, bounds));
            }
        };

        const endInteraction = () => {
            setIsDragging(false);
            target.removeEventListener("pointermove", handlePointerMove);
            target.removeEventListener("pointerup", handlePointerUp);
            target.removeEventListener("pointercancel", endInteraction);
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            endInteraction();

            // Only a completed drag (not a resize) can result in a drop-on-trash.
            // The pointer position is used, so it works even though the note is clamped to the board.
            if (interaction.type === "drag") {
                onDragEnd(note.id, { x: upEvent.clientX, y: upEvent.clientY });
            }
        };

        target.addEventListener("pointermove", handlePointerMove);
        target.addEventListener("pointerup", handlePointerUp);
        target.addEventListener("pointercancel", endInteraction);
    };

    const handleTextChange = (value: string) => {
        onUpdate(note.id, { text: value });
    };

    return (
        <div
            ref={noteRef}
            className="sticky-note brute-card"
            style={{
                left: note.x,
                top: note.y,
                width: note.width,
                height: note.height,
                backgroundColor: note.color,
                zIndex: note.zIndex,
                cursor: isDragging ? "grabbing" : "default",
                boxShadow: isDragging ? "0 10px 20px rgba(0, 0, 0, 0.50)" : undefined,
            }}
            onPointerDown={onBringToFront}
        >
            <div
                className="note-handle"
                onPointerDown={(e) => startInteraction(e, "drag")}
            >
                ⠿ {/* drag handle bar */}
            </div>

            <textarea
                placeholder="Type here..."
                value={note.text}
                onChange={(e) => handleTextChange(e.target.value)}
                className="note"
                style={{
                    width: "100%",
                    height: "90%",
                    background: "inherit",
                    fontFamily: "'Barlow', sans-serif",
                }}
            />

            {/* Resize corner */}
            <div
                className="resize-handle"
                onPointerDown={(e) => startInteraction(e, "resize")}
            />
        </div>
    );
};
