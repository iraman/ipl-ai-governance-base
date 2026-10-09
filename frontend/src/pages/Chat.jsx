import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSlots, getUser, getBookings, getSlotCanBook, getBookableDate, createChatBooking } from '../api';

const URGENT_OPTIONS = [
  { value: 'medical_emergency', label: 'Medical emergency' },
  { value: 'family_emergency', label: 'Family emergency' },
  { value: 'client_visit', label: 'Same-day client visit' },
];

function isBlockedUser(person) {
  return Boolean(person?.blocked_until && new Date(person.blocked_until) > new Date());
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [userWithBlock, setUserWithBlock] = useState(null);
  const [messages, setMessages] = useState([]);
  const [bookingDate, setBookingDate] = useState('');
  const [slotId, setSlotId] = useState('');
  const [phase, setPhase] = useState('choose');
  const [pending, setPending] = useState(null);
  const [urgentCategory, setUrgentCategory] = useState('');
  const [urgentExplanation, setUrgentExplanation] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;  const availableSlots = bookingDate === todayLocal
    ? slots.filter((s) => new Date(`${bookingDate}T${s.time || '00:00'}:00`) > now)
    : slots;

  useEffect(() => {
    getSlots().then(setSlots).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    getUser(user.id).then(setUserWithBlock).catch(() => setUserWithBlock(user));
  }, [user]);

  useEffect(() => {
    if (!userWithBlock || messages.length > 0) return;
    const blocked = isBlockedUser(userWithBlock);
    setMessages([{
      role: 'assistant',
      text: blocked
        ? `The Book page is closed until ${new Date(userWithBlock.blocked_until).toLocaleString()} because of the no-show policy. Tell me the date and slot. If this trip is a medical emergency, a family emergency, or a same-day client visit, chat can still book it.`
        : 'Tell me the date and slot you need. Morning is metro to office at 7:30 and 8:30. Evening is office to metro at 5:00 and 6:00.',
    }]);
  }, [userWithBlock, messages.length]);

  useEffect(() => {
    if (slotId && bookingDate && availableSlots.length && !availableSlots.some((s) => String(s.id) === slotId)) {
      setSlotId('');
    }
  }, [bookingDate, availableSlots, slotId]);

  const addMessage = (message) => setMessages((prev) => [...prev, message]);

  const book = (request, slotLabel) => {
    setLoading(true);
    setError('');
    createChatBooking(request)
      .then((data) => {
        if (data.policy_override) {
          addMessage({
            role: 'assistant',
            highlight: true,
            text: `Booked ${data.booking_date} — ${data.slot_label || slotLabel}. This booking used the ${data.policy_override.skill} exception from the chat PRD. The Book page is still blocked until the no-show block ends.`,
            skills: data.skills,
            trace: data.decision_trace,
          });
        } else {
          addMessage({
            role: 'assistant',
            text: `Booking confirmed for ${data.booking_date} — ${data.slot_label || slotLabel}.`,
            skills: data.skills,
            trace: data.decision_trace,
          });
        }
        setPhase('done');
        if (user?.id) getUser(user.id).then(setUserWithBlock).catch(() => {});
      })
      .catch((e) => {
        if (e.decisionTrace) {
          addMessage({ role: 'assistant', text: `I could not book this: ${e.message}`, skills: e.skills, trace: e.decisionTrace });
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  };

  const handleChoose = async (e) => {
    e.preventDefault();
    setError('');
    const slot = availableSlots.find((s) => String(s.id) === slotId);
    if (!slot || !bookingDate || !user?.id) return;

    addMessage({ role: 'user', text: `Book ${slot.label} on ${bookingDate}.` });

    try {
      const dateCheck = await getBookableDate(bookingDate);
      if (!dateCheck.ok) {
        addMessage({ role: 'assistant', text: dateCheck.reason });
        return;
      }
      const cutoff = await getSlotCanBook(slot.id, bookingDate);
      if (!cutoff.can_book) {
        addMessage({ role: 'assistant', text: 'Booking closed for this slot on this date.' });
        return;
      }
      const existing = await getBookings({ user_id: user.id, date: bookingDate });
      const active = existing.find((b) => b.status === 'booked');
      if (active) {
        addMessage({ role: 'assistant', text: `You already have a booking on this date (${active.slot_label}). Only one booking per day.` });
        return;
      }
    } catch (err) {
      setError(err.message);
      return;
    }

    if (isBlockedUser(userWithBlock)) {
      setPending({ bookingDate, slotId: slot.id, slotLabel: slot.label });
      setPhase('urgent');
      addMessage({
        role: 'assistant',
        text: 'You are blocked from the Book page after two no-shows. Choose a medical emergency, a family emergency, or a same-day client visit, and explain why this trip is urgent.',
      });
      return;
    }

    book({ user_id: user.id, slot_id: slot.id, booking_date: bookingDate }, slot.label);
  };

  const handleUrgent = (e) => {
    e.preventDefault();
    setError('');
    const explanation = urgentExplanation.trim();
    if (!urgentCategory) {
      setError('Choose an urgent reason.');
      return;
    }
    if (explanation.length < 15) {
      setError('Explain the urgent request in at least 15 characters.');
      return;
    }
    if (explanation.length > 500) {
      setError('The urgent explanation must be 500 characters or fewer.');
      return;
    }
    const label = URGENT_OPTIONS.find((option) => option.value === urgentCategory)?.label || urgentCategory;
    addMessage({ role: 'user', text: `${label}: ${explanation}` });
    book({
      user_id: user.id,
      slot_id: pending.slotId,
      booking_date: pending.bookingDate,
      urgent_category: urgentCategory,
      urgent_explanation: explanation,
    }, pending.slotLabel);
  };

  const startAnother = () => {
    setPhase('choose');
    setPending(null);
    setUrgentCategory('');
    setUrgentExplanation('');
    setError('');
    setBookingDate('');
    setSlotId('');
    addMessage({ role: 'assistant', text: 'What date and slot should I book next?' });
  };

  if (!user) return null;

  return (
    <div className="chat-widget">
      {open && (
      <div className="chat-panel" data-testid="chat-panel">
        <div className="chat-panel-header">
          <strong>Shuttle chat</strong>
          <button type="button" className="btn-secondary" data-testid="chat-close" onClick={() => setOpen(false)}>Close</button>
        </div>
        <div className="chat-log" data-testid="chat-log">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.highlight ? 'policy-override' : `chat-bubble chat-bubble-${message.role}`}
              data-testid={message.highlight ? 'policy-override-note' : undefined}
            >
              <p style={{ margin: 0 }}>{message.text}</p>
              {message.trace && (
                <div className="skill-trace" data-testid="skill-trace">
                  <p className="skill-trace-title">
                    Skills used:{' '}
                    {(message.skills || []).map((name, i) => (
                      <span key={name}>{i > 0 && ', '}<code>{name}</code></span>
                    ))}
                  </p>
                  <ul>
                    {message.trace.map((step) => (
                      <li key={step.check} className={step.passed ? 'skill-pass' : 'skill-fail'}>
                        <strong>{step.passed ? 'Pass' : 'Fail'}: {step.check}</strong>
                        <span> — {step.result}</span>
                        <div className="skill-trace-source">
                          <code>{step.skill}</code> · <code>{step.rule}</code> · {step.source}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {phase === 'choose' && (
          <form onSubmit={handleChoose}>
            <div style={{ display: 'grid', gap: '1rem', maxWidth: '360px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>Date</label>
                <input
                  type="date"
                  data-testid="chat-date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={todayLocal}                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>Slot</label>
                <select data-testid="chat-slot" value={slotId} onChange={(e) => setSlotId(e.target.value)} required>
                  <option value="">Select slot...</option>
                  {availableSlots.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary" data-testid="chat-send" disabled={loading || !userWithBlock}>
                {loading ? 'Booking...' : 'Send'}
              </button>
            </div>
          </form>
        )}

        {phase === 'urgent' && (
          <form onSubmit={handleUrgent}>
            <div style={{ display: 'grid', gap: '1rem', maxWidth: '420px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>Urgent reason</label>
                <select
                  data-testid="chat-urgent-category"
                  value={urgentCategory}
                  onChange={(e) => setUrgentCategory(e.target.value)}
                  required
                >
                  <option value="">Select a reason...</option>
                  {URGENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>Explanation</label>
                <textarea
                  data-testid="chat-urgent-explanation"
                  value={urgentExplanation}
                  onChange={(e) => setUrgentExplanation(e.target.value)}
                  rows={3}
                  required
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <button type="submit" className="btn-primary" data-testid="chat-urgent-send" disabled={loading}>
                {loading ? 'Booking...' : 'Book with this reason'}
              </button>
            </div>
          </form>
        )}

        {phase === 'done' && (
          <button type="button" className="btn-secondary" data-testid="chat-new-request" onClick={startAnother}>
            Update another request
          </button>
        )}
        {error && <p className="error-msg">{error}</p>}
      </div>
      )}
      <button
        type="button"
        className="chat-launcher"
        data-testid="chat-launcher"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Hide chat' : 'Shuttle chat'}
      </button>
    </div>
  );
}
