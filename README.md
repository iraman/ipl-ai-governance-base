# ipl-ai-governance-base

Project base for AI-assisted code generation. A dummy Express app lives in `/src/`. Agent behavior is governed by versioned policies in `.ai-governance/` and the root `.cursorrules` file.

This repository is independent of Trimble WorkRide.

## Dummy app

```bash
npm install
npm run dev
```

Open **http://localhost:4000**. Health check: **http://localhost:4000/api/health**.

## Governance

| File | Purpose |
|------|---------|
| `.ai-governance/global-security-policy.md` | Security constraints for generated code |
| `.ai-governance/architectural-standards.md` | Stack, file placement, API conventions |
| `.cursorrules` | Baseline Cursor instructions that load the policies above |

Agents must read those files before generating or modifying code under `/src/`.
