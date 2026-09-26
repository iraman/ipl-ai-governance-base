import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSlots, createBooking, getSlotCanBook, getUser, getBookings, getBookableDate } from '../api';

export default function Book() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [userWithBlock, setUserWithBlock] = useState(user);
  const [bookingDate, setBookingDate] = useState('');
  const [slotId, setSlotId] = useState('');
  const [cutoffInfo, setCutoffInfo] = useState(null);
  const [existingOnDate, setExistingOnDate] = useState(null);
  const [dateBookable, setDateBookable] = useState({ ok: true }); // weekend/holiday check
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Today in local timezone (for min date and for "current date" slot filter)
  const now = new Date();
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // For current date, only show slots whose start time is still in the future (local time)
  const availableSlots =
    bookingDate === todayLocal
      ? slots.filter((s) => {
          const slotStart = new Date(bookingDate + 'T' + (s.time || '00:00') + ':00');
          return slotStart > now;
        })
      : slots;

  // Clear selected slot if it's no longer available (e.g. switched to today and morning already passed)
  useEffect(() => {
    if (slotId && bookingDate && availableSlots.length && !availableSlots.some((s) => String(s.id) === slotId)) {
      setSlotId('');
    }
  }, [bookingDate, availableSlots, slotId]);

  useEffect(() => {
    getSlots().then(setSlots).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (user?.id) getUser(user.id).then(setUserWithBlock).catch(() => setUserWithBlock(user));
    else setUserWithBlock(user);
  }, [user]);

  useEffect(() => {
    if (!slotId || !bookingDate) {
      setCutoffInfo(null);
      return;
    }
    getSlotCanBook(slotId, bookingDate)
      .then(setCutoffInfo)
      .catch(() => setCutoffInfo(null));
  }, [slotId, bookingDate]);

  useEffect(() => {
    if (!bookingDate) {
      setDateBookable({ ok: true });
      return;
    }
    getBookableDate(bookingDate)
      .then(setDateBookable)
      .catch(() => setDateBookable({ ok: true }));
  }, [bookingDate]);

  useEffect(() => {
    if (!user?.id || !bookingDate) {
      setExistingOnDate(null);
      return;
    }
    getBookings({ user_id: user.id, date: bookingDate })
      .then((list) => {
        const active = list.find((b) => b.status === 'booked');
        setExistingOnDate(active || null);
      })
      .catch(() => setExistingOnDate(null));
  }, [user?.id, bookingDate]);

  const isBlocked = userWithBlock?.blocked_until && new Date(userWithBlock.blocked_until) > new Date();
  const canBook =
    dateBookable.ok &&
    !existingOnDate &&
    cutoffInfo?.can_book &&
    !isBlocked &&
    user?.id &&
    bookingDate &&
    slotId &&
    availableSlots.some((s) => String(s.id) === slotId);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!canBook) return;
    setLoading(true);
    createBooking({ user_id: user.id, slot_id: Number(slotId), booking_date: bookingDate })
      .then((data) => {
        setSuccess('Booking confirmed.');
        setSlotId('');
        setExistingOnDate(data || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  // Clear success when user picks a different date so "already booked" and "confirmed" don't show together
  useEffect(() => {
    if (success) setSuccess('');
  }, [bookingDate]);

  if (!user) return null;

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Book Shuttle</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Morning: Metro → Office (7:30, 8:30). Evening: Office → Metro (5:00, 6:00). Book before cutoff.
      </p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '1rem', maxWidth: '360px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>Date</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={todayLocal}
                required
              />
              {bookingDate && !dateBookable.ok && (
                <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginTop: '0.35rem' }}>
                  {dateBookable.reason}
                </p>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>Slot</label>
              <select value={slotId} onChange={(e) => setSlotId(e.target.value)} required>
                <option value="">Select slot...</option>
                {availableSlots.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              {bookingDate === todayLocal && availableSlots.length < slots.length && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  For today, only slots after the current time are shown (in your time zone).
                </p>
              )}
              {bookingDate === todayLocal && availableSlots.length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginTop: '0.35rem' }}>
                  No slots left for today. Please select a future date.
                </p>
              )}
              {existingOnDate && !success && (
                <p style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: '0.35rem' }}>
                  You already have a booking on this date ({existingOnDate.slot_label}). Only one booking per day.
                </p>
              )}
              {cutoffInfo && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  {cutoffInfo.can_book
                    ? `Book by ${cutoffInfo.cutoff_label}`
                    : 'Booking closed for this slot on this date.'}
                </p>
              )}
            </div>
            {isBlocked && (
              <p className="error-msg">
                Booking is blocked until {new Date(userWithBlock.blocked_until).toLocaleString()} due to no-show policy.
              </p>
            )}
            <button type="submit" className="btn-primary" disabled={!canBook || loading}>
              {loading ? 'Booking...' : 'Book'}
            </button>
          </div>
        </form>
        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">{success}</p>}
      </div>
    </div>
  );
}
