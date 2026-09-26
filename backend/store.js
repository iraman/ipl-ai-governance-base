const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const filePath = path.join(dataDir, 'store.json');

let state = {
  users: [],
  slots: [],
  bookings: [],
  vehicles: [],
};

function load() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (fs.existsSync(filePath)) {
      state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.warn('Store load:', e.message);
  }
}

function save() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.warn('Store save:', e.message);
  }
}

function nextId(arrName) {
  const arr = state[arrName];
  const max = arr.length ? Math.max(...arr.map((x) => x.id)) : 0;
  return max + 1;
}

// Seed default data
function seed() {
  if (state.slots.length === 0) {
    state.slots = [
      { id: 1, label: '7:30 AM - Metro to Office', time: '07:30', direction: 'morning_to_office', sort_order: 1 },
      { id: 2, label: '8:30 AM - Metro to Office', time: '08:30', direction: 'morning_to_office', sort_order: 2 },
      { id: 3, label: '5:00 PM - Office to Metro', time: '17:00', direction: 'evening_to_metro', sort_order: 3 },
      { id: 4, label: '6:00 PM - Office to Metro', time: '18:00', direction: 'evening_to_metro', sort_order: 4 },
    ];
  }
  if (state.users.length === 0) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    state.users = [
      { id: 1, name: 'Admin User', email: 'admin@company.com', employee_id: 'EMP001', is_admin: 1, blocked_until: null, created_at: now },
      { id: 2, name: 'Test User 1', email: 'testuser1@company.com', employee_id: 'EMP002', is_admin: 0, blocked_until: null, created_at: now },
      { id: 3, name: 'Test User 2', email: 'testuser2@company.com', employee_id: 'EMP003', is_admin: 0, blocked_until: null, created_at: now },
      { id: 4, name: 'Test User 3', email: 'testuser3@company.com', employee_id: 'EMP004', is_admin: 0, blocked_until: null, created_at: now },
    ];
  }
  if (state.vehicles.length === 0) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    state.vehicles = [
      { id: 1, name: 'Shuttle A', capacity: 12, created_at: now },
      { id: 2, name: 'Shuttle B', capacity: 12, created_at: now },
    ];
  }
  save();
}

load();
seed();

const store = {
  getSlots() {
    return [...state.slots].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  },
  getSlotById(id) {
    return state.slots.find((s) => s.id === id);
  },
  getUsers() {
    return state.users.map((u) => ({ ...u }));
  },
  getUserById(id) {
    return state.users.find((u) => u.id === id);
  },
  createUser({ name, email, employee_id }) {
    if (state.users.some((u) => u.email === email)) throw new Error('UNIQUE');
    const id = nextId('users');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const user = { id, name, email, employee_id: employee_id || null, is_admin: 0, blocked_until: null, created_at: now };
    state.users.push(user);
    save();
    return user;
  },
  setUserBlockedUntil(userId, datetimeStr) {
    const u = state.users.find((x) => x.id === userId);
    if (u) {
      u.blocked_until = datetimeStr;
      save();
    }
  },
  getBookings({ date, user_id } = {}) {
    let list = state.bookings.map((b) => {
      const u = state.users.find((us) => us.id === b.user_id);
      const s = state.slots.find((sl) => sl.id === b.slot_id);
      return {
        ...b,
        user_name: u?.name,
        user_email: u?.email,
        slot_label: s?.label,
        slot_time: s?.time,
        direction: s?.direction,
      };
    });
    if (date) list = list.filter((b) => b.booking_date === date);
    if (user_id) list = list.filter((b) => b.user_id === user_id);
    list.sort((a, b) => {
      const d = (a.booking_date || '').localeCompare(b.booking_date || '');
      if (d !== 0) return d;
      const sa = state.slots.find((s) => s.id === a.slot_id);
      const sb = state.slots.find((s) => s.id === b.slot_id);
      return (sa?.sort_order || 0) - (sb?.sort_order || 0);
    });
    return list;
  },
  getBookingById(id) {
    return state.bookings.find((b) => b.id === id);
  },
  getBookingByUserSlotDate(user_id, slot_id, booking_date) {
    return state.bookings.find(
      (b) => b.user_id === user_id && b.slot_id === slot_id && b.booking_date === booking_date && b.status === 'booked'
    );
  },
  /** Any active booking for this user on this date (one per day). */
  getActiveBookingByUserAndDate(user_id, booking_date) {
    return state.bookings.find(
      (b) => b.user_id === user_id && b.booking_date === booking_date && b.status === 'booked'
    );
  },
  createBooking({ user_id, slot_id, booking_date }) {
    const id = nextId('bookings');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const row = { id, user_id, slot_id, booking_date, status: 'booked', vehicle_id: null, created_at: now, cancelled_at: null, no_show_at: null };
    state.bookings.push(row);
    save();
    return row;
  },
  updateBookingStatus(id, status, extra = {}) {
    const b = state.bookings.find((x) => x.id === id);
    if (b) {
      b.status = status;
      Object.assign(b, extra);
      save();
    }
  },
  setBookingVehicle(id, vehicle_id) {
    const b = state.bookings.find((x) => x.id === id);
    if (b) {
      b.vehicle_id = vehicle_id;
      save();
    }
  },
  getVehicles() {
    return [...state.vehicles];
  },
  getBookingsForConsecutiveNoShow(userId) {
    return state.bookings
      .filter((b) => b.user_id === userId && b.status in { no_show: 1, booked: 1 })
      .sort((a, b) => {
        const d = (b.booking_date || '').localeCompare(a.booking_date || '');
        if (d !== 0) return d;
        return (b.slot_id || 0) - (a.slot_id || 0);
      });
  },
};

module.exports = store;
