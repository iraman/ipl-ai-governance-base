---
name: enforce-safe-errors
description: Verify WorkRide API errors return a generic JSON message and never leak internal error text, stack traces, or file paths to clients.
---

# Enforce safe errors skill

Use when adding or changing any Express route or error handler in Trimble WorkRide.

Source: "Input and output" in `.ai-governance/global-security-policy.md` — return `{ "error": "string" }` and do not leak stack traces or internal paths.

## When to use

- Adding a route or a `try`/`catch` block in `backend/server.js` or a module it imports
- Changing how the API reports unexpected failures
- Reviewing AI-generated backend code before merge

## Procedure

1. Read the "Input and output" section of `.ai-governance/global-security-policy.md`.
2. Confirm every unexpected failure goes through `serverError(res, e)` in `backend/server.js`.
3. Confirm `serverError` logs the error on the server and returns `{ error: 'Something went wrong. Please try again.' }` with status 500.
4. Confirm no response sends `e.message`, `e.stack`, or a file path. Known, expected failures (404, 400, 403, 409) use a fixed message written for the employee.
5. Run `npm run skills:eval` and check this skill's cases pass.

## Output checklist

Report to the PR or chat:

- [ ] New `catch` blocks call `serverError(res, e)`
- [ ] No response body contains `e.message` or `e.stack`
- [ ] Expected failures return a fixed, employee-readable message
- [ ] Error bodies keep the `{ error: string }` shape

## Evaluation

Test cases are in `evals.json` next to this file. Run them with `npm run skills:eval`.

## Do not

- Return `res.status(500).json({ error: e.message })` or any variant that forwards internal error text
- Return a stack trace, file path, or store contents in an error body
- Remove the server-side `console.error` in `serverError`; operators need the real error in the logs
