// The comment-length lint rule, run through the real oxlint on small samples.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import plugin, { commentRuns } from '../lint-comment-length.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const rule = resolve(here, '../lint-comment-length.mjs');
const oxlint = join(here, 'node_modules/.bin/oxlint');
const LINES = 'comment-length(max-comment-lines)';
const WIDTH = 'comment-length(max-comment-width)';
const wide = (width, start = '// ') => start + 'x'.repeat(width - start.length);
const CODE = 'console.log(1);\n';

// Each never-counted comment is over 120 wide and sits under a two-line note: counted, it would fail both rules.
const PAD = 'x'.repeat(130);
const toolRead = line => `// first line of a note\n// second line of a note\n${line}\n${CODE}`;
const TOOL_READ = {
  'tool/vitest-environment.mjs': toolRead(`// @vitest-environment jsdom ${PAD}`),
  'tool/reference.ts': toolRead(`/// <reference types="node" /> ${PAD}`),
  'tool/ts-expect-error.ts': toolRead(`// @ts-expect-error ${PAD}`),
  'tool/ts-ignore.ts': toolRead(`// @ts-ignore ${PAD}`),
  'tool/ts-nocheck.ts': toolRead(`// @ts-nocheck ${PAD}`),
  'tool/oxlint-disable.mjs': toolRead(`// oxlint-disable-next-line no-console -- ${PAD}`),
  'tool/eslint-disable.mjs': toolRead(`/* eslint-disable no-console -- ${PAD} */`),
  'tool/v8-ignore.mjs': toolRead(`/* v8 ignore next ${PAD} */`),
  'tool/c8-ignore.mjs': toolRead(`/* c8 ignore next ${PAD} */`),
  'tool/istanbul-ignore.mjs': toolRead(`/* istanbul ignore next ${PAD} */`),
  'tool/jscpd-ignore.mjs': toolRead(`// jscpd:ignore-start ${PAD}`),
  'tool/prettier-ignore.mjs': toolRead(`// prettier-ignore ${PAD}`),
  'tool/shebang.mjs': `#!/usr/bin/env node ${PAD}\n// first line of a note\n// second line of a note\n${CODE}`,
  'tool/license.mjs': `/**\n * @license MIT\n * ${PAD}\n * a fourth line\n */\n${CODE}`,
  'tool/spdx.mjs': `// SPDX-License-Identifier: MIT\n// two\n// three\n${CODE}`,
  'tool/copyright.mjs': `// Copyright 2026 Someone\n// two\n// three\n${CODE}`,
};

const SAMPLES = {
  'block.mjs': `${CODE}/**\n * one\n */\n${CODE}`,
  'singles.mjs': `// one\n// two\n// three\n${CODE}`,
  'two.mjs': `// one\n// two\n${CODE}/** one line */\n${CODE}/* one\n   two */\n${CODE}`,
  'split-by-code.mjs': `// one\n// two\n${CODE}// three\n// four\n${CODE}`,
  'trailing.mjs': `export const a = 1; // one\nexport const b = 2; // two\nexport const c = 3; // three\n`,
  'jsx.tsx': 'export const Part = () => (\n  <p>\n    {/* one\n        two\n        three */}\n  </p>\n);\n',
  'wide-121.mjs': `${wide(121)}\n${CODE}`,
  'wide-120.mjs': `${wide(120)}\n${CODE}`,
  'wide-trailing.mjs': `${wide(121, 'export const value = 1; // ')}\n`,
  'wide-code.mjs': `export const value = '${'x'.repeat(130)}';\n`,
  'in-string.mjs': `export const a = '// one';\nexport const b = '// two';\nexport const c = '// three ${'x'.repeat(130)}';\n`
    + 'export const d = `\n// one\n// two\n// three\n`;\n',
  'loose/four.mjs': `// one\n// two\n// three\n// four\n${CODE}${wide(100)}\n${CODE}`,
  'loose/five.mjs': `// one\n// two\n// three\n// four\n// five\n${CODE}${wide(101)}\n${CODE}`,
  ...TOOL_READ,
};

const settings = extra => JSON.stringify({
  jsPlugins: [rule], categories: { correctness: 'off' },
  rules: { 'comment-length/max-comment-lines': 'error', 'comment-length/max-comment-width': 'error' }, ...extra,
});

