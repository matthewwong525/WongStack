// Which app makes this computer's workspaces, and the marker on a workspace made without one.
//
// With Paseo, a workspace is Paseo's: its own worktree and agent. Without it, workspace.mjs makes
// a plain worktree and marks it with wong-workspace.json in the worktree's own git directory,
// beside the secrets baseline: never in the working tree, and gone when the worktree goes. The
// marker is the only thing that makes a worktree WongStack's; one without it is never closed or
// swept.
//
// Node built-ins only.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { git } from './cli.mjs';
import { findPaseo } from './paseo.mjs';

export const MARKER = 'wong-workspace.json';
// The names workspace.mjs and tidy.mjs take a `paseo` binary from, ahead of PATH.
const OVERRIDES = ['WORKSPACE_PASEO_BIN', 'TIDY_PASEO_BIN'];

/**
 * 'paseo' when a `paseo` command is here, else 'plain'. `override` names the variable that
 * replaces PATH when set (default: the first set of the two above); one pointing at no command
 * is 'plain'. A Paseo whose daemon is down stays 'paseo': its user should hear that it is down.
 */
export function workspaceHost(env = process.env, override = OVERRIDES.find(name => env[name])) {
  try { findPaseo(env, override); return 'paseo'; } catch { return 'plain'; }
}

/** Where a plain workspace's worktree goes: a sibling of the primary checkout, out of its searches and checks. */
export function plainParent(primary) {
  return `${primary}-workspaces`;
}

/** The marker's path for the linked worktree holding `dir`; null in the primary checkout or outside git. */
export function markerFile(dir) {
  let gitDir, commonDir;
  try {
    [gitDir, commonDir] = git(dir, 'rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir').split('\n');
  } catch { return null; }
  return gitDir && commonDir && gitDir !== commonDir ? path.join(gitDir, MARKER) : null;
}

/** The marker `{ title, madeAt, closedAt }` of the worktree holding `dir`, or null when WongStack did not make it. */
export function readMarker(dir) {
  const file = markerFile(dir);
  if (!file) return null;
  try {
    const marker = JSON.parse(readFileSync(file, 'utf8'));
    return marker && typeof marker === 'object' && !Array.isArray(marker) ? marker : null;
  } catch { return null; }
}

/** Writes the marker of the worktree holding `dir`, through a temp file and a rename. */
export function writeMarker(dir, marker) {
  const file = markerFile(dir);
  if (!file) throw new Error(`${dir} is not a linked worktree, so it takes no workspace marker.`);
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(marker, null, 2)}\n`);
  renameSync(temp, file);
}
