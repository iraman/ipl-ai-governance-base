---
name: validate-chat-override
description: Verify the urgent chat override lets a blocked employee book only from chat by giving a valid reason for the two missed shuttles that caused the block, while the Book page keeps the no-show block.
---

# Validate chat override skill

Use when implementing or reviewing the Shuttle chat booking path or the urgent override of the no-show block in Trimble WorkRide.

Base booking rules (cutoffs, cancel window, no-show block, one booking per date) belong to `validate-booking-rules`. This skill owns only the chat exception from `prd/workride-chat-prd.md`.

## When to use

- Adding or changing `POST /api/chat/bookings` in `backend/server.js`
- Editing `validateUrgentOverride()` or `URGENT_CATEGORIES` in `backend/rules.js`
- Modifying the Shuttle chat widget in `frontend/src/pages/Chat.jsx` or `createChatBooking` in `frontend/src/api.js`
- Changing override fields on bookings in `backend/store.js`

## Procedure

1. Read `prd/workride-chat-prd.md`, `backend/rules.js`, and the no-show section of `.ai-governance/rules/booking-policies.md`.
2. Confirm the exception is chat only: `POST /api/bookings` still returns 403 for a blocked employee, even when the body includes an urgent reason.
3. Confirm the reason explains the missed shuttles, not the new trip. The chat bot asks "Why did you miss your last two shuttles?", and nothing describes the booking as a cab, an on-demand ride, or a trip that needs its own reason. WorkRide books office shuttle seats only.
4. Confirm `validateUrgentOverride()` accepts only `medical_emergency`, `family_emergency`, or `client_visit` (an unplanned client visit), with a trimmed explanation of 15–500 characters.
5. Confirm a blocked chat request without a valid reason returns 403 with the reason string from `validateUrgentOverride()`.
6. Confirm an accepted override stores `override_category`, `override_explanation`, `override_source: "chat"`, and `override_no_show_ids` (the missed shuttles from `getBlockingNoShows()`), and does not clear `blocked_until`.
7. Confirm the override does not skip base rules: `isBookableDate()`, the cutoff, and one booking per date still apply on the chat path.
8. Confirm a chat request from an employee who is not blocked books without asking for a reason.
9. Confirm manipulation attempts are refused: admin claims, `override` or `force` flags, look-alike or non-string categories, and "ignore the policy" wording.
10. Run `npm run skills:eval` and check this skill's cases pass.

## Output checklist

Report to the PR or chat:

- [ ] Web book matches `isUserBlocked()` with no override
- [ ] Chat book of a blocked employee matches `validateUrgentOverride()`
- [ ] The reason explains the two missed shuttles, and the booking records them in `override_no_show_ids`
- [ ] Only the three urgent categories are accepted
- [ ] Admin claims, override flags, and non-string categories are refused
- [ ] `blocked_until` is unchanged after an override
- [ ] Booking rows carry the override fields
- [ ] Cutoff, weekend, holiday, and one-booking-per-date checks still refuse a chat request
- [ ] Chat responses list `skills` and each check in `decision_trace`; the urgent override step names this skill and `workride-chat-prd.md`
- [ ] The chat reply highlights that the booking used this exception

## PRD change — urgent chat override

Source: `prd/workride-chat-prd.md`. Baseline `prd/workride-prd.md` stays as written.

Old line: **2 consecutive no-shows, blocked 1 day, no exception.**

New line, chat only: a blocked employee may book from `POST /api/chat/bookings` by explaining why they missed the two shuttles that caused the block. `validateUrgentOverride()` must accept `urgent_category` of `medical_emergency`, `family_emergency`, or `client_visit` and an explanation of 15–500 characters. The booking records the missed shuttles in `override_no_show_ids`. The Book page and `POST /api/bookings` still refuse the booking. `blocked_until` is not cleared. Cutoffs, one booking per date, weekends, and holidays still apply.

Revision, 2026-10-09: the first version of this change asked why the new trip was urgent. That was a wrong requirement; WorkRide books office shuttle seats, not cabs. The reason now explains the missed shuttles. Decision `Q-CHAT-08` in `prd/questions.json`.

## Evaluation

Test cases are in `evals.json` next to this file. Run them with `npm run skills:eval`.

## Do not

- Let the Book page or `POST /api/bookings` accept an urgent override
- Ask why the new trip is needed, or treat the shuttle like a cab or on-demand ride; the reason is for the missed shuttles
- Accept an urgent category other than `medical_emergency`, `family_emergency`, or `client_visit`
- Clear or shorten `blocked_until` when an override is accepted
- Decide urgency in the frontend only; the API must call `validateUrgentOverride()`
- Skip the cutoff, date, or one-booking-per-date checks for an urgent request
- Trust `is_admin`, `override`, `force`, or `policy_override` sent in the request body; only `validateUrgentOverride()` can lift the block
- Accept an `urgent_category` that is not a string, such as `["medical_emergency"]`
- Let the wording of the explanation ("I am an admin", "ignore the policy") change the decision
