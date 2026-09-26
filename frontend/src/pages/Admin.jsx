import { useState, useEffect } from 'react';
import { getBookings, getVehicles, markNoShow, setBookingVehicle } from '../api';

export default function Admin() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getVehicles().then(setVehicles).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getBookings({ date })
      .then(setBookings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [date]);

  const handleNoShow = (id) => {
    if (!confirm('Mark this booking as no-show? (2 consecutive no-shows block the user from booking for 1 day)')) return;
    setError('');
    markNoShow(id)
      .then(() => setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'no_show' } : b))))
      .catch((e) => setError(e.message));
  };

  const handleVehicle = (bookingId, vehicle_id) => {
    setBookingVehicle(bookingId, vehicle_id ? Number(vehicle_id) : null)
      .then(() => setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, vehicle_id: vehicle_id ? Number(vehicle_id) : null } : b))))
      .catch((e) => setError(e.message));
  };

  const bySlot = bookings.reduce((acc, b) => {
    const key = b.slot_label || b.slot_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  const booked = bookings.filter((b) => b.status === 'booked');

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem' }}>Admin — Bookings & Vehicles</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        View bookings by date, assign vehicles, and mark no-shows.
      </p>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: '0.5rem' }}>Date:</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {error && <p className="error-msg">{error}</p>}
      {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

      {!loading && (
        <>
          <p style={{ marginBottom: '1rem' }}>
            <strong>{booked.length}</strong> active booking(s) on this date.
          </p>
          {Object.keys(bySlot).length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No bookings for this date.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(bySlot).map(([slotLabel, list]) => (
                <div key={slotLabel} className="card">
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>{slotLabel}</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--surface2)', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem 0' }}>Employee</th>
                        <th style={{ padding: '0.5rem 0' }}>Status</th>
                        <th style={{ padding: '0.5rem 0' }}>Vehicle</th>
                        <th style={{ padding: '0.5rem 0' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((b) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--surface2)' }}>
                          <td style={{ padding: '0.5rem 0' }}>{b.user_name} ({b.user_email})</td>
                          <td style={{ padding: '0.5rem 0' }}>
                            <span style={{ color: b.status === 'booked' ? 'var(--success)' : 'var(--text-muted)' }}>{b.status}</span>
                          </td>
                          <td style={{ padding: '0.5rem 0' }}>
                            <select
                              value={b.vehicle_id || ''}
                              onChange={(e) => handleVehicle(b.id, e.target.value)}
                              disabled={b.status !== 'booked'}
                            >
                              <option value="">—</option>
                              {vehicles.map((v) => (
                                <option key={v.id} value={v.id}>{v.name} ({v.capacity})</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem 0' }}>
                            {b.status === 'booked' && (
                              <button type="button" className="btn-danger" onClick={() => handleNoShow(b.id)}>No-show</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
