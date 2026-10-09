import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const pkg = (rel) => JSON.parse(read(rel));
const deps = (rel) => {
  const p = pkg(rel);
  return Object.keys({ ...(p.dependencies || {}), ...(p.devDependencies || {}) });
};

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(jsx?|tsx?)$/.test(entry)) out.push(rel);
  }
  return out;
}

const DATABASE_PACKAGES = ['pg', 'mysql', 'mysql2', 'mongodb', 'mongoose', 'sequelize', 'prisma', '@prisma/client', 'sqlite3', 'better-sqlite3', 'typeorm', 'knex', 'redis'];
const HEAVY_FRAMEWORKS = ['@nestjs/core', 'redux', '@reduxjs/toolkit', 'mobx', 'next', 'axios'];

describe('architecture', () => {
  it('calls the API from the frontend only through api.js', () => {
    const offenders = sourceFiles('frontend/src')
      .filter((f) => f !== 'frontend/src/api.js')
      .filter((f) => /\bfetch\(|XMLHttpRequest|axios/.test(read(f)));
    assert.deepEqual(offenders, [], 'move these HTTP calls into frontend/src/api.js');
  });

  it('keeps the JSON store with no database package', () => {
    const found = ['package.json', 'backend/package.json'].flatMap((f) => deps(f).filter((d) => DATABASE_PACKAGES.includes(d)).map((d) => `${f}: ${d}`));
    assert.deepEqual(found, [], 'a database needs an approved architecture change');
    assert.ok(read('backend/store.js').includes('store.json'), 'backend/store.js must persist to the JSON store');
  });

  it('adds no heavyweight framework without an architecture change', () => {
    const found = ['package.json', 'backend/package.json', 'frontend/package.json'].flatMap((f) =>
      deps(f).filter((d) => HEAVY_FRAMEWORKS.includes(d)).map((d) => `${f}: ${d}`)
    );
    assert.deepEqual(found, []);
  });

  it('keeps booking rules in rules.js, not in route handlers', () => {
    const server = read('backend/server.js');
    for (const pattern of ['setHours(', 'getDay()', 'PUBLIC_HOLIDAYS', "'20:00'", "'15:00'", '60 * 60 * 1000', 'medical_emergency']) {
      assert.ok(!server.includes(pattern), `backend/server.js contains "${pattern}"; move the rule into backend/rules.js`);
    }
    assert.ok(server.includes("require('./rules')"));
  });

  it('restricts CORS to known origins', () => {
    const server = read('backend/server.js');
    assert.ok(/app\.use\(cors\(\{\s*origin: allowedOrigins/.test(server), 'CORS must use the allowedOrigins list');
    assert.ok(!/origin:\s*['"]\*['"]/.test(server), 'CORS must not allow every origin');
  });

  it('keeps one app tree: frontend, backend, and the src placeholder', () => {
    const extra = ['app', 'server', 'api', 'client', 'web'].filter((d) => existsSync(join(ROOT, d)));
    assert.deepEqual(extra, [], 'do not create a third app tree');
  });

  it('routes every page in frontend/src/pages from App.jsx', () => {
    const app = read('frontend/src/App.jsx');
    const pages = readdirSync(join(ROOT, 'frontend/src/pages')).filter((f) => f.endsWith('.jsx'));
    const unrouted = pages.map((f) => f.replace('.jsx', '')).filter((name) => !app.includes(`./pages/${name}`));
    assert.deepEqual(unrouted, []);
  });

  it('returns errors as { error: string }', () => {
    const server = read('backend/server.js');
    const bodies = [...server.matchAll(/res\.status\((?:4|5)\d\d\)\.json\(\{\s*(\w+)/g)].map((m) => m[1]);
    assert.ok(bodies.length > 0);
    assert.deepEqual([...new Set(bodies)].filter((k) => k !== 'error'), [], relative(ROOT, 'backend/server.js'));
  });
});
