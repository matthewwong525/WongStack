#!/usr/bin/env node
// Portable customer checks. The caller supplies repository context; GitHub
// and hosted runners use this same entry point without provider credentials.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCli, usageError } from '../../.agents/skills/memory/scripts/lib/cli.mjs';

const USAGE = `usage: node .github/scripts/checks.mjs --repo <path> --base <sha-or-empty> --head <sha> --default-branch <name> [--discover] [--summary <path>]

Supply the whole-change base and exact checked-out head, never only the latest
commit's parent. An empty/unavailable base runs checks conservatively.
The default branch labels caller context; it does not select the base.
--discover  print scope and test-suite location as JSON; run no checks
--summary   append quality reports and the final summary to this file`;
const scripts = dirname(fileURLToPath(import.meta.url));
const SHA = /^[0-9a-f]{40}([0-9a-f]{24})?$/;

function context(values) {
  for (const key of ['repo', 'base', 'head', 'default-branch']) {
    if (values[key] === undefined) usageError(USAGE, `missing --${key}`);
  }
  if (!SHA.test(values.head) || (values.base && !SHA.test(values.base)) || !values['default-branch'].trim()) {
    usageError(USAGE, 'give full commit SHAs and a default branch');
  }
  const repo = realpathSync(resolve(values.repo));
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  if (realpathSync(git('rev-parse', '--show-toplevel')) !== repo || git('rev-parse', 'HEAD') !== values.head) {
    throw new Error('repository root or checked-out head does not match the supplied context');
  }
  const scope = execFileSync('bash', [join(scripts, 'app-untouched.sh'), '--base', values.base, '--head', values.head], {
    cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
  });
  return { repo, defaultBranch: values['default-branch'], scope: Object.fromEntries(scope.trim().split('\n').map(line => line.split('='))) };
}

function suiteDir(repo) {
  const dirs = ['', ...readdirSync(repo)
    .filter(name => name !== 'node_modules' && !name.startsWith('.')).sort()];
  for (const dir of dirs) {
    try {
      if (JSON.parse(readFileSync(join(repo, dir, 'package.json'), 'utf8')).scripts?.test) return join(repo, dir);
    } catch {
      // An absent or malformed package has no discoverable test script.
    }
  }
  return null;
}

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) console.error(result.error.message);
  if (capture) {
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
  }
  return { ok: result.status === 0, text: result.stdout ?? '' };
}

function checks({ repo, scope, dir }, summary) {
  const report = text => {
    console.log(text);
    if (summary) appendFileSync(summary, `${text}\n`);
  };
  let suite = 'skipped';
  let install = true;
  if (dir) {
    install = run('npm', ['ci', '--no-audit', '--no-fund'], dir).ok;
    if (install) suite = run('npm', ['test'], dir).ok ? 'success' : 'failure';
  } else if (scope.untouched !== 'true') {
    report('### No test suite yet\n\nNo `package.json` in this repo declares a `test` script, so there is nothing to run.\n\nAdd one — `/plan` includes a test task for any change that touches behavior — and this check runs it on every push.');
  }
  // Quality checks still run after install/test failure, including docs-only
  // changes. A red app suite must not hide a second actionable failure.
  const loosened = run(process.execPath, [join(scripts, 'loosened-checks.mjs'), '--base', scope.base], repo, true);
  if (summary) appendFileSync(summary, loosened.text);
  let wiki = { ok: true, text: '' };
  if (scope.wiki_affected !== 'false') {
    wiki = run(process.execPath, [join(scripts, 'wiki-links.mjs'), repo], repo, true);
    if (summary) appendFileSync(summary, wiki.text);
  }
  let line = scope.untouched === 'true'
    ? 'The main app is untouched (only docs changed), so its suite did not run.'
    : dir ? `The main app changed, so its suite ran: ${suite}.` : 'The main app changed, but no test suite is declared.';
  if (!install) line = 'The main app changed, but installation failed, so its suite did not run.';
  if (!loosened.ok) line += ' A check was loosened with no written reason; see Loosened checks above.';
  if (!wiki.ok) line += ' A wiki page has a broken link, is linked from nowhere, is too long, or lacks its title; see Wiki checks above.';
  if (scope.wiki_affected === 'false') line += ' The wiki check skipped, because no page or linked file changed.';
  report(line);
  return install && suite !== 'failure' && loosened.ok && wiki.ok;
}

function main() {
  const { values } = parseCli({ usage: USAGE, options: {
    repo: { type: 'string' }, base: { type: 'string' }, head: { type: 'string' },
    'default-branch': { type: 'string' }, discover: { type: 'boolean' }, summary: { type: 'string' },
  } });
  const data = context(values);
  data.dir = data.scope.untouched === 'true' ? null : suiteDir(data.repo);
  if (values.discover) console.log(JSON.stringify(data));
  else if (!checks(data, values.summary)) process.exitCode = 1;
}

try { main(); } catch (error) { console.error(`Checks unavailable: ${error.message}`); process.exitCode = 1; }
