import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { TIDProvider } from '@trimble-oss/trimble-id-react';
import { AuthProvider, TrimbleAuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

function MainApp() {
  const clientId = import.meta.env.VITE_TRIMBLE_CLIENT_ID;
  const appBaseUrl = import.meta.env.VITE_APP_BASE_URL;
  const normalizedBaseUrl = appBaseUrl ? appBaseUrl.replace(/\/+$/, '') : '';
  const redirectUrl = normalizedBaseUrl ? `${normalizedBaseUrl}/callback` : '';
  const logoutRedirectUrl = normalizedBaseUrl ? `${normalizedBaseUrl}/logout-callback` : '';
  const trimbleConfigured = Boolean(clientId && normalizedBaseUrl);

  // Localhost without a Developer Console app uses email sign-in only.
  if (!trimbleConfigured) {
    return (
      <AuthProvider>
        <App />
      </AuthProvider>
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
      <TrimbleAuthProvider>
        <App />
      </TrimbleAuthProvider>
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