// One oxlint run over every sample; each test reads its own file's findings from it.
let found;
function findings(t) {
  if (found) return found;
  const folder = mkdtempSync(join(tmpdir(), 'wong-test-comment-length-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const files = { ...SAMPLES, '.oxlintrc.json': settings({ overrides: [{ files: ['loose/**'],
    rules: { 'comment-length/max-comment-lines': ['error', 4], 'comment-length/max-comment-width': ['error', 100] } }] }) };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true });
    writeFileSync(join(folder, path), text);
  }
  const result = spawnSync(oxlint, ['-f', 'json'], { cwd: folder, encoding: 'utf8' });
  assert.equal(result.status, 1, `oxlint fails on the bad samples: ${result.stderr}`);
  found = {};
  for (const { code, filename, labels, message } of JSON.parse(result.stdout).diagnostics) {
    (found[filename] ??= []).push({ code, line: labels[0].span.line, message });
  }
  return found;
}
const of = (t, file) => (findings(t)[file] ?? []).map(({ code, line }) => `${code}@${line}`);

test('a three-line block comment fails, named at its first line', t => {
  assert.deepEqual(of(t, 'block.mjs'), [`${LINES}@2`]);
  assert.match(findings(t)['block.mjs'][0].message, /^This comment runs 3 lines; the limit is 2\./);
});

test('three single-line comments in a row fail as one comment, in JSX too', t => {
  assert.deepEqual(of(t, 'singles.mjs'), [`${LINES}@1`]);
  assert.deepEqual(of(t, 'jsx.tsx'), [`${LINES}@3`]);
});

test('a comment of one or two lines passes', t => {
  assert.deepEqual(of(t, 'two.mjs'), []);
});

test('two two-line comments with code between them pass, and so do trailing notes on three lines of code', t => {
  assert.deepEqual(of(t, 'split-by-code.mjs'), []);
  assert.deepEqual(of(t, 'trailing.mjs'), []);
});

test('a comment line of 121 characters fails, counted from column one; 120 passes', t => {
  assert.deepEqual(of(t, 'wide-121.mjs'), [`${WIDTH}@1`]);
  assert.match(findings(t)['wide-121.mjs'][0].message, /^This comment line is 121 characters wide; the limit is 120\./);
  assert.deepEqual(of(t, 'wide-trailing.mjs'), [`${WIDTH}@1`]);
  assert.deepEqual(of(t, 'wide-120.mjs'), []);
});

test('a code line of 130 characters passes', t => {
  assert.deepEqual(of(t, 'wide-code.mjs'), []);
});

test('`//` inside a string or a template is not a comment', t => {
  assert.deepEqual(of(t, 'in-string.mjs'), []);
});

test('each limit is an option', t => {
  assert.deepEqual(of(t, 'loose/four.mjs'), []);
  assert.deepEqual(of(t, 'loose/five.mjs'), [`${LINES}@1`, `${WIDTH}@7`]);
});

for (const file of Object.keys(TOOL_READ)) {
  test(`never counted, and joins no note beside it: ${file}`, t => {
    assert.deepEqual(of(t, file), []);
  });
}

test('a tool-read comment ends the run above it, and a blank line starts a new run', () => {
  const comment = (line, value, offset, type = 'Line') => ({ type, value, range: [offset, offset + 5], loc: { start: { line }, end: { line } } });
  const text = '0123456789'.replaceAll(/\d/g, '     \n');
  const runs = commentRuns([comment(4, ' four', 18), comment(1, ' one', 0), comment(2, ' oxlint-disable-next-line x', 6), comment(3, ' three', 12),
    comment(6, ' six', 30)], text);
  assert.deepEqual(runs.map(run => [run.start, run.end]), [[1, 1], [3, 4], [6, 6]]);
});

test('the rule file reports through the plugin interface with its default limits', () => {
  const text = '// one\n// two\n// three\nx\n';
  const comments = [0, 7, 14].map((offset, index) => ({ type: 'Line', value: ' n', range: [offset, offset + 6],
    loc: { start: { line: index + 1 }, end: { line: index + 1 } } }));
  const reports = [];
  const context = { options: [], sourceCode: { text, getAllComments: () => comments }, report: report => reports.push(report) };
  assert.equal(plugin.meta.name, 'comment-length');
  for (const name of ['max-comment-lines', 'max-comment-width']) plugin.rules[name].create(context).Program();
  assert.deepEqual(reports.map(report => report.loc.start.line), [1]);
});
