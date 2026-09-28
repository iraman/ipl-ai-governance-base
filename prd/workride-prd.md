# PRD: Trimble WorkRide

**Status:** Agreed
**Date:** 2026-09-28
**Product:** Trimble WorkRide
**Audience:** Stakeholders

## Problem

Employees need a reliable way to book the office shuttle between metro and office. Ad hoc booking causes three problems:

- Admins cannot see how many people need the shuttle, so they over- or under-book vehicles.
- Cutoff and cancellation rules live in no single place.
- A no-show has no consequence, so a seat is wasted.

## Solution

Trimble WorkRide is the web app for that shuttle.

Employees sign in with Trimble ID. They book for themselves, on one of four slots:

- Morning, metro to office: 7:30 and 8:30, by 8:00 PM the previous evening.
- Evening, office to metro: 5:00 and 6:00, by 3:00 PM the same day.

An employee holds one booking on a date. They can see their bookings and cancel until one hour before the slot starts.

An admin marks a no-show. After two consecutive no-shows, the employee can still sign in and cannot book for the next day.

Only an admin can view a day’s bookings, tag a vehicle on each booking, and mark no-shows.

## Impact

- **Capacity planning.** Admins book the right number of vehicles from real bookings instead of guesswork.
- **Fewer no-shows.** The two-strike rule discourages no-shows and frees seats for employees who need them.
- **Clear rules.** Cutoff and cancellation rules are visible and enforced in one place.
- **Time saved.** Employees book quickly. Admins see the day’s demand without spreadsheets or messages.

## Terms

**Employee:** A person who signs in with Trimble ID and books the shuttle for themselves.

**Admin:** An employee who may view a day’s bookings, tag a vehicle on each booking, and mark no-shows.

**Slot:** One of the four fixed departures on a date (7:30, 8:30, 5:00, 6:00).

**Booking:** An employee’s hold on one slot on one date. One per employee per date.

**Vehicle:** The shuttle an admin tags on a booking.

**No-show:** A booking an admin marks when the employee does not ride.

**Booking block:** The day after two consecutive no-shows, during which the employee can sign in and cannot book.
