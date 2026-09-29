// The key page's script (see hand-over.mjs `open --keys` and keys.mjs). It lists the keys the agent
// asked for from `GET /keys`, one hidden box each with its hint, and says when a key would replace one
// saved now. *Save* sends the filled boxes to `POST /save` once; a saved box is cleared and locked, and
// a refused one stays open to fix. The link closes itself once every key is saved; *Done* posts
// `/done`. The pure `filledKeys` is exported for the tests; the rest runs only in a browser.

const MESSAGES = {
  empty: 'Paste a key first.',
  failedRow: 'Couldn\'t save this one; check it and try again.',
  failed: 'Couldn\'t save. Try again.',
  tooLong: 'That\'s too much at once. Save one key, then the next.',
  allSaved: 'All saved. You can close this page.',
};

/** The boxes' `{name: value}` worth sending: trimmed, the empty ones left out. */
export function filledKeys(boxes) {
  const keys = {};
  for (const { name, value, disabled } of boxes) if (!disabled && value.trim()) keys[name] = value.trim();
  return keys;
}

const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;

function start() {
  const $ = selector => document.querySelector(selector);
  const key = new URLSearchParams(location.hash.slice(1)).get('key') ?? '';
  history.replaceState(null, '', location.pathname);
  const rows = new Map();

  const status = text => { $('#status').textContent = text ?? ''; };
  const call = (path, body) => fetch(path, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: { 'x-hand-over-key': key, ...(body && { 'content-type': 'application/json' }) },
    body: body && JSON.stringify(body),
  }).catch(() => null);
  const closed = () => {
    for (const row of rows.values()) row.input.value = '';
    status();
    $('#closed').hidden = false;
    $('#form').hidden = true;
  };
  const stillOpen = () => fetch('page.mjs', { cache: 'no-store' }).then(response => response.ok, () => false);
  /** A refused call means a closed link, unless the page still answers. */
  const refused = async response => (!response || response.status === 403) && !(await stillOpen());

  function note(row, text, className = 'miss') {
    row.note.textContent = text ?? '';
    row.note.className = className;
    row.note.hidden = !text;
  }

  function addRow({ name, hint, set }) {
    const item = document.createElement('li');
    const id = `key-${rows.size}`;
    const label = Object.assign(document.createElement('label'), { htmlFor: id, textContent: name });
    item.append(label);
    if (hint) item.append(Object.assign(document.createElement('p'), { className: 'hint', textContent: hint }));
    if (set) item.append(Object.assign(document.createElement('p'), { className: 'hint', textContent: 'This replaces the one saved now.' }));
    const input = Object.assign(document.createElement('input'), { id, name, type: 'password', autocomplete: 'off', spellcheck: false });
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    const toggle = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Show' });
    toggle.setAttribute('aria-controls', id);
    toggle.addEventListener('click', () => {
      const hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      toggle.textContent = hidden ? 'Hide' : 'Show';
    });
    const row = Object.assign(document.createElement('div'), { className: 'row' });
    row.append(input, toggle);
    const line = Object.assign(document.createElement('p'), { role: 'status', hidden: true });
    item.append(row, line);
    rows.set(name, { input, toggle, note: line });
    $('#keys').append(item);
  }

  function markSaved(name) {
    const row = rows.get(name);
    row.input.value = '';
    row.input.type = 'password';
    row.input.disabled = true;
    row.toggle.textContent = 'Show';
    row.toggle.disabled = true;
    note(row, 'Saved ✓', 'ok');
  }

  $('#keys-form').addEventListener('submit', async event => {
    event.preventDefault();
    const keys = filledKeys([...rows.values()].map(({ input }) => input));
    if (!Object.keys(keys).length) return status(MESSAGES.empty);
    $('#save').disabled = true;
    status('Saving…');
    const response = await call('save', { keys });
    $('#save').disabled = false;
    if (await refused(response)) return closed();
    if (!response?.ok) return status(response?.status === 413 ? MESSAGES.tooLong : MESSAGES.failed);
    const { saved, failed } = await response.json();
    for (const name of saved) markSaved(name);
    for (const name of failed) note(rows.get(name), MESSAGES.failedRow);
    if ([...rows.values()].every(row => row.input.disabled)) {
      status(MESSAGES.allSaved);
      for (const button of document.querySelectorAll('.actions button')) button.disabled = true;
      return;
    }
    status(saved.length ? `Saved ${plural(saved.length, 'key')}.` : '');
  });

  $('#done').addEventListener('click', async () => {
    $('#done').disabled = true;
    await call('done', {});
    closed();
  });

  (async () => {
    if (!key) return closed();
    const response = await call('keys');
    if (!response?.ok) return (await refused(response)) ? closed() : status(MESSAGES.failed);
    for (const each of (await response.json()).keys) addRow(each);
    rows.values().next().value?.input.focus();
  })();
}

if (typeof document !== 'undefined') start();
