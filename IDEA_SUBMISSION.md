# Trimble WorkRide — Idea submission answers

Use these answers when submitting the idea (e.g. idea portal or form).

---

## What problem does this idea solve?

Employees need a reliable way to book the office shuttle (metro ↔ office) for fixed morning and evening slots. Without a dedicated system, booking is ad hoc or manual, which leads to:

- **Poor capacity planning** — Admins cannot see how many people need the shuttle and may over- or under-book vehicles.
- **Unclear rules** — No single place for cut-off times (e.g. book morning shuttle by 8 PM previous day, evening by 3 PM) or cancellation (e.g. cancel at least 1 hour before).
- **No-shows** — There is no consequence for not showing up, so seats are wasted and others miss out.

Trimble WorkRide solves this by providing a simple booking app with clear rules and admin visibility.

---

## What is your proposed solution?

**Trimble WorkRide** — a lightweight web application that:

1. **Employee booking** — Employees sign in and book shuttle slots (morning: 7:30 & 8:30 Metro→Office; evening: 5:00 & 6:00 Office→Metro) with enforced cut-offs (morning: book by 8 PM previous evening; evening: book by 3 PM same day).
2. **Cancellation policy** — Cancellation allowed until 1 hour before the slot start time.
3. **No-show policy** — After 2 consecutive no-shows, the employee can sign in but cannot book for the next 1 day, encouraging reliability and fair access.
4. **Admin view** — Admins see all bookings by date, assign vehicles to slots, and mark no-shows so transport can be planned from actual demand.

The solution is a simple UI + backend (ready for Okta integration later) so it can be adopted quickly and extended with SSO when needed.

---

## What is the expected impact or customer value?

- **Better capacity planning** — Transport admins book the right number of vehicles based on real bookings instead of guesswork.
- **Fewer no-shows** — The 2-strike rule discourages no-shows and frees capacity for employees who need the shuttle.
- **Clear, fair rules** — Cut-off and cancellation rules are visible and enforced in one place, reducing confusion and last-minute changes.
- **Time saved** — Employees book in seconds; admins see daily demand at a glance instead of managing spreadsheets or messages.

---

## Which Trimble product / module does this idea relate to?

**Workplace & internal transport / fleet operations.**

This idea relates to internal workplace productivity and transport management — enabling employees to book shared shuttle service between office and metro. It can sit alongside or integrate with Trimble’s workplace, fleet, or connectivity offerings where employee transport and scheduling are in scope. If your organization uses a specific product for workplace services or fleet, you can name that module here (e.g. Trimble Connect, internal tools, or a relevant fleet/workplace product).
