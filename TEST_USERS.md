# Test users & no-show validation

## Test accounts (1 admin + 3 users)

After a **fresh** run (or after running the no-show seed script below), you have:

| Role   | Name         | Email                  | Use for                          |
|--------|--------------|------------------------|----------------------------------|
| Admin  | Admin User   | admin@company.com     | Admin view, assign vehicles, mark no-show |
| User 1 | Test User 1 | testuser1@company.com | Booking, or test **blocked** after no-show seed |
| User 2 | Test User 2 | testuser2@company.com  | Booking, switch to compare with User 1 |
| User 3 | Test User 3 | testuser3@company.com  | Booking, switch to compare        |

**To get these 4 users from scratch:** delete `backend/data/store.json`, restart the backend (e.g. `npm run dev` in `backend`). The seed in code will create 1 admin + 3 users.

If you already have an existing `store.json` with 3 users (e.g. John Doe, Jane Smith), run the no-show seed script once—it will add **Test User 3** and then apply the no-show scenario to **Test User 1**.

---

## Populate no-show data (see blocked-user validation)

To see **“Booking blocked due to no-show policy”** (2 consecutive no-shows → 1-day booking block):

1. **Stop the backend** (so `store.json` is not in use).
2. Run:
   ```bash
   cd /path/to/Trimble-transport
   node backend/scripts/seedNoShowData.js
   ```
3. **Start the backend** again.
4. In the app, **log in as Test User 1** and try to book → you should see the block message.

The script:

- Adds **Test User 3** if missing (id 4).
- Gives **Test User 1** (id 2) **2 consecutive no_show** bookings (past 2 days, slot 7:30 AM).
- Sets **Test User 1**’s `blocked_until` to **now + 1 day**.

---

## Edit the DB directly (optional)

The DB is a single JSON file: **`backend/data/store.json`**.  
**Full guide:** see [DIRECT_DB_EDIT.md](./DIRECT_DB_EDIT.md) for adding users, bookings, no-shows, and vehicles.

- **Stop the backend** before editing (otherwise changes may be overwritten).
- **Users:** edit `users[]` — set `blocked_until` to a future datetime string (e.g. `"2026-03-20 18:00:00"`) to block a user, or `null` to unblock.
- **No-show bookings:** add or change items in `bookings[]`:
  - `"status": "no_show"`
  - `"no_show_at": "2026-03-18 10:00:00"` (optional)
  - Use `user_id`, `slot_id` (1–4), `booking_date` (YYYY-MM-DD).

Example: to block **Test User 2** (id 3) manually, set in `users`:

```json
{
  "id": 3,
  "name": "Test User 2",
  "blocked_until": "2026-03-22 23:59:59"
}
```

Save the file, start the backend, then log in as Test User 2 and try to book to see the block.
