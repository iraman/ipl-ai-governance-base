# How to add data directly to the DB

The app uses a **JSON file** as the database: **`backend/data/store.json`**.

---

## Before you edit

1. **Stop the backend** (Ctrl+C in the terminal where `node server.js` is running).  
   If the backend is running, it keeps data in memory and may overwrite your file when it saves.
2. Edit **`backend/data/store.json`** in any text editor.
3. **Start the backend again** so it loads the new data.

---

## File structure

The file has four arrays:

| Key        | What it holds                          |
|-----------|----------------------------------------|
| `users`   | Employees (id, name, email, blocked_until, …) |
| `slots`   | Shuttle slots (fixed: 4 slots)          |
| `bookings`| Each booking (user_id, slot_id, booking_date, status) |
| `vehicles`| Vehicles for admin to assign           |

Use **unique `id`** values. For new users or bookings, pick an `id` higher than any existing one in that array.

---

## 1. Add a new user

Add an object to the **`users`** array. Example (id 5):

```json
{
  "id": 5,
  "name": "New Employee",
  "email": "newuser@company.com",
  "employee_id": "EMP005",
  "is_admin": 0,
  "blocked_until": null,
  "created_at": "2026-03-18 12:00:00"
}
```

- `is_admin`: `1` = admin, `0` = normal user.  
- `blocked_until`: `null` = not blocked. Use `"YYYY-MM-DD HH:MM:SS"` to block until that time.

They can then log in with `newuser@company.com`.

---

## 2. Add a booking

Add an object to the **`bookings`** array:

```json
{
  "id": 99,
  "user_id": 2,
  "slot_id": 1,
  "booking_date": "2026-03-25",
  "status": "booked",
  "vehicle_id": null,
  "created_at": "2026-03-18 12:00:00",
  "cancelled_at": null,
  "no_show_at": null
}
```

- **user_id**: from `users[].id` (e.g. 2 = Test User 1).  
- **slot_id**: 1 = 7:30 AM, 2 = 8:30 AM, 3 = 5:00 PM, 4 = 6:00 PM.  
- **booking_date**: `YYYY-MM-DD`.  
- **status**: `"booked"` | `"cancelled"` | `"no_show"`.

Use an `id` greater than any existing booking id.

---

## 3. Add no-show data (to test “booking blocked”)

**Option A – Block a user (no booking history)**  
In **`users`**, find the user and set **`blocked_until`** to a future time:

```json
"blocked_until": "2026-03-22 23:59:59"
```

That user can sign in but cannot book until after that time.

**Option B – Add real no-show bookings (then block)**  
1. In **`bookings`**, add two entries for the **same user** and **same slot** on **two consecutive days** (e.g. yesterday and today), with:

   ```json
   "status": "no_show",
   "no_show_at": "2026-03-18 10:00:00"
   ```

2. In **`users`**, set that user’s **`blocked_until`** to **tomorrow** (e.g. `"2026-03-20 23:59:59"`).

Example: block **Test User 1** (id 2) and add 2 no-shows for slot 1 on 2026-03-17 and 2026-03-18, then set `blocked_until` to 2026-03-20.

---

## 4. Unblock a user

In **`users`**, set **`blocked_until`** to **`null`** for that user.

---

## 5. Add a vehicle

Add to the **`vehicles`** array:

```json
{
  "id": 3,
  "name": "Shuttle C",
  "capacity": 12,
  "created_at": "2026-03-18 12:00:00"
}
```

---

## Quick reference – slot_id

| slot_id | Slot                    |
|--------|--------------------------|
| 1      | 7:30 AM - Metro to Office |
| 2      | 8:30 AM - Metro to Office |
| 3      | 5:00 PM - Office to Metro |
| 4      | 6:00 PM - Office to Metro |

Save the file as **valid JSON** (no trailing commas, quotes around keys and strings). After editing, start the backend again.
