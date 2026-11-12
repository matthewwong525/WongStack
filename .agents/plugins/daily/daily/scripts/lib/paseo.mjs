// The helpers the routine scripts share: find the Paseo binary, make one `--json` call, name each
// failure with a fixed exit code, parse `<command> [flags]`, and run git.

import { execFile, execFileSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

export const EXIT = { ok: 0, input: 2, noPaseo: 3, noDaemon: 4, client: 5 };

export class PaseoError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    this.extra = extra;
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

/** `args` with `--json`, ahead of a closing `--` and prompt, so it is never read as the prompt. */
export function withJson(args) {
  return args.at(-2) === '--' ? [...args.slice(0, -2), '--json', ...args.slice(-2)] : [...args, '--json'];
}

// One public `paseo … --json` call: the parsed stdout (or its trimmed text) and the stderr text. Exit 4 when the
// daemon does not answer; any other failure is exit 2 with Paseo's own message.
export async function runPaseo(bin, args, { env } = {}) {
  try {
    const { stdout, stderr } = await promisify(execFile)(bin, withJson(args), {
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

// Parses `<command> [flags]` into `{ command, flags, positional }`. `values` names the `--name <value>` flags and
// `booleans` maps a flag to its key (`{ '--dry-run': 'dryRun' }`); anything else is exit 2 with `unknown(arg)`.
export function parseCommand(argv, { values = [], booleans = {}, positional: keep = false, unknown }) {
  const [command, ...rest] = argv;
  const flags = {};
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (Object.hasOwn(booleans, arg)) flags[booleans[arg]] = true;
    else if (arg.startsWith('--') && values.includes(arg.slice(2))) {
      if (rest[i + 1] === undefined) throw new PaseoError(EXIT.input, `${arg} needs a value.`);
      flags[arg.slice(2)] = rest[++i];
    } else if (keep && !arg.startsWith('--')) positional.push(arg);
    else throw new PaseoError(EXIT.input, unknown(arg));
  }
  return { command, flags, positional };
}

/** `git -C cwd …`'s stdout, trailing whitespace trimmed; throws with `stderr` on a failure. */
export function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
}
