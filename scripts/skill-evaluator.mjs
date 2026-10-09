#!/usr/bin/env node
/**
 * Skill evaluator for AGL behavioral assets (no LLM API required).
 *
 * For every skill in .ai-governance/skills/<name>/:
 *   1. Lifecycle: SKILL.md frontmatter and required sections, evals.json present and well formed.
 *   2. Tests: run the node:test cases the skill owns and report pass, fail, or missing.
 *   3. Assets: check the policy, PRD, and source files the skill depends on.
 *
 * Writes test-results/skill-evaluation.json and exits 1 if any skill fails.
 * Run: npm run skills:eval
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { runTestFile as runTests } from './lib/node-tests.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SKILLS_DIR = join(ROOT, '.ai-governance', 'skills');
const REPORT_PATH = join(ROOT, 'test-results', 'skill-evaluation.json');
const BASE_TEST_FILES = ['test/backend/rules.test.js', 'test/backend/api.test.js'];
const SUITE_NAMES = new Set(['WorkRide API', 'booking rules', 'PRD evaluation', 'PRD grill', 'architecture']);
const REQUIRED_SECTIONS = ['## When to use', '## Procedure', '## Output checklist', '## Evaluation', '## Do not'];

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return fields;
}

function evaluateLifecycle(name, dir) {
  const checks = [];
  const add = (description, passed, detail = '') => checks.push({ description, passed, detail });

  const skillPath = join(dir, 'SKILL.md');
  if (!existsSync(skillPath)) {
    add('SKILL.md exists', false, 'missing');
    return { checks, evals: null };
  }
  const skillText = readFileSync(skillPath, 'utf8');
  const fm = parseFrontmatter(skillText);
  add('SKILL.md has frontmatter', Boolean(fm));
  add('Frontmatter name matches folder', fm?.name === name, fm?.name ? `name: ${fm.name}` : 'no name');
  add('Frontmatter has a description', Boolean(fm?.description));
  for (const section of REQUIRED_SECTIONS) {
    add(`SKILL.md has "${section}"`, skillText.includes(section));
  }

  const evalsPath = join(dir, 'evals.json');
  if (!existsSync(evalsPath)) {
    add('evals.json exists', false, 'missing');
    return { checks, evals: null };
  }
  let evals = null;
  try {
    evals = JSON.parse(readFileSync(evalsPath, 'utf8'));
    add('evals.json parses', true);
  } catch (e) {
    add('evals.json parses', false, e.message);
    return { checks, evals: null };
  }
  add('evals.json names this skill', evals.skill === name, `skill: ${evals.skill}`);
  add('evals.json lists at least one test', Array.isArray(evals.tests) && evals.tests.length > 0);
  return { checks, evals };
}

function evaluateAssets(assets = []) {
  const checks = [];
  for (const asset of assets) {
    if (!existsSync(join(ROOT, asset.file))) {
      checks.push({ description: asset.description, file: asset.file, passed: false, detail: 'file missing' });
      continue;
    }
    const text = read(asset.file);
    const missing = (asset.contains || []).filter((p) => !text.includes(p));
    const forbidden = (asset.notContains || []).filter((p) => text.toLowerCase().includes(p.toLowerCase()));
    const problems = [
      ...missing.map((p) => `missing "${p}"`),
      ...forbidden.map((p) => `must not contain "${p}"`),
    ];
    checks.push({ description: asset.description, file: asset.file, passed: problems.length === 0, detail: problems.join('; ') });
  }
  return checks;
}

const skillNames = existsSync(SKILLS_DIR)
  ? readdirSync(SKILLS_DIR).filter((n) => statSync(join(SKILLS_DIR, n)).isDirectory()).sort()
  : [];

if (skillNames.length === 0) {
  console.error('FAIL: no skills found in .ai-governance/skills/');
  process.exit(1);
}

const evaluated = skillNames.map((name) => ({ name, ...evaluateLifecycle(name, join(SKILLS_DIR, name)) }));
const testFiles = [...new Set([...BASE_TEST_FILES, ...evaluated.flatMap((s) => (s.evals?.tests || []).map((t) => t.file))])].filter(
  (f) => existsSync(join(ROOT, f))
);
const outcomesByFile = new Map(testFiles.map((f) => [f, runTests(ROOT, f)]));
const owned = new Set();
const report = { generatedAt: new Date().toISOString(), skills: [], unownedTests: [], passed: true };

for (const { name, checks: lifecycle, evals } of evaluated) {
  const tests = (evals?.tests || []).map((t) => {
    owned.add(`${t.file}::${t.name}`);
    const outcomes = outcomesByFile.get(t.file);
    if (!outcomes) return { ...t, status: 'missing', detail: 'test file is not run by the evaluator' };
    if (!outcomes.has(t.name)) return { ...t, status: 'missing', detail: 'no test with this name' };
    return { ...t, status: outcomes.get(t.name) ? 'pass' : 'fail' };
  });
  const assets = evaluateAssets(evals?.assets);
  const passed = lifecycle.every((c) => c.passed) && tests.every((t) => t.status === 'pass') && assets.every((a) => a.passed);
  report.skills.push({ skill: name, passed, lifecycle, tests, assets });
  if (!passed) report.passed = false;
}

for (const [file, outcomes] of outcomesByFile) {
  for (const testName of outcomes.keys()) {
    if (!SUITE_NAMES.has(testName) && !owned.has(`${file}::${testName}`)) report.unownedTests.push({ file, name: testName });
  }
}

const mark = (ok) => (ok ? 'PASS' : 'FAIL');
console.log('Skill evaluation\n');
for (const s of report.skills) {
  const testsPassed = s.tests.filter((t) => t.status === 'pass').length;
  const assetsPassed = s.assets.filter((a) => a.passed).length;
  const lifecyclePassed = s.lifecycle.filter((c) => c.passed).length;
  console.log(`${mark(s.passed)}  ${s.skill}`);
  console.log(`      lifecycle ${lifecyclePassed}/${s.lifecycle.length}   tests ${testsPassed}/${s.tests.length}   assets ${assetsPassed}/${s.assets.length}`);
  for (const c of s.lifecycle.filter((x) => !x.passed)) console.log(`      FAIL lifecycle: ${c.description}${c.detail ? ` (${c.detail})` : ''}`);
  for (const t of s.tests.filter((x) => x.status !== 'pass')) console.log(`      ${t.status.toUpperCase()} test: ${t.name} [${t.file}]${t.detail ? ` (${t.detail})` : ''}`);
  for (const a of s.assets.filter((x) => !x.passed)) console.log(`      FAIL asset: ${a.description} [${a.file}] ${a.detail}`);
}

if (report.unownedTests.length) {
  console.log(`\nTests not owned by any skill (${report.unownedTests.length}):`);
  for (const t of report.unownedTests) console.log(`  - ${t.name} [${t.file}]`);
}

mkdirSync(join(ROOT, 'test-results'), { recursive: true });
writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
console.log(`\nReport: test-results/skill-evaluation.json`);

if (!report.passed) {
  console.error('\nSkill evaluation failed.');
  process.exit(1);
}
console.log('\nAll skills passed.');
