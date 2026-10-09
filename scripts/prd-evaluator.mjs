#!/usr/bin/env node
/**
 * PRD evaluator (no LLM API required). Uses prd/traceability.json.
 *
 *   1. Structure: every PRD has the header and sections; a change PRD names its baseline and carrying skill.
 *   2. Traceability: every requirement's quotes still exist in the PRD, policy, and code, and its tests pass.
 *   3. Coverage: every business rule exported by backend/rules.js belongs to a requirement.
 *   4. Gaps: requirements that are not fully implemented must declare a gap; they are reported, not hidden.
 *
 * Writes test-results/prd-evaluation.json. Exits 1 on any structure problem, broken trace,
 * failing test, or untraced rule. Declared gaps do not fail the run.
 * Run: npm run prd:eval
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ROOT, evaluatePrdsStatic } from './lib/prd-checks.mjs';
import { runTestFile } from './lib/node-tests.mjs';

const result = evaluatePrdsStatic();
const testFiles = [...new Set(result.trace.requirements.flatMap((r) => (r.tests || []).map((t) => t.file)))];
const outcomes = new Map(testFiles.map((f) => [f, runTestFile(ROOT, f)]));

const requirements = result.requirements.map((r) => {
  const req = result.trace.requirements.find((x) => x.id === r.id);
  const tests = (req.tests || []).map((t) => ({ ...t, passed: outcomes.get(t.file)?.get(t.name) === true }));
  const failing = tests.filter((t) => !t.passed);
  const problems = [...r.problems, ...failing.map((t) => `test failing: "${t.name}" [${t.file}]`)];
  const status = r.status === 'gap' && !failing.length ? 'gap' : problems.length ? 'broken' : r.status;
  return { ...r, status, problems, tests, prd: req.prd?.file || null };
});

const structureProblems = [
  ...result.prds.flatMap((p) => p.problems.map((x) => `${p.file}: ${x}`)),
  ...result.plans.flatMap((p) => p.problems.map((x) => `${p.file}: ${x}`)),
  ...result.unlisted.map((f) => `${f}: not listed in prd/traceability.json`),
  ...result.duplicateIds.map((id) => `duplicate requirement id ${id}`),
  ...result.untracedRules.map((n) => `backend/rules.js exports ${n} but no requirement claims it`),
];

const count = (s) => requirements.filter((r) => r.status === s).length;
const report = {
  generatedAt: new Date().toISOString(),
  prds: result.prds.map((p) => ({ file: p.file, status: p.status, isChange: p.change.isChange, baseline: p.change.baseline, skill: p.change.skill, requirements: p.requirements, problems: p.problems })),
  plans: result.plans,
  requirements,
  structureProblems,
  summary: { traced: count('traced'), gaps: count('gap'), broken: count('broken') },
  passed: structureProblems.length === 0 && count('broken') === 0,
};

const mark = { traced: 'TRACED', gap: 'GAP   ', broken: 'BROKEN' };
console.log('PRD evaluation\n');
for (const p of report.prds) {
  const kind = p.isChange ? `change PRD on ${p.baseline}, carried by ${p.skill}` : 'baseline PRD';
  console.log(`${p.problems.length ? 'FAIL' : 'PASS'}  ${p.file}  (${p.status}, ${kind}, ${p.requirements} requirements)`);
  for (const x of p.problems) console.log(`      ${x}`);
}
for (const p of report.plans) {
  console.log(`${p.problems.length ? 'FAIL' : 'PASS'}  ${p.file}  (implementation plan for ${p.source})`);
  for (const x of p.problems) console.log(`      ${x}`);
}

console.log('\nRequirements');
for (const r of requirements) {
  const tests = r.tests.length ? `  tests ${r.tests.filter((t) => t.passed).length}/${r.tests.length}` : '';
  console.log(`${mark[r.status]}  ${r.id}  ${r.title}${tests}`);
  for (const x of r.problems) console.log(`        ${x}`);
}

const gaps = requirements.filter((r) => r.status === 'gap');
if (gaps.length) {
  console.log('\nOpen gaps (declared in prd/traceability.json)');
  for (const g of gaps) console.log(`  ${g.id}: ${g.gap}${g.plan ? `\n         Plan: prd/workride-to-implement.md "${g.plan.replace(/^#+\s*/, '')}"` : ''}`);
}
for (const x of structureProblems.filter((s) => s.includes('rules.js') || s.includes('not listed') || s.includes('duplicate'))) console.log(`\nFAIL  ${x}`);

console.log(`\n${report.summary.traced} traced, ${report.summary.gaps} open gaps, ${report.summary.broken} broken`);
mkdirSync(join(ROOT, 'test-results'), { recursive: true });
writeFileSync(join(ROOT, 'test-results', 'prd-evaluation.json'), JSON.stringify(report, null, 2));
console.log('Report: test-results/prd-evaluation.json');

if (!report.passed) {
  console.error('\nPRD evaluation failed.');
  process.exit(1);
}
console.log('\nPRD evaluation passed.');
