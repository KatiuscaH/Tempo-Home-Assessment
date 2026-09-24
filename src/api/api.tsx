import type { Note } from "../types/Note.type";

const FAKE_LATENCY = 400;

const delay = (ms: number) =>
    new Promise<void>(resolve => setTimeout(resolve, ms));

export const notesApi = {
    async fetchNotes(): Promise<Note[]> {
        await delay(FAKE_LATENCY);

        const raw = localStorage.getItem('sticky-notes');

        return raw ? JSON.parse(raw) : [];
    },

    async saveNotes(notes: Note[]): Promise<void> {
        await delay(FAKE_LATENCY);

        localStorage.setItem(
            'sticky-notes',
            JSON.stringify(notes)
        );
    },
};