import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/save/scripts/preview-url.sh');

// A stub `gh` answers the repo lookup and the PR comment read; every Deployment,
// status, and check-run list is empty, so only method 4 (free text) can match.
function discover(t, commentBody) {
  const root = mkdtempSync('/tmp/preview-url-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(join(root, 'comment.txt'), commentBody);
  writeFileSync(join(bin, 'gh'), `#!/usr/bin/env bash
case "$1 $2" in
  "repo view") echo fixture/repo ;;
  "pr view") cat "${join(root, 'comment.txt')}" ;;
esac
exit 0
`);
  chmodSync(join(bin, 'gh'), 0o755);
  const work = join(root, 'work');
  mkdirSync(work);
  for (const args of [['init', '-q'], ['-c', 'user.email=f@example.test', '-c', 'user.name=F', 'commit', '-q', '--allow-empty', '-m', 'base']]) {
    spawnSync('git', args, { cwd: work });
  }
  const result = spawnSync('bash', [script], { cwd: work, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  return result.stdout.trim();
}

test('a bot logo link to the provider apex does not hide the real preview', t => {
  const body = '[![Cloudflare](https://workers.dev)](https://workers.dev)\n| Preview | https://feature-app.example.workers.dev |\n';
  assert.equal(discover(t, body), 'https://feature-app.example.workers.dev');
});

test('an apex-only comment yields no preview URL', t => {
  assert.equal(discover(t, 'Deployed with [Cloudflare](https://workers.dev/) and https://vercel.app\n'), '');
});
