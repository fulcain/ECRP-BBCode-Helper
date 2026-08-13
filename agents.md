# Agent Instructions

- Do not add a commit signature (e.g., a "Co-Authored-By" or "Generated with" trailer) to commits.

## Git & commit conventions

- Use Conventional Commits for commit messages:
  - `feat:` — new feature
  - `fix:` — bug fix
  - `refactor:` — code restructuring that does not change behavior
  - `docs:` — documentation only
  - `style:` — formatting, missing semicolons, etc.
  - `test:` — adding or updating tests
  - `chore:` — maintenance tasks, dependency updates, tooling
  - `perf:` — performance improvements
  - `build:` — build system or external dependencies
  - `ci:` — CI configuration changes
- Keep the commit subject short, imperative mood, and no trailing period.
- Optional scope: `feat(auth): add password reset`.
- Branch naming:
  - `feat/<short-description>` for features
  - `fix/<short-description>` for bug fixes
  - `refactor/<short-description>` for refactoring
  - `chore/<short-description>` for chores
- Avoid mixing unrelated changes in a single commit; split them into logical commits.

## Coding conventions

### Stack

- Next.js 16 (App Router) + React 19 + TypeScript (`strict`) — server components by default; add `"use client"` only where interactivity requires it.
- Tailwind CSS v4 — style with utility classes; the theme tokens live in `app/globals.css`. Keep custom CSS to a minimum.
- MongoDB for persistence via `lib/store.ts`, falling back to `data/db.json` locally when `MONGODB_URI` is unset.
- Capacitor (Android) and Electron (desktop) are thin shells that load the live web app — don't add web features to `android/` or `electron/`; only `electron/main.cjs` and `electron/preload.cjs` are hand-edited.
- Import with the `@/*` alias (maps to the repo root).

### Structure

- `app/` — routes and server components; server actions in per-feature `*-actions.ts` files (e.g. `actions.ts`, `party-actions.ts`, `admin-actions.ts`).
- `components/` — React components grouped by feature (`ui/`, `parties/`, `admin/`, ...); prefer reusing existing `components/ui` primitives over adding new ones.
- `lib/` — shared logic: `store.ts` (DB), `auth.ts`, `types.ts`, `i18n/`, and `ui.ts` (`cn()`).
- User-facing strings go through `lib/i18n` (`tServer` / `t`) for the fa/en switch — no hardcoded UI text.

### Linting

- ESLint 9 flat config (`eslint.config.mjs`) with `eslint-config-next` (core-web-vitals + typescript).
- Run `npm run lint` before finishing. `electron/**` is intentionally ignored (CommonJS main process, Node-style require).

### Type checking & tests

- There is no test suite in this repo yet. Verify changes with:
  - `npx tsc --noEmit` (typecheck)
  - `npm run build` (production build, includes typecheck)
  - `npm run lint`

### Comments

- Keep comments short and explain *why*, not *what*. Don't write long comments narrating what the code does or what happened — the code should speak for itself. Reserve comments for non-obvious decisions, invariants, and gotchas.
