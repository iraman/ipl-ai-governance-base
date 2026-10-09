import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkQuestion, evaluateQuestions, nextQuestion } from '../../scripts/lib/grill-checks.mjs';
import { loadTraceability } from '../../scripts/lib/prd-checks.mjs';

const result = evaluateQuestions();
const trace = loadTraceability();
const problemsOf = (pattern) =>
  result.questions.flatMap((q) => q.problems.filter((p) => pattern.test(p)).map((p) => `${q.id}: ${p}`));

describe('PRD grill', () => {
  it('asks a question for every open PRD gap', () => {
    assert.deepEqual(result.unaskedGaps, [], 'add a question to prd/questions.json for each of these gaps');
  });

  it('asks only about requirements that exist and still have a gap', () => {
    assert.deepEqual(problemsOf(/not in prd\/traceability|has no open gap/), []);
  });

  it('uses unique question ids', () => {
    assert.deepEqual(result.duplicateIds, []);
  });

  it('asks one question with at least two options and a named owner', () => {
    assert.deepEqual(problemsOf(/id must|question must|at least two options|owner must|priority must|status must/), []);
  });

  it('offers no option the security policy rules out', () => {
    assert.deepEqual(problemsOf(/security policy/), []);
    const bad = { ...result.open[0], options: ['Keep email login in production', 'Store the token in localStorage'] };
    assert.equal(checkQuestion(bad, trace).filter((p) => p.includes('security policy')).length, 2);
  });

  it('records who decided, when, and what changes for every answered question', () => {
    assert.deepEqual(problemsOf(/answered question/), []);
    const open = result.open[0];
    const incomplete = { ...open, status: 'answered', answer: 'One per block' };
    const problems = checkQuestion(incomplete, trace);
    for (const field of ['decidedBy', 'decidedOn', 'action']) assert.ok(problems.some((p) => p.includes(field)), field);
  });

  it('asks the highest-priority open question first', () => {
    const next = nextQuestion(result.questions);
    assert.ok(next, 'expected an open question');
    assert.equal(next.status, 'open');
    for (const q of result.open) assert.ok(next.priority <= q.priority, `${q.id} has a higher priority than ${next.id}`);
  });
});
