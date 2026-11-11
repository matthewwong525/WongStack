#!/usr/bin/env node
// The one way the loop reaches the project: a named part of `.agents/loop/profile.mjs`, the project's own file.
// A missing profile or part prints `SLOT=<name> empty` and exits 0, so a step always runs it. Doc: ../README.md
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMain, parseCli, usageError } from './lib/cli.mjs';

const USAGE = `usage: slot.mjs <name> [args…]        run the profile's part and print what it returns
       slot.mjs --run <name> [args…]  run the command the part returns, with the args after it, from the top folder

Prints SLOT=<name> empty, exit 0, when the profile or the part is missing.`;
export const PROFILE = '.agents/loop/profile.mjs';
/** This script's path, for a caller that runs a slot as its own process. */
export const SLOT = fileURLToPath(import.meta.url);

/** The checkout's top folder, or the folder itself outside Git. */
export function topOf(cwd = process.cwd()) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return cwd;
  }
}

/** The project's profile, `{}` when it has none. `WONG_LOOP_PROFILE` names another file, as a test does. */
export async function loadProfile(root = topOf()) {
  const file = process.env.WONG_LOOP_PROFILE || join(root, PROFILE);
  return existsSync(file) ? (await import(pathToFileURL(file).href)).default ?? {} : {};
}

/** `{ empty: true }`, or `{ value }`: the part called with `input`, or the part itself when it is not a function. */
export async function slot(name, input = {}, root = topOf()) {
  const part = (await loadProfile(root))[name];
  if (part === undefined || part === null) return { empty: true };
  return { value: typeof part === 'function' ? await part({ root, ...input }) : part };
}

/** Runs a part's command string with `args` after it; its exit code. */
export const runCommand = (command, args = [], options = {}) => spawnSync('sh', ['-c', `${command} "$@"`, 'sh', ...args], { stdio: 'inherit', ...options }).status ?? 1;
const print = value => {
  if (value === undefined || value === null) return;
  if (typeof value === 'number') process.exitCode = value;
  else console.log(typeof value === 'string' || typeof value === 'boolean' ? String(value) : JSON.stringify(value));
};

if (isMain(import.meta.url)) {
  // Flags come before the name; everything after it is the part's own.
  const argv = process.argv.slice(2);
  const at = argv.findIndex(arg => !arg.startsWith('-'));
  const { values } = parseCli({ usage: USAGE, options: { run: { type: 'boolean' } }, args: at === -1 ? argv : argv.slice(0, at) });
  if (at === -1) usageError(USAGE, 'name a slot');
  const [name, ...args] = argv.slice(at);
  const found = await slot(name, { args });
  // A part that returns nothing for --run, such as a pre-check a checkout lacks, is empty too.
  if (found.empty || (values.run && found.value == null)) console.log(`SLOT=${name} empty`);
  else if (!values.run) print(found.value);
  else if (typeof found.value !== 'string') usageError(USAGE, `--run: ${name} returns no command`);
  else process.exitCode = runCommand(found.value, args, { cwd: topOf() });
}
