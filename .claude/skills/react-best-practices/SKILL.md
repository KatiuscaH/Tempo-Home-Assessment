---
name: react-best-practices
description: Architecture, implementation and testing rules for this React + TypeScript + Vite home assessment. Use whenever creating, editing, refactoring, reviewing or testing React components, custom hooks, styles or tests in this project.
---

# React Home Assessment Best Practices

Strict architectural, implementation and testing rules for this React home assessment. The goal is clean, production-grade, self-documenting code.

## Project Alignment & Constraints
- **Scope**: Small home assessment. Prioritize speed, correctness and clean organization.
- **Styling**: Plain CSS only (component-level `.css` files or CSS Modules). No CSS frameworks (Tailwind, Bootstrap, MUI, styled-components, etc.).
- **State management**: Keep it simple. Use local `useState` / `useReducer` or the native Context API. Add external state libraries only when explicitly asked.
- **TypeScript**: Strict typing. Never use `any`; prefer `unknown` plus narrowing when a type is genuinely unknown.

## React Best Practices
- **Component separation**: Small, single-purpose components. Move complex business logic into custom hooks (e.g. `useStickyNotes.ts`).
- **Performance**: Avoid unnecessary re-renders. Use `useMemo` for expensive derivations/filtering and `useCallback` for callbacks passed to memoized children. Don't memoize trivially cheap values.
- **State co-location**: Keep state as close as possible to where it is used. Lift it only when several distant components depend on it.
- **Semantic HTML & a11y**: Use `<main>`, `<section>`, `<article>`, `<header>`, `<button>`, `<form>`, `<label>` etc. instead of generic `<div>` wrappers. Interactive elements must be keyboard-accessible and have accessible names.

## Testing Guidelines
- **Framework**: Vitest + React Testing Library (`@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`). If these are not installed yet, propose installing them before writing tests.
- **Philosophy**: Test user behavior, not implementation details. Query by accessible role/label/text (e.g. `screen.getByRole('button', { name: /submit/i })`). Avoid test IDs and class selectors.
- **Coverage priorities**:
  1. Core user flows (happy paths).
  2. Edge cases: loading, empty and error states.
  3. Custom hooks, via `renderHook` from `@testing-library/react` (the old `@testing-library/react-hooks` package is deprecated for React 18+).

## Task Execution Flow
1. **Discover & plan**: Analyze the requirements. Outline the component hierarchy and state shape before writing code.
2. **Types first**: Define data models and TypeScript interfaces (e.g. in `src/types/`).
3. **Core logic (TDD preferred)**: Build custom hooks / base components together with their tests.
4. **Refine UI/UX**: Responsive styling, accessibility attributes, loading/error/empty states.
5. **Verify & clean**: Run `npm run lint`, `npm run build` and the tests; fix console warnings; remove debug logs.
