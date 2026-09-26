/**
 * Seed no-show data for testing: gives one user 2 consecutive no-shows and sets blocked_until (+1 day).
 * Run: node backend/scripts/seedNoShowData.js
 * Then log in as that user and try to book to see "Booking blocked due to no-show policy".
 */
const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '..', 'data', 'store.json');

if (!fs.existsSync(storePath)) {
  console.error('store.json not found. Start the backend once to create it, then run this script.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));

// Ensure we have 4 users (1 admin + 3 test users)
const needUser4 = !data.users.some((u) => u.id === 4);
if (needUser4) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  data.users.push({
    id: 4,
    name: 'Test User 3',
    email: 'testuser3@company.com',
    employee_id: 'EMP004',
    is_admin: 0,
    blocked_until: null,
    created_at: now,
  });
  console.log('Added Test User 3 (id 4).');
}

// User to apply no-show block (id 2 = Test User 1)
const TARGET_USER_ID = 2;
const targetUser = data.users.find((u) => u.id === TARGET_USER_ID);
if (!targetUser) {
  console.error('User id 2 not found.');
  process.exit(1);
}

// Past dates for 2 consecutive no-shows (most recent first for "consecutive" rule)
const today = new Date();
const dates = [];
for (let i = 0; i < 2; i++) {
  const d = new Date(today);
  d.setDate(d.getDate() - i);
  dates.push(d.toISOString().slice(0, 10));
}
dates.reverse(); // oldest first: e.g. [yesterday, today]

const maxBookingId = data.bookings.length ? Math.max(...data.bookings.map((b) => b.id)) : 0;
const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

// Add 2 no_show bookings for slot_id 1 (7:30 AM) on consecutive days
for (let i = 0; i < 2; i++) {
  const existing = data.bookings.find(
    (b) => b.user_id === TARGET_USER_ID && b.booking_date === dates[i] && b.slot_id === 1
  );
  if (!existing) {
    data.bookings.push({
      id: maxBookingId + 1 + i,
      user_id: TARGET_USER_ID,
      slot_id: 1,
      booking_date: dates[i],
      status: 'no_show',
      vehicle_id: null,
      created_at: nowStr,
      cancelled_at: null,
      no_show_at: nowStr,
    });
  } else if (existing.status !== 'no_show') {
    existing.status = 'no_show';
    existing.no_show_at = nowStr;
  }
}

// Set blocked_until = now + 1 day for target user
const blockedUntil = new Date();
blockedUntil.setDate(blockedUntil.getDate() + 1);
targetUser.blocked_until = blockedUntil.toISOString().slice(0, 19).replace('T', ' ');

fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
console.log(`No-show seed done. User "${targetUser.name}" (id ${TARGET_USER_ID}) has 2 no-shows and cannot book until ${targetUser.blocked_until}.`);
console.log('Log in as Test User 1 to see the block message when booking.');
