# Agent governance

This directory is the source of truth for AI behavioral policies. Cursor loads a baseline pointer from the repository-root `.cursorrules` file.

## Files

| File | Purpose |
|------|---------|
| `global-security-policy.md` | Security constraints for generated or modified code |
| `architectural-standards.md` | Stack, file placement, and API conventions |

## How agents should use this folder

1. Read `.cursorrules` (always apply).
2. Read both policy files before generating or changing code under `/src/`.
3. Keep generated application code inside `/src/`. Do not invent a parallel app tree.

Policies here apply only to this repository. Product-specific rules for other apps (for example Trimble WorkRide) live in those repositories.
