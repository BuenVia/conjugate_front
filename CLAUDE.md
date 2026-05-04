# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # dev server at http://localhost:3000
npm run build    # production build → build/
npm test         # Jest watch mode (run once with CI=true npm test)
```

## Architecture

This is a single-page React app (Create React App) that quizzes users on verb conjugations. All app logic lives in two files: `src/App.js` and `src/App.css`.

**Backend dependency:** The app calls a separate API (default `http://localhost:8000`, overridden via `REACT_APP_API_URL`). Three endpoints are used:
- `GET /verbs` — returns `{ data: [{ id, ... }] }`
- `GET /tenses` — returns `{ data: [{ id, name }] }`
- `GET /conjugations?verbs=<ids>&tenses=<ids>` — returns `{ data: [{ verb: { infinitive }, moods: [{ name, tenses: [{ name, conjugations: [{ person, value }] }] }] }] }`

**Data flow:** On mount, `App` fetches all verbs, then fetches all their conjugations. `flattenConjugations` denormalizes the nested mood→tense→conjugation tree into a flat array of `{ infinitive, person, mood, tense, answer }` objects, then shuffles them.

**Quiz state machine:** `status` drives the UI — `'idle'` (awaiting input), `'correct'` (advance on next Enter/click), `'incorrect'` (retry same question). Typing while `'incorrect'` resets to `'idle'`.

## Styling

Bootstrap v5 is loaded via CDN in `public/index.html`. All layout, typography, color, and component styling uses Bootstrap utility classes (`d-flex`, `gap-*`, `fw-bold`, `text-danger`, `fs-*`, `btn btn-primary`, `form-control`, etc.) directly on JSX elements.

`App.css` is intentionally minimal — it only defines the `.app` wrapper for max-width and centering, which Bootstrap's container doesn't constrain to 600px by default.
