// The key page's script (see hand-over.mjs `open --keys` and keys.mjs). It lists the keys the agent
// asked for from `GET /keys`, one hidden box each with its hint, and says when a key would replace one
// saved now. Save and continue posts filled boxes to `/continue`; partial successes are cleared and
// locked, with missing/failed rows left editable. Its completion receipt names the notification
// outcome. Close without continuing cancels through `/done`. `filledKeys` is exported for tests.

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
  let saving = false;
  const savedNames = new Set();

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
  const completed = receipt => {
    closed();
    $('#closed h1').textContent = receipt?.notification === 'notified' ? 'Your assistant was notified' : 'Saved; return to your chat';
    $('#closed .hint').textContent = receipt?.notification === 'notified' ? 'You can return to the chat.' : "Your entries are saved. Return to chat and say continue.";
  };
  const update = () => {
    $('#save').textContent = saving ? 'Saving…' : 'Save and continue';
    $('#save').disabled = saving || ![...rows.values()].some(row => !savedNames.has(row.input.name) && row.input.value.trim());
    $('#done').disabled = saving;
    for (const [name, row] of rows) { row.input.disabled = saving || savedNames.has(name); row.toggle.disabled = saving || savedNames.has(name); }
  };
  const stillOpen = () => fetch('page.mjs', { cache: 'no-store' }).then(response => response.ok, () => false);
  /** A refused call means a closed link, unless the page still answers. */
  const refused = async response => response?.status === 410 || ((!response || response.status === 403) && !(await stillOpen()));

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
    input.addEventListener('input', update);
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
    savedNames.add(name);
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
    if (saving) return;
    const keys = filledKeys([...rows.values()].map(({ input }) => input));
    if (!Object.keys(keys).length) return status(MESSAGES.empty);
    saving = true;
    update();
    status('Saving…');
    const response = await call('continue', { keys });
    saving = false;
    update();
    if (await refused(response)) return closed();
    if (!response?.ok) return status(response?.status === 413 ? MESSAGES.tooLong : MESSAGES.failed);
    const { saved, failed, missing = [], ready, receipt } = await response.json();
    for (const name of saved) markSaved(name);
    for (const name of failed) note(rows.get(name), MESSAGES.failedRow);
    for (const name of missing) if (!failed.includes(name)) note(rows.get(name), 'Paste this key before continuing.');
    update();
    if (ready && receipt) return completed(receipt);
    status(saved.length ? `Saved ${plural(saved.length, 'key')}. Complete the remaining keys.` : '');
  });

  $('#done').addEventListener('click', async () => {
    if (saving) return;
    $('#done').disabled = true;
    await call('done', {});
    closed();
  });

  (async () => {
    if (!key) return closed();
    const response = await call('keys');
    if (!response?.ok) return (await refused(response)) ? closed() : status(MESSAGES.failed);
    for (const each of (await response.json()).keys) addRow(each);
    update();
    rows.values().next().value?.input.focus();
  })();
}

if (typeof document !== 'undefined') start();
