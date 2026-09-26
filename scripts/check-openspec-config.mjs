#!/usr/bin/env node
// Release check: can the OpenSpec CLI actually read openspec/config.yaml?
//
// The config carries the per-artifact rules every change is drafted against. When
// it cannot be parsed the CLI prints a warning and carries on with defaults, so
// the only symptom is rules quietly not applying — to artifacts nobody is
// comparing against the rules. That shipped once (13.0.0: an unquoted colon-space
// inside a plain scalar starts a mapping key) and went unnoticed through a whole
// release, which is why this check exists.
//
// It asks the CLI rather than parsing YAML here: no dependency enters the repo,
// and the check agrees with the parser that actually matters by construction. A
// hand-rolled parser could accept a file the CLI rejects, which would be a check
// that lies.
//
// Owner: .claude/rules/payload.md — the release ritual. Run it beside
// scripts/check-payload-links.mjs on every payload change.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseCli } from './lib-cli.mjs';

parseCli({ usage: 'usage: check-openspec-config.mjs  (run from the repo root)' });
const root = process.cwd();
const candidates = ['openspec/config.yaml', 'openspec/config.yml'];
const configPath = candidates.find((p) => existsSync(join(root, p)));

if (!configPath) {
  console.log('openspec config: no openspec/config.yaml — nothing to check');
  process.exit(0);
}

// `context` is read-only, needs no active change, and does read the config.
// `list` does NOT read it — asking the wrong command is how this check first
// shipped passing a file the parser rejected.
const run = spawnSync('openspec', ['context', '--json'], { cwd: root, encoding: 'utf8' });

if (run.error && run.error.code === 'ENOENT') {
  console.log('openspec config: the openspec CLI is not installed — skipped');
  process.exit(0);
}

const output = `${run.stdout || ''}${run.stderr || ''}`;
const complaint = output
  .split('\n')
  .find((line) => /could not parse|failed to parse/i.test(line) && /config\.ya?ml/i.test(line));

if (complaint) {
  console.error(`FAIL  ${configPath} — the OpenSpec CLI cannot read it, so every per-artifact rule is being ignored.`);
  console.error(`      ${complaint.trim()}`);
  console.error('');
  console.error('      Most often an unquoted scalar containing ": " — YAML reads that as a mapping key.');
  console.error('      Rephrase the line (an em dash instead of the colon) or quote the whole scalar.');
  process.exit(1);
}

// A crash or a non-zero exit without a JSON answer proves nothing about the
// config. Passing it would be the check that lies, so it fails.
if (run.status !== 0 && !isJson(run.stdout || '')) {
  console.error(`FAIL  \`openspec context --json\` exited ${run.status ?? run.signal} without JSON — cannot confirm ${configPath} parses.`);
  if (output.trim()) console.error(`      ${output.trim().split('\n')[0]}`);
  process.exit(1);
}

console.log(`openspec config: ${configPath} parses — per-artifact rules are in effect.`);

function isJson(text) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}
