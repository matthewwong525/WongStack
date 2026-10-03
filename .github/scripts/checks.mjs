#!/usr/bin/env node
// The project's one check list. Two callers run it and neither keeps its own:
//
//   .github/workflows/test.yml    →  checks.mjs test
//   .github/workflows/deploy.yml  →  checks.mjs build
//   the hosted runner             →  checks.mjs test build, at the exact commit
//
// A check added, fixed, or skipped here applies to GitHub and to a hosted
// workspace alike, so the two can not drift apart. What stays with a caller is
// what only it can do: the workflows keep checkout, Node setup, and the
// token-holding migrate and deploy steps; the hosted service keeps the
// exact-commit assertion, the pack, the upload, and the approval. See
// wiki/development/the-change-loop.md#the-gate.
//
// test   What the change touches (app-untouched.sh), then the suite: find the
//        package.json with a `test` script at the root or one folder down,
//        `npm ci`, `npm test`. A change that leaves the main app untouched
//        runs no suite. Then, every time: loosened-checks.mjs, and
//        wiki-links.mjs unless no page or linked file changed. One step
//        failing never hides the others; the exit code is the first failure's.
// build  Find the app (cf-build.sh --app-dir), `npm ci`, the staging/production
//        parity check, then the credential-free build: binding types and
//        `build:app`, or `build` in a repo not wired to the pack. It never
//        migrates or deploys. With CLOUDFLARE_API_TOKEN set it leaves the
//        build to the caller's cf-build.sh, which migrates first. An untouched
//        main app builds nothing; a repo with no wrangler config says so and
//        passes.
//
// Input (environment), the same for every caller:
//   GITHUB_EVENT_NAME, GITHUB_BASE_REF, GITHUB_REF_NAME, DEFAULT_BRANCH,
//   BEFORE_SHA      what app-untouched.sh reads on GitHub
//   CHECKS_BASE     a full commit id to compare with instead; the hosted
//                   service passes the candidate's base. With neither this nor
//                   an event, the branch is compared with the default branch.
//   CHECKS_BUILD    `always` builds even when the main app is untouched, for a
//                   caller that needs the built app from every commit
//   CLOUDFLARE_ENV  reaches the build alone; no other step sees it
//   CLOUDFLARE_API_TOKEN  see `build` above
//   GITHUB_STEP_SUMMARY   when set, the run page's summary is written there
//
// With `--plan` it runs nothing. It prints, for `>> "$GITHUB_OUTPUT"`, what the
// caller needs to set up Node: `untouched`, then `found` (test) or
// `configured` (build), and `dir`, the folder whose lockfile to cache.
//
// Exit 0 when every check passed or skipped, the failing step's code when one
// did not, 2 on a usage error.
//
// Usage: node .github/scripts/checks.mjs test|build... [--plan]

import { spawnSync } from 'node:child_process';
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../.claude/skills/memory/scripts/lib/cli.mjs';

const USAGE = `usage: node .github/scripts/checks.mjs test|build... [--plan]

test    the suite, loosened checks, and the wiki's links
build   the parity check and the credential-free build
--plan  run nothing; print where the suite or app is, for one verb`;

const VERBS = ['test', 'build'];

// Every script a step runs, from the repo root.
const SCOPE = '.github/scripts/app-untouched.sh';
const LOOSENED = '.github/scripts/loosened-checks.mjs';
const WIKI = '.github/scripts/wiki-links.mjs';
const APP = 'scripts/cf-build.sh';
const PARITY = 'scripts/cf-secrets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Run a command. `capture` returns its stdout instead of printing it. */
function spawn(file, args, { cwd, env, capture = false }) {
  const result = spawnSync(file, args, { cwd, env, encoding: 'utf8', stdio: ['ignore', capture ? 'pipe' : 'inherit', 'inherit'] });
  return { status: result.status ?? 1, stdout: result.stdout ?? '' };
}

function scripts(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts ?? {};
  } catch {
    return {};
  }
}

/**
 * The folder whose package.json declares a `test` script: the repo root first,
 * then each folder one level down. By its test script, never by a stack's
 * config file: a repo can have tests long before it is provisioned.
 */
