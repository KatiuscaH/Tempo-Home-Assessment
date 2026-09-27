# CLAUDE.md

Sticky Notes app — React 19 + TypeScript + Vite home assessment. See [README.md](README.md) for features.

## Commands
- `npm run dev` — start dev server (http://localhost:5173)
- `npm run build` — type-check (`tsc -b`) and build
- `npm run lint` — ESLint
- `npm test` — Vitest + React Testing Library (jsdom); `npm run test:watch` for watch mode

## Project structure
```
src/
├── api/          # Mock REST layer (localStorage + artificial delay) — the only place that touches storage
├── components/   # Small presentational components (StickyNote)
├── consts/       # Constants (note colors)
├── hooks/        # Custom hooks holding state/business logic (useNotes)
├── pages/        # Page-level containers (Board)
├── types/        # Shared TypeScript types (Note)
├── App.tsx
└── main.tsx
```
Follow the existing naming: `*.hook.tsx` for hooks, `*.type.ts` for types, PascalCase for components.

## Always-on rules
- **TypeScript**: never use `any`; use `unknown` + narrowing. Type all props, hook return values and API responses. Use `import type` for type-only imports (`verbatimModuleSyntax` is on).
- **Styling**: plain CSS only — no Tailwind, UI kits or CSS-in-JS.
- **Dependencies**: do not add libraries (state, drag-and-drop, UI) without asking. Drag, resize and z-order are implemented by hand on purpose.
- **State**: `useState` / `useReducer` / Context only. Co-locate state; keep note logic in `useNotes`, not in components.
- **Components**: small and single-purpose; logic in hooks, rendering in components. Use `useMemo`/`useCallback` only where they prevent real work or re-renders.
- **Data access**: components never call `localStorage` directly — go through `src/api`.
- **Accessibility**: semantic HTML (`main`, `section`, `article`, `button`, `label`), keyboard-reachable controls, accessible names on icon-only buttons.
- **Handle states**: loading, empty and error states for every async flow.

## Before finishing a task
1. `npm run lint` and `npm run build` pass with no warnings.
2. Tests (once set up) pass; new behavior has tests that query by role/label, not test IDs or classes.
3. No leftover `console.log`, commented-out code or unused files.
4. Update README.md if features or structure change.

For detailed React/testing guidance, use the `react-best-practices` skill (`.claude/skills/react-best-practices/SKILL.md`).
