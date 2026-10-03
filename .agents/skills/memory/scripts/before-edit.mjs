#!/usr/bin/env node
// PreToolUse hook on file edits (Claude Code's edit tools, Codex's apply_patch): the first time a session edits a file in a mapped folder, show that area's
// open threads, then its newest live facts, eight lines at most, under the same team filter as search. Once
// per area per session. It never blocks an edit: an unmapped path, an area already shown, a missing key, or an
// unreachable store prints nothing, and it always exits 0.
import { readFileSync } from 'node:fs';
import { parseCli } from './lib/cli.mjs';
import { areasOf, loadAreas } from './lib/areas.mjs';
import { formatFact } from './lib/digest.mjs';
import { isMain, openStore, readJson, repoContext, statePath, writeJson } from './lib/store.mjs';

const BUDGET_MS = 2500;
const LINES = 8;

// The edited files: Claude Code's Edit, Write, and MultiEdit name file_path, and NotebookEdit notebook_path;
// Codex's apply_patch names each file in its patch's headers.
export function editedPaths({ tool_input: tool = {} }) {
  const own = [tool.file_path, tool.notebook_path].filter(Boolean);
  const patch = typeof tool.command === 'string' ? tool.command : '';
  return [...own, ...[...patch.matchAll(/^\*\*\* (?:(?:Add|Update|Delete) File|Move to): (.+)$/gm)].map(([, path]) => path.trim())];
}

// The hook's output for one edit, or '' when it shows nothing.
export async function beforeEdit(input) {
  const paths = editedPaths(input);
  if (!paths.length) return '';
  const ctx = repoContext(input.cwd || process.cwd());
  const shownFile = statePath(ctx, 'shown-areas', `${String(input.session_id || 'unknown').replace(/[^\w.-]/g, '_')}.json`);
  const shown = readJson(shownFile, []);
  const areas = loadAreas();
  const tags = [...new Set(paths.flatMap(path => areasOf(path, areas, ctx.root)))].filter(tag => !shown.includes(tag));
  if (!tags.length) return '';
  const store = openStore(ctx, { timeoutMs: BUDGET_MS });
  const facts=await store.operation('facts',{tags,threadsFirst:true,limit:LINES});
  writeJson(shownFile, [...shown, ...tags]);
  if (!facts.length) return '';
  const additionalContext = [`Memory for ${tags.join(', ')}:`, ...facts.map(fact => formatFact(fact))].join('\n');
  return `${JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext } })}\n`;
}

if (isMain(import.meta.url)) {
  parseCli({ usage: 'usage: before-edit.mjs   the PreToolUse hook on file edits; reads the hook\'s JSON on stdin' });
  let out = '';
  try { out = await beforeEdit(JSON.parse(readFileSync(0, 'utf8') || '{}')); } catch { /* memory never blocks an edit */ }
  // Exit once the output is flushed: an aborted fetch's socket would otherwise hold the hook past its timeout.
  process.stdout.write(out, () => process.exit(0));
}
