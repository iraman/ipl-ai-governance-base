# PRD: WorkRide chat booking

**Status:** Agreed
**Date:** 2026-10-09
**Product:** Trimble WorkRide
**Audience:** Stakeholders
**Baseline:** [workride-prd.md](./workride-prd.md) is unchanged. This PRD adds a chat path and one exception to the no-show block.

## Problem

Employees book the office shuttle on the Book page. After two consecutive no-shows, that page refuses the next booking for one day. A medical emergency, a family emergency, or a same-day client visit can still be a real reason to ride. Today those employees have no way to book.

## Solution

Employees can book the same four slots in a Chat page.

The Book page is unchanged. A blocked employee can sign in and cannot book there.

The exception is chat only. Chat may book one trip when the employee is blocked only if both of these are true:

- `urgent_category` is `medical_emergency`, `family_emergency`, or `client_visit`.
- `urgent_explanation` is 15 to 500 characters after trimming.

That booking is tagged with the category, the explanation, and source `chat`. `blocked_until` stays in place. The next chat request without a valid reason is refused. Cutoffs, one booking per date, weekends, holidays, and the one-hour cancel window still apply. An urgent reason does not move those rules.

The behavioral asset that carries this change is `.ai-governance/skills/validate-booking-rules/SKILL.md`, in the section **PRD change — urgent chat override**. `validateUrgentOverride()` is the check.

## Impact

- **Urgent trips still run.** A blocked employee with one of the three reasons can book from chat.
- **The block still means something.** The Book page stays closed, and chat refuses a missing or unknown reason.
- **The rule change is visible.** The booking skill states the old hard block and the chat-only exception, and tests compare the two PRDs.

## Terms

**Chat booking:** A booking created from the Chat page through `POST /api/chat/bookings`.

**Urgent override:** A chat booking allowed during a no-show block because `validateUrgentOverride()` accepted the category and explanation. It does not clear the block.
