// src/components/StickyNote.tsx
import { useState } from "react";
import "../index.css";
import type { StickyNoteProps } from "../types/Note.type";

type Interaction =
    | { type: "drag"; startMouseX: number; startMouseY: number; startX: number; startY: number }
    | { type: "resize"; startMouseX: number; startMouseY: number; startWidth: number; startHeight: number };

export const StickyNote = ({ note, onUpdate, onBringToFront, onDragEnd }: StickyNoteProps) => {

    const [isDragging, setIsDragging] = useState(false);

    const startInteraction = (e: React.MouseEvent, kind: Interaction["type"]) => {
        e.stopPropagation();
        onBringToFront();
        setIsDragging(true);

        const interaction: Interaction =
            kind === "drag"
                ? {
                    type: "drag",
                    startMouseX: e.clientX,
                    startMouseY: e.clientY,
                    startX: note.x,
                    startY: note.y,
                }
                : {
                    type: "resize",
                    startMouseX: e.clientX,
                    startMouseY: e.clientY,
                    startWidth: note.width,
                    startHeight: note.height,
                };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - interaction.startMouseX;
            const deltaY = moveEvent.clientY - interaction.startMouseY;

            if (interaction.type === "drag") {
                onUpdate(note.id, {
                    x: interaction.startX + deltaX,
                    y: interaction.startY + deltaY,
                });
            } else {
                onUpdate(note.id, {
                    width: Math.max(100, interaction.startWidth + deltaX),
                    height: Math.max(80, interaction.startHeight + deltaY),
                });
            }
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            setIsDragging(false);

            // Only a completed drag (not a resize) can result in a drop-on-trash
            if (interaction.type === "drag") {
               onDragEnd(upEvent, note.id);
            }

            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

    const handleTextChange = (value: string) => {
        onUpdate(note.id, { text: value });
    };

    return (
        <div
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
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onBringToFront}
        >
            <div
                className="note-handle"
                onMouseDown={(e) => startInteraction(e, "drag")}
            >
                ⠿ {/* drag handle bar */}
            </div>

            <textarea
                placeholder="Type here..."
                value={note.text}
                onChange={(e) => handleTextChange(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
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
                onMouseDown={(e) => startInteraction(e, "resize")}
            />
        </div>
    );
};