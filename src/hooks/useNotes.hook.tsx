import { useState, useEffect, useRef } from "react";
import type { Note } from "../types/Note.type";
import { notesApi } from "../api/api";
import { STICKY_NOTE_COLORS } from "../consts/StickyNoteColors";
import { DEFAULT_NOTE_HEIGHT, DEFAULT_NOTE_WIDTH } from "../consts/NoteSize";
import { bringNoteToFront, clampNoteRect, normalizeZIndexes, type Size } from "../utils/notes.utils";

const SAVE_DEBOUNCE_MS = 500;

export const useNotes = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loading, setLoading] = useState(false)

    const latestNotesRef = useRef<Note[]>(notes);
    const saveTimerRef = useRef<number | null>(null);
    const skipNextSaveRef = useRef(true);

    useEffect(() => {
        let cancelled = false;

        const loadNotes = async () => {
            try {
                setLoading(true)
                const savedNotes = await notesApi.fetchNotes();
                if (!cancelled) setNotes(savedNotes);
            } catch (error) {
                console.error("Failed to load notes", error);
            } finally {
                if (!cancelled) {
                    setIsLoaded(true);
                    setLoading(false)
                }
            }
        };

        loadNotes();

        return () => {
            cancelled = true;
        };
    }, []);

    // Debounced save: a drag produces one save once the user stops, not one per pixel
    useEffect(() => {
        latestNotesRef.current = notes;
        if (!isLoaded) return;

        // The first render after loading holds exactly what is already stored
        if (skipNextSaveRef.current) {
            skipNextSaveRef.current = false;
            return;
        }

        if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
            saveTimerRef.current = null;
            notesApi.saveNotes(latestNotesRef.current);
        }, SAVE_DEBOUNCE_MS);
    }, [notes, isLoaded]);

    // Flush a pending save when the page is hidden or closed, or the hook unmounts
    useEffect(() => {
        const flushPendingSave = () => {
            if (saveTimerRef.current === null) return;
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
            notesApi.saveNotesImmediately(latestNotesRef.current);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") flushPendingSave();
        };

        window.addEventListener("pagehide", flushPendingSave);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("pagehide", flushPendingSave);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            flushPendingSave();
        };
    }, []);

    const addNote = (position: { x: number; y: number }) => {
        setNotes(prev => {
            const newNote: Note = {
                id: crypto.randomUUID(),
                x: position.x,
                y: position.y,
                width: DEFAULT_NOTE_WIDTH,
                height: DEFAULT_NOTE_HEIGHT,
                text: '',
                color: STICKY_NOTE_COLORS[Math.floor(Math.random() * STICKY_NOTE_COLORS.length)],
                // z-indexes are always 1..n, so the new note goes on top
                zIndex: prev.length + 1,
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
        // Re-normalize so z-indexes stay 1..n without gaps
        setNotes(prev =>
            normalizeZIndexes(prev.filter(note => note.id !== id))
        );
    };

    // Functional update so it uses the note's latest position, not the one from when the drag started
    const moveNoteInside = (id: string, bounds: Size) => {
        setNotes(prev => {
            const note = prev.find(n => n.id === id);
            if (!note) return prev;

            const { x, y } = clampNoteRect(note, bounds);
            if (x === note.x && y === note.y) return prev;

            return prev.map(n => (n.id === id ? { ...n, x, y } : n));
        });
    };

    const bringToFront = (id: string) => {
        setNotes(prev => bringNoteToFront(prev, id));
    };

    return {
        notes,
        addNote,
        updateNote,
        deleteNote,
        moveNoteInside,
        bringToFront,
        loading
    };
};