export function locateSuite(root) {
  if (scripts(root).test) return root;
  const folders = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.'))
    .map(entry => entry.name)
    .sort();
  for (const name of folders) if (scripts(join(root, name)).test) return join(root, name);
  return '';
}

/**
 * Run the verbs in order and return the exit code. A failing verb stops the
 * ones after it. `exec` and `out` are injected by tests.
 */
export function run({ verbs, plan = false, root = ROOT, env = process.env, exec = spawn, out = text => process.stdout.write(text) }) {
  // CLOUDFLARE_ENV selects the build's environment. Tests and binding types
  // read the top-level config, as they do under cf-build.sh.
  const { CLOUDFLARE_ENV: _build, ...plain } = env;
  // Knip’s normal parser avoids its multi-gigabyte raw-transfer allocation.
  // This preserves the same complete analysis on GitHub and small hosted runners.
  plain.KNIP_DISABLE_RAW_TRANSFER = '1';
  const installed = new Set();
  const say = line => out(`${line}\n`);
  const summary = text => {
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, text);
  };
  const emit = answers => {
    for (const [key, value] of Object.entries(answers)) say(`${key}=${value}`);
    return 0;
  };
  const step = (file, args, cwd, stepEnv = plain) => exec(file, args, { cwd, env: stepEnv }).status;
  // A check whose report belongs on the run page too.
  const report = script => {
    const result = exec(process.execPath, script, { cwd: root, env: plain, capture: true });
    out(result.stdout);
    summary(result.stdout);
    return result.status;
  };
  // One install per folder, however many verbs build on it.
  const install = dir => {
    if (installed.has(dir)) return 0;
    const status = step('npm', ['ci', '--no-audit', '--no-fund'], dir);
    if (status === 0) installed.add(dir);
    return status;
  };

  // What the change touches. A skipped check must be a proven skip, so any
  // answer app-untouched.sh does not give assumes a change.
  const scope = () => {
    const answers = { untouched: 'false', base: '', docs_only: 'false', wiki_affected: 'true' };
    const scopeEnv = { ...plain };
    if (!scopeEnv.GITHUB_EVENT_NAME && !scopeEnv.CHECKS_BASE) {
      // No caller named a base: the whole branch against the default branch.
      scopeEnv.GITHUB_EVENT_NAME = 'push';
      scopeEnv.GITHUB_REF_NAME = '';
    }
    const result = exec('bash', [join(root, SCOPE)], { cwd: root, env: scopeEnv, capture: true });
    if (result.status !== 0) return answers;
    for (const line of result.stdout.split('\n')) {
      const at = line.indexOf('=');
      if (at > 0 && line.slice(0, at) in answers) answers[line.slice(0, at)] = line.slice(at + 1);
    }
    return answers;
  };

  const test = () => {
    const touched = scope();
    const untouched = touched.untouched === 'true';
    const dir = untouched ? '' : locateSuite(root);
    if (plan) return emit({ untouched, found: Boolean(dir), dir });
    if (!untouched && !dir) {
      summary('### No test suite yet\n\nNo `package.json` in this repo declares a `test` script,\nso there is nothing to run.\n\nAdd one — `/plan` includes a test task for any change that\ntouches behavior — and this check runs it on every push.\n');
      say('No test script declared — nothing to run.');
    }
    const failed = [];
    let suite = 'skipped';
    if (dir) {
      const status = install(dir);
      if (status !== 0) failed.push(status);
      else {
        const tests = step('npm', ['test'], dir);
        suite = tests === 0 ? 'success' : 'failure';
        if (tests !== 0) failed.push(tests);
      }
    }
    // After a red suite too, so one run reports everything. A skip comment, a
    // skipped or deleted test, or a changed check setting fails here unless
    // the change's Decision log names the file in a `Check:` bullet.
    const loosened = report([join(root, LOOSENED), '--base', touched.base]);
    if (loosened !== 0) failed.push(loosened);
    // Docs-only runs too: a wiki edit is often all a change is. Skipped only
    // when the change touches no Markdown and removes or moves no file.
    const wiki = touched.wiki_affected === 'false' ? null : report([join(root, WIKI)]);
    if (wiki) failed.push(wiki);
    // One line on the run page: what ran, or why nothing did.
    let line = untouched ? 'The main app is untouched (only docs changed), so its suite did not run.'
      : dir ? `The main app changed, so its suite ran: ${suite}.`
        : 'The main app changed, but no test suite is declared.';
    if (loosened !== 0) line += ' A check was loosened with no written reason; see Loosened checks above.';
    if (wiki) line += ' A wiki page has a broken link, is linked from nowhere, is too long, or lacks its title; see Wiki checks above.';
    if (wiki === null) line += ' The wiki check skipped, because no page or linked file changed.';
    summary(`${line}\n`);
    say(line);
    return failed[0] ?? 0;
  };

  const build = () => {
    const untouched = env.CHECKS_BUILD !== 'always' && scope().untouched === 'true';
    if (untouched) {
      if (plan) return emit({ untouched, configured: false, dir: '' });
      const note = 'The main app is untouched (only docs changed), so no main-app migration, build, or deploy ran.';
      summary(`${note}\n`);
      say(note);
      return 0;
    }
    // Exit 3 means "no wrangler config yet": a repo that has the pack and is
    // not provisioned. That is green and says what to do next. Any other
    // non-zero exit is a real error.
    const located = exec('bash', [join(root, APP), '--app-dir'], { cwd: root, env: plain, capture: true });
    if (located.status === 3) {
      if (plan) return emit({ untouched, configured: false, dir: '' });
      summary('### Not configured yet\n\nThis repo has the Cloudflare stack pack but no wrangler config,\nso there is nothing to build or deploy yet.\n\nRun `/wong-sync` to plan Cloudflare provisioning.\n');
      say('No wrangler config yet — run /wong-sync to plan Cloudflare provisioning.');
      return 0;
    }
    if (located.status !== 0) {
      console.error(`cf-build.sh --app-dir failed with exit ${located.status}`);
      return located.status;
    }
    const dir = located.stdout.trim();
    if (plan) return emit({ untouched, configured: true, dir });
    const installing = install(dir);
    if (installing !== 0) return installing;
    const failed = [];
    // Before the build, so drift is reported even when the build is what
    // breaks. It skips, never fails, with no token or no `env.staging`.
    const parity = step(process.execPath, [join(root, PARITY), 'check'], root);
    if (parity !== 0) failed.push(parity);
    if (env.CLOUDFLARE_API_TOKEN) {
      say('CLOUDFLARE_API_TOKEN is set — the caller migrates and builds with cf-build.sh.');
      return failed[0] ?? 0;
    }
    say('No CLOUDFLARE_API_TOKEN secret — building without deploying.');
    say('Run /wong-sync to plan provisioning, then this job deploys.');
    // wrangler.jsonc is the source of truth for bindings, so regenerate their
    // types before `tsc` reads them. Non-fatal, as in cf-build.sh.
    if (/"typescript"/.test(readFileSync(join(dir, 'package.json'), 'utf8')) && step('npx', ['--no-install', 'wrangler', 'types'], dir) !== 0) {
      console.error('checks: WARNING — wrangler types failed; continuing');
    }
    // A wired pack repo has build:app (build is the cf-build.sh wrapper, which
    // would try to migrate). An unwired repo just has build.
    const building = step('npm', ['run', scripts(dir)['build:app'] ? 'build:app' : 'build'], dir, { ...env, KNIP_DISABLE_RAW_TRANSFER: '1' });
    if (building !== 0) failed.push(building);
    return failed[0] ?? 0;
  };

  for (const verb of verbs) {
    const status = verb === 'test' ? test() : build();
    if (status !== 0) return status;
  }
  return 0;
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseCli({ usage: USAGE, options: { plan: { type: 'boolean' } }, allowPositionals: true });
  if (positionals.length === 0) usageError(USAGE, 'name a verb: test, build, or both');
  const unknown = positionals.find(verb => !VERBS.includes(verb));
  if (unknown) usageError(USAGE, `unknown verb: ${unknown}`);
  if (new Set(positionals).size !== positionals.length) usageError(USAGE, 'each verb runs once');
  if (values.plan && positionals.length !== 1) usageError(USAGE, '--plan takes one verb');
  process.exitCode = run({ verbs: positionals, plan: values.plan });
}
