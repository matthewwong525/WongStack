#!/usr/bin/env node
// Removes the module plugins an older WongStack added to this computer's Codex: the project's hooks file runs them now.
// Every command is safe to run again; it never fails: no Codex, or a failed command, prints one line. Doc: ../SKILL.md
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { isMain, parseCli } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';

const USAGE = `usage: codex-plugin.mjs [--root <checkout>] [--check]
  removes each Codex plugin named for a module in .claude/skills/ from the wongstack list or a list at this checkout,
  then that list; --root defaults to the primary checkout
  --check   removes nothing: prints the one command to run when Codex still has such a plugin`;

const COMMAND = 'node .claude/skills/wong-sync/scripts/codex-plugin.mjs';
const real = path => { try { return realpathSync(path); } catch { return path; } };
const joined = names => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

/** Each `[header]` of a TOML file with the lines under it. */
function sections(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const header = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (header) out.push({ name: header[1].trim(), body: '' });
    else if (out.length) out.at(-1).body += `${line}\n`;
  }
  return out;
}

/** The checkout and its primary checkout, resolved: a plugin list with either as its source is WongStack's. */
function ownRoots(root) {
  let primary = root;
  try { primary = primaryRoot(root).primary; } catch { /* not a Git checkout: the root alone */ }
  return new Set([real(root), real(primary)]);
}

/** Module plugins from the `wongstack` list or this checkout's own list, as `<module>@<list>`, and those own lists. */
export function oldPlugins(root, config) {
  const isModule = name => ['hooks/codex.json', 'VERSION'].some(file => existsSync(join(root, '.claude/skills', name, file)));
  const roots = ownRoots(root), plugins = [], lists = [];
  const all = sections(config);
  for (const { name, body } of all) {
    const list = name.match(/^marketplaces\.(?:"([^"]+)"|([\w-]+))$/);
    const source = body.match(/^\s*source\s*=\s*"([^"]*)"/m)?.[1];
    if (list && source && roots.has(real(source))) lists.push(list[1] ?? list[2]);
  }
  // Another vendor may name a plugin like a module, and a removal can't be undone.
  for (const { name } of all) {
    const plugin = name.match(/^plugins\."([^"@]+)@([^"]+)"$/);
    if (plugin && isModule(plugin[1]) && (plugin[2] === 'wongstack' || lists.includes(plugin[2]))) plugins.push(`${plugin[1]}@${plugin[2]}`);
  }
  return { plugins, lists };
}

const readConfig = codexHome => { try { return readFileSync(join(codexHome, 'config.toml'), 'utf8'); } catch { return ''; } };
const CODEX_HOME = () => process.env.CODEX_HOME || join(homedir(), '.codex');

/** The one line to print: nothing to remove, Codex absent, a step that failed, or the plugins removed. */
export function codexPlugin(root, codexHome = CODEX_HOME()) {
  const { plugins, lists } = oldPlugins(root, readConfig(codexHome));
  if (!plugins.length && !lists.length) return 'Codex has no WongStack module plugin on this computer.';
  for (const args of [...plugins.map(plugin => ['plugin', 'remove', plugin]), ...lists.map(list => ['plugin', 'marketplace', 'remove', list])]) {
    const run = spawnSync('codex', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (run.error?.code === 'ENOENT') return 'Codex is not on this computer: no Codex plugin to remove.';
    if (run.status !== 0) {
      const cause = String(run.stderr || run.error?.message || '').trim().split('\n').at(-1);
      return `Codex did not remove ${args.at(-1)}: \`codex ${args.join(' ')}\` failed${cause ? ` (${cause})` : ''}.`;
    }
  }
  return `Codex no longer has ${joined([...plugins, ...lists.map(list => `the ${list} plugin list`)])}; the project's hooks run each module.`;
}

/** For the stack's Codex start hook: the one command to run while Codex still has a module plugin, else nothing. */
export function codexPluginCheck(root, codexHome = CODEX_HOME()) {
  const { plugins } = oldPlugins(root, readConfig(codexHome));
  return plugins.length ? `Codex still has the ${joined(plugins)} plugin on this computer, so its hooks run twice; run \`${COMMAND}\`.` : '';
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: { root: { type: 'string' }, check: { type: 'boolean' } } });
  try {
    const root = values.root ?? primaryRoot().primary;
    const line = values.check ? codexPluginCheck(root) : codexPlugin(root);
    if (line) console.log(line);
  } catch (error) {
    if (!values.check) console.log(`Codex did not remove the module plugins: ${error.message}.`);
  }
}
