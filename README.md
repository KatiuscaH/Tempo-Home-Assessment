# Sticky Notes App

A simple React + TypeScript sticky notes application built as a frontend coding challenge.

## Features

* Create sticky notes by clicking on the board.
* Edit note text.
* Drag notes around the board.
* Resize notes using the resize handle.
* Bring a note to the front when interacting with it.
* Delete notes by dragging them into the delete zone.
* Assign different colors to newly created notes.
* Persist notes using `localStorage`.
* Restore notes when the application is reloaded.
* Simulate asynchronous REST API calls with a fake API layer.

## Tech Stack

* React
* TypeScript
* Vite
* Plain CSS
* Vitest + React Testing Library

No third-party drag-and-drop or sticky-note interaction libraries are used.

## Architecture

The app is split by responsibility rather than by feature. `Board` owns the layout and everything that depends on it: telling a click apart from a drag, working out the drag bounds, and checking whether a drop landed on the trash. It is the only component that knows where the notes area and the trash are on screen. `StickyNote` handles pointer interaction for a single note and reports what the user wants to do (move, resize, drop, bring to front) through callbacks. It knows nothing about storage or about the other notes. The `useNotes` hook is the only owner of the notes state: every change (adding, editing, moving, reordering, deleting) goes through it. That is why it also owns persistence. Saving is a consequence of the state changing, not of any particular UI event, so keeping it next to the state means every change is saved the same way and no component can forget to save. The timing policy also lives in one place: saves are debounced, and a pending save is flushed synchronously on `pagehide`/`visibilitychange`.

The API layer (`src/api`) is kept separate so the hook talks to an async interface shaped like a REST client (`fetchNotes`/`saveNotes`, with artificial latency) instead of to `localStorage` directly. Replacing the mock with a real backend would only change that file. It is also the trust boundary: data in `localStorage` can be corrupted, edited by hand or written by an older version, so it is validated there with a type guard. Invalid entries are dropped and z-indexes are normalized, and the rest of the app can rely on the `Note` type without defensive checks. The rules themselves (boundary clamping, z-index ordering and the trash hit test) are pure functions in `src/utils`, so they can be tested without a browser and reused by both the hook and the components.

Several tradeoffs were deliberate. State lives in a single hook with `useState` rather than Context or a state library, because there is only one consumer and adding more would be extra machinery for no benefit. The whole list is saved on every change, which is simple and fine for a handful of notes; a real backend would call for per-note updates, optimistic UI and conflict handling. The 500 ms debounce trades a short window of unsaved changes for far fewer writes during a drag, and that window is covered by the flush on page hide. Z-indexes are renumbered to 1..n on every bring-to-front, which costs a sort but keeps the values bounded forever. Dragging uses the Pointer Events API with pointer capture instead of a library, so it works for mouse, touch and pen, and fast movements don't lose the note. Deletion is decided by the pointer position rather than by how much the note overlaps the trash, which is more predictable. A note may slide over the trash while dragging, but is pulled back inside the board if it is released anywhere else. Known limitations: notes can't yet be moved with the keyboard, and positions are stored in pixels, so shrinking the window can leave a note partly outside the board until it is moved again.

## Getting Started

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Then open the local URL shown in the terminal, usually:

```text
http://localhost:5173
```

### Run the tests

```bash
npm test            # single run
npm run test:watch  # watch mode
```

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Project Structure

```text
src/
├── api/          # Mock REST layer over localStorage, validates stored data
├── components/   # StickyNote: pointer interaction for a single note
├── consts/       # Colors and note size limits
├── hooks/        # useNotes: notes state, transitions and persistence
├── pages/        # Board: layout, click vs. drag, trash hit test
├── test/         # Test setup and shared helpers
├── types/        # Note types
└── utils/        # Pure rules: clamping, z-index ordering, hit test, validation
```

## Notes

No restrictions on AI usage for this home task (I used Claude Code and ChatGPT).
