#!/usr/bin/env node
// Release check: can the OpenSpec CLI read openspec/config.yaml? An unreadable config silently drops every rule.
// It asks the CLI, so it agrees with the parser that matters. Owner: .claude/rules/payload.md

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

// `context` is read-only, needs no active change, and reads the config.
// `list` does NOT read it, so asking `list` would pass a file the parser rejects.
const run = spawnSync('openspec', ['context', '--json'], { cwd: root, encoding: 'utf8' });

if (run.error && run.error.code === 'ENOENT') {
  console.log('openspec config: the openspec CLI is not installed — skipped');
  process.exit(0);
}

const output = `${run.stdout || ''}${run.stderr || ''}`;
const answer = parseJson(run.stdout || '');
// Three ways the CLI says it could not use the config: an older CLI's parse warning, a warning that it is
// ignoring part of it, and 1.13's error in the JSON status.
const complaint =
  output
    .split('\n')
    .find((line) => (/could not parse|failed to parse/i.test(line) && /config\.ya?ml/i.test(line)) || /\bignoring\b/i.test(line)) ??
  answer?.status?.find?.((entry) => entry?.severity === 'error')?.message;

if (complaint) {
  console.error(`FAIL  ${configPath} — the OpenSpec CLI cannot read it, so every per-artifact rule is being ignored.`);
  console.error(`      ${complaint.trim()}`);
  console.error('');
  console.error('      Most often an unquoted scalar containing ": " — YAML reads that as a mapping key.');
  console.error('      Rephrase the line (an em dash instead of the colon) or quote the whole scalar.');
  process.exit(1);
}

// A crash, or any exit without a JSON answer, proves nothing about the config.
// Passing it would be the check that lies, so it fails.
if (answer === undefined) {
  console.error(`FAIL  \`openspec context --json\` exited ${run.status ?? run.signal} without JSON — cannot confirm ${configPath} parses.`);
  if (output.trim()) console.error(`      ${output.trim().split('\n')[0]}`);
  process.exit(1);
}

console.log(`openspec config: ${configPath} parses — per-artifact rules are in effect.`);

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
