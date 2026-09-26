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
│   └── validate-booking-rules/SKILL.md
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

Runs structure validation and policy regression tests (no API key required).

## Pull request policy

Any change under `.ai-governance/`, `.cursor/rules/`, or MCP configuration must use the checklist in `PR_REVIEW_CHECKLIST.md` and receive the same scrutiny as security-sensitive code changes.
