import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePrdsStatic, read } from '../../scripts/lib/prd-checks.mjs';

const result = evaluatePrdsStatic();

// WorkRide books seats on the four fixed office shuttle departures. A **Revision:** header may name a past mistake.
const OUT_OF_SCOPE = [/\bcabs?\b/i, /\btaxis?\b/i, /on-demand ride/i, /pickup address/i, /drop-off address/i, /door-to-door/i];
const TRIP_REASON = [/reason to ride/i, /why this trip is urgent/i, /urgent trips? still run/i, /same-day client visit/i];
const requirementsText = (file) => read(file).split('\n## Problem\n')[1] || '';

describe('PRD evaluation', () => {
  it('lists every PRD in prd/traceability.json', () => {
    assert.deepEqual(result.unlisted, [], `add to prd/traceability.json: ${result.unlisted.join(', ')}`);
  });

  it('links every implementation plan to the PRD it implements', () => {
    for (const plan of result.plans) assert.deepEqual(plan.problems, [], plan.file);
  });

  it('gives every PRD the required header and sections', () => {
    for (const prd of result.prds) {
      const own = prd.problems.filter((p) => !p.includes('skill') && !p.includes('Baseline') && !p.includes('PRD change'));
      assert.deepEqual(own, [], prd.file);
    }
  });

  it('names the baseline and a carrying skill with evals in every change PRD', () => {
    const changes = result.prds.filter((p) => p.change.isChange);
    assert.ok(changes.length > 0, 'expected at least one change PRD');
    for (const prd of changes) {
      assert.deepEqual(prd.problems, [], prd.file);
      assert.ok(prd.change.skill, prd.file);
    }
  });

  it('keeps the baseline PRD free of the changes made by change PRDs', () => {
    const baseline = read('prd/workride-prd.md');
    for (const term of ['medical_emergency', 'family_emergency', 'client_visit', 'validateUrgentOverride']) {
      assert.ok(!baseline.includes(term), `baseline PRD mentions ${term}`);
    }
  });

  it('uses unique requirement ids', () => {
    assert.deepEqual(result.duplicateIds, []);
  });

  it('traces every requirement to text that still exists in the PRD, policy, and code', () => {
    const broken = result.requirements.filter((r) => r.status === 'broken');
    assert.deepEqual(
      broken.map((r) => `${r.id}: ${r.problems.join('; ')}`),
      []
    );
  });

  it('declares a gap for every requirement without code or tests', () => {
    for (const r of result.requirements) {
      if (r.missing.length) assert.equal(r.status, 'gap', `${r.id} is missing ${r.missing.join(', ')} with no declared gap`);
    }
  });

  it('keeps the policy free of limits the plan rules out', () => {
    const policy = read('.ai-governance/rules/booking-policies.md');
    assert.ok(read('prd/workride-to-implement.md').includes('Do not add a seat cap, a waitlist, a recommended shuttle count, or a 30-day booking window.'));
    for (const term of ['5 waitlist', '30 calendar days', '2 bookings per date']) {
      assert.ok(!policy.includes(term), `booking-policies.md still states "${term}"`);
    }
  });

  it('keeps every PRD inside the shuttle-only product scope', () => {
    for (const file of result.trace.prds) {
      const text = requirementsText(file);
      for (const pattern of OUT_OF_SCOPE) {
        assert.doesNotMatch(text, pattern, `${file} describes something WorkRide does not do`);
      }
    }
  });

  it('words the chat override as the reason for the missed shuttles, not for the new trip', () => {
    const prd = requirementsText('prd/workride-chat-prd.md');
    assert.ok(prd.includes('explains why they missed the two shuttles that caused the block'), 'chat PRD');
    assert.ok(prd.includes('The reason is about the missed shuttles, not the trip being booked.'), 'chat PRD');
    assert.ok(read('.ai-governance/rules/booking-policies.md').includes('explains why they missed the two shuttles'), 'booking policy');
    assert.ok(read('frontend/src/pages/Chat.jsx').includes('Why did you miss your last two shuttles?'), 'chat bot');
    const files = ['.ai-governance/rules/booking-policies.md', '.ai-governance/skills/validate-chat-override/SKILL.md', 'frontend/src/pages/Chat.jsx', 'backend/rules.js'];
    for (const file of files) {
      for (const pattern of TRIP_REASON) assert.doesNotMatch(read(file), pattern, file);
    }
    for (const pattern of TRIP_REASON) assert.doesNotMatch(prd, pattern, 'prd/workride-chat-prd.md');
  });

  it('traces every business rule in rules.js to a requirement', () => {
    assert.deepEqual(result.untracedRules, [], 'add these rules.js exports to a requirement in prd/traceability.json');
  });
});
