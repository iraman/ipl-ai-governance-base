import { spawnSync } from 'child_process';

/** Run one node:test file and return Map(test name -> passed). Empty map if the file could not run. */
export function runTestFile(root, rel) {
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', rel], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  });
  const outcomes = new Map();
  for (const line of (result.stdout || '').split('\n')) {
    const m = line.match(/^\s*(not )?ok \d+ - (.+?)(\s+#\s.*)?$/);
    if (m) outcomes.set(m[2].trim(), !m[1]);
  }
  if (outcomes.size === 0) {
    console.error(`Could not read test results from ${rel}:\n${result.stderr || result.stdout}`);
  }
  return outcomes;
}
