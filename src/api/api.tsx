import type { Note } from "../types/Note.type";
import { isNote, normalizeZIndexes } from "../utils/notes.utils";

const FAKE_LATENCY = 400;
const STORAGE_KEY = 'sticky-notes';

const delay = (ms: number) =>
    new Promise<void>(resolve => setTimeout(resolve, ms));

const readNotes = (): Note[] => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        console.warn("Stored notes are not valid JSON, starting with an empty board");
        return [];
    }

    if (!Array.isArray(parsed)) return [];

    // Drop corrupt entries but keep the valid ones
    return normalizeZIndexes(parsed.filter(isNote));
};

const writeNotes = (notes: Note[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
        console.error("Failed to save notes", error);
    }
};

export const notesApi = {
    async fetchNotes(): Promise<Note[]> {
        await delay(FAKE_LATENCY);
        return readNotes();
    },

    async saveNotes(notes: Note[]): Promise<void> {
        await delay(FAKE_LATENCY);
        writeNotes(notes);
    },

    // Synchronous save without latency, for when the page is being hidden or closed
    saveNotesImmediately(notes: Note[]): void {
        writeNotes(notes);
    },
};
