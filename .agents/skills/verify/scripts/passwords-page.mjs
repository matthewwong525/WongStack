// The password page's script (see hand-over.mjs `open --passwords` and passwords.mjs). One screen
// holds one list: a CSV password export, dropped anywhere on the page or picked, is read on this
// device and joins the list with none ticked; a login typed or filled into the form joins it ticked.
// *Save* sends only the ticked logins, plus a filled form not yet added, to `POST /save`; the file
// itself is never sent. *Done* posts `/done`, which closes the link. The pure `parseExport` and
// `siteUrl` are exported for the tests; the rest runs only in a browser.

const SITE = ['url', 'login_uri', 'website', 'web site'];
const USER = ['username', 'login_username', 'login', 'email', 'user name'];
const PASS = ['password', 'login_password'];
const LABEL = ['name', 'title'];
const FIELD_LIMIT = 1024;
const MESSAGES = {
  unreadable: 'This file isn\'t a password export. Export as CSV from your password manager.',
  empty: 'This file has no logins with a website and a password.',
  tooMany: 'That\'s too many at once. Tick fewer, save, then save the rest.',
  failed: 'Couldn\'t save. Try again.',
  badSite: 'Enter the website, like netflix.com.',
};

const long = value => value.length > FIELD_LIMIT;

/** RFC 4180 rows: quoted fields, doubled quotes, and newlines inside quotes; blank lines dropped. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const endRow = () => { row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted && c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (quoted) cell += c;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; endRow(); }
    else cell += c;
  }
  if (cell || row.length) endRow();
  return rows;
}

/** A typed or exported site as a URL: a bare `netflix.com` gets `https://`; anything else stays. */
export function siteUrl(text) {
  const site = String(text ?? '').trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(site) || !/^[^\s/:@]+\.[^\s/:@]+/.test(site) ? site : `https://${site}`;
}

/** An http(s) URL's host, lowercased, `www.` stripped; '' for anything else. */
function hostOf(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return /^https?:$/.test(protocol) ? hostname.toLowerCase().replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}

/**
 * A password manager's CSV export as `{url, host, username, password, label}` logins, sorted by host,
 * one per host and username; null when it has no site or password column. Rows with no username or
 * password, whose site isn't http(s), such as `android://`, or that the server would refuse are
 * skipped; other columns, such as notes and one-time code secrets, are dropped.
 */
export function parseExport(text) {
  const [header, ...rows] = parseCsv(String(text ?? '').replace(/^\uFEFF/, ''));
  const names = (header ?? []).map(name => name.trim().toLowerCase());
  const column = aliases => aliases.map(alias => names.indexOf(alias)).find(index => index >= 0) ?? -1;
  const [site, user, pass, label] = [SITE, USER, PASS, LABEL].map(column);
  if (site < 0 || pass < 0) return null;
  const seen = new Set();
  const logins = [];
  for (const row of rows) {
    const url = siteUrl(row[site]);
    const host = hostOf(url);
    const username = (row[user] ?? '').trim();
    const password = row[pass] ?? '';
    const id = `${host}\n${username}`;
    if (!host || !username || !password || /[\r\n]/.test(username) || [url, username, password].some(long) || seen.has(id)) continue;
    seen.add(id);
    logins.push({ url, host, username, password, label: (row[label] ?? '').trim() });
  }
  return logins.sort((a, b) => a.host.localeCompare(b.host) || a.username.localeCompare(b.username));
}

const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;
const byHost = (a, b) => a.host.localeCompare(b.host) || a.username.localeCompare(b.username);
const SEARCH_FROM = 9;

