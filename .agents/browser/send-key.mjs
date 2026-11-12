// WongStack's `sendKey` slot: a tool's key saved in the primary app/.dev.vars, then sent sealed through the company app,
// or put by wrangler for an app with no lock for keys yet. wiki/stack/connect-your-tools.md#how-a-key-reaches-the-app
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { masked } from '../skills/browser/scripts/mask-keys.mjs';
import { primaryRoot } from '../skills/memory/scripts/lib/primary-root.mjs';

/** Sets `name` in a dotenv file, readable by its owner alone, keeping every other line. */
function setVar(file, name, value) {
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(line => !line.startsWith(`${name}=`)) : [];
  while (lines.at(-1) === '') lines.pop();
  writeFileSync(file, `${[...lines, `${name}=${value}`].join('\n')}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
}

/** This computer's Cloudflare login from the primary `.env`, under the environment's own, so wrangler can save. */
function cloudflareEnv(primary) {
  const file = join(primary, '.env');
  const saved = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
  const login = Object.fromEntries(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'].filter(name => saved[name]).map(name => [name, saved[name]]));
  return { ...login, ...process.env };
}

/** Runs a script of the worktree with `value` on its stdin alone. */
const withValue = (worktree, [script, ...args], value, env = process.env) =>
  spawnSync(process.execPath, [join(worktree, 'scripts', script), ...args], { cwd: worktree, env, input: value, encoding: 'utf8' });

/** The last line a run printed, every copy of `value` in it masked. */
const lastLine = (run, value) => `${run.stdout}${run.stderr}`.split(value).join(masked(value)).trim().split('\n').at(-1);

/** The `{code, message}` a refusal prints on stdout, or null. */
const refusal = out => { try { return JSON.parse(out).error ?? null; } catch { return null; } };

/** Sends `name` sealed through the company app, under the person's company login; null once sent, else the
 *  refusal's code and why. */
function sendSealed(worktree, name, value) {
  const sent = withValue(worktree, ['company-api.mjs', 'key', 'send', name, '--value-stdin'], value);
  if (sent.status === 0) return null;
  const { code, message } = refusal(sent.stdout) ?? {};
  return { code, why: (code ? [code, message].filter(Boolean).join(': ') : lastLine(sent, value)) || 'company-api.mjs gave no answer' };
}

/** The old way, for an app with no lock for keys yet: wrangler with this computer's Cloudflare login. */
function putTool(worktree, env, name, value, ends) {
  const sent = withValue(worktree, ['cf-secrets.mjs', 'put-tool', name], value, env);
  if (sent.status !== 0) throw new Error(`${name} is saved on this computer, ${ends}, but not on the live app: ${lastLine(sent, value)}`);
  // A put refused while a newer version waits lands on that version: say so, never that the live app has it.
  return { said: /next publish/.test(sent.stdout) ? `saved on this computer, ${ends}; it reaches the live app at the next publish` : `saved, ${ends}` };
}

/** Keeps the key in the primary checkout's ignored app/.dev.vars and sends it: null once sent, `{ said }` once put
 *  the old way, else `{ code, why }`. */
export function sendKey(name, value) {
  const { primary, root: worktree } = primaryRoot();
  setVar(join(primary, 'app', '.dev.vars'), name, value);
  const refused = sendSealed(worktree, name, value);
  if (!refused) return null;
  const env = cloudflareEnv(primary);
  return refused.code === 'no_seal' && env.CLOUDFLARE_API_TOKEN ? putTool(worktree, env, name, value, `ends in …${value.slice(-4)}`) : refused;
}
