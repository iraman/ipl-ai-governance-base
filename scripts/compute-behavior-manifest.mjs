#!/usr/bin/env node
/**
 * Computes SHA-256 hash of all .ai-governance/ assets and writes behavior-manifest.json.
 * Run after changing rules, skills, or prompts: npm run governance:manifest
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const GOVERNANCE_DIR = join(ROOT, '.ai-governance');
const MANIFEST_PATH = join(ROOT, 'behavior-manifest.json');

function collectFiles(dir, base = dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...collectFiles(full, base));
    } else if (!entry.endsWith('.DS_Store')) {
      files.push(full);
    }
  }
  return files.sort();
}

function computeBundleHash(files) {
  const hash = createHash('sha256');
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const content = readFileSync(file);
    hash.update(rel);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }
  return hash.digest('hex');
}

const files = collectFiles(GOVERNANCE_DIR);
const bundleHash = computeBundleHash(files);
const fileEntries = files.map((f) => ({
  path: relative(ROOT, f).replace(/\\/g, '/'),
  sha256: createHash('sha256').update(readFileSync(f)).digest('hex'),
}));

const manifest = {
  version: 1,
  framework: 'AGL',
  project: 'trimble-workride',
  generatedAt: new Date().toISOString(),
  bundleHash,
  files: fileEntries,
  usage: 'Reference bundleHash in PRs as AGL-MANIFEST when AI-generated code depends on this rule set.',
};

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(`behavior-manifest.json updated`);
console.log(`AGL-MANIFEST: ${bundleHash}`);
console.log(`Files hashed: ${fileEntries.length}`);
