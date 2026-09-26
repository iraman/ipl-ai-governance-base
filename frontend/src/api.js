const base = import.meta.env.VITE_API_URL || '';
const API = base ? `${String(base).replace(/\/$/, '')}/api` : '/api';

let accessTokenProvider = null;

export function setAccessTokenProvider(provider) {
  accessTokenProvider = provider;
}

async function getAccessToken() {
  if (!accessTokenProvider) return null;
  try {
    return await accessTokenProvider();
  } catch (err) {
    console.warn('Failed to resolve access token for API request', err);
    return null;
  }
}

const fetchDefaults = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
};

async function apiFetch(url, options = {}) {
  const token = await getAccessToken();
  const headers = {
    ...fetchDefaults.headers,
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fetchOptions = {
    ...fetchDefaults,
    ...options,
    headers,
  };

  return fetch(url, fetchOptions);
}

export async function getSlots() {
  const r = await apiFetch(`${API}/slots`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getUsers() {
  const r = await apiFetch(`${API}/users`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createUser({ name, email, employee_id }) {
  const r = await apiFetch(`${API}/users`, {
    method: 'POST',
    body: JSON.stringify({ name, email, employee_id }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

export async function getUser(id) {
  const r = await apiFetch(`${API}/users/${id}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getBookings(params = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await apiFetch(`${API}/bookings${q ? '?' + q : ''}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createBooking({ user_id, slot_id, booking_date }) {
  const r = await apiFetch(`${API}/bookings`, {
    method: 'POST',
    body: JSON.stringify({ user_id, slot_id, booking_date }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

export async function cancelBooking(id) {
  const r = await apiFetch(`${API}/bookings/${id}/cancel`, {
    method: 'PATCH',
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

export async function markNoShow(id) {
  const r = await apiFetch(`${API}/bookings/${id}/no-show`, {
    method: 'PATCH',
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

export async function setBookingVehicle(bookingId, vehicle_id) {
  const r = await apiFetch(`${API}/bookings/${bookingId}/vehicle`, {
    method: 'PATCH',
    body: JSON.stringify({ vehicle_id }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

export async function getSlotCanBook(slotId, date) {
  const r = await apiFetch(`${API}/slots/${slotId}/can-book?date=${date}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getBookableDate(date) {
  const r = await apiFetch(`${API}/bookable-date?date=${date}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getVehicles() {
  const r = await apiFetch(`${API}/vehicles`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
