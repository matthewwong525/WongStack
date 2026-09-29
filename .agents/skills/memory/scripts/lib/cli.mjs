// One CLI convention for every WongStack script: `--help` prints usage and exits 0, a usage
// error prints to stderr and exits 2, and an unknown flag is a usage error.
// Skills import it by path, like primary-root.mjs; scripts/lib-cli.mjs re-exports it for the pack.
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

/** True when the module at `url` is the script node was started with, even through a symlink. */
export function isMain(url) {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url));
  } catch {
    return false;
  }
}

/** Print a usage error and exit 2. */
export function usageError(usage, message) {
  console.error(message ? `${message}\n${usage}` : usage);
  process.exit(2);
}

/** Strict `parseArgs` with `--help`. Returns `{ values, positionals }`. */
export function parseCli({ usage, options = {}, allowPositionals = false, args = process.argv.slice(2) }) {
  let parsed;
  try {
    parsed = parseArgs({ args, options: { ...options, help: { type: 'boolean' } }, allowPositionals, strict: true });
  } catch (error) {
    usageError(usage, error.message);
  }
  if (parsed.values.help) {
    console.log(usage);
    process.exit(0);
  }
  return parsed;
}
