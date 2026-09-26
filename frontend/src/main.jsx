import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { TIDProvider } from '@trimble-oss/trimble-id-react';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

function MainApp() {
  const clientId = import.meta.env.VITE_TRIMBLE_CLIENT_ID;
  const appBaseUrl = import.meta.env.VITE_APP_BASE_URL;
  const normalizedBaseUrl = appBaseUrl ? appBaseUrl.replace(/\/+$/, '') : '';
  const redirectUrl = normalizedBaseUrl ? `${normalizedBaseUrl}/callback` : '';
  const logoutRedirectUrl = normalizedBaseUrl ? `${normalizedBaseUrl}/logout-callback` : '';
  
  // If Client ID is not configured, show a setup message
  if (!clientId || clientId === '' || !normalizedBaseUrl || normalizedBaseUrl === '') {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <h1>Trimble WorkRide - Setup Required</h1>
        <p>To use Trimble ID authentication, you need to:</p>
        <ol>
          <li>Go to <a href="https://developer.trimble.com/console/applications" target="_blank" rel="noreferrer">Trimble Developer Console</a></li>
          <li>Create a new application</li>
          <li>Configure OAuth: Authorization Code Grant + Use Refresh tokens</li>
          <li>Set Callback URL: <code>{redirectUrl || 'VITE_APP_BASE_URL/callback'}</code></li>
          <li>Set Logout URL: <code>{logoutRedirectUrl || 'VITE_APP_BASE_URL/logout-callback'}</code></li>
          <li>Add these values to <code>frontend/.env</code>: <code>VITE_TRIMBLE_CLIENT_ID</code> and <code>VITE_APP_BASE_URL</code></li>
          <li>Restart the dev server: <code>npm run dev</code></li>
        </ol>
        <p><strong>In the meantime</strong>, you can use the email-based login on the login page:</p>
        <ul>
          <li>admin@company.com</li>
          <li>testuser1@company.com</li>
          <li>testuser2@company.com</li>
          <li>testuser3@company.com</li>
        </ul>
      </div>
    );
  }

  return (
    <TIDProvider
      configurationEndpoint={import.meta.env.VITE_TRIMBLE_CONFIG_ENDPOINT || "https://id.trimble.com/.well-known/openid-configuration"}
      clientId={clientId}
      redirectUrl={redirectUrl}
      logoutRedirectUrl={logoutRedirectUrl}
      scopes={['openid', 'profile', 'email']}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </TIDProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  </React.StrictMode>
);
