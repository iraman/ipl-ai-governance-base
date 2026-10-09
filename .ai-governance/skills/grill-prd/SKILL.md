---
name: grill-prd
description: Interview the PRD owner one question at a time about every open gap and ambiguity in a WorkRide PRD, and record each decision before anyone writes code for it.
---

# Grill PRD skill

Use before a PRD moves from Draft to Agreed, before implementing a requirement that has a declared gap, and whenever `npm run prd:eval` reports open gaps.

Questions: `prd/questions.json`. Next question: `npm run prd:grill`. Gaps come from `prd/traceability.json` (see `validate-prd`).

## When to use

- `npm run prd:eval` lists open gaps
- A PRD is Draft, or a change PRD is about to be agreed
- Someone asks an agent to build a requirement whose gap is not decided
- The PRD is silent or ambiguous about a rule the code needs (for example "one trip")

## Procedure

1. For any exception to a rule, first ask what the reason must explain and check it fits what the product does. WorkRide books seats on the office shuttle, so a reason can explain the missed shuttles behind a block; it never justifies a trip the way a cab booking would. `Q-CHAT-08` records the case where this was missed.
2. Run `npm run prd:grill`. It prints the highest-priority open question, its owner, its options, and the gap behind it.
3. Ask that one question, and only that question. In Cursor, use the AskQuestion tool with the options from `prd/questions.json`, recommended option first. Say who owns the decision.
4. Wait for the answer. Do not answer for the user, guess, or pick the recommended option on their behalf.
5. If the answer opens a new question, add it to `prd/questions.json` with the same requirement, an owner, a priority, and at least two options.
6. Record the answer in `prd/questions.json`: `status: "answered"`, `answer`, `decidedBy`, `decidedOn` (YYYY-MM-DD), and `action` — the PRD, traceability, or code change it leads to.
7. Carry out the action with `validate-prd`: write a change PRD rather than editing an Agreed baseline, then update the requirement's quotes, tests, or `gap` in `prd/traceability.json`. If the answer shows the requirement itself was wrong, add a `**Revision:**` line to the PRD and a test that fails on the old wording.
8. Repeat from step 2 until no questions are open or the user stops. Run `npm run prd:grill`, `npm run prd:eval`, and `npm run skills:eval`.

## Output checklist

Report to the PR or chat:

- [ ] Every open gap in `prd/traceability.json` has a question in `prd/questions.json`
- [ ] Questions were asked one at a time, highest priority first
- [ ] Every answer records `decidedBy`, `decidedOn`, and `action`
- [ ] Each action is reflected in a PRD or change PRD and in `prd/traceability.json`
- [ ] Questions still open are listed with their owner

## Evaluation

Test cases are in `evals.json` next to this file. Run them with `npm run skills:eval`. Run `npm run prd:grill -- --all` for every question and its status.

## Do not

- Ask several questions at once or bundle two decisions into one question
- Accept an exception without asking what its reason must explain, or a reason about something the product does not do
- Answer a question yourself, or record a decision the user did not make
- Write code for a requirement whose question is still open
- Ask about requirements that are already traced, or invent gaps that `prd/traceability.json` does not declare
- Offer an option the security policy rules out (tokens in `localStorage` or `sessionStorage`, dev email login in production)
- Edit an Agreed baseline PRD to record an answer; write a change PRD
- Delete a question to make the grill pass; answer it or close the gap