function start() {
  const $ = selector => document.querySelector(selector);
  const key = new URLSearchParams(location.hash.slice(1)).get('key') ?? '';
  history.replaceState(null, '', location.pathname);
  // Rows are `{url, host, username, password, label, source: 'file' | 'typed', state: 'open' | 'saved'}`,
  // one per `id`: host and username. Ticks are kept by id, so sorting and merging never move them.
  let logins = [];
  const ticked = new Set();
  const savedHosts = new Set();
  let saving = false;
  let doneArmed = false;

  const idOf = login => `${login.host}\n${login.username}`;
  const show = id => { for (const section of document.querySelectorAll('section')) section.hidden = section.id !== id; };
  const note = (id, text) => { const line = $(id); line.textContent = text ?? ''; line.hidden = !text; };
  const post = (path, body) => fetch(path, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'x-hand-over-key': key, 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  }).catch(() => null);
  const closed = () => { logins = []; ticked.clear(); $('#add-form').reset(); show('closed'); };
  const stillOpen = () => fetch('page.mjs', { cache: 'no-store' }).then(response => response.ok, () => false);

  /** Saves the logins; resolves to `{saved, failed}`, or an error message, or null once the link has closed. */
  async function save(list) {
    const response = await post('save', { logins: list.map(({ url, username, password }) => ({ url, username, password })) });
    if (response?.ok) return response.json();
    if (!response || response.status === 403) return (await stillOpen()) ? MESSAGES.failed : null;
    return response.status === 413 ? MESSAGES.tooMany : MESSAGES.failed;
  }

  /** The form's login when all three fields hold text and the site parses; null otherwise. */
  function formLogin() {
    const url = siteUrl($('#site').value);
    const username = $('#username').value.trim();
    const password = $('#password').value;
    const host = hostOf(url);
    return host && username && password ? { url, host, username, password, label: '' } : null;
  }
  const pending = () => logins.filter(login => login.state === 'open' && ticked.has(idOf(login)));
  const disarmDone = () => { doneArmed = false; note('#done-note'); };

  function drawCount() {
    const ids = new Set(pending().map(idOf));
    const typed = formLogin();
    if (typed) ids.add(idOf(typed));
    const button = $('#save');
    button.textContent = `Save ${plural(ids.size, 'login')}`;
    button.disabled = saving || !ids.size;
  }

  function filter() {
    const words = $('#search').value.trim().toLowerCase();
    for (const item of $('#logins').children) item.hidden = !item.dataset.words.includes(words);
  }

  function draw() {
    $('#list').hidden = !logins.length;
    $('#list-title').textContent = plural(logins.length, 'login');
    const search = $('#search');
    search.hidden = logins.length < SEARCH_FROM;
    if (search.hidden) search.value = '';
    const scroll = $('#logins').scrollTop;
    $('#logins').replaceChildren(...logins.map((login, index) => {
      const id = idOf(login);
      const saved = login.state === 'saved';
      const box = Object.assign(document.createElement('input'), { type: 'checkbox', id: `login-${index}`, checked: !saved && ticked.has(id), disabled: saved });
      box.addEventListener('change', () => {
        if (box.checked) ticked.add(id); else ticked.delete(id);
        disarmDone();
        drawCount();
      });
      const host = Object.assign(document.createElement('span'), { className: 'host', textContent: login.host });
      const user = Object.assign(document.createElement('span'), { className: 'user', textContent: login.username });
      const label = Object.assign(document.createElement('label'), { htmlFor: box.id });
      label.append(box, host, user);
      if (saved) label.append(Object.assign(document.createElement('span'), { className: 'tag', textContent: 'Saved' }));
      const item = document.createElement('li');
      item.dataset.words = `${login.host} ${login.username} ${login.label}`.toLowerCase();
      item.append(label);
      return item;
    }));
    $('#logins').scrollTop = scroll;
    filter();
    drawCount();
  }

  // A file's logins join unticked, skipping any already listed.
  function mergeFile(found) {
    const ids = new Set(logins.map(idOf));
    for (const login of found) if (!ids.has(idOf(login))) logins.push({ ...login, source: 'file', state: 'open' });
    logins.sort(byHost);
    draw();
  }

  // A typed login joins ticked; one already listed takes its site and password, and opens again if saved.
  function addTyped(typed) {
    const id = idOf(typed);
    const row = logins.find(login => idOf(login) === id);
    if (row) Object.assign(row, { url: typed.url, password: typed.password, source: 'typed', state: 'open' });
    else logins.push({ ...typed, source: 'typed', state: 'open' });
    logins.sort(byHost);
    ticked.add(id);
    $('#add-form').reset();
    note('#add-error');
    disarmDone();
    draw();
  }

  async function readFile(file) {
    if (!file) return;
    const found = parseExport(await file.text().catch(() => ''));
    note('#file-error', !found ? MESSAGES.unreadable : !found.length ? MESSAGES.empty : '');
    if (found?.length) mergeFile(found);
  }

  // The file: tapped to pick, or dropped anywhere, so a near miss never opens it in the tab.
  $('#drop').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', () => {
    const file = $('#file').files[0];
    $('#file').value = '';
    return readFile(file);
  });
  const hasFiles = event => [...(event.dataTransfer?.types ?? [])].includes('Files');
  for (const type of ['dragenter', 'dragover']) {
    document.addEventListener(type, event => {
      event.preventDefault();
      if (hasFiles(event)) $('#drop').classList.add('over');
    });
  }
  document.addEventListener('dragleave', event => { if (!event.relatedTarget) $('#drop').classList.remove('over'); });
  document.addEventListener('drop', event => {
    event.preventDefault();
    $('#drop').classList.remove('over');
    return readFile(event.dataTransfer?.files?.[0]);
  });

  $('#search').addEventListener('input', filter);

  // One login, typed or filled by a password manager.
  $('#add-form').addEventListener('input', drawCount);
  $('#add-form').addEventListener('submit', event => {
    event.preventDefault();
    const typed = formLogin();
    if (!typed) return note('#add-error', hostOf(siteUrl($('#site').value)) ? '' : MESSAGES.badSite);
    addTyped(typed);
  });

  // One Save for every ticked login, and a filled form not yet added.
  $('#save').addEventListener('click', async () => {
    const typed = formLogin();
    if (typed) addTyped(typed);
    const list = pending();
    if (!list.length || saving) return;
    saving = true;
    disarmDone();
    drawCount();
    const result = await save(list);
    saving = false;
    if (result === null) return closed();
    if (typeof result === 'string') {
      note('#list-error', result);
      return drawCount();
    }
    const failed = new Set(result.failed.map(at => idOf(list[at])));
    for (const login of list) {
      if (failed.has(idOf(login))) continue;
      login.state = 'saved';
      ticked.delete(idOf(login));
      if (login.source === 'file') $('#delete-file').hidden = false;
    }
    for (const { host } of result.saved) savedHosts.add(host);
    note('#status', savedHosts.size ? `Saved: ${[...savedHosts].join(', ')}` : '');
    const sites = list.filter(login => failed.has(idOf(login))).map(login => login.host);
    note('#list-error', sites.length ? `Couldn't save ${[...new Set(sites)].join(', ')}. Try again.` : '');
    draw();
  });

  // Done closes the link; with ticked logins not yet saved, it asks for a second tap.
  $('#done').addEventListener('click', async () => {
    const left = pending().length;
    if (left && !doneArmed) {
      doneArmed = true;
      return note('#done-note', `${plural(left, 'ticked login')} ${left === 1 ? 'isn\'t' : 'aren\'t'} saved. Tap Done again to leave without ${left === 1 ? 'it' : 'them'}.`);
    }
    $('#done').disabled = true;
    await post('done');
    closed();
  });

  draw();
  if (!key) closed();
}

if (typeof document !== 'undefined') start();
