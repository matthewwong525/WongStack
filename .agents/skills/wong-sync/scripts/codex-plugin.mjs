#!/usr/bin/env node
// Adds this repo's plugin list to Codex and installs the memory plugin from it. Both commands are safe to run again.
// It never fails: no Codex, or a failed command, prints one line. Doc: ../SKILL.md
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { isMain, parseCli } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { codexPluginName } from '../../memory/scripts/lib/store.mjs';

const USAGE = `usage: codex-plugin.mjs [--root <checkout>] [--check]
  installs memory in Codex from the root .claude-plugin/marketplace.json; --root defaults to the primary checkout
  --check   installs nothing: prints one line when Codex's config has no memory plugin`;

/** The one line to print: Codex absent, a step that failed, or the plugin installed. */
export function codexPlugin(root) {
  const plugin = codexPluginName(root);
  for (const args of [['plugin', 'marketplace', 'add', root], ['plugin', 'add', plugin]]) {
    const run = spawnSync('codex', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (run.error?.code === 'ENOENT') return 'Codex is not on this computer: no Codex plugin to install.';
    if (run.status !== 0) {
      const cause = String(run.stderr || run.error?.message || '').trim().split('\n').at(-1);
      return `Codex did not install ${plugin}: \`codex ${args.join(' ')}\` failed${cause ? ` (${cause})` : ''}.`;
    }
  }
  return `Codex has ${plugin}.`;
}

/** For the stack's Codex start hook: the one command to run when Codex's config has no memory plugin, else nothing. */
export function codexPluginCheck(root, codexHome = process.env.CODEX_HOME || join(homedir(), '.codex')) {
  let config;
  try { config = readFileSync(join(codexHome, 'config.toml'), 'utf8'); } catch { config = ''; }
  const plugin = codexPluginName(root);
  if (config.includes(`[plugins."${plugin}"]`)) return '';
  return `Memory: Codex has no ${plugin} plugin on this computer, so no memory hook runs here; run \`node .claude/skills/wong-sync/scripts/codex-plugin.mjs\`.`;
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: { root: { type: 'string' }, check: { type: 'boolean' } } });
  try {
    const root = values.root ?? primaryRoot().primary;
    const line = values.check ? codexPluginCheck(root) : codexPlugin(root);
    if (line) console.log(line);
  } catch (error) {
    if (!values.check) console.log(`Codex did not install memory: ${error.message}.`);
  }
}
