// The password page's script (see hand-over.mjs `open --passwords` and passwords.mjs). The person
// either picks a CSV password export, which this device reads and lists with none ticked, or fills one
// login. Only the ticked or filled logins go to `POST /save`; the file itself is never sent. `Done`
// posts `/done`, which closes the link. The pure `parseExport` and `siteUrl` are exported for the
// tests; the rest runs only in a browser.

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

function start() {
  const $ = selector => document.querySelector(selector);
  const key = new URLSearchParams(location.hash.slice(1)).get('key') ?? '';
  history.replaceState(null, '', location.pathname);
  let logins = [];
  const ticked = new Set();

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

  function showSaved(saved, fromFile) {
    $('#saved-title').textContent = `Saved ${plural(saved.length, 'login')}:`;
    $('#saved-sites').textContent = [...new Set(saved.map(login => login.host))].join(', ');
    $('#delete-file').hidden = !fromFile;
    show('saved');
  }

  // The export: read here, listed with none ticked, searched by site, username, or name.
  function drawList() {
    const button = $('#save-ticked');
    button.textContent = `Save ${plural(ticked.size, 'login')}`;
    button.disabled = !ticked.size;
  }
  function listLogins() {
    ticked.clear();
    $('#list-title').textContent = `${plural(logins.length, 'login')} in your file`;
    $('#search').value = '';
    $('#logins').replaceChildren(...logins.map((login, index) => {
      const box = Object.assign(document.createElement('input'), { type: 'checkbox', id: `login-${index}` });
      box.addEventListener('change', () => { if (box.checked) ticked.add(index); else ticked.delete(index); drawList(); });
      const host = Object.assign(document.createElement('span'), { className: 'host', textContent: login.host });
      const user = Object.assign(document.createElement('span'), { className: 'user', textContent: login.username });
      const label = Object.assign(document.createElement('label'), { htmlFor: box.id });
      label.append(box, host, user);
      const item = document.createElement('li');
      item.dataset.words = `${login.host} ${login.username} ${login.label}`.toLowerCase();
      item.append(label);
      return item;
    }));
    note('#list-error');
    drawList();
    show('list');
  }
  $('#search').addEventListener('input', () => {
    const words = $('#search').value.trim().toLowerCase();
    for (const item of $('#logins').children) item.hidden = !item.dataset.words.includes(words);
  });
  $('#pick-file').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', async () => {
    const file = $('#file').files[0];
    $('#file').value = '';
    if (!file) return;
    const found = parseExport(await file.text().catch(() => ''));
    note('#file-error', !found ? MESSAGES.unreadable : !found.length ? MESSAGES.empty : '');
    if (found?.length) {
      logins = found;
      listLogins();
    }
  });
  $('#save-ticked').addEventListener('click', async () => {
    const indexes = [...ticked].sort((a, b) => a - b);
    $('#save-ticked').disabled = true;
    const result = await save(indexes.map(index => logins[index]));
    if (result === null) return closed();
    if (typeof result === 'string') {
      note('#list-error', result);
      return drawList();
    }
    const failed = new Set(result.failed.map(at => indexes[at]));
    for (const index of indexes) {
      if (failed.has(index)) continue;
      ticked.delete(index);
      $(`#login-${index}`).checked = false;
    }
    drawList();
    if (!failed.size) return showSaved(result.saved, true);
    const sites = [...failed].map(index => logins[index].host).join(', ');
    note('#list-error', `${result.saved.length ? `Saved ${plural(result.saved.length, 'login')}. ` : ''}Couldn't save ${sites}. Try again.`);
  });

  // One login, typed or filled by a password manager.
  $('#add-one').addEventListener('click', () => { note('#add-error'); show('add'); $('#site').focus(); });
  $('#add-form').addEventListener('submit', async event => {
    event.preventDefault();
    const url = siteUrl($('#site').value);
    if (!hostOf(url)) return note('#add-error', MESSAGES.badSite);
    const result = await save([{ url, username: $('#username').value.trim(), password: $('#password').value }]);
    if (result === null) return closed();
    if (typeof result === 'string' || result.failed.length) return note('#add-error', typeof result === 'string' ? result : MESSAGES.failed);
    $('#add-form').reset();
    showSaved(result.saved, false);
  });

  for (const back of document.querySelectorAll('[data-back]')) back.addEventListener('click', () => { note('#file-error'); show('start'); });
  $('#another').addEventListener('click', () => { note('#file-error'); show('start'); });
  $('#done').addEventListener('click', async () => {
    $('#done').disabled = true;
    await post('done');
    closed();
  });

  if (!key) closed();
}

if (typeof document !== 'undefined') start();
