#!/usr/bin/env node
// Adds WongStack's agent presets (paseo-presets.json beside this file) to this
// machine's Paseo: `daemon.agentProfiles` in <home>/config.json, then
// `paseo reload`. Add-missing only: a preset whose id or name is already there
// is kept as it is, and one whose agent command (`claude`, `codex`) is not on
// PATH is skipped. Every other setting stays as it was.
//
// Home is --home, else PASEO_HOME, else ~/.paseo. It writes only a config.json
// Paseo already made, through a temp file and a rename, keeping the file's mode.
//
// Prints one JSON object on stdout: { ok, added, kept, skipped, reloaded }, names
// only. Exit codes: 0 ok, 2 bad input, 3 Paseo not installed or not set up,
// 5 the config is not what Paseo writes. On 3 and 5 nothing was written. A daemon
// that does not answer the reload is `reloaded: false` with a warning, not a failure.
//
// Node built-ins only. PRESETS_PASEO_BIN overrides the `paseo` found on PATH.

import { accessSync, constants, readFileSync, renameSync, rmSync, statSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { EXIT, PaseoError, findPaseo, parseCommand, runPaseo } from './lib/paseo.mjs';

const USAGE = 'usage: presets.mjs add [--dry-run] [--home <paseo home>]';
const PRESETS = fileURLToPath(new URL('paseo-presets.json', import.meta.url));

// ---------------------------------------------------------------------------
// Pure helpers

/** WongStack's presets, from paseo-presets.json. */
export function loadPresets(file = PRESETS) {
  return JSON.parse(readFileSync(file, 'utf8')).presets;
}

/**
 * Sorts each preset into added, kept, or skipped against the existing profiles.
 * `installed(provider)` says whether that agent's command is on PATH.
 */
export function plan(profiles, presets, installed) {
  const ids = new Set(profiles.map(p => p?.id));
  const names = new Set(profiles.map(p => p?.name));
  const out = { added: [], kept: [], skipped: [] };
  for (const preset of presets) {
    if (ids.has(preset.id) || names.has(preset.name)) out.kept.push(preset);
    else if (!installed(preset.provider)) out.skipped.push(preset);
    else out.added.push(preset);
  }
  return out;
}

/** The config with `presets` appended to `daemon.agentProfiles`; every other key untouched. */
export function withPresets(config, presets) {
  const daemon = config.daemon ?? {};
  return { ...config, daemon: { ...daemon, agentProfiles: [...(daemon.agentProfiles ?? []), ...presets] } };
}

// ---------------------------------------------------------------------------
// Environment

/** True when an executable `name` is on env.PATH. */
function onPath(env, name) {
  for (const dir of (env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
    try { accessSync(path.join(dir, name), constants.X_OK); return true; } catch { /* next */ }
  }
  return false;
}

function paseoHome(flags, env) {
  if (flags.home) return path.resolve(flags.home);
  if (env.PASEO_HOME) return path.resolve(env.PASEO_HOME);
  return path.join(env.HOME || homedir(), '.paseo');
}

function readConfig(file) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch (error) {
    if (error.code === 'ENOENT') {
      throw new PaseoError(EXIT.noPaseo, `Paseo is not set up yet: no ${file}. Start Paseo once, then run this again.`);
    }
    throw new PaseoError(EXIT.input, `Cannot read ${file}: ${error.code ?? error.message}.`);
  }
  let config;
  try { config = JSON.parse(text); } catch {
    throw new PaseoError(EXIT.client, `${file} is not valid JSON; nothing was written.`);
  }
  const profiles = config?.daemon?.agentProfiles;
  if (!config || typeof config !== 'object' || Array.isArray(config)
    || (config.daemon !== undefined && (typeof config.daemon !== 'object' || config.daemon === null || Array.isArray(config.daemon)))
    || (profiles !== undefined && !Array.isArray(profiles))) {
    throw new PaseoError(EXIT.client, `${file} is not in the shape Paseo writes; nothing was written.`);
  }
  return config;
}

/** Writes `text` over `file` through a temp file and a rename in the same folder, keeping its mode. */
function writeAtomic(file, text) {
  const mode = statSync(file).mode & 0o777;
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  try {
    writeFileSync(temp, text, { mode });
    chmodSync(temp, mode);
    renameSync(temp, file);
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Command

async function add(flags, env) {
  const bin = findPaseo(env, 'PRESETS_PASEO_BIN');
  const home = paseoHome(flags, env);
  const file = path.join(home, 'config.json');
  const config = readConfig(file);
  const sorted = plan(config.daemon?.agentProfiles ?? [], loadPresets(), provider => onPath(env, provider));
  const report = {
    ok: true,
    ...(flags.dryRun ? { dryRun: true } : {}),
    added: sorted.added.map(p => p.name),
    kept: sorted.kept.map(p => p.name),
    skipped: sorted.skipped.map(p => p.name),
    reloaded: false,
  };
  if (flags.dryRun || !sorted.added.length) return report;
  writeAtomic(file, `${JSON.stringify(withPresets(config, sorted.added), null, 2)}\n`);
  try {
    await runPaseo(bin, ['reload', '--home', home], { env });
    report.reloaded = true;
  } catch (error) {
    report.warning = `The presets are saved, but Paseo did not reload: ${error.message} They show up after Paseo restarts.`;
  }
  return report;
}

async function main(argv = process.argv.slice(2), env = process.env) {
  if (argv.length === 0 || argv.includes('--help')) { process.stdout.write(`${USAGE}\n`); return EXIT.ok; }
  try {
    const { command, flags } = parseCommand(argv, { values: ['home'], booleans: { '--dry-run': 'dryRun' }, unknown: arg => `Unknown argument ${arg}.` });
    if (command !== 'add') throw new PaseoError(EXIT.input, `Unknown command "${command}". Use add.`);
    process.stdout.write(`${JSON.stringify(await add(flags, env), null, 2)}\n`);
    return EXIT.ok;
  } catch (error) {
    const code = error instanceof PaseoError ? error.code : 1;
    process.stdout.write(`${JSON.stringify({ ok: false, code, error: error.message }, null, 2)}\n`);
    return code;
  }
}

if (isMain(import.meta.url)) process.exitCode = await main();
