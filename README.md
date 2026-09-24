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
* Manage note state and persistence through a custom `useNotes` hook.

## Tech Stack

* React
* TypeScript
* Vite
* CSS
* LocalStorage
* Custom React hooks

No third-party drag-and-drop or sticky-note interaction libraries are used.

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
├── api/
│   └── notesApi.ts
├── components/
│   └── StickyNote.tsx
├── consts/
│   └── Colors.ts
├── hook/
│   └── useNotes.hook.ts
├── pages/
│   └── Board.tsx
├── types/
│   └── Note.type.ts
├── App.tsx
└── index.css
```

## Notes

The API layer is mocked using `localStorage` and an artificial delay to simulate asynchronous REST requests. This keeps persistence logic separate from the UI and makes it easier to replace the mock API with a real backend in the future. No restrictions on AI usage for this home task (I used Claude code and ChatGPT)
