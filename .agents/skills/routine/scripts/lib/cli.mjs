// The helpers every routine script shares, whatever app the chat runs in: the fixed exit codes,
// one error that carries a code, the `<command> [flags]` parser, and git.
//
// Exit codes: 0 ok, 2 bad input, 3 not ready (or Paseo not installed), 4 no answer (or Paseo's
// daemon not answering), 5 the other side's client or output has changed.
//
// Node built-ins only.

import { execFileSync } from 'node:child_process';

export const EXIT = { ok: 0, input: 2, noPaseo: 3, notReady: 3, noDaemon: 4, noAnswer: 4, client: 5 };

export class CliError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    this.extra = extra;
  }
}

/**
 * Parses `<command> [flags]`. `values` names the `--name <value>` flags, `booleans` maps a flag to its key
 * (`{ '--dry-run': 'dryRun' }`), and `positional` keeps bare words. Anything else is exit 2 with `unknown(arg)`,
 * the calling script's own message. Returns `{ command, flags, positional }`.
 */
export function parseCommand(argv, { values = [], booleans = {}, positional: keep = false, unknown }) {
  const [command, ...rest] = argv;
  const flags = {};
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (Object.hasOwn(booleans, arg)) flags[booleans[arg]] = true;
    else if (arg.startsWith('--') && values.includes(arg.slice(2))) {
      if (rest[i + 1] === undefined) throw new CliError(EXIT.input, `${arg} needs a value.`);
      flags[arg.slice(2)] = rest[++i];
    } else if (keep && !arg.startsWith('--')) positional.push(arg);
    else throw new CliError(EXIT.input, unknown(arg));
  }
  return { command, flags, positional };
}

/** `git -C cwd …`'s stdout, trailing whitespace trimmed; throws with `stderr` on a failure. */
export function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
}
