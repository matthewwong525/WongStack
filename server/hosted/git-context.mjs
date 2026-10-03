import { spawnSync } from 'node:child_process';
import { lstatSync, readdirSync, existsSync, rmSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { need, shaOK, uuidOK } from './security.mjs';

export function checksBase(candidate) {
  const base = candidate.mainBase === candidate.sha ? candidate.base : candidate.mainBase;
  need((base == null || shaOK(base)) && base !== candidate.sha, 'Recorded check base is invalid');
  return base ?? null;
}

// Serialized into a service-owned command: never import or execute candidate code here.
export function prepareGitContext(root, sourceRoot, identity) {
  const fail = () => { throw new Error('Trusted Git preparation failed'); };
  const { sha, base, remote, projectId } = identity;
  if (!/^[a-f0-9]{40}$/.test(sha) || base && !/^[a-f0-9]{40}$/.test(base) || base === sha || !/^[a-f0-9-]{36}$/.test(projectId)) fail();
  const token = process.env.HOSTED_GIT_READ_TOKEN;
  if (!token || /[\r\n\0]/.test(token)) fail();
  const env = { PATH: process.env.PATH, HOME: root, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' };
  const git = (cwd, args, authenticated = false) => {
    const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd, env: authenticated ? { ...env, GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'http.extraHeader', GIT_CONFIG_VALUE_0: `Authorization: Bearer ${token}` } : env, encoding: 'utf8', timeout: 180000, maxBuffer: 1024 * 1024 });
    if (result.status !== 0) fail();
    return result.stdout.trim();
  };
  const regularTree = (path, budget = { files: 0, bytes: 0 }) => {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isDirectory() && !stat.isFile()) fail();
    if (++budget.files > 50000 || (budget.bytes += stat.size) > 128 * 1024 * 1024) fail();
    if (stat.isDirectory()) for (const name of readdirSync(path)) regularTree(join(path, name), budget);
  };
  const original = join(sourceRoot, '.git');
  regularTree(original);
  if (existsSync(join(root, '.git')) || existsSync(join(original, 'objects/info/alternates'))) fail();
  if (/(include|credential|extraheader|insteadof|hookspath|fsmonitor)/i.test(readFileSync(join(original, 'config'), 'utf8'))) fail();
  if (git(sourceRoot, ['rev-parse', 'HEAD']) !== sha || git(sourceRoot, ['remote', 'get-url', 'origin']) !== remote) fail();
  const keys = git(sourceRoot, ['config', '--local', '--name-only', '--list']).split('\n');
  if (keys.some(key => !/^(core\.(repositoryformatversion|filemode|bare|logallrefupdates)|remote\.origin\.(url|fetch))$/.test(key))) fail();
  git(root, ['init', '-q']);
  rmSync(join(root, '.git/hooks'), { recursive: true, force: true });
  cpSync(join(original, 'objects'), join(root, '.git/objects'), { recursive: true });
  if (existsSync(join(original, 'shallow'))) {
    const shallow = readFileSync(join(original, 'shallow'), 'utf8');
    if (!/^(?:[a-f0-9]{40}\n)+$/.test(shallow)) fail();
    writeFileSync(join(root, '.git/shallow'), shallow);
  }
  git(root, ['remote', 'add', 'origin', remote]);
  git(root, ['update-ref', 'HEAD', sha]);
  git(root, ['reset', '--mixed', sha]);
  git(root, ['diff', '--quiet']);
  if (base) {
    git(root, ['fetch', '--quiet', '--no-tags', '--depth=512', 'origin', sha, base], true);
    if (git(root, ['rev-parse', `${base}^{commit}`]) !== base || !/^[a-f0-9]{40}$/.test(git(root, ['merge-base', sha, base]))) fail();
  }
  if (git(root, ['rev-parse', 'HEAD']) !== sha) fail();
  regularTree(join(root, '.git'));
  if (readFileSync(join(root, '.git/config'), 'utf8').includes(token)) fail();
  delete process.env.HOSTED_GIT_READ_TOKEN;
  delete process.env.SOURCE_CONTROL_TOKEN;
  return { sha, base, projectId, prepared: true };
}

export function prepareGitCommand(sha, projectId, base, remote) {
  need(shaOK(sha) && uuidOK(projectId) && (base == null || shaOK(base)) && base !== sha, 'Exact Git context required');
  const url = new URL(remote);
  need(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && /^[a-f0-9]{32}\.artifacts\.cloudflare\.net$/.test(url.hostname) && url.pathname.endsWith(`/${projectId}.git`), 'Owned Git remote required');
  const script = `import {spawnSync} from 'node:child_process';import {lstatSync,readdirSync,existsSync,rmSync,cpSync,readFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';\n${prepareGitContext.toString()}\ntry{const receipt=prepareGitContext(process.cwd(),'/tmp/ci-source',${JSON.stringify({ sha, base, remote, projectId })});console.log('HOSTED_GIT_CONTEXT='+JSON.stringify(receipt));}catch{console.error('Trusted Git preparation failed');process.exit(1)}`;
  return `node --input-type=module -e '${script.replaceAll("'", "'\\''")}'`;
}

export async function readGitContext(result, sha, projectId, base) {
  need(result.exitCode === 0 && typeof result.runner === 'function', 'Trusted Git preparation failed');
  // SDK destruction waits for every streamed log. Drain stderr too, without exposing it.
  const [stdout, stderr] = await Promise.all([typeof result.logs?.stdout === 'string' ? result.logs.stdout : new Response(result.logs?.stdout).text(), typeof result.logs?.stderr === 'string' ? result.logs.stderr : new Response(result.logs?.stderr).text()]);
  need(stderr.length < 65536, 'Git preparation diagnostics exceed bound');
  need(stdout.length < 65536, 'Git preparation receipt exceeds bound');
  const rows = stdout.split('\n').filter(line => line.startsWith('HOSTED_GIT_CONTEXT='));
  need(rows.length === 1, 'Git preparation receipt unreadable');
  const row = JSON.parse(rows[0].slice(19));
  need(row.prepared === true && row.sha === sha && row.projectId === projectId && row.base === base, 'Git preparation receipt identity differs');
  return row;
}
