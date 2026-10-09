/**
 * Static PRD checks shared by scripts/prd-evaluator.mjs and test/governance/prd.test.mjs.
 * Source of truth for requirements: prd/traceability.json.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const HEADER_FIELDS = ['Status', 'Date', 'Product', 'Audience'];
export const STATUSES = ['Draft', 'Agreed'];
export const SECTIONS = ['## Problem', '## Solution', '## Impact', '## Terms'];

export function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

export function loadTraceability() {
  return JSON.parse(read('prd/traceability.json'));
}

export function listPrdFiles() {
  return readdirSync(join(ROOT, 'prd'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => `prd/${f}`)
    .sort();
}

function headerValue(text, field) {
  const m = text.match(new RegExp(`^\\*\\*${field}:\\*\\*\\s*(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

/** Structure of one PRD: header fields, sections, and for a change PRD its baseline and carrying skill. */
export function checkPrdStructure(file) {
  const problems = [];
  const text = read(file);
  if (!/^# PRD: .+/m.test(text)) problems.push('title must start with "# PRD: "');
  for (const field of HEADER_FIELDS) {
    if (!headerValue(text, field)) problems.push(`missing header **${field}:**`);
  }
  const status = headerValue(text, 'Status');
  if (status && !STATUSES.includes(status)) problems.push(`Status must be ${STATUSES.join(' or ')}, not "${status}"`);
  const date = headerValue(text, 'Date');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push(`Date must be YYYY-MM-DD, not "${date}"`);
  for (const section of SECTIONS) {
    if (!text.includes(`\n${section}\n`)) problems.push(`missing section "${section}"`);
  }

  const baseline = headerValue(text, 'Baseline');
  const change = { isChange: Boolean(baseline), baseline: null, skill: null, section: null };
  if (baseline) {
    const link = baseline.match(/\]\(\.\/([^)]+)\)/);
    change.baseline = link ? `prd/${link[1]}` : null;
    if (!change.baseline) problems.push('Baseline must link to the baseline PRD, e.g. [workride-prd.md](./workride-prd.md)');
    else if (!existsSync(join(ROOT, change.baseline))) problems.push(`Baseline ${change.baseline} does not exist`);

    const skill = text.match(/`(\.ai-governance\/skills\/[^/`]+)\/SKILL\.md`/);
    change.skill = skill ? skill[1] : null;
    if (!change.skill) problems.push('a change PRD must name the skill that carries it (`.ai-governance/skills/<name>/SKILL.md`)');
    else {
      if (!existsSync(join(ROOT, change.skill, 'SKILL.md'))) problems.push(`${change.skill}/SKILL.md does not exist`);
      if (!existsSync(join(ROOT, change.skill, 'evals.json'))) problems.push(`${change.skill}/evals.json does not exist`);
    }

    const section = text.match(/\*\*(PRD change — [^*]+)\*\*/);
    change.section = section ? section[1] : null;
    if (!change.section) problems.push('a change PRD must name its "PRD change — …" section in the skill');
    else if (change.skill && existsSync(join(ROOT, change.skill, 'SKILL.md'))) {
      if (!read(`${change.skill}/SKILL.md`).includes(`## ${change.section}`)) {
        problems.push(`${change.skill}/SKILL.md has no "## ${change.section}" section`);
      }
    }
  }
  return { file, status, date, change, problems };
}

function quoteProblem(label, ref) {
  if (!existsSync(join(ROOT, ref.file))) return `${label} file ${ref.file} does not exist`;
  if (!read(ref.file).includes(ref.quote)) return `${label} ${ref.file} no longer contains "${ref.quote}"`;
  return null;
}

/** Names of node:test cases declared in a file (it('...') / test('...')). */
export function declaredTests(file) {
  if (!existsSync(join(ROOT, file))) return new Set();
  const names = new Set();
  for (const m of read(file).matchAll(/\b(?:it|test)\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) names.add(m[2].replace(/\\(.)/g, '$1'));
  return names;
}

/**
 * One requirement: every quote must still exist. Without a declared gap it also needs a PRD quote, code, and tests.
 * Returns { id, title, status: 'traced' | 'gap' | 'broken', problems, missing }.
 */
export function checkRequirement(req) {
  const problems = [];
  const missing = [];
  if (req.prd) {
    const p = quoteProblem('PRD', req.prd);
    if (p) problems.push(p);
  } else missing.push('PRD statement');
  if (req.policy) {
    const p = quoteProblem('policy', req.policy);
    if (p) problems.push(p);
  }
  for (const ref of req.code || []) {
    const p = quoteProblem('code', ref);
    if (p) problems.push(p);
  }
  if (!(req.code || []).length) missing.push('code');
  if (req.plan) {
    const p = quoteProblem('plan', req.plan);
    if (p) problems.push(p);
  }
  for (const t of req.tests || []) {
    if (!declaredTests(t.file).has(t.name)) problems.push(`test "${t.name}" not found in ${t.file}`);
  }
  if (!(req.tests || []).length) missing.push('tests');

  if (req.gap) {
    return { id: req.id, title: req.title, status: problems.length ? 'broken' : 'gap', problems, missing, gap: req.gap, plan: req.plan?.quote };
  }
  for (const m of missing) problems.push(`no ${m} and no declared gap`);
  return { id: req.id, title: req.title, status: problems.length ? 'broken' : 'traced', problems, missing };
}

/** Business rules exported by backend/rules.js that no requirement claims. */
export function untracedRules(trace) {
  const require = createRequire(import.meta.url);
  const rules = require(join(ROOT, 'backend', 'rules.js'));
  const claimed = new Set([...(trace.ruleHelpers || []), ...trace.requirements.flatMap((r) => r.rules || [])]);
  return Object.keys(rules).filter((name) => !claimed.has(name));
}

/** An implementation plan derived from a PRD: needs a title, a Source link to an existing PRD, and a Date. */
export function checkPlanStructure(file) {
  const problems = [];
  const text = read(file);
  if (!/^# .+/m.test(text)) problems.push('missing title');
  const source = headerValue(text, 'Source');
  const link = source?.match(/\]\(\.\/([^)]+)\)/);
  if (!link) problems.push('missing **Source:** link to the PRD it implements');
  else if (!existsSync(join(ROOT, 'prd', link[1]))) problems.push(`Source prd/${link[1]} does not exist`);
  if (!headerValue(text, 'Date')) problems.push('missing header **Date:**');
  return { file, source: link ? `prd/${link[1]}` : null, problems };
}

export function evaluatePrdsStatic() {
  const trace = loadTraceability();
  const files = listPrdFiles();
  const plans = (trace.plans || []).map((file) =>
    existsSync(join(ROOT, file)) ? checkPlanStructure(file) : { file, problems: ['listed in traceability.json but missing'] }
  );
  const unlisted = files.filter((f) => !trace.prds.includes(f) && !(trace.plans || []).includes(f));
  const prds = trace.prds.map((file) => {
    if (!existsSync(join(ROOT, file))) return { file, problems: ['listed in traceability.json but missing'], change: {} };
    const structure = checkPrdStructure(file);
    const count = trace.requirements.filter((r) => r.prd?.file === file).length;
    if (count === 0) structure.problems.push('no requirement in traceability.json quotes this PRD');
    return { ...structure, requirements: count };
  });
  const ids = trace.requirements.map((r) => r.id);
  const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  const requirements = trace.requirements.map(checkRequirement);
  return { trace, prds, plans, unlisted, duplicateIds, requirements, untracedRules: untracedRules(trace) };
}
