#!/usr/bin/env node
// Adds this repo's plugin list to Codex and installs each module plugin it names, such as memory and daily.
// Every command is safe to run again; it never fails: no Codex, or a failed command, prints one line. Doc: ../SKILL.md
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { isMain, parseCli } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { readJson } from '../../memory/scripts/lib/store.mjs';

const USAGE = `usage: codex-plugin.mjs [--root <checkout>] [--check]
  installs each module plugin (memory, daily) in Codex from the root .claude-plugin/marketplace.json; --root defaults to the primary checkout
  --check   installs nothing: prints one line when Codex's config lacks one of them`;

/** Each plugin the root plugin list names, as `<plugin>@<list>`; memory alone when the list names none. */
export function codexPluginNames(root) {
  const list = readJson(join(root, '.claude-plugin', 'marketplace.json'), {}) || {};
  const names = (Array.isArray(list.plugins) ? list.plugins : []).map(plugin => plugin?.name).filter(Boolean);
  return (names.length ? names : ['memory']).map(name => `${name}@${list.name || 'wongstack'}`);
}

const joined = names => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

/** The one line to print: Codex absent, a step that failed, or the plugins installed. */
export function codexPlugin(root) {
  const plugins = codexPluginNames(root);
  for (const args of [['plugin', 'marketplace', 'add', root], ...plugins.map(plugin => ['plugin', 'add', plugin])]) {
    const run = spawnSync('codex', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (run.error?.code === 'ENOENT') return 'Codex is not on this computer: no Codex plugin to install.';
    if (run.status !== 0) {
      const cause = String(run.stderr || run.error?.message || '').trim().split('\n').at(-1);
      return `Codex did not install ${args[1] === 'add' ? args[2] : joined(plugins)}: \`codex ${args.join(' ')}\` failed${cause ? ` (${cause})` : ''}.`;
    }
  }
  return `Codex has ${joined(plugins)}.`;
}

/** For the stack's Codex start hook: the one command to run when Codex's config lacks a module plugin, else nothing. */
export function codexPluginCheck(root, codexHome = process.env.CODEX_HOME || join(homedir(), '.codex')) {
  let config;
  try { config = readFileSync(join(codexHome, 'config.toml'), 'utf8'); } catch { config = ''; }
  const missing = codexPluginNames(root).filter(plugin => !config.includes(`[plugins."${plugin}"]`));
  if (!missing.length) return '';
  return `Codex has no ${joined(missing)} plugin on this computer, so their hooks do not run here; run \`node .claude/skills/wong-sync/scripts/codex-plugin.mjs\`.`;
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: { root: { type: 'string' }, check: { type: 'boolean' } } });
  try {
    const root = values.root ?? primaryRoot().primary;
    const line = values.check ? codexPluginCheck(root) : codexPlugin(root);
    if (line) console.log(line);
  } catch (error) {
    if (!values.check) console.log(`Codex did not install the module plugins: ${error.message}.`);
  }
}
