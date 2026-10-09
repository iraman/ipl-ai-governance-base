---
name: validate-prd
description: Verify every WorkRide PRD is well formed and every requirement traces to policy, code, and passing tests, with any gap declared rather than hidden.
---

# Validate PRD skill

Use when writing or changing a PRD in `prd/`, or when code, policy, or tests that a PRD requirement depends on change.

Source of truth for requirements: `prd/traceability.json`. Report: `npm run prd:eval`.

## When to use

- Adding a PRD or a change PRD to `prd/`
- Editing a requirement in `prd/workride-prd.md`, `prd/workride-chat-prd.md`, or the plan `prd/workride-to-implement.md`
- Adding, renaming, or removing a business rule in `backend/rules.js`
- Renaming or removing a test that a requirement lists

## Procedure

1. Give the PRD the header `**Status:**` (Draft or Agreed), `**Date:**` (YYYY-MM-DD), `**Product:**`, `**Audience:**`, and the sections Problem, Solution, Impact, Terms.
2. For a change PRD, add `**Baseline:**` linking the baseline PRD, leave the baseline unchanged, name the carrying skill (`.ai-governance/skills/<name>/SKILL.md`), and name its `PRD change — …` section. That section must exist in the skill.
3. Add each requirement to `prd/traceability.json`: an exact PRD quote, the policy quote, the code quote, the `rules.js` functions it uses, and the tests that prove it.
4. If a requirement is not fully implemented, or the PRD is silent or ambiguous, add a `gap` that says what is missing, and a `plan` quote when `prd/workride-to-implement.md` covers the work. Never leave a gap undeclared.
5. Do not add policy or code for limits the PRD does not state; `prd/workride-to-implement.md` lists the ones ruled out.
6. Run `npm run prd:eval` and `npm run skills:eval`.

## Output checklist

Report to the PR or chat:

- [ ] Every PRD in `prd/` is listed in `prd/traceability.json`
- [ ] Every requirement's PRD, policy, and code quotes still exist
- [ ] Every requirement without a gap has code and passing tests
- [ ] Every `rules.js` business rule belongs to a requirement
- [ ] Open gaps are listed in the PR with their plan section
- [ ] The baseline PRD is unchanged by a change PRD

## Evaluation

Test cases are in `evals.json` next to this file. Run them with `npm run skills:eval`. Run `npm run prd:eval` for the requirement-by-requirement report.

## Do not

- Edit an Agreed baseline PRD to describe a change; write a change PRD with `**Baseline:**`
- Remove a requirement, quote, or test from `prd/traceability.json` to make the evaluation pass
- Declare a gap to hide a requirement that is broken; a gap means the work is known and planned
- Add a business rule to `backend/rules.js` that no PRD requirement claims
