#!/usr/bin/env node
// One HTML page from a folder, put in the person's inbox as a plain page, shared with --share; with --file, it carries
// files its link downloads. wiki/development/plain-pages.md#a-plain-page
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { isMain, parseCli } from '../../memory/scripts/lib/cli.mjs';
import { inliner, local } from '../../plan/scripts/build-review.mjs';
import { companyFor, sharePage, upload, uploadPageFile } from '../../reply-link/scripts/lib/inbox.mjs';

const USAGE = `usage: page.mjs [<folder>] --title "<title>" [--file <path>]… [--id <id>] [--share]
  Reads <folder>/index.html, carries its styles, scripts, pictures and fonts inside it, and puts it in your inbox.
  --file   a file the page carries, which its link downloads; up to 5, each 25 MB at most. With no folder, the page
           shows each file's name and size
  --id     the page to replace, printed by an earlier run
  --share  share it with the team and print the team link`;
const KB = 1024, MB = 1024 * KB, WARN = 800 * KB, MAX = 1536 * KB;
/** The app's limits for a page's files: D1 keeps them in parts. */
const FILES = { page: 5, file: 25 * MB, name: 200 };
/** What the app's refusal of a file means, by its code. */
const REFUSALS = {
  too_large: "a page's file is 25 MB at most; zip or split it", pages_full: "the app's 1 GB for page files is full",
  bad_page_file: 'its bytes are not what its name says', not_page: 'that id is not a plain page; leave out --id',
};
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

/** Each `--file` path as the page carries it, `{ name, path, size }`; throws on a missing or empty file, or past the
 *  app's limits, before anything is sent. */
export function pageFiles(paths) {
  if (paths.length > FILES.page) throw new Error(`a page carries ${FILES.page} files at most`);
  const files = paths.map(path => {
    const name = basename(path);
    let stat;
    try { stat = statSync(path); } catch { throw new Error(`no file at ${path}`); }
    if (!stat.isFile() || stat.size === 0) throw new Error(`${path} is not a file with something in it`);
    if (stat.size > FILES.file) throw new Error(`${name} is ${Math.ceil(stat.size / MB)} MB; a page's file is 25 MB at most: zip or split it`);
    if (name.length > FILES.name || /[\\\p{Cc}]/u.test(name)) {
      throw new Error(`${JSON.stringify(name)} is not a name the inbox takes: 200 characters at most, no \\ or control characters`);
    }
    return { name, path, size: stat.size };
  });
  if (new Set(files.map(file => file.name)).size !== files.length) throw new Error('two files share a name; rename one');
  return files;
}

const escape = text => text.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** A file's size as the page shows it: *48 KB*, *2.4 MB*. */
export const sizeText = size => size < MB ? `${Math.max(1, Math.ceil(size / KB))} KB` : `${(size / MB).toFixed(1)} MB`;

/** The page a chat puts when it gives files and no folder: the title, and each file's name and size. */
export function filePage(title, files) {
  const rows = files.map(file => `<li><span>${escape(file.name)}</span><span class="size">${sizeText(file.size)}</span></li>`).join('');
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<base target="_blank"><style>body{margin:0;padding:16px;font:15px/1.5 system-ui,sans-serif;color:#171717;background:#fff}'
    + 'h1{font-size:18px;margin:0 0 12px}ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}'
    + 'li{display:flex;justify-content:space-between;gap:12px;border:1px solid #e5e5e5;border-radius:8px;padding:8px 12px;overflow-wrap:anywhere}'
    + '.size,p{color:#525252}</style></head>'
    + `<body><h1>${escape(title)}</h1><ul>${rows}</ul><p>Tap Download at the top to get ${files.length === 1 ? 'it' : 'them'} again.</p></body></html>`;
}

/** Uploads each of `files` for page `id`, one at a time: what the page names, `{ name, size, sha256 }`. */
async function uploadFiles(client, id, files) {
  const named = [];
  for (const file of files) {
    const bytes = readFileSync(file.path);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const answer = await uploadPageFile(client, id, { name: file.name, sha256, bytes });
    if (answer?.status !== 200) {
      const why = REFUSALS[answer?.value?.error?.code];
      throw new Error(`the inbox did not take ${file.name}${why ? `: ${why}` : `; sign in with ${SIGN_IN}, then run this again`}`);
    }
    named.push({ name: file.name, size: bytes.length, sha256 });
  }
  return named;
}

/** Puts the page in the person's inbox through `client`, its `files` uploaded first, and shares it when asked: its
 *  lines to print. A page with files prints a link that downloads them on open. */
export async function putPage(client, { html, title, id = randomBytes(16).toString('hex'), share = false, workspace, chat, files = [] }) {
  const named = await uploadFiles(client, id, files);
  const version = createHash('sha256').update(html).update(JSON.stringify(named)).digest('hex').slice(0, 16);
  const item = { id, kind: 'plan', title, workspace: workspace.slice(0, 100), body: html, actions: [], version, closesAt: Date.now(),
    plain: true, ...(chat && { chat: chat.slice(0, 128) }), ...(named.length && { files: named }) };
  if (!(await upload(client, item))) throw new Error(`the inbox did not take the page; sign in with ${SIGN_IN}, then run this again`);
  const origin = client.target();
  const lines = [`page: ${origin}/apps/inbox/?item=${id}${named.length ? '&download=1' : ''}`, `id: ${id} (pass --id ${id} to replace it)`];
  if (!share) return lines;
  const shared = await sharePage(client, id);
  if (!shared?.token) throw new Error('the page is in your inbox, but it was not shared; open it and tap Share with team');
  return [...lines, `team link: ${origin}/apps/inbox/?shared=${shared.token}`];
}

/** The command: 0 when the page is in the inbox, 1 when it is not, and 2 on a usage error. */
export async function main(args = process.argv.slice(2), connect = companyFor) {
  const { values, positionals } = parseCli({ usage: USAGE, allowPositionals: true, args,
    options: { title: { type: 'string' }, id: { type: 'string' }, share: { type: 'boolean' }, file: { type: 'string', multiple: true } } });
  const paths = values.file ?? [];
  if (positionals.length > 1 || positionals.length + paths.length === 0 || !values.title?.trim()
    || (values.id && !/^[0-9a-f]{32}$/.test(values.id))) {
    console.error(USAGE);
    return 2;
  }
  try {
    const title = values.title.trim().slice(0, 200);
    const files = pageFiles(paths);
    const { html, warnings } = positionals.length ? buildPage(positionals[0]) : { html: filePage(title, files), warnings: [] };
    for (const warning of warnings) console.error(`page: warning: ${warning}`);
    const client = await connect();
    if (!client) throw new Error(`you are not signed in to the app; run ${SIGN_IN}, then run this again`);
    const lines = await putPage(client, { html, title, id: values.id, share: values.share === true,
      workspace: basename(process.cwd()), chat: process.env.PASEO_AGENT_ID, files });
    console.log(lines.join('\n'));
    return 0;
  } catch (error) {
    console.error(`page: ${error.message}`);
    return 1;
  }
}

if (isMain(import.meta.url)) main().then(code => { process.exitCode = code; });
