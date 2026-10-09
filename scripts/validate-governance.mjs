#!/usr/bin/env node
/**
 * Validates .ai-governance/ structure and required behavioral assets.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const GOV = join(ROOT, '.ai-governance');

const REQUIRED_FILES = [
  '.ai-governance/README.md',
  '.ai-governance/ADOPTION.md',
  '.ai-governance/PR_REVIEW_CHECKLIST.md',
  '.ai-governance/global-security-policy.md',
  '.ai-governance/architectural-standards.md',
  '.ai-governance/rules/architecture-guidelines.md',
  '.ai-governance/rules/trimble-id-auth.md',
  '.ai-governance/rules/booking-policies.md',
  '.ai-governance/skills/validate-booking-rules/SKILL.md',
  '.ai-governance/skills/validate-booking-rules/evals.json',
  '.ai-governance/skills/validate-chat-override/SKILL.md',
  '.ai-governance/skills/validate-chat-override/evals.json',
  '.ai-governance/prompts/pr-review-behavioral-assets.md',
  '.ai-governance/ci/promptfoo.yaml',
  '.cursor/rules/workride-agl.mdc',
  '.cursorrules',
];

const REQUIRED_DIRS = [
  '.ai-governance/rules',
  '.ai-governance/skills',
  '.ai-governance/prompts',
];

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed++;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

for (const dir of REQUIRED_DIRS) {
  const full = join(ROOT, dir);
  if (!existsSync(full) || !statSync(full).isDirectory()) {
    fail(`Missing directory ${dir}`);
  } else {
    ok(`Directory ${dir}`);
  }
}

for (const file of REQUIRED_FILES) {
  const full = join(ROOT, file);
  if (!existsSync(full)) {
    fail(`Missing file ${file}`);
  } else if (statSync(full).size === 0) {
    fail(`Empty file ${file}`);
  } else {
    ok(`File ${file}`);
  }
}

if (!existsSync(GOV)) {
  fail('.ai-governance/ root missing');
} else {
  const rules = readdirSync(join(GOV, 'rules'));
  if (rules.length < 3) {
    fail('Expected at least 3 rule files in .ai-governance/rules/');
  }
}

const manifestPath = join(ROOT, 'behavior-manifest.json');
if (!existsSync(manifestPath)) {
  fail('behavior-manifest.json missing — run npm run governance:manifest');
} else {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (!manifest.bundleHash || manifest.bundleHash.length !== 64) {
      fail('behavior-manifest.json has invalid bundleHash');
    } else {
      ok(`behavior-manifest.json bundleHash present`);
    }
  } catch (e) {
    fail(`behavior-manifest.json parse error: ${e.message}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} validation error(s)`);
  process.exit(1);
}

console.log('\nGovernance structure validation passed.');
