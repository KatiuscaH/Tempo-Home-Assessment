import { useState, useEffect } from "react";
import type { Note } from "../types/Note.type";
import { notesApi } from "../api/api";
import { STICKY_NOTE_COLORS } from "../consts/StickyNoteColors";

export const useNotes = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const loadNotes = async () => {
            try {
                setLoading(true)
                const savedNotes = await notesApi.fetchNotes();
                setNotes(savedNotes);
            } catch (error) {
                console.error("Failed to load notes", error);
            } finally {
                setIsLoaded(true);
                setLoading(false)
            }
        };

        loadNotes();
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        notesApi.saveNotes(notes);
    }, [notes, isLoaded]);

    const addNote = (position: { x: number; y: number }) => {
        setNotes(prev => {
            const nextZ = Math.max(0, ...prev.map(n => n.zIndex)) + 1;
            const newNote: Note = {
                id: crypto.randomUUID(),
                x: position.x,
                y: position.y,
                width: 200,
                height: 200,
                text: '',
                color: STICKY_NOTE_COLORS[Math.floor(Math.random() * STICKY_NOTE_COLORS.length)],
                zIndex: nextZ,
            };
            return [...prev, newNote];
        });
    };

    const updateNote = (
        id: string,
        changes: Partial<Note>
    ) => {
        setNotes(prev =>
            prev.map(note =>
                note.id === id
                    ? { ...note, ...changes }
                    : note
            )
        );
    };

    const deleteNote = (id: string) => {
        setNotes(prev =>
            prev.filter(note => note.id !== id)
        );
    };

    const bringToFront = (id: string) => {
        setNotes(prev => {

            const highestZIndex = Math.max(
                ...prev.map(note => note.zIndex)
            );

            return prev.map(note =>
                note.id === id ? { ...note, zIndex: highestZIndex + 1 } : note
            )
        })
    };

    return {
        notes,
        addNote,
        updateNote,
        deleteNote,
        bringToFront,
        loading
    };
};