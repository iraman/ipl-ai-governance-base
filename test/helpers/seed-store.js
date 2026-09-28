const { randomUUID } = require('crypto');

function nextWeekday(from = new Date(), offsetDays = 1) {
  const d = new Date(from);
  d.setDate(d.getDate() + offsetDays);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function seedStore(overrides = {}) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return {
    users: [
      { id: 1, name: 'Admin User', email: 'admin@company.com', employee_id: 'EMP001', is_admin: 1, blocked_until: null, created_at: now },
      { id: 2, name: 'Test User 1', email: 'testuser1@company.com', employee_id: 'EMP002', is_admin: 0, blocked_until: null, created_at: now },
      { id: 3, name: 'Test User 2', email: 'testuser2@company.com', employee_id: 'EMP003', is_admin: 0, blocked_until: null, created_at: now },
      { id: 4, name: 'Test User 3', email: 'testuser3@company.com', employee_id: 'EMP004', is_admin: 0, blocked_until: null, created_at: now },
    ],
    slots: [
      { id: 1, label: '7:30 AM - Metro to Office', time: '07:30', direction: 'morning_to_office', sort_order: 1 },
      { id: 2, label: '8:30 AM - Metro to Office', time: '08:30', direction: 'morning_to_office', sort_order: 2 },
      { id: 3, label: '5:00 PM - Office to Metro', time: '17:00', direction: 'evening_to_metro', sort_order: 3 },
      { id: 4, label: '6:00 PM - Office to Metro', time: '18:00', direction: 'evening_to_metro', sort_order: 4 },
    ],
    bookings: [],
    vehicles: [
      { id: 1, name: 'Shuttle A', capacity: 12, created_at: now },
      { id: 2, name: 'Shuttle B', capacity: 12, created_at: now },
    ],
    ...overrides,
  };
}

function uniqueEmail() {
  return `e2e-${randomUUID().slice(0, 8)}@company.com`;
}

module.exports = { nextWeekday, seedStore, uniqueEmail };
