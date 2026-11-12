// WongStack's side of the browser module: the one file the module loads, each slot filled from WongStack's own code.
// The slots, and what each does when empty: ../plugins/browser/browser/README.md#slots
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const lazy = (file, name) => async (...args) => (await import(file))[name](...args);
const INBOX = '../skills/reply-link/scripts/lib/inbox.mjs';
/** A tool's key added from a chat, as `scripts/lib-staging-secrets.mjs` names it: no example file declares it, and
 * `secrets:push` sends it to the live app alone. */
const TOOL_KEY = /^TOOL_[A-Z][A-Z0-9_]*$/;

/** The app's look and the light and dark switch, as the plan's review page has them. */
async function look() {
  const { lookCss } = await import('../plugins/loop/skills/plan/scripts/look.mjs');
  return { css: lookCss(), themeJs: readFileSync(new URL('../plugins/loop/skills/plan/references/theme.js', import.meta.url), 'utf8') };
}

/** Wakes the chat that opened the link: the link's watcher runs in that chat's environment, so it names the chat. */
async function wakeChat(state, message) {
  const wake = await import('../skills/reply-link/scripts/lib/wake.mjs');
  return wake.wakeChat({ ...wake.chatTarget(), ...state }, message);
}

/** The two key files, each taking the names its example declares; an undeclared tool's key goes to the app's file,
 * which reaches the live app through `npm run secrets:push`. A seeded branch copy of either is written too. */
async function keyFiles(ctx) {
  const { declarations } = await import('../skills/hand-over/scripts/keys.mjs');
  const { loadBase } = await import('../loop/worktree-secrets.mjs');
  const declared = example => { try { return declarations(readFileSync(join(ctx.root, example), 'utf8')); } catch { return new Map(); } };
  const copy = rel => { try { return ctx.linked && loadBase(ctx)?.files?.[rel] ? join(ctx.root, rel) : null; } catch { return null; } };
  const env = declared('.env.example');
  const app = declared('app/.dev.vars.example');
  const tool = name => (TOOL_KEY.test(name) && !env.has(name) ? 'The key for a tool added from a chat.' : null);
  return [
    { file: '.env', names: name => env.get(name), copy: copy('.env') },
    { file: 'app/.dev.vars', names: name => app.get(name) ?? tool(name), app: true, copy: copy('app/.dev.vars') },
  ];
}

export default {
  look,
  wakeChat,
  // The app's inbox lists each private link while it is open.
  inbox: { companyFor: lazy(INBOX, 'companyFor'), listLink: lazy(INBOX, 'listLink'), closeItem: lazy(INBOX, 'closeItem'), inTime: lazy(INBOX, 'inTime') },
  keyFiles,
  // A tool's key from connect's browser, sent sealed through the app.
  sendKey: lazy('./send-key.mjs', 'sendKey'),
};
