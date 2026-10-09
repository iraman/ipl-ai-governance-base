const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../../backend/rules');

const morning = { time: '07:30', direction: 'morning_to_office' };
const evening = { time: '17:00', direction: 'evening_to_metro' };

describe('booking rules', () => {
  it('marks morning slots and evening slots', () => {
    assert.equal(rules.isMorningSlot(morning), true);
    assert.equal(rules.isMorningSlot(evening), false);
  });

  it('sets morning cutoff to 8 PM the previous day', () => {
    const cutoff = rules.getBookingCutoff(morning, '2026-09-29');
    assert.equal(cutoff.getHours(), 20);
    assert.equal(cutoff.getDate(), 28);
  });

  it('sets evening cutoff to 3 PM the same day', () => {
    const cutoff = rules.getBookingCutoff(evening, '2026-09-29');
    assert.equal(cutoff.getHours(), 15);
    assert.equal(cutoff.getDate(), 29);
  });

  it('allows cancel until 1 hour before slot start', () => {
    const booking = { status: 'booked', booking_date: '2026-09-29' };
    const twoHoursBefore = new Date('2026-09-29T15:00:00');
    const thirtyMinBefore = new Date('2026-09-29T16:30:00');
    assert.equal(rules.canCancel(booking, evening, twoHoursBefore), true);
    assert.equal(rules.canCancel(booking, evening, thirtyMinBefore), false);
    assert.equal(rules.canCancel({ status: 'cancelled', booking_date: '2026-09-29' }, evening, twoHoursBefore), false);
  });

  it('blocks a user only while blocked_until is in the future', () => {
    assert.equal(rules.isUserBlocked({ blocked_until: '2099-01-01 00:00:00' }), true);
    assert.equal(rules.isUserBlocked({ blocked_until: '2020-01-01 00:00:00' }), false);
    assert.equal(rules.isUserBlocked({ blocked_until: null }), false);
  });

  it('counts consecutive no-shows from the most recent booking', () => {
    const count = rules.getConsecutiveNoShows(() => [
      { status: 'no_show' },
      { status: 'no_show' },
      { status: 'booked' },
    ]);
    assert.equal(count, 2);
    assert.equal(rules.getConsecutiveNoShows(() => [{ status: 'booked' }, { status: 'no_show' }]), 0);
  });

  it('sets a 1-day block after two consecutive no-shows', () => {
    let blocked = null;
    rules.updateBlockIfNeeded(
      () => [{ status: 'no_show' }, { status: 'no_show' }],
      (userId, until) => { blocked = { userId, until }; },
      7
    );
    assert.equal(blocked.userId, 7);
    assert.ok(new Date(blocked.until) > new Date());
  });

  it('accepts only the three urgent categories with a 15 to 500 character explanation', () => {
    const explanation = 'Hospital visit and I still need the shuttle.';
    for (const category of ['medical_emergency', 'family_emergency', 'client_visit']) {
      const result = rules.validateUrgentOverride({ category, explanation });
      assert.equal(result.ok, true);
      assert.equal(result.category, category);
      assert.equal(result.explanation, explanation);
    }
    assert.equal(rules.validateUrgentOverride({ category: 'traffic', explanation }).ok, false);
    assert.equal(rules.validateUrgentOverride({ explanation }).ok, false);
    assert.equal(rules.validateUrgentOverride({ category: 'medical_emergency', explanation: 'too short' }).ok, false);
    assert.equal(rules.validateUrgentOverride({ category: 'medical_emergency', explanation: 'x'.repeat(501) }).ok, false);
    const trimmed = rules.validateUrgentOverride({
      category: 'client_visit',
      explanation: '   Client visit this afternoon.   ',
    });
    assert.equal(trimmed.ok, true);
    assert.equal(trimmed.explanation, 'Client visit this afternoon.');
  });

  it('rejects weekends and listed public holidays', () => {
    assert.equal(rules.isWeekend('2026-10-03'), true);
    assert.deepEqual(rules.isBookableDate('2026-10-03'), { ok: false, reason: 'Booking not available on weekends.' });
    assert.deepEqual(rules.isBookableDate('2026-10-02'), { ok: false, reason: 'Booking not available on public holidays.' });
    assert.deepEqual(rules.isBookableDate('2026-09-29'), { ok: true });
  });
});
