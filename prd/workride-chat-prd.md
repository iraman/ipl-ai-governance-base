# PRD: WorkRide chat booking

**Status:** Agreed
**Date:** 2026-10-09
**Product:** Trimble WorkRide
**Audience:** Stakeholders
**Baseline:** [workride-prd.md](./workride-prd.md) is unchanged. This PRD adds a chat path and one exception to the no-show block.
**Revision:** 2026-10-09. The first version treated the urgent reason as a reason for the new trip. That was wrong. WorkRide books seats on the office shuttle; it is not a cab or an on-demand ride. The reason explains the missed shuttles that caused the block. Decision: `Q-CHAT-08` in `prd/questions.json`.

## Problem

Employees book the office shuttle on the Book page. After two consecutive no-shows, that page refuses the next booking for one day. Some employees missed those two shuttles for a valid reason: a medical emergency, a family emergency, or an unplanned client visit. The block treats them the same as employees who simply did not turn up, and today they have no way to book their next shuttle.

## Solution

Employees can book the same four slots in a Chat page.

The Book page is unchanged. A blocked employee can sign in and cannot book there.

The exception is chat only. Chat may book one trip when the employee is blocked only if the employee explains why they missed the two shuttles that caused the block:

- `urgent_category` is `medical_emergency`, `family_emergency`, or `client_visit`.
- `urgent_explanation` is 15 to 500 characters after trimming.

The reason is about the missed shuttles, not the trip being booked. The trip is an ordinary seat on one of the four fixed shuttle departures.

That booking is tagged with the category, the explanation, and source `chat`. It also records the missed shuttles the reason explains in `override_no_show_ids`. `blocked_until` stays in place. The next chat request without a valid reason is refused. Cutoffs, one booking per date, weekends, holidays, and the one-hour cancel window still apply. An urgent reason does not move those rules.

The behavioral asset that carries this change is `.ai-governance/skills/validate-chat-override/SKILL.md`, in the section **PRD change — urgent chat override**. `validateUrgentOverride()` is the check. `.ai-governance/skills/validate-booking-rules/SKILL.md` keeps the base booking rules and points to that skill for the exception.

Each skill's test cases are listed in its `evals.json`. `npm run skills:eval` runs them and reports pass or fail per skill.

## Impact

- **A valid reason for missing the shuttle is not punished.** An employee who missed two shuttles because of an emergency or a client visit can book their next shuttle from chat.
- **The block still means something.** The Book page stays closed, and chat refuses a missing or unknown reason.
- **The rule change is visible.** The booking skill states the old hard block and the chat-only exception, and tests compare the two PRDs.

## Terms

**Chat booking:** A booking created from the Chat page through `POST /api/chat/bookings`.

**Missed shuttles:** The consecutive no-shows that set the block, most recent first. `getBlockingNoShows()` in `backend/rules.js` returns them.

**Urgent override:** A chat booking allowed during a no-show block because `validateUrgentOverride()` accepted the reason for the missed shuttles. It does not clear the block.
