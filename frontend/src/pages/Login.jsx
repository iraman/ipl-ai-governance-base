import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@trimble-oss/trimble-id-react';
import { useAuth as useAppAuth } from '../context/AuthContext';
import { getUsers } from '../api';

export default function Login() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingTrimbleAuth, setUsingTrimbleAuth] = useState(false);
  
  const { loginWithRedirect, isAuthenticated: isTrimbleAuthenticated } = useAuth();
  const { login, isAuthenticated } = useAppAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleTrimbleLogin = async () => {
    setError('');
    setUsingTrimbleAuth(true);
    try {
      // Ensure proper state persistence before redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      await loginWithRedirect();
    } catch (err) {
      console.error('Trimble login error:', err);
      setError('Failed to initiate Trimble login. Please try again.');
      setUsingTrimbleAuth(false);
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setError('');
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email.');
      return;
    }
    const u = users.find((x) => (x.email || '').toLowerCase() === trimmed);
    if (!u) {
      setError('No account found for this email.');
      return;
    }
    login(u);
    navigate(location.state?.from?.pathname || '/', { replace: true });
  };

  if (loading) {
    return (
      <div className="login-page">
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="card" style={{ maxWidth: '360px', margin: '0 auto' }}>
        <h1 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Trimble WorkRide</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Sign in to book the office shuttle.
        </p>

        {/* Trimble ID Login */}
        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%', marginBottom: '1rem' }}
          onClick={handleTrimbleLogin}
          disabled={usingTrimbleAuth}
        >
          {usingTrimbleAuth ? 'Redirecting to Trimble ID...' : 'Sign in with Trimble ID'}
        </button>

        <div style={{ textAlign: 'center', margin: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          or
        </div>

        {/* Fallback Email Login for Development */}
        <form onSubmit={handleEmailSubmit}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            <strong>Development Mode:</strong> Use email to sign in (no password)
          </p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. testuser1@company.com"
              style={{ width: '100%' }}
              autoComplete="email"
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ width: '100%' }}>
            Sign in with Email
          </button>
        </form>

        <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.8rem' }}>
          Test accounts: admin@company.com, testuser1@company.com, testuser2@company.com, testuser3@company.com
        </p>

        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  );
}
