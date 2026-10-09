const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { seedStore, nextWeekday } = require('../helpers/seed-store');

const storeFile = path.join(os.tmpdir(), `workride-api-${process.pid}.json`);
process.env.WORKRIDE_STORE_FILE = storeFile;
fs.writeFileSync(storeFile, JSON.stringify(seedStore(), null, 2));

const request = require('supertest');
const app = require('../../backend/server');

const futureDate = nextWeekday(new Date(), 2);

describe('WorkRide API', () => {
  before(() => {
    assert.ok(fs.existsSync(storeFile));
  });

  it('lists morning and evening slots', async () => {
    const res = await request(app).get('/api/slots').expect(200);
    assert.equal(res.body.length, 4);
    assert.ok(res.body.some((s) => s.direction === 'morning_to_office'));
    assert.ok(res.body.some((s) => s.direction === 'evening_to_metro'));
  });

  it('lists seed users including admin', async () => {
    const res = await request(app).get('/api/users').expect(200);
    assert.ok(res.body.find((u) => u.email === 'admin@company.com' && u.is_admin === 1));
  });

  it('returns 404 for a missing user', async () => {
    const res = await request(app).get('/api/users/9999').expect(404);
    assert.equal(res.body.error, 'User not found');
  });

  it('requires name and email when creating a user', async () => {
    const res = await request(app).post('/api/users').send({ name: 'No Email' }).expect(400);
    assert.match(res.body.error, /required/i);
  });

  it('rejects a duplicate email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Dup', email: 'admin@company.com' })
      .expect(409);
    assert.equal(res.body.error, 'Email already registered');
  });

  it('creates a user', async () => {
    const email = `api-${Date.now()}@company.com`;
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'API User', email, employee_id: 'EMP999' })
      .expect(201);
    assert.equal(res.body.email, email);
    assert.equal(res.body.is_admin, 0);
  });

  it('lists vehicles', async () => {
    const res = await request(app).get('/api/vehicles').expect(200);
    assert.ok(res.body.find((v) => v.name === 'Shuttle A'));
  });

  it('reports weekend and holiday dates as not bookable', async () => {
    const weekend = await request(app).get('/api/bookable-date?date=2026-10-03').expect(200);
    assert.equal(weekend.body.ok, false);
    const holiday = await request(app).get('/api/bookable-date?date=2026-10-02').expect(200);
    assert.equal(holiday.body.ok, false);
  });

  it('requires date for bookable-date and can-book helpers', async () => {
    await request(app).get('/api/bookable-date').expect(400);
    await request(app).get('/api/slots/1/can-book').expect(400);
  });

  it('returns cutoff info for a slot', async () => {
    const res = await request(app).get(`/api/slots/3/can-book?date=${futureDate}`).expect(200);
    assert.equal(typeof res.body.can_book, 'boolean');
    assert.ok(res.body.cutoff);
  });

  it('rejects a booking with missing fields', async () => {
    const res = await request(app).post('/api/bookings').send({ user_id: 3 }).expect(400);
    assert.match(res.body.error, /required/i);
  });

  it('rejects booking on a weekend', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ user_id: 3, slot_id: 3, booking_date: '2026-10-03' })
      .expect(400);
    assert.match(res.body.error, /weekend/i);
  });

  it('rejects booking for a blocked user', async () => {
    const store = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
    store.users.find((u) => u.id === 2).blocked_until = '2099-01-01 00:00:00';
    fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));

    // store module already loaded; mutate via setUserBlockedUntil
    const backendStore = require('../../backend/store');
    backendStore.setUserBlockedUntil(2, '2099-01-01 00:00:00');

    const res = await request(app)
      .post('/api/bookings')
      .send({ user_id: 2, slot_id: 3, booking_date: futureDate })
      .expect(403);
    assert.match(res.body.error, /blocked/i);
  });

  it('creates a booking, then rejects a second booking the same day', async () => {
    const created = await request(app)
      .post('/api/bookings')
      .send({ user_id: 3, slot_id: 3, booking_date: futureDate })
      .expect(201);
    assert.equal(created.body.status, 'booked');
    assert.ok(created.body.slot_label);

    const dupSlot = await request(app)
      .post('/api/bookings')
      .send({ user_id: 3, slot_id: 3, booking_date: futureDate })
      .expect(409);
    assert.match(dupSlot.body.error, /Already booked/i);

    const dupDay = await request(app)
      .post('/api/bookings')
      .send({ user_id: 3, slot_id: 4, booking_date: futureDate })
      .expect(409);
    assert.match(dupDay.body.error, /one booking per day/i);
  });

  it('assigns a vehicle and lists bookings by date', async () => {
    const list = await request(app).get(`/api/bookings?date=${futureDate}&user_id=3`).expect(200);
    assert.ok(list.body.length >= 1);
    const id = list.body[0].id;

    await request(app).patch(`/api/bookings/${id}/vehicle`).send({ vehicle_id: 1 }).expect(200);
    const after = await request(app).get(`/api/bookings?date=${futureDate}&user_id=3`).expect(200);
    assert.equal(after.body[0].vehicle_id, 1);
  });

  it('cancels an active future booking', async () => {
    const date = nextWeekday(new Date(), 5);
    const created = await request(app)
      .post('/api/bookings')
      .send({ user_id: 4, slot_id: 4, booking_date: date })
      .expect(201);

    const cancelled = await request(app).patch(`/api/bookings/${created.body.id}/cancel`).expect(200);
    assert.equal(cancelled.body.status, 'cancelled');
  });

  it('marks no-show and blocks after two consecutive no-shows', async () => {
    const d1 = nextWeekday(new Date(), 8);
    const d2 = nextWeekday(new Date(d1 + 'T12:00:00'), 1);
    const first = await request(app)
      .post('/api/bookings')
      .send({ user_id: 4, slot_id: 3, booking_date: d1 })
      .expect(201);
    await request(app).patch(`/api/bookings/${first.body.id}/no-show`).expect(200);

    const second = await request(app)
      .post('/api/bookings')
      .send({ user_id: 4, slot_id: 3, booking_date: d2 })
      .expect(201);
    await request(app).patch(`/api/bookings/${second.body.id}/no-show`).expect(200);

    const user = await request(app).get('/api/users/4').expect(200);
    assert.ok(user.body.blocked_until);
    assert.ok(new Date(user.body.blocked_until) > new Date());
  });

  it('returns JSON error shape for missing booking actions', async () => {
    const res = await request(app).patch('/api/bookings/9999/cancel').expect(404);
    assert.equal(typeof res.body.error, 'string');
  });

  it('keeps the web booking path blocked even when an urgent reason is sent', async () => {
    const date = nextWeekday(new Date(), 6);
    const explanation = 'Hospital visit and I still need the shuttle.';
    const res = await request(app)
      .post('/api/bookings')
      .send({
        user_id: 2,
        slot_id: 4,
        booking_date: date,
        urgent_category: 'medical_emergency',
        urgent_explanation: explanation,
      })
      .expect(403);
    assert.match(res.body.error, /blocked/i);
    const list = await request(app).get(`/api/bookings?date=${date}&user_id=2`).expect(200);
    assert.equal(list.body.length, 0);
  });

  it('refuses a chat booking for a blocked user without a valid urgent reason', async () => {
    const date = nextWeekday(new Date(), 6);
    const explanation = 'Hospital visit and I still need the shuttle.';
    const missing = await request(app)
      .post('/api/chat/bookings')
      .send({ user_id: 2, slot_id: 4, booking_date: date })
      .expect(403);
    assert.match(missing.body.error, /urgent reason/i);

    const unknown = await request(app)
      .post('/api/chat/bookings')
      .send({
        user_id: 2,
        slot_id: 4,
        booking_date: date,
        urgent_category: 'traffic',
        urgent_explanation: explanation,
      })
      .expect(403);
    assert.match(unknown.body.error, /urgent reason/i);

    const short = await request(app)
      .post('/api/chat/bookings')
      .send({
        user_id: 2,
        slot_id: 4,
        booking_date: date,
        urgent_category: 'medical_emergency',
        urgent_explanation: 'too short',
      })
      .expect(403);
    assert.match(short.body.error, /15 characters/i);
  });

  it('books from chat for each urgent category and leaves the block in place', async () => {
    const before = await request(app).get('/api/users/2').expect(200);
    const explanation = 'Hospital visit and I still need the shuttle.';
    const cases = [
      ['medical_emergency', 6],
      ['family_emergency', 7],
      ['client_visit', 9],
    ];
    for (const [category, offset] of cases) {
      const date = nextWeekday(new Date(), offset);
      const res = await request(app)
        .post('/api/chat/bookings')
        .send({
          user_id: 2,
          slot_id: 4,
          booking_date: date,
          urgent_category: category,
          urgent_explanation: explanation,
        })
        .expect(201);
      assert.equal(res.body.override_category, category);
      assert.equal(res.body.override_explanation, explanation);
      assert.equal(res.body.override_source, 'chat');
      assert.deepEqual(res.body.policy_override, {
        skill: 'validate-booking-rules',
        prd: 'workride-chat-prd.md',
      });
    }
    const after = await request(app).get('/api/users/2').expect(200);
    assert.equal(after.body.blocked_until, before.body.blocked_until);
    assert.equal(after.body.blocked_until, '2099-01-01 00:00:00');

    const again = nextWeekday(new Date(), 11);
    await request(app)
      .post('/api/chat/bookings')
      .send({ user_id: 2, slot_id: 4, booking_date: again })
      .expect(403);
  });

  it('still rejects a weekend and a past cutoff on the chat path', async () => {
    const explanation = 'Hospital visit and I still need the shuttle.';
    const weekend = await request(app)
      .post('/api/chat/bookings')
      .send({
        user_id: 2,
        slot_id: 4,
        booking_date: '2026-10-10',
        urgent_category: 'medical_emergency',
        urgent_explanation: explanation,
      })
      .expect(400);
    assert.match(weekend.body.error, /weekend/i);

    const cutoff = await request(app)
      .post('/api/chat/bookings')
      .send({
        user_id: 2,
        slot_id: 1,
        booking_date: '2026-10-09',
        urgent_category: 'client_visit',
        urgent_explanation: explanation,
      })
      .expect(400);
    assert.match(cutoff.body.error, /cutoff/i);
  });

  it('books from chat without an urgent reason when the employee is not blocked', async () => {
    const date = nextWeekday(new Date(), 4);
    const res = await request(app)
      .post('/api/chat/bookings')
      .send({ user_id: 3, slot_id: 4, booking_date: date })
      .expect(201);
    assert.equal(res.body.status, 'booked');
    assert.equal(res.body.override_category, null);
    assert.equal(res.body.policy_override, undefined);
  });
});
