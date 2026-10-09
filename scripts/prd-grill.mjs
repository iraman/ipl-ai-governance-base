#!/usr/bin/env node
/**
 * PRD grill (no LLM API required). Uses prd/questions.json and prd/traceability.json.
 *
 * Prints the next open question for a PRD gap, with its options, so the agent asks one
 * question at a time. --all lists every question and its status.
 *
 * Exits 1 if an open gap has no question, a question is malformed, or an answer does not
 * record who decided, when, and what changes.
 * Run: npm run prd:grill
 */

import { evaluateQuestions } from './lib/grill-checks.mjs';
import { loadTraceability } from './lib/prd-checks.mjs';

const result = evaluateQuestions();
const trace = loadTraceability();
const showAll = process.argv.includes('--all');

const problems = [
  ...result.unaskedGaps.map((id) => `${id} has an open gap but no question in prd/questions.json`),
  ...result.duplicateIds.map((id) => `duplicate question id ${id}`),
  ...result.questions.flatMap((q) => q.problems.map((p) => `${q.id}: ${p}`)),
];

const answered = result.questions.filter((q) => q.status === 'answered');
console.log('PRD grill\n');
console.log(`${result.open.length} open, ${answered.length} answered\n`);

const q = result.next;
if (q) {
  const req = trace.requirements.find((r) => r.id === q.requirement);
  console.log(`Next question (${q.id}, ask the ${q.owner})`);
  console.log(`  ${q.question}`);
  q.options.forEach((o, i) => console.log(`    ${i + 1}. ${o}`));
  console.log(`  Why it matters: ${req?.gap || ''}`);
  console.log('  Record the answer in prd/questions.json: status, answer, decidedBy, decidedOn, action.');
} else {
  console.log('No open questions.');
}

if (showAll) {
  console.log('\nAll questions');
  for (const x of result.questions) {
    const tail = x.status === 'answered' ? `  → ${x.answer} (${x.decidedBy}, ${x.decidedOn})` : '';
    console.log(`  ${x.status === 'open' ? 'OPEN    ' : 'ANSWERED'}  P${x.priority}  ${x.id}  ${x.owner}${tail}`);
  }
}

if (problems.length) {
  console.error('\nPRD grill failed:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
