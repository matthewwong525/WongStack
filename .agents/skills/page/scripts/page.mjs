#!/usr/bin/env node
// One HTML page from a folder, every file carried inside it, put in the person's inbox as a plain page and, with
// --share, shared with the team. wiki/development/plain-pages.md#a-plain-page
import { createHash, randomBytes } from 'node:crypto';
import { basename, dirname, resolve } from 'node:path';
import { isMain, parseCli } from '../../memory/scripts/lib/cli.mjs';
import { inliner, local } from '../../plan/scripts/build-review.mjs';
import { companyFor, sharePage, upload } from '../../reply-link/scripts/lib/inbox.mjs';

const USAGE = `usage: page.mjs <folder> --title "<title>" [--id <id>] [--share]
  Reads <folder>/index.html, carries its styles, scripts, pictures and fonts inside it, and puts it in your inbox.
  --id     the page to replace, printed by an earlier run
  --share  share it with the team and print the team link`;
const KB = 1024, WARN = 800 * KB, MAX = 1536 * KB;
const SIGN_IN = 'node scripts/company-api.mjs login';

/** `html` with `<base target="_blank">`, so a link opens its own tab, never inside the frame, and each `#` link with no
 *  target stays in the page. Keep in step with its twin in app/worker/apps/inbox/sealed.ts. */
export function linksOpenOwnTab(html) {
  if (/<base[\s>]/i.test(html)) return html;
  html = html.replace(/<a\b(?![^>]*\starget\s*=)([^>]*\shref\s*=\s*["']#)/gi, '<a target="_self"$1');
  const head = /<head(\s[^>]*)?>/i.exec(html);
  // Before a doctype, the tag would put the page in quirks mode.
  const at = head ? head.index + head[0].length : /^\s*<!doctype[^>]*>/i.exec(html)?.[0].length ?? 0;
  return `${html.slice(0, at)}<base target="_blank">${html.slice(at)}`;
}

/** The folder's index.html as one sealed-ready document, and its warnings; throws on a web address, a missing file or
 *  a page over 1.5 MB. */
export function buildPage(folder) {
  const root = resolve(folder);
  const stop = why => { throw new Error(why); };
  const { real, bytes } = local('index.html', root, root, stop, `no index.html in ${folder}`);
  const html = linksOpenOwnTab(inliner(root, stop, 'a page')(bytes.toString('utf8'), dirname(real)));
  const size = Buffer.byteLength(html);
  if (size > MAX) stop(`the page is ${Math.ceil(size / KB)} KB; keep a page under 1.5 MB: use smaller pictures`);
  const warnings = size > WARN ? [`the page is ${Math.ceil(size / KB)} KB; a page over 800 KB is slow on a phone`] : [];
  return { html, warnings };
}

/** Puts the page in the person's inbox through `client`, and shares it when asked: its lines to print. */
export async function putPage(client, { html, title, id = randomBytes(16).toString('hex'), share = false, workspace, chat }) {
  const version = createHash('sha256').update(html).digest('hex').slice(0, 16);
  const item = { id, kind: 'plan', title, workspace: workspace.slice(0, 100), body: html, actions: [], version, closesAt: Date.now(),
    plain: true, ...(chat && { chat: chat.slice(0, 128) }) };
  if (!(await upload(client, item))) throw new Error(`the inbox did not take the page; sign in with ${SIGN_IN}, then run this again`);
  const origin = client.target();
  const lines = [`page: ${origin}/apps/inbox/?item=${id}`, `id: ${id} (pass --id ${id} to replace it)`];
  if (!share) return lines;
  const shared = await sharePage(client, id);
  if (!shared?.token) throw new Error('the page is in your inbox, but it was not shared; open it and tap Share with team');
  return [...lines, `team link: ${origin}/apps/inbox/?shared=${shared.token}`];
}

/** The command: 0 when the page is in the inbox, 1 when it is not, and 2 on a usage error. */
export async function main(args = process.argv.slice(2), connect = companyFor) {
  const { values, positionals } = parseCli({ usage: USAGE, allowPositionals: true, args,
    options: { title: { type: 'string' }, id: { type: 'string' }, share: { type: 'boolean' } } });
  if (positionals.length !== 1 || !values.title?.trim() || (values.id && !/^[0-9a-f]{32}$/.test(values.id))) {
    console.error(USAGE);
    return 2;
  }
  try {
    const { html, warnings } = buildPage(positionals[0]);
    for (const warning of warnings) console.error(`page: warning: ${warning}`);
    const client = await connect();
    if (!client) throw new Error(`you are not signed in to the app; run ${SIGN_IN}, then run this again`);
    const lines = await putPage(client, { html, title: values.title.trim().slice(0, 200), id: values.id, share: values.share === true,
      workspace: basename(process.cwd()), chat: process.env.PASEO_AGENT_ID });
    console.log(lines.join('\n'));
    return 0;
  } catch (error) {
    console.error(`page: ${error.message}`);
    return 1;
  }
}

if (isMain(import.meta.url)) main().then(code => { process.exitCode = code; });
