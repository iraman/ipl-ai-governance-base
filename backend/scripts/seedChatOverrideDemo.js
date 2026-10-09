/**
 * Demo data for the urgent chat override (prd/workride-chat-prd.md).
 *
 * Test User 1 (testuser1@company.com) and Test User 2 (testuser2@company.com) each get
 * two consecutive no-shows on the last two weekdays and a 1-day booking block.
 * The Book page refuses them. The Shuttle chat button can still book a morning slot
 * when they give a medical emergency, family emergency, or same-day client visit.
 *
 * Their upcoming active bookings are cancelled so any morning slot is free to book.
 *
 * Stop the backend first, then run:
 *   node backend/scripts/seedChatOverrideDemo.js
 * Start the backend again afterwards. Re-run before a demo: the block lasts 1 day.
 */
const fs = require('fs');
const path = require('path');
const rules = require('../rules');

const storePath = process.env.WORKRIDE_STORE_FILE || path.join(__dirname, '..', 'data', 'store.json');
const DEMO_USERS = [
  { id: 2, email: 'testuser1@company.com' },
  { id: 3, email: 'testuser2@company.com' },
];
const MORNING_SLOT_ID = 1;

if (!fs.existsSync(storePath)) {
  console.error('store.json not found. Start the backend once to create it, then run this script.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));

function pad(n) {
  return String(n).padStart(2, '0');
}

function localDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sqlDateTime(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function pastWeekdays(count) {
  const days = [];
  const d = new Date();
  while (days.length < count) {
    d.setDate(d.getDate() - 1);
    if (!rules.isWeekend(localDate(d))) days.push(localDate(d));
  }
  return days;
}

function nextMorningDate() {
  const morning = data.slots.find((s) => s.id === MORNING_SLOT_ID);
  const d = new Date();
  for (let i = 0; i < 30; i++) {
    const date = localDate(d);
    if (rules.isBookableDate(date).ok && !rules.isPastBookingCutoff(morning, date)) return date;
    d.setDate(d.getDate() + 1);
  }
  return null;
}

const today = localDate(new Date());
const now = new Date();
const nowStr = sqlDateTime(now);
const blockedUntil = new Date(now);
blockedUntil.setDate(blockedUntil.getDate() + 1);
const noShowDates = pastWeekdays(2);
let nextId = data.bookings.length ? Math.max(...data.bookings.map((b) => b.id)) : 0;

for (const demo of DEMO_USERS) {
  const user = data.users.find((u) => u.id === demo.id && u.email === demo.email);
  if (!user) {
    console.error(`User ${demo.email} (id ${demo.id}) not found.`);
    process.exit(1);
  }

  for (const b of data.bookings) {
    if (b.user_id !== demo.id || b.booking_date < today) continue;
    if (b.status === 'booked' || b.status === 'no_show') {
      b.status = 'cancelled';
      b.cancelled_at = nowStr;
    }
  }

  for (const date of noShowDates) {
    const existing = data.bookings.find(
      (b) => b.user_id === demo.id && b.booking_date === date && b.slot_id === MORNING_SLOT_ID
    );
    if (existing) {
      existing.status = 'no_show';
      existing.no_show_at = `${date} 08:00:00`;
      continue;
    }
    nextId += 1;
    data.bookings.push({
      id: nextId,
      user_id: demo.id,
      slot_id: MORNING_SLOT_ID,
      booking_date: date,
      status: 'no_show',
      vehicle_id: null,
      created_at: nowStr,
      cancelled_at: null,
      no_show_at: `${date} 08:00:00`,
      override_category: null,
      override_explanation: null,
      override_source: null,
    });
  }

  user.blocked_until = sqlDateTime(blockedUntil);
}

fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');

const morningDate = nextMorningDate();
console.log(`Chat override demo data written to ${storePath}`);
console.log(`No-shows on ${noShowDates.join(' and ')} (7:30 AM) for testuser1@company.com and testuser2@company.com.`);
console.log(`Both are blocked from the Book page until ${blockedUntil.toLocaleString()}.`);
console.log(`Upcoming bookings for both users were cancelled.`);
if (morningDate) {
  console.log(`Book a morning slot (7:30 or 8:30 AM) on ${morningDate} from the Shuttle chat button with an urgent reason.`);
}
