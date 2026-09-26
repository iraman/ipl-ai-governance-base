# Trimble ID Authentication Setup Guide

This document explains how to set up Trimble ID authentication for the WorkRide application.

## Overview

The application now uses **Trimble ID** (OAuth 2.0) for user authentication, with a fallback email-based login for development.

- **Production**: Use Trimble ID authentication
- **Development**: Use email-based login (no password) for testing

## Prerequisites

- An account at [Trimble Developer Console](https://developer.trimble.com/console)
- A Trimble organization/workspace
- Access to create applications

## Setup Steps

### 1. Create Application in Trimble Developer Console

Visit: https://developer.trimble.com/console/applications

1. Click **+ NEW APPLICATION** (top right)
2. Fill in the application details:
   - **Name**: `WorkRide` (or your preferred name)
   - **Display Name**: `Trimble WorkRide - Shuttle Booking`
   - **Description**: `Office shuttle booking system`
3. Click **Continue**

### 2. Configure OAuth Settings

1. Under **OAuth Configuration**, enable:
   - ✅ **Authorization Code Grant** (required)
   - ✅ **Use Refresh tokens** (recommended for token management)

2. Set the **Callback URLs**:
   - **Redirect URL**: `http://localhost:5173/callback`
   - **Logout URL**: `http://localhost:5173/logout-callback`

   > For production, replace `localhost:5173` with your domain

3. Click **Save** or **Create Application**

### 3. Get Your Client ID

After creating the application:

1. Go to **Basic Information** section
2. Copy your **Client ID**
3. Note the **OAuth URLs** shown in the configuration

### 4. Configure the Frontend

1. Open `frontend/.env` in your editor:

```bash
cd frontend
nano .env  # or use your preferred editor
```

2. Update the Client ID:

```env
VITE_TRIMBLE_CLIENT_ID=<YOUR_CLIENT_ID_HERE>
VITE_TRIMBLE_CONFIG_ENDPOINT=https://id.trimble.com/.well-known/openid-configuration
VITE_API_BASE_URL=http://localhost:3001
```

3. Save the file

### 5. Restart the Frontend Dev Server

```bash
cd frontend
npm run dev
```

The dev server will restart and load the new configuration.

## Usage

### Production (with Trimble ID)

1. User lands on the login page
2. Clicks **"Sign in with Trimble ID"**
3. Gets redirected to Trimble ID login
4. After authentication, returns to the app
5. User is logged in with their Trimble credentials

### Development (Email-based Fallback)

If Trimble ID is not configured, or for testing:

1. Click **"Sign in with Email"**
2. Enter one of the test accounts:
   - `admin@company.com` (admin access)
   - `testuser1@company.com`
   - `testuser2@company.com`
   - `testuser3@company.com`
3. Click **Sign in**

## How It Works

### Authentication Flow

```
1. User clicks "Sign in with Trimble ID"
   ↓
2. Redirect to: https://id.trimble.com/authorize
   ↓
3. User logs in with Trimble credentials
   ↓
4. Trimble redirects to: http://localhost:5173/callback
   ↓
5. App handles callback, retrieves access token
   ↓
6. User is logged in and redirected to dashboard
```

### Token Management

- **Access Token**: Stored in browser memory (most secure)
- **Refresh Token**: Managed by TIDProvider automatically
- **User Info**: Saved in localStorage for session persistence
- **Token Duration**: Configured by Trimble ID

### API Integration

Access the user's Trimble ID token in your API calls:

```javascript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { accessToken } = useAuth();

  // Use accessToken in API headers:
  const response = await fetch('/api/bookings', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
}
```

## File Structure

```
frontend/
├── .env                          # Your configuration (Trimble Client ID)
├── .env.example                  # Example configuration
├── src/
│   ├── main.jsx                 # TIDProvider setup
│   ├── App.jsx                  # Routes including /callback
│   ├── context/
│   │   └── AuthContext.jsx      # Auth state + Trimble integration
│   └── pages/
│       ├── Login.jsx            # Login with Trimble or Email
│       └── Callback.jsx         # OAuth callback handler
```

## Modified Files

These files were updated to support Trimble ID:

1. **frontend/src/context/AuthContext.jsx**
   - Added Trimble auth integration
   - Token storage for access tokens
   - Logout integration with Trimble

2. **frontend/src/main.jsx**
   - Wrapped app with TIDProvider
   - Redirect callback handling

3. **frontend/src/pages/Login.jsx**
   - "Sign in with Trimble ID" button
   - Fallback email login for development

4. **frontend/src/App.jsx**
   - Added /callback and /logout-callback routes
   - Created Callback component

5. **frontend/.env** (New)
   - Configuration for Trimble Client ID

6. **frontend/package.json**
   - Added `@trimble-oss/trimble-id-react` dependency

## Scopes

The application requests these scopes from Trimble ID:

- `openid`: Standard OpenID Connect
- `profile`: User profile information (name, etc.)
- `email`: User email address

Customize scopes in `main.jsx` if needed:

```javascript
scopes={['openid', 'profile', 'email']}
```

## Troubleshooting

### "Client ID not configured" Message

**Problem**: App shows setup instructions instead of login

**Solution**:
1. Check `frontend/.env` exists
2. Verify `VITE_TRIMBLE_CLIENT_ID` is set to your actual Client ID
3. Restart the dev server: `npm run dev`

### Redirect to callback fails

**Problem**: Redirects to `/callback` but shows error

**Solution**:
1. Verify callback URL in Trimble Console matches exactly: `http://localhost:5173/callback`
2. Check that the Client ID is correct
3. Check browser console for detailed error messages

### "Failed to retrieve user information"

**Problem**: Login succeeds but can't retrieve user data

**Solution**:
1. Verify `openid` and `profile` scopes are configured
2. Check Trimble console logs for any errors
3. Ensure network requests are not blocked by CORS

### Token expires / "Invalid token"

**Problem**: After a while, API calls fail with invalid token error

**Solution**:
- The TIDProvider handles token refresh automatically
- Access a protected route to trigger token refresh
- Or call `getAccessTokenSilently()` to refresh explicitly

## Production Deployment

Before deploying to production:

1. Update `frontend/.env` with production Trimble credentials
2. Update callback URLs in Trimble Console:
   - **Redirect URL**: `https://yourdomain.com/callback`
   - **Logout URL**: `https://yourdomain.com/logout-callback`
3. Update `VITE_API_BASE_URL` to point to production backend
4. Build the frontend: `npm run build`
5. Deploy the dist folder

## Additional Resources

- [Trimble Developer Console](https://developer.trimble.com/console)
- [Trimble ID Documentation](https://developer.trimble.com/documentation)
- [@trimble-oss/trimble-id-react NPM Package](https://www.npmjs.com/package/@trimble-oss/trimble-id-react)
- [OAuth 2.0 with PKCE](https://tools.ietf.org/html/draft-ietf-oauth-v2-browser-based-apps)

## Support

For issues or questions:

- **Trimble Support**: cloudplatform_support@trimble.com
- **Developer Forum**: https://developer.trimble.com/forum
- **Local Development**: Use email-based login for testing
