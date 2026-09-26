import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useTrimbleAuth } from '@trimble-oss/trimble-id-react';
import { setAccessTokenProvider, getUsers, createUser } from '../api';

const STORAGE_KEY = 'shuttle_user';
// NOTE: Access token is stored in-memory by the SDK (v1.0.3+)
// Do NOT store it in localStorage for security reasons

const AuthContext = createContext(null);

async function resolveUserFromStore(parsedUser) {
  if (!parsedUser || !parsedUser.email) return parsedUser;

  try {
    const users = await getUsers();
    const dbUser = users.find((u) => (u.email || '').toLowerCase() === (parsedUser.email || '').toLowerCase());
    if (dbUser) {
      console.log('✓ Found stored user in database by email:', dbUser.email);
      return dbUser;
    }

    if (!parsedUser.id) {
      console.log('⚠ Stored user has no id; creating a new backend user for:', parsedUser.email);
      const createdUser = await createUser({ name: parsedUser.name || parsedUser.email, email: parsedUser.email });
      console.log('✓ Created backend user for stored email:', createdUser.email);
      return createdUser;
    }
  } catch (err) {
    console.warn('Unable to resolve stored user from backend:', err);
  }

  return parsedUser;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const trimbleAuth = useTrimbleAuth();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      console.log('🚀 AuthContext initializing...');
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        console.log('📖 Retrieved user from localStorage:', stored ? JSON.parse(stored) : null);

        if (stored) {
          let parsed = JSON.parse(stored);
          if (parsed && (parsed.id || parsed.email)) {
            parsed = await resolveUserFromStore(parsed);
            if (!cancelled) {
              console.log('✓ User loaded from storage:', parsed);
              setUser(parsed);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            }
          } else {
            console.log('⚠ Stored user object lacks id or email:', parsed);
          }
        } else {
          console.log('ℹ No stored user found in localStorage');
        }
      } catch (err) {
        console.error('✗ Error initializing user from localStorage:', err);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!trimbleAuth) {
      setAccessTokenProvider(null);
      return;
    }

    setAccessTokenProvider(async () => {
      try {
        if (typeof trimbleAuth.getAccessTokenSilently === 'function') {
          return await trimbleAuth.getAccessTokenSilently();
        }
        if (typeof trimbleAuth.getTokens === 'function') {
          const tokens = await trimbleAuth.getTokens();
          return tokens?.access_token || null;
        }
        console.warn('Trimble auth provides no token retrieval method');
        return null;
      } catch (err) {
        console.warn('Unable to obtain Trimble access token:', err);
        return null;
      }
    });
  }, [trimbleAuth]);

  const login = (userData) => {
    console.log('🔐 login() called with user:', userData);
    
    setUser(userData);
    
    // Save only USER data to localStorage (for persistence)
    // Token is managed by the SDK in-memory
    if (userData) {
      try {
        const userStr = JSON.stringify(userData);
        localStorage.setItem(STORAGE_KEY, userStr);
        console.log('✓ User data stored in localStorage');
      } catch (err) {
        console.error('✗ Failed to store user data in localStorage:', err);
      }
    }
  };

  const logout = () => {
    console.log('🚪 logout() called');
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('✓ Cleared user data from localStorage');
    } catch (err) {
      console.error('✗ Error clearing localStorage:', err);
    }
    setAccessTokenProvider(null);
    // Call Trimble logout if available (SDK manages token cleanup)
    if (trimbleAuth?.logout) {
      console.log('→ Calling Trimble SDK logout');
      trimbleAuth.logout();
    }
  };

  const value = {
    user,
    login,
    logout,
    ready,
    isAuthenticated: !!user,
    trimbleAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
