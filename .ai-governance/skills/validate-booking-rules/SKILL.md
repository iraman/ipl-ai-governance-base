---
name: validate-booking-rules
description: Verify AI-generated booking or shuttle code aligns with backend/rules.js and booking-policies.md before merge.
---

# Validate booking rules skill

Use when implementing or reviewing booking, cancellation, no-show, or capacity features in Trimble WorkRide.

## When to use

- Adding or changing book/cancel endpoints
- Modifying `Book.jsx`, `MyBookings.jsx`, or `Admin.jsx`
- Editing `backend/rules.js` or booking-related store logic

## Procedure

1. Read `backend/rules.js` and `.ai-governance/rules/booking-policies.md`.
2. Confirm cutoff times match:
   - Morning: book by 8 PM **previous day**
   - Evening: book by 3 PM **same day**
3. Confirm cancel window: **1 hour before** slot start.
4. Confirm no-show block: **2 consecutive** → blocked **1 day** (can still sign in).
5. Ensure weekend/holiday checks use `isBookableDate()`.
6. Run backend tests or manual API checks for edge cases (cutoff boundary, blocked user).

## Output checklist

Report to the PR or chat:

- [ ] Cutoffs implemented in backend (not UI-only)
- [ ] Cancel rule matches `canCancel()`
- [ ] No-show block matches `isUserBlocked()`
- [ ] No invented slot times or capacity limits
- [ ] User-facing error messages match API reasons

## Do not

- Hard-code different cutoff times in the frontend
- Allow booking on weekends/holidays without updating `rules.js`
- Skip blocked-user checks in the book API path
