/**
 * Checks for prd/questions.json, shared by scripts/prd-grill.mjs and test/governance/grill.test.mjs.
 * Every open gap in prd/traceability.json needs a question; every answer records who decided, when, and what changes.
 */

import { loadTraceability, read } from './prd-checks.mjs';

export const STATUSES = ['open', 'answered'];
export const OWNERS = ['Product owner', 'Security', 'HR', 'Facilities', 'Architecture'];
export const FORBIDDEN_OPTIONS = ['localStorage', 'sessionStorage', 'email login in production', 'skip the check', 'ignore the policy'];

export function loadQuestions() {
  return JSON.parse(read('prd/questions.json')).questions;
}

export function gapIds(trace = loadTraceability()) {
  return trace.requirements.filter((r) => r.gap).map((r) => r.id);
}

/** Open questions ordered by priority, then id. The first one is the next question to ask. */
export function openQuestions(questions = loadQuestions()) {
  return questions
    .filter((q) => q.status === 'open')
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

export function nextQuestion(questions = loadQuestions()) {
  return openQuestions(questions)[0] || null;
}

/** Problems with one question, independent of the others. */
export function checkQuestion(q, trace = loadTraceability()) {
  const problems = [];
  const req = trace.requirements.find((r) => r.id === q.requirement);
  if (!/^Q-[A-Z]+-\d+$/.test(q.id || '')) problems.push('id must look like Q-REQ-07');
  if (!req) problems.push(`requirement ${q.requirement} is not in prd/traceability.json`);
  if (!STATUSES.includes(q.status)) problems.push(`status must be ${STATUSES.join(' or ')}`);
  if (!OWNERS.includes(q.owner)) problems.push(`owner must be one of ${OWNERS.join(', ')}`);
  if (!Number.isInteger(q.priority) || q.priority < 1) problems.push('priority must be a whole number from 1');
  if (typeof q.question !== 'string' || !q.question.trim().endsWith('?')) problems.push('question must be one sentence ending in "?"');
  if (!Array.isArray(q.options) || q.options.length < 2) problems.push('needs at least two options');
  for (const o of q.options || []) {
    for (const term of FORBIDDEN_OPTIONS) {
      if (o.toLowerCase().includes(term.toLowerCase())) problems.push(`option "${o}" offers something the security policy rules out`);
    }
  }
  if (q.status === 'open' && req && !req.gap) problems.push(`${q.requirement} has no open gap; answer or remove this question`);
  if (q.status === 'answered') {
    if (!q.answer) problems.push('answered question needs "answer"');
    if (!q.decidedBy) problems.push('answered question needs "decidedBy"');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(q.decidedOn || '')) problems.push('answered question needs "decidedOn" as YYYY-MM-DD');
    if (!q.action) problems.push('answered question needs "action": the PRD, traceability, or code change it leads to');
  }
  return problems;
}

export function evaluateQuestions() {
  const trace = loadTraceability();
  const questions = loadQuestions();
  const ids = questions.map((q) => q.id);
  const asked = new Set(questions.map((q) => q.requirement));
  return {
    questions: questions.map((q) => ({ ...q, problems: checkQuestion(q, trace) })),
    duplicateIds: ids.filter((id, i) => ids.indexOf(id) !== i),
    unaskedGaps: gapIds(trace).filter((id) => !asked.has(id)),
    open: openQuestions(questions),
    next: nextQuestion(questions),
  };
}
