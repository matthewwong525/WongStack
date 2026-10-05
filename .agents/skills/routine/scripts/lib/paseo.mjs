// The Paseo helpers: find the `paseo` binary, make one `--json` call, and name each failure with a
// fixed exit code. Only a script that calls Paseo imports this file; lib/cli.mjs holds what every
// script shares, and its names are passed on here for the Paseo scripts.
//
// Exit codes: 0 ok, 2 bad input, 3 Paseo not installed, 4 daemon not
// answering, 5 Paseo's client or output has changed.
//
// Node built-ins only.

import { execFile } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { CliError, EXIT, parseCommand as parse } from './cli.mjs';

export { CliError, EXIT, git } from './cli.mjs';

export class PaseoError extends CliError {}

/** lib/cli.mjs's parseCommand, failing as a PaseoError: a Paseo script catches only that. */
export function parseCommand(argv, options) {
  try {
    return parse(argv, options);
  } catch (error) {
    if (error instanceof CliError) throw new PaseoError(error.code, error.message, error.extra);
    throw error;
  }
}

/** The `paseo` binary: `env[override]` when set, else the first on PATH; exit 3 when none. */
export function findPaseo(env, override) {
  const candidates = env[override]
    ? [env[override]]
    : (env.PATH ?? '').split(path.delimiter).filter(Boolean).map(d => path.join(d, 'paseo'));
  for (const file of candidates) {
    try { accessSync(file, constants.X_OK); return file; } catch { /* next */ }
  }
  throw new PaseoError(EXIT.noPaseo, 'Paseo is not installed: no `paseo` command on PATH.');
}

const DAEMON_DOWN = /Cannot connect to daemon|DAEMON_NOT_RUNNING|DAEMON_UNREACHABLE|ECONNREFUSED/i;

/**
 * One public `paseo … --json` call. Returns the parsed stdout (or its trimmed
 * text) and the stderr text. Exit 4 when the daemon does not answer; any other
 * failure is exit 2 with Paseo's own message.
 */
export async function runPaseo(bin, args, { env } = {}) {
  try {
    const { stdout, stderr } = await promisify(execFile)(bin, [...args, '--json'], {
      encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...(env ? { env } : {}),
    });
    let data;
    try { data = JSON.parse(stdout); } catch { data = stdout.trim(); }
    return { data, stderr: stderr ?? '' };
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    if (DAEMON_DOWN.test(out)) {
      throw new PaseoError(EXIT.noDaemon, 'The Paseo daemon does not answer. Start it with `paseo daemon start`.');
    }
    throw new PaseoError(EXIT.input, `paseo ${args.slice(0, 2).join(' ')} failed: ${out.trim() || error.message}`);
  }
}

/** runPaseo, returning only the parsed stdout. */
export async function paseo(bin, args, options) {
  return (await runPaseo(bin, args, options)).data;
}
