const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ipl-ai-governance-base' });
});

app.listen(PORT, () => {
  console.log(`AGL base app at http://localhost:${PORT}`);
});
