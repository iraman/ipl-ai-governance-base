# Agent Governance Lifecycle (AGL) — Trimble WorkRide

This directory centralizes **behavioral assets** (rules, skills, prompts) that shape AI-assisted development for WorkRide. These assets are versioned in Git, reviewed in pull requests, and validated in CI—using the same discipline as application source code.

## Why this exists

Ungoverned AI instructions on individual machines can steer agents toward:

- Dev-only auth bypasses instead of Trimble ID OAuth
- Booking logic that ignores cutoffs defined in `backend/rules.js`
- Inconsistent API patterns across frontend and backend

AGL extends Trimble CPD pull-request practices to these meta-assets.

## Directory layout

```
.ai-governance/
├── README.md                 ← this file
├── ADOPTION.md               ← 5-step team playbook
├── PR_REVIEW_CHECKLIST.md    ← extend PR review to behavioral assets
├── global-security-policy.md
├── architectural-standards.md
├── rules/
│   ├── architecture-guidelines.md
│   ├── trimble-id-auth.md
│   └── booking-policies.md
├── skills/
│   ├── validate-booking-rules/
│   │   ├── SKILL.md
│   │   └── evals.json        ← test cases run by the skill evaluator
│   ├── validate-chat-override/      ← urgent chat override (chat PRD)
│   ├── enforce-safe-errors/         ← no internal error details to clients
│   ├── validate-prd/                ← PRD structure and requirement traceability
│   ├── grill-prd/                   ← one question at a time about each open PRD gap
│   └── enforce-architecture/        ← api.js, rules.js, JSON store, no extra frameworks
├── prompts/
│   └── pr-review-behavioral-assets.md
└── ci/
    └── promptfoo.yaml        ← optional LLM-as-judge (requires API key)
```


## Traceability

`behavior-manifest.json` at the repo root records a SHA-256 hash of all files in this directory. Regenerate after changes:

```bash
npm run governance:manifest
```

Reference the manifest hash in commit messages or PR descriptions when AI-generated code depends on a specific rule set:

```
AGL-MANIFEST: a1b2c3d4...
```

## Local validation

```bash
npm run governance:check
```

Runs structure validation, policy regression tests, the PRD evaluator, the skill evaluator, and the manifest check (no API key required).

## PRD evaluator

```bash
npm run prd:eval
```

Every requirement in `prd/workride-prd.md` and `prd/workride-chat-prd.md` is listed in `prd/traceability.json` with an exact quote from the PRD, the policy, and the code, the `rules.js` functions it uses, and the tests that prove it. The evaluator:

1. Checks each PRD's header (Status, Date, Product, Audience) and sections (Problem, Solution, Impact, Terms). A change PRD must link its baseline and name a carrying skill with a matching `PRD change — …` section.
2. Checks every quote still exists and runs every listed test. A requirement is TRACED, GAP (not fully implemented, declared with what is missing and the plan section), or BROKEN.
3. Fails if any `rules.js` business rule belongs to no requirement.

It writes `test-results/prd-evaluation.json` and exits 1 on any BROKEN requirement or structure problem. Declared gaps are reported but do not fail the run. The `validate-prd` skill owns these checks.

## PRD grill

```bash
npm run prd:grill          # next open question
npm run prd:grill -- --all # every question and its status
```

A declared gap is a decision nobody has made yet. `prd/questions.json` holds one question per open gap, with an owner, a priority, and at least two options. The `grill-prd` skill has the agent ask the highest-priority question, one at a time, wait for the owner's answer, and record `answer`, `decidedBy`, `decidedOn`, and `action` before any code is written for it. The command fails if an open gap has no question, an option breaks the security policy, or an answer is missing who decided, when, or what changes.

## Skill evaluator

```bash
npm run skills:eval
```

For each folder in `skills/`, the evaluator:

1. Checks the skill's lifecycle assets: `SKILL.md` frontmatter (`name` matches the folder, `description` set), the sections When to use, Procedure, Output checklist, Evaluation, and Do not, and a well-formed `evals.json`.
2. Runs the backend tests listed in `evals.json` and reports each as pass, fail, or missing.
3. Checks the policy, PRD, and source files listed under `assets`.

It prints a result per skill, lists backend tests that no skill owns, writes `test-results/skill-evaluation.json`, and exits 1 if any skill fails.

To add a skill, create `skills/<name>/SKILL.md` and `skills/<name>/evals.json`, then add both to `scripts/validate-governance.mjs` and run `npm run governance:manifest`.

## Manifest check

`npm run governance:manifest:check` compares every file in `.ai-governance/` with the reviewed `behavior-manifest.json` and lists any file that was added, changed, or removed without regenerating it. CI and `governance:check` run it.

## Demo

```bash
npm run agl:demo    # six ungoverned changes, each applied to a throwaway copy of the repo
npm run agl:video   # records test-results/agl-demo.webm (needs the app running with testuser1 blocked)
```

| Use case | Ungoverned change | Gate that blocks it |
|---|---|---|
| Policy and code drift | Policy promises a waitlist and 2 bookings per date | Regression tests, `validate-booking-rules`, manifest check |
| Errors that leak internals | A handler returns `e.message` and `e.stack` | `enforce-safe-errors` |
| Talking the chat bot past the rules | Chat route trusts `is_admin` from the request | `validate-chat-override` |
| A quiet change to the rules | Cancel window edited to 30 minutes without review | Manifest check, regression tests, `validate-booking-rules` |
| Code that no longer matches the PRD | Morning cutoff moved to 9 PM in `rules.js` only | PRD evaluator, `validate-prd`, `validate-booking-rules` |
| A page that bypasses the API client | `fetch` added straight into `Book.jsx` | `enforce-architecture` |

`agl:demo` writes `test-results/agl-demo.html` and exits 1 if any change gets through or the real repo fails a gate.

## Pull request policy

Any change under `.ai-governance/`, `.cursor/rules/`, or MCP configuration must use the checklist in `PR_REVIEW_CHECKLIST.md` and receive the same scrutiny as security-sensitive code changes.
