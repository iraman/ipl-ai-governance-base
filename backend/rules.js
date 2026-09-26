/**
 * Business rules for shuttle booking
 * - Morning slots (7:30, 8:30): book by 8 PM previous evening
 * - Evening slots (17:00, 18:00): book by 3 PM same day
 * - Cancel: allowed until 1 hour before slot start
 * - 2 consecutive no-shows -> can sign in but cannot book for 1 day
 */

function parseDate(s) {
  return s ? new Date(s.replace(' ', 'T')) : null;
}

function toDateOnly(d) {
  const x = new Date(d);
  return x.toISOString().slice(0, 10);
}

function toLocalISO(d) {
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}:00`;
}

/** Slot is morning (metro->office) or evening (office->metro) */
function isMorningSlot(slot) {
  return slot && slot.direction === 'morning_to_office';
}

/** Get cutoff datetime for booking a slot on bookingDate (YYYY-MM-DD). */
function getBookingCutoff(slot, bookingDateStr) {
  const slotTime = slot.time; // "07:30" or "17:00"
  const [h, m] = slotTime.split(':').map(Number);
  if (isMorningSlot(slot)) {
    // Morning: cutoff is previous day 8 PM (20:00)
    const d = new Date(bookingDateStr + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    d.setHours(20, 0, 0, 0);
    return d;
  } else {
    // Evening: cutoff is same day 3 PM (15:00)
    const d = new Date(bookingDateStr + 'T00:00:00');
    d.setHours(15, 0, 0, 0);
    return d;
  }
}

/** Check if current time is past booking cutoff for this slot on this date. */
function isPastBookingCutoff(slot, bookingDateStr) {
  const cutoff = getBookingCutoff(slot, bookingDateStr);
  return new Date() > cutoff;
}

/** Slot start datetime on the given date. */
function getSlotStart(slot, dateStr) {
  const [h, m] = slot.time.split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(h, m, 0, 0);
  return d;
}

/** True if the slot start time on the given date has already passed (server local time). */
function isSlotStartInPast(slot, dateStr) {
  const start = getSlotStart(slot, dateStr);
  return start <= new Date();
}

/** Cancel allowed until 1 hour before slot start. */
function canCancel(booking, slot, now = new Date()) {
  if (booking.status !== 'booked') return false;
  const start = getSlotStart(slot, booking.booking_date);
  const oneHourBefore = new Date(start.getTime() - 60 * 60 * 1000);
  return now < oneHourBefore;
}

/** Consecutive no-shows: count from most recent backwards. */
function getConsecutiveNoShows(getBookingsForUser) {
  const rows = getBookingsForUser();
  let count = 0;
  for (const r of rows) {
    if (r.status === 'no_show') count++;
    else break;
  }
  return count;
}

/** Set blocked_until to now + 1 day if user has 2+ consecutive no-shows. */
function updateBlockIfNeeded(getBookingsForUser, setUserBlockedUntil, userId) {
  const consecutive = getConsecutiveNoShows(getBookingsForUser);
  if (consecutive < 2) return;
  const blockedUntil = new Date();
  blockedUntil.setDate(blockedUntil.getDate() + 1);
  const str = blockedUntil.toISOString().slice(0, 19).replace('T', ' ');
  setUserBlockedUntil(userId, str);
}

/** Check if user is currently blocked (blocked_until in future). */
function isUserBlocked(user) {
  if (!user || !user.blocked_until) return false;
  return new Date(user.blocked_until) > new Date();
}

/** Weekend: Saturday = 6, Sunday = 0 (getDay()). */
function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Public holidays: YYYY-MM-DD list. Edit as needed for your region. */
const PUBLIC_HOLIDAYS = [
  '2025-01-26', '2025-03-08', '2025-03-25', '2025-04-14', '2025-04-18', '2025-05-01',
  '2025-06-17', '2025-08-15', '2025-10-02', '2025-11-01', '2025-12-25',
  '2026-01-26', '2026-03-08', '2026-03-25', '2026-04-14', '2026-04-30', '2026-05-01',
  '2026-08-15', '2026-10-02', '2026-11-01', '2026-12-25',
];

function isPublicHoliday(dateStr) {
  return PUBLIC_HOLIDAYS.includes(dateStr);
}

function isBookableDate(dateStr) {
  if (!dateStr) return { ok: false, reason: 'No date' };
  if (isWeekend(dateStr)) return { ok: false, reason: 'Booking not available on weekends.' };
  if (isPublicHoliday(dateStr)) return { ok: false, reason: 'Booking not available on public holidays.' };
  return { ok: true };
}

module.exports = {
  parseDate,
  toDateOnly,
  toLocalISO,
  isMorningSlot,
  getBookingCutoff,
  isPastBookingCutoff,
  getSlotStart,
  isSlotStartInPast,
  canCancel,
  getConsecutiveNoShows,
  updateBlockIfNeeded,
  isUserBlocked,
  isWeekend,
  isPublicHoliday,
  isBookableDate,
};
