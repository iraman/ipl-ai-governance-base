const express = require('express');
const cors = require('cors');
const path = require('path');
const rules = require('./rules');
const store = require('./store');

const app = express();

// Configure CORS with proper headers and credentials support
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
}));

app.use(express.json());

// ---------- Slots ----------
app.get('/api/slots', (req, res) => {
  try {
    res.json(store.getSlots());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Users ----------
app.get('/api/users', (req, res) => {
  try {
    res.json(store.getUsers());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:id', (req, res) => {
  try {
    const u = store.getUserById(Number(req.params.id));
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json(u);
  } catch (e) {
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

// ---------- Bookings ----------
app.get('/api/bookings', (req, res) => {
  try {
    const { date, user_id } = req.query;
    const rows = store.getBookings({ date: date || undefined, user_id: user_id ? Number(user_id) : undefined });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

// ---------- Vehicles ----------
app.get('/api/vehicles', (req, res) => {
  try {
    res.json(store.getVehicles());
  } catch (e) {
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/bookable-date', (req, res) => {
  try {
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: 'date query required' });
    const result = rules.isBookableDate(date);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Shuttle booking API at http://localhost:${PORT}`));
