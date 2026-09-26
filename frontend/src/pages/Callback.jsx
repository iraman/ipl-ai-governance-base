import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useTrimbleAuth } from '@trimble-oss/trimble-id-react';
import { useAuth } from '../context/AuthContext';
import { getUsers, createUser } from '../api';

export default function Callback() {
  const navigate = useNavigate();
  const { handleCallback, user: trimbleUser } = useTrimbleAuth();
  const { login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [callbackProcessed, setCallbackProcessed] = useState(false);
  const processedRef = useRef(false);

  const handleLogin = async (user) => {
    try {
      // The SDK (v1.0.3+) manages access tokens in-memory
      // We only need to save the user data
      console.log('→ Fetching users from API...');
      
      try {
        const users = await getUsers();
        const dbUser = users.find(
          (u) => (u.email || '').toLowerCase() === (user.email || '').toLowerCase()
        );

        if (dbUser) {
          console.log('✓ User found in database:', dbUser.email);
          console.log('📤 Calling login() with dbUser');
          login(dbUser);
        } else {
          console.log('⚠ User not in database, creating a new DB user for:', user.email);
          const createdUser = await createUser({
            name: user.name || user.email,
            email: user.email,
          });
          console.log('✓ Created new user in database:', createdUser.email);
          login(createdUser);
        }
      } catch (err) {
        console.error('✗ Error fetching or creating user from API:', err);
        console.log('⚠ Creating fallback temporary user');
        const tempUser = {
          name: user.name || user.email,
          email: user.email,
          trimbleId: user.sub,
        };
        console.log('📤 Calling login() with fallback tempUser');
        login(tempUser);
      }

      console.log('✓ Login completed successfully, redirecting to home...');
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  // First effect: Process the OAuth callback
  useEffect(() => {
    // Prevent double-processing in React 18 StrictMode
    if (processedRef.current) {
      console.log('⏭ Callback already processed, skipping...');
      return;
    }
    processedRef.current = true;

    const processCallback = async () => {
      try {
        // Handle the OAuth callback
        const authState = await handleCallback();
        console.log('✓ Callback handled successfully. Auth state:', authState);
        console.log('→ Waiting for user data from Trimble auth...');
        setCallbackProcessed(true);
      } catch (err) {
        console.error('Callback error:', err);
        
        // If state validation fails, clear storage and show error
        if (err.message?.includes('state') || err.message?.includes('State validation')) {
          console.log('State validation failed. Clearing stored state...');
          
          // Clear all OIDC-related state from storage
          try {
            // Clear localStorage
            const keysToRemove = ['oidc.user', 'oidc.state', 'oidc.nonce'];
            keysToRemove.forEach(key => {
              localStorage.removeItem(key);
            });
            
            // Clear all items that might contain OAuth state
            Object.keys(localStorage).forEach(key => {
              if (key.includes('oidc') || key.includes('auth') || key.includes('oauth') || key.includes('state')) {
                localStorage.removeItem(key);
              }
            });
            
            // Clear sessionStorage too
            Object.keys(sessionStorage).forEach(key => {
              if (key.includes('oidc') || key.includes('auth') || key.includes('oauth') || key.includes('state')) {
                sessionStorage.removeItem(key);
              }
            });
          } catch (clearErr) {
            console.error('Error clearing storage:', clearErr);
          }
          
          // Show user-friendly error message instead of auto-redirecting
          setError('Authentication token expired. Please click the button below to try again.');
          setLoading(false);
        } else {
          setError('Authentication failed. Please try again. Error: ' + (err.message || 'Unknown error'));
          setLoading(false);
        }
      }
    };

    processCallback();
  }, [handleCallback]);

  // Second effect: Handle login once callback is processed and user is available
  useEffect(() => {
    if (!callbackProcessed || !trimbleUser) {
      if (callbackProcessed && !trimbleUser) {
        console.log('⏳ Callback processed but user not yet available from Trimble auth...');
      }
      return;
    }

    console.log('✓ User available from Trimble auth:', trimbleUser.email);
    // Call the login handler with the user (SDK manages token in-memory)
    handleLogin(trimbleUser);
  }, [callbackProcessed, trimbleUser, login, navigate]);

  if (loading) {
    return (
      <div className="login-page">
        <div className="card" style={{ maxWidth: '360px', margin: '0 auto', textAlign: 'center' }}>
          <h2>Processing login...</h2>
          <p style={{ color: 'var(--text-muted)' }}>Please wait while we complete your authentication.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="login-page">
        <div className="card" style={{ maxWidth: '360px', margin: '0 auto' }}>
          <h2>Authentication Error</h2>
          <p className="error-msg">{error}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/login', { replace: true })}
            style={{ width: '100%' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
}
