#!/usr/bin/env node
/**
 * Static policy regression tests for behavioral assets (no LLM API required).
 * Simulates CI guardrails described in the AGL framework.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

let failed = 0;

function assertContains(rel, patterns, label) {
  const text = read(rel);
  for (const p of patterns) {
    if (!text.includes(p)) {
      console.error(`FAIL [${label}]: ${rel} must contain "${p}"`);
      failed++;
    }
  }
}

function assertNotContains(rel, patterns, label) {
  const text = read(rel);
  for (const p of patterns) {
    if (text.toLowerCase().includes(p.toLowerCase())) {
      console.error(`FAIL [${label}]: ${rel} must NOT contain "${p}"`);
      failed++;
    }
  }
}

// Trimble ID auth policy
assertContains(
  '.ai-governance/rules/trimble-id-auth.md',
  ['Trimble ID', 'OAuth', 'TRIMBLE_ID_SETUP.md', 'localStorage'],
  'auth-required-terms'
);
assertNotContains(
  '.ai-governance/rules/trimble-id-auth.md',
  ['use custom jwt for production', 'skip authentication in production'],
  'auth-forbidden-phrases'
);

// Booking policy alignment with rules.js
assertContains(
  '.ai-governance/rules/booking-policies.md',
  ['8:00 PM', '3:00 PM', '1 hour', '2 consecutive', 'backend/rules.js'],
  'booking-required-terms'
);

const rulesJs = read('backend/rules.js');
assertContains(
  '.ai-governance/rules/booking-policies.md',
  ['canCancel', 'isUserBlocked'],
  'booking-implementation-refs'
);

if (!rulesJs.includes('20, 0, 0, 0')) {
  console.error('FAIL: backend/rules.js morning cutoff (8 PM) may have changed — update booking-policies.md');
  failed++;
}

// Architecture
assertContains(
  '.ai-governance/rules/architecture-guidelines.md',
  ['Express', 'React', 'backend/rules.js', 'api.js'],
  'architecture-required-terms'
);

// Skill references governance
assertContains(
  '.ai-governance/skills/validate-booking-rules/SKILL.md',
  ['booking-policies.md', 'backend/rules.js', 'canCancel'],
  'skill-alignment'
);

// Cursor rule points to governance
assertContains(
  '.cursor/rules/workride-agl.mdc',
  ['.ai-governance', 'trimble-id-auth', 'booking-policies'],
  'cursor-rule-bridge'
);

if (failed > 0) {
  console.error(`\n${failed} regression test(s) failed`);
  process.exit(1);
}

console.log('All governance regression tests passed.');
