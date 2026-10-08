# WorkRide — what to implement

**Source:** [workride-prd.md](./workride-prd.md)
**Date:** 2026-09-28

The booking rules in the PRD are already in the app. This document is the remaining work: who may do what, and one policy file that still describes rules the PRD does not.

## Already implemented — do not rebuild

- Four slots. Morning (7:30, 8:30, metro to office) books by 8:00 PM the previous evening. Evening (5:00, 6:00, office to metro) books by 3:00 PM the same day.
- One booking per employee per date.
- The Book screen creates a booking for the signed-in employee. My Bookings lists that employee’s bookings and cancels until one hour before the slot.
- An admin can mark a no-show. Two consecutive no-shows block new bookings for about one day. The employee can still sign in.
- A vehicle is stored on each booking.

Do not add a seat cap, a waitlist, a recommended shuttle count, or a 30-day booking window. Those are not in the PRD. Vehicle capacity is stored and shown in the admin dropdown and does not limit bookings.

## 1. Admin-only day view, vehicle tag, and no-show

**PRD:** Only an admin can view a day’s bookings, tag a vehicle on each booking, and mark no-shows.

**Today:** `is_admin` is stored on the user and never read. Every signed-in employee sees the Admin link, and `/admin` only checks that someone is signed in (`frontend/src/App.jsx`). These routes do the same work with no role check (`backend/server.js`):

- `GET /api/bookings?date=...` returns every booking that day
- `PATCH /api/bookings/:id/no-show`
- `PATCH /api/bookings/:id/vehicle`

**Change:**

- Show the Admin link and allow `/admin` only when `is_admin` is set.
- Require an admin on the three routes above.
- An employee can still load their own bookings.

## 2. Bookings and cancels belong to the signed-in employee

**PRD:** An employee books for themselves and cancels their own booking.

**Today:** The Book screen sends the signed-in employee’s id. The API does not. `POST /api/bookings` accepts any `user_id` in the body. `PATCH /api/bookings/:id/cancel` cancels any booking id. No route identifies the caller.

**Change:**

- Take the employee from the signed-in session.
- Create a booking only for that employee.
- Cancel only that employee’s booking.

## 3. Sign in with Trimble ID

**PRD:** Employees sign in with Trimble ID.

**Today:** The login page offers Trimble ID and a passwordless email form (`frontend/src/pages/Login.jsx`). The API does not require a Trimble ID token, so email sign-in reaches booking and admin actions.

**Change:**

- Trimble ID is the sign-in that can book, cancel, and use admin actions.
- Keep email sign-in on a local-only development path, or remove it from the product login page.

## 4. Align the booking policy file with the PRD

`.ai-governance/rules/booking-policies.md` still says:

- 10 confirmed + 5 waitlist per slot
- Advance booking up to 30 calendar days
- Up to 2 bookings per date

The app and the PRD say one booking per employee per date, and they do not describe a waitlist or a 30-day window. Update that file so later changes follow the PRD. Cutoffs, the one-hour cancel window, and the two-no-show block in that file already match.
