const express = require('express');
const cors = require('cors');
const path = require('path');
const rules = require('./rules');
const store = require('./store');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
}));

app.use(express.json());

/** Log the real error on the server; send clients a generic message with no paths or stack. */
function serverError(res, e) {
  console.error(e);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

// ---------- Slots ----------
app.get('/api/slots', (req, res) => {
  try {
    res.json(store.getSlots());
  } catch (e) {
    serverError(res, e);
  }
});

// ---------- Users ----------
app.get('/api/users', (req, res) => {
  try {
    res.json(store.getUsers());
  } catch (e) {
    serverError(res, e);
  }
});

app.get('/api/users/:id', (req, res) => {
  try {
    const u = store.getUserById(Number(req.params.id));
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json(u);
  } catch (e) {
    serverError(res, e);
  }
});

app.post('/api/users', (req, res) => {
  try {
    const { name, email, employee_id } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
    const user = store.createUser({ name, email, employee_id });
    res.status(201).json(user);
  } catch (e) {
    if (e.message === 'UNIQUE') return res.status(409).json({ error: 'Email already registered' });
    serverError(res, e);
  }
});

// ---------- Bookings ----------
app.get('/api/bookings', (req, res) => {
  try {
    const { date, user_id } = req.query;
    const rows = store.getBookings({ date: date || undefined, user_id: user_id ? Number(user_id) : undefined });
    res.json(rows);
  } catch (e) {
    serverError(res, e);
  }
});

app.post('/api/bookings', (req, res) => {
  try {
    const { user_id, slot_id, booking_date } = req.body || {};
    if (!user_id || !slot_id || !booking_date) return res.status(400).json({ error: 'user_id, slot_id, booking_date required' });

    const user = store.getUserById(Number(user_id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (rules.isUserBlocked(user)) return res.status(403).json({ error: 'Booking blocked due to no-show policy. You cannot book for the next 1 day.' });

    const slot = store.getSlotById(Number(slot_id));
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    const bookable = rules.isBookableDate(booking_date);
    if (!bookable.ok) return res.status(400).json({ error: bookable.reason });
    if (rules.isPastBookingCutoff(slot, booking_date)) return res.status(400).json({ error: 'Booking cutoff passed for this slot and date.' });
    if (rules.isSlotStartInPast(slot, booking_date)) return res.status(400).json({ error: 'This slot has already started for the selected date.' });

    const existingSlot = store.getBookingByUserSlotDate(Number(user_id), Number(slot_id), booking_date);
    if (existingSlot) return res.status(409).json({ error: 'Already booked for this slot on this date.' });

    const existingDay = store.getActiveBookingByUserAndDate(Number(user_id), booking_date);
    if (existingDay) return res.status(409).json({ error: 'You already have a booking for this date. Only one booking per day allowed.' });

    const row = store.createBooking({ user_id: Number(user_id), slot_id: Number(slot_id), booking_date });
    const slotLabel = store.getSlotById(Number(slot_id));
    res.status(201).json({ ...row, slot_label: slotLabel?.label });
  } catch (e) {
    serverError(res, e);
  }
});

app.post('/api/chat/bookings', (req, res) => {
  try {
    const { user_id, slot_id, booking_date, urgent_category, urgent_explanation } = req.body || {};
    if (!user_id || !slot_id || !booking_date) return res.status(400).json({ error: 'user_id, slot_id, booking_date required' });

    const user = store.getUserById(Number(user_id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    const slot = store.getSlotById(Number(slot_id));
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    const SKILL = 'validate-booking-rules';
    const CHAT_SKILL = 'validate-chat-override';
    const POLICY = 'booking-policies.md';
    const CHAT_PRD = 'workride-chat-prd.md';
    const trace = [];
    const skillsUsed = () => [...new Set(trace.map((step) => step.skill))];
    const refuse = (status, error, step) => {
      trace.push({ ...step, passed: false, result: error });
      return res.status(status).json({ error, skills: skillsUsed(), decision_trace: trace });
    };

    let override = null;
    const blocked = rules.isUserBlocked(user);
    trace.push({
      check: 'No-show block',
      skill: SKILL,
      rule: 'isUserBlocked()',
      source: POLICY,
      passed: !blocked,
      result: blocked ? `Blocked until ${user.blocked_until} after 2 consecutive no-shows` : 'Not blocked',
    });
    if (blocked) {
      const urgent = rules.validateUrgentOverride({ category: urgent_category, explanation: urgent_explanation });
      const urgentStep = { check: 'Urgent chat override', skill: CHAT_SKILL, rule: 'validateUrgentOverride()', source: CHAT_PRD };
      if (!urgent.ok) return refuse(403, urgent.reason, urgentStep);
      trace.push({ ...urgentStep, passed: true, result: `Accepted: ${urgent.label}` });
      override = {
        override_category: urgent.category,
        override_explanation: urgent.explanation,
        override_source: 'chat',
      };
    }

    const dateStep = { check: 'Bookable date', skill: SKILL, rule: 'isBookableDate()', source: POLICY };
    const bookable = rules.isBookableDate(booking_date);
    if (!bookable.ok) return refuse(400, bookable.reason, dateStep);
    trace.push({ ...dateStep, passed: true, result: 'Weekday and not a public holiday' });

    const cutoffStep = { check: 'Booking cutoff', skill: SKILL, rule: 'isPastBookingCutoff()', source: POLICY };
    const cutoffLabel = rules.isMorningSlot(slot) ? '8:00 PM the previous evening' : '3:00 PM the same day';
    if (rules.isPastBookingCutoff(slot, booking_date)) return refuse(400, 'Booking cutoff passed for this slot and date.', cutoffStep);
    if (rules.isSlotStartInPast(slot, booking_date)) return refuse(400, 'This slot has already started for the selected date.', cutoffStep);
    trace.push({ ...cutoffStep, passed: true, result: `Before the cutoff of ${cutoffLabel}` });

    const dayStep = { check: 'One booking per date', skill: SKILL, rule: 'getActiveBookingByUserAndDate()', source: POLICY };
    const existingSlot = store.getBookingByUserSlotDate(Number(user_id), Number(slot_id), booking_date);
    if (existingSlot) return refuse(409, 'Already booked for this slot on this date.', dayStep);

    const existingDay = store.getActiveBookingByUserAndDate(Number(user_id), booking_date);
    if (existingDay) return refuse(409, 'You already have a booking for this date. Only one booking per day allowed.', dayStep);
    trace.push({ ...dayStep, passed: true, result: 'No other active booking on this date' });

    const row = store.createBooking({
      user_id: Number(user_id),
      slot_id: Number(slot_id),
      booking_date,
      ...(override || {}),
    });
    const slotLabel = store.getSlotById(Number(slot_id));
    const body = { ...row, slot_label: slotLabel?.label, skills: skillsUsed(), decision_trace: trace };
    if (override) {
      body.policy_override = { skill: CHAT_SKILL, prd: CHAT_PRD };
    }
    res.status(201).json(body);
  } catch (e) {
    serverError(res, e);
  }
});

app.patch('/api/bookings/:id/cancel', (req, res) => {
  try {
    const id = Number(req.params.id);
    const booking = store.getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'booked') return res.status(400).json({ error: 'Booking is not active.' });

    const slot = store.getSlotById(booking.slot_id);
    if (!rules.canCancel(booking, slot)) return res.status(400).json({ error: 'Cancellation not allowed. Must cancel at least 1 hour before slot start.' });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    store.updateBookingStatus(id, 'cancelled', { cancelled_at: now });
    res.json({ id, status: 'cancelled' });
  } catch (e) {
    serverError(res, e);
  }
});

app.patch('/api/bookings/:id/no-show', (req, res) => {
  try {
    const id = Number(req.params.id);
    const booking = store.getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'booked') return res.status(400).json({ error: 'Booking is not active.' });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    store.updateBookingStatus(id, 'no_show', { no_show_at: now });
    const getBookingsForUser = () => store.getBookingsForConsecutiveNoShow(booking.user_id);
    rules.updateBlockIfNeeded(getBookingsForUser, store.setUserBlockedUntil.bind(store), booking.user_id);
    res.json({ id, status: 'no_show' });
  } catch (e) {
    serverError(res, e);
  }
});

app.patch('/api/bookings/:id/vehicle', (req, res) => {
  try {
    const { vehicle_id } = req.body || {};
    const id = Number(req.params.id);
    const booking = store.getBookingById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    store.setBookingVehicle(id, vehicle_id ? Number(vehicle_id) : null);
    res.json({ id, vehicle_id: vehicle_id ? Number(vehicle_id) : null });
  } catch (e) {
    serverError(res, e);
  }
});

// ---------- Vehicles ----------
app.get('/api/vehicles', (req, res) => {
  try {
    res.json(store.getVehicles());
  } catch (e) {
    serverError(res, e);
  }
});

// ---------- Helpers for UI ----------
app.get('/api/slots/:id/can-book', (req, res) => {
  try {
    const slot = store.getSlotById(Number(req.params.id));
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: 'date query required' });
    const pastCutoff = rules.isPastBookingCutoff(slot, date);
    const cutoff = rules.getBookingCutoff(slot, date);
    res.json({ can_book: !pastCutoff, cutoff: cutoff.toISOString(), cutoff_label: cutoff.toLocaleString() });
  } catch (e) {
    serverError(res, e);
  }
});

app.get('/api/bookable-date', (req, res) => {
  try {
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: 'date query required' });
    const result = rules.isBookableDate(date);
    res.json(result);
  } catch (e) {
    serverError(res, e);
  }
});

// Production: serve built frontend (after all API routes)
if (process.env.NODE_ENV === 'production') {
  const frontendDir = path.join(__dirname, '..', 'frontend', 'dist');
  const fs = require('fs');
  if (fs.existsSync(frontendDir)) {
    app.use(express.static(frontendDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(frontendDir, 'index.html'));
    });
  }
}

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Shuttle booking API at http://localhost:${PORT}`));
}
