# Tests

Backend uses Node’s built-in test runner and Supertest. Frontend uses Playwright.

## Install

From the repository root:

```bash
npm install
npx playwright install chromium
cd backend && npm install
cd ../frontend && npm install
```

## Run

```bash
npm test                 # backend + Playwright
npm run test:backend     # API and booking-rule tests
npm run test:frontend    # Playwright UI tests
```

Playwright starts an isolated backend on port **3101** and Vite on **5174** so local `3001` / `5173` servers are left alone. It writes a throwaway store to `test/fixtures/e2e-store.json`.
