import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/save/scripts/preview-url.sh');

// A stub `gh` answers the repo lookup and the PR comment read (one comment per line, newest first, @SHA@ as the head
// commit). Every Deployment, status, and check-run list is empty, so only method 4 can match.
function discover(t, commentBody) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-preview-url-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(join(root, 'comment.txt'), commentBody);
  writeFileSync(join(bin, 'gh'), `#!/usr/bin/env bash
case "$1 $2" in
  "repo view") echo fixture/repo ;;
  "pr view") sed "s/@SHA@/$(git rev-parse --short=7 HEAD)/g" "${join(root, 'comment.txt')}" ;;
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
  const body = '[![Cloudflare](https://workers.dev)](https://workers.dev) | Latest commit | @SHA@ | Preview | https://feature-app.example.workers.dev |\n';
  assert.equal(discover(t, body), 'https://feature-app.example.workers.dev');
});

test('an apex-only comment yields no preview URL', t => {
  assert.equal(discover(t, 'Deployed @SHA@ with [Cloudflare](https://workers.dev/) and https://vercel.app\n'), '');
});

test('the newest comment naming the head commit wins over older deploys', t => {
  const body = ['Deployed @SHA@: https://new-app.example.workers.dev', 'Deployed 0000000: https://old-app.example.workers.dev'].join('\n');
  assert.equal(discover(t, body), 'https://new-app.example.workers.dev');
});

test('a comment for an earlier commit is never reported', t => {
  assert.equal(discover(t, 'Deployed 0000000: https://old-app.example.workers.dev\n'), '');
});

test('a copy installed through the app asks app-change.mjs for the preview, and gh nothing', t => {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-preview-url-app-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = join(root, 'bin');
  const work = join(root, 'work');
  for (const dir of [bin, work]) mkdirSync(dir);
  // `node` runs delivery-route.mjs for real and stands in for app-change.mjs; `gh` only logs.
  const tools = {
    gh: `#!/usr/bin/env bash\necho "gh $*" >> "${join(root, 'calls')}"\nexit 1\n`,
    node: `#!/usr/bin/env bash
case "$1" in */app-change.mjs) echo "app-change.mjs \${*:2}" >> "${join(root, 'calls')}"; echo https://work.example.workers.dev; exit 0 ;; esac
exec "${process.execPath}" "$@"
`,
  };
  for (const [name, body] of Object.entries(tools)) {
    writeFileSync(join(bin, name), body);
    chmodSync(join(bin, name), 0o755);
  }
  for (const args of [['init', '-q'], ['remote', 'add', 'origin', 'https://app.example.com/api/access/code/git/']]) spawnSync('git', args, { cwd: work });
  const result = spawnSync('bash', [script], { cwd: work, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(result.stdout, 'https://work.example.workers.dev\n');
  assert.equal(readFileSync(join(root, 'calls'), 'utf8'), 'app-change.mjs preview\n');
});
