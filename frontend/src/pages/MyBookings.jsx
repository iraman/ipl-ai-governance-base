import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBookings, cancelBooking } from '../api';

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    getBookings({ user_id: user.id })
      .then(setBookings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleCancel = (id) => {
    if (!confirm('Cancel this booking?')) return;
    setError('');
    cancelBooking(id)
      .then(() => setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))))
      .catch((e) => setError(e.message));
  };

  const upcoming = bookings.filter((b) => b.status === 'booked' && b.booking_date >= new Date().toISOString().slice(0, 10));
  const past = bookings.filter((b) => b.booking_date < new Date().toISOString().slice(0, 10) || b.status !== 'booked');

  const canCancelSlot = (b) => {
    if (b.status !== 'booked') return false;
    const [h, m] = (b.slot_time || '').split(':').map(Number);
    const slotStart = new Date(b.booking_date);
    slotStart.setHours(h || 0, m || 0, 0, 0);
    const oneHrBefore = new Date(slotStart.getTime() - 60 * 60 * 1000);
    return new Date() < oneHrBefore;
  };

  if (!user) return null;

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>My Bookings</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Cancel at least 1 hour before the slot start time.
      </p>

      {error && <p className="error-msg">{error}</p>}
      {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

      {!loading && (
        <>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Upcoming</h2>
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No upcoming bookings.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {upcoming.map((b) => (
                <li key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span><strong>{b.booking_date}</strong> — {b.slot_label}</span>
                  {canCancelSlot(b) ? (
                    <button type="button" className="btn-danger" onClick={() => handleCancel(b.id)}>Cancel</button>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cancel window passed</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {past.length > 0 && (
            <>
              <h2 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>Past / Cancelled</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {past.slice(0, 20).map((b) => (
                  <li key={b.id} className="card" style={{ opacity: 0.85 }}>
                    <strong>{b.booking_date}</strong> — {b.slot_label}
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>({b.status})</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
