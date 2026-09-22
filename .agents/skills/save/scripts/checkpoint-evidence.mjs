#!/usr/bin/env node
// Local evidence only. The calling skill owns selection and every mutation.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const splitNull = text => text.split('\0').filter(Boolean);
const sorted = values => [...new Set(values)].sort();

export function checkpointEvidence({ repo = '.', ref = 'HEAD', base, changesDir = 'openspec/changes', branch } = {}) {
  const git = (...args) => execFileSync('git', ['--no-optional-locks', '-C', repo, ...args], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const root = git('rev-parse', '--show-toplevel').trim();
  repo = root;
  const changes = relative(root, resolve(root, changesDir)).split(sep).join('/');
  if (!changes || changes === '..' || changes.startsWith('../') || isAbsolute(changes)) {
    throw new Error('changes directory must be inside the selected repository');
  }
  const commit = value => git('rev-parse', '--verify', '--end-of-options', `${value}^{commit}`).trim();
  const sha = commit(ref);
  if (!base) {
    const refs = git('for-each-ref', '--format=%(refname)', 'refs/remotes/origin/main', 'refs/heads/main').trim().split('\n');
    base = refs.includes('refs/remotes/origin/main') ? 'origin/main' : refs.includes('refs/heads/main') ? 'main' : null;
    if (!base) throw new Error('comparison base unavailable; pass --base explicitly');
  }
  const baseSha = commit(base);
  const local = ref === 'HEAD';
  const fullRef = git('rev-parse', '--symbolic-full-name', '--verify', '--end-of-options', ref).trim();
  const observedBranch = fullRef.replace(/^refs\/heads\//, '').replace(/^refs\/remotes\/[^/]+\//, '');
  branch ??= observedBranch && observedBranch !== 'HEAD' ? observedBranch : null;
  const branchPaths = splitNull(git('diff', '--no-renames', '--name-only', '-z', `${baseSha}...${sha}`, '--'));
  const dirtyPaths = [];
  if (local) {
    const entries = splitNull(git('status', '--porcelain=v1', '-z', '--untracked-files=all'));
    for (let i = 0; i < entries.length; i++) {
      const status = entries[i].slice(0, 2);
      const record = { path: entries[i].slice(3), status };
      if (/[RC]/.test(status)) record.from = entries[++i];
      if (!record.path || (/[RC]/.test(status) && !record.from)) throw new Error('invalid status record');
      dirtyPaths.push(record);
    }
  }
  const tracked = local
    ? splitNull(git('ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', changes))
    : splitNull(git('ls-tree', '-r', '-z', '--name-only', sha, '--', changes));
  const proposals = new Map();
  for (const path of sorted(tracked)) {
    if (!path.startsWith(`${changes}/`) || !path.endsWith('/proposal.md')) continue;
    const name = path.slice(changes.length + 1, -'/proposal.md'.length);
    if (!/^[^/]+$/.test(name) && !/^archive\/[^/]+$/.test(name)) continue;
    if (local && !existsSync(resolve(root, path))) continue;
    // Read proposal metadata only, never environment or source files.
    const text = local ? readFileSync(resolve(root, path), 'utf8') : git('show', `${sha}:${path}`);
    proposals.set(name, text.match(/^\*\*Branch:\*\*\s*(.+?)\s*$/m)?.[1] ?? null);
  }
  const sources = new Map();
  const record = (path, source) => {
    if (!path.startsWith(`${changes}/`)) return;
    const parts = path.slice(changes.length + 1).split('/');
    const name = parts[0] === 'archive' ? parts.slice(0, 2).join('/') : parts[0];
    if (!proposals.has(name)) return;
    if (!sources.has(name)) sources.set(name, new Set());
    sources.get(name).add(source);
  };
  branchPaths.forEach(path => record(path, 'branch'));
  for (const entry of dirtyPaths) {
    const source = entry.status === '??' ? 'untracked' : 'worktree';
    record(entry.path, source);
    if (entry.from) record(entry.from, source);
  }
  const names = sorted(sources.keys());
  return {
    root, changesDir: changes, ref, sha, branch, base, baseSha,
    branchPaths: sorted(branchPaths), dirtyPaths,
    active: names.filter(name => !name.startsWith('archive/')),
    archive: names.filter(name => name.startsWith('archive/')).map(name => name.slice(8)),
    recorded: branch ? sorted([...proposals].filter(([name, value]) => !name.startsWith('archive/') && value === branch).map(([name]) => name)) : [],
    legacy: {
      active: branch && proposals.has(branch) ? [branch] : [],
      archive: branch ? sorted([...proposals.keys()].filter(name => name.startsWith('archive/') && name.slice(8).replace(/^\d{4}-\d{2}-\d{2}-/, '') === branch).map(name => name.slice(8))) : [],
    },
    sources: Object.fromEntries(names.map(name => [name, sorted(sources.get(name))])),
    diagnostics: [],
  };
}

function parseArgs(args) {
  const options = {};
  let mode;
  let json = false;
  const keys = { '--repo': 'repo', '--ref': 'ref', '--base': 'base', '--changes-dir': 'changesDir', '--branch': 'branch' };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') json = true;
    else if (keys[arg]) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`missing value for ${arg}`);
      options[keys[arg]] = args[++i];
    } else if (!mode && ['active', 'archive'].includes(arg)) mode = arg;
    else if (mode && !options.ref && !arg.startsWith('-')) options.ref = arg;
    else throw new Error(`invalid argument: ${arg}`);
  }
  if (!json && !mode) throw new Error('expected active|archive [ref] or --json');
  return { options, mode, json };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { options, mode, json } = parseArgs(process.argv.slice(2));
    const result = checkpointEvidence(options);
    process.stdout.write(json ? `${JSON.stringify(result)}\n` : result[mode].map(name => `${name}\n`).join(''));
  } catch (error) {
    console.error(`checkpoint evidence: ${error.status !== undefined ? 'Git inspection failed; check the selected root, ref, and base' : error.message}`);
    process.exitCode = 1;
  }
}
