export type Note = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    color: string;
    zIndex: number;
}

export type StickyNoteProps = {
    note: Note;
    onUpdate: (id: string, changes: Partial<Note>) => void;
    onBringToFront: () => void;
    onDragEnd: (noteId: string, pointer: { x: number; y: number }) => void;
    getDragBounds: () => { width: number; height: number } | null;
}