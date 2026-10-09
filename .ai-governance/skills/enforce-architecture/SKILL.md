---
name: enforce-architecture
description: Verify WorkRide code keeps the agreed architecture — Express backend with rules in rules.js, JSON store, React/Vite frontend calling the API only through api.js.
---

# Enforce architecture skill

Use when adding files, packages, routes, or pages to Trimble WorkRide, or when reviewing AI-generated structural changes.

Sources: `.ai-governance/rules/architecture-guidelines.md` and `.ai-governance/architectural-standards.md`.

## When to use

- Adding a dependency to `package.json`, `backend/package.json`, or `frontend/package.json`
- Adding a route in `backend/server.js` or a page in `frontend/src/pages/`
- Adding any HTTP call in the frontend
- Creating a new top-level folder

## Procedure

1. Read `.ai-governance/rules/architecture-guidelines.md` and `.ai-governance/architectural-standards.md`.
2. Frontend HTTP calls go through `frontend/src/api.js` only; no `fetch`, `XMLHttpRequest`, or `axios` in pages or context.
3. Persistence stays in the JSON store (`backend/store.js`, `backend/data/store.json`). No database or ORM package without an approved architecture change.
4. No heavyweight framework (NestJS, Redux, MobX, Next.js, axios) without team approval.
5. Business rules live in `backend/rules.js`; route handlers call them and do not hard-code times, dates, or categories.
6. CORS uses the `allowedOrigins` list, never `*`.
7. Keep three trees only: `frontend/`, `backend/`, and the `src/` placeholder. New pages live in `frontend/src/pages/` and are imported in `frontend/src/App.jsx`.
8. Error responses use `{ error: string }`.
9. Run `npm run skills:eval` and check this skill's cases pass.

## Output checklist

Report to the PR or chat:

- [ ] No HTTP call outside `frontend/src/api.js`
- [ ] No new database, ORM, or heavyweight framework package
- [ ] No business rule in `backend/server.js`
- [ ] CORS still restricted to `allowedOrigins`
- [ ] No new top-level app folder
- [ ] New pages imported in `App.jsx`
- [ ] Error bodies keep the `{ error: string }` shape

## Evaluation

Test cases are in `evals.json` next to this file. Run them with `npm run skills:eval`.

## Do not

- Call `fetch` from a page or component
- Add Postgres, MongoDB, SQLite, Prisma, or another store in place of the JSON file
- Copy a cutoff, holiday list, or urgent category into `backend/server.js`
- Set CORS `origin` to `*`
- Create `app/`, `server/`, `api/`, `client/`, or `web/` beside the existing trees
