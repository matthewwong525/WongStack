// The key page's script (see hand-over.mjs `open --keys` and keys.mjs). It lists the keys the agent
// asked for from `GET /keys`, one hidden box each, and says when a key would replace one saved now. A
// key with a guide shows its plain title, an *Open …* link to the service's key page in a new tab with
// its host, and numbered steps, every string set as text; without one it shows its code name and hint.
// A lone guided key's title heads the page. The time left counts down in whole minutes to `closesAt`,
// on the watcher's clock, and the page closes at the limit.
//
// *Paste* fills a box from the clipboard where the browser offers that; a refusal says to paste by hand.
// Text over several lines, pasted or picked as a file the device reads itself, is held in memory and
// shown only as a name and a line count; a file over 16 KB is refused before anything is sent.
//
// Save and continue posts filled boxes to `/continue`; partial successes are cleared and locked, with
// missing/failed rows left editable. A saved key says *Works* or *Saved, not tested*. A key its test
// refused stays in its box with the test's host and *Save anyway*, which sends it again under `force`.
// The completion receipt names the notification outcome. Close without continuing cancels through
// `/done`. `filledKeys`, `timeLeft`, `heldLabel`, and `httpsHost` are exported for tests.

const MESSAGES = {
  empty: 'Paste a key first.',
  failedRow: 'Couldn\'t save this one; check it and try again.',
  failed: 'Couldn\'t save. Try again.',
  tooLong: 'That\'s too much at once. Save one key, then the next.',
  allSaved: 'All saved. You can close this page.',
  noClipboard: 'Tap and hold the box to paste.',
  bigFile: 'That file is too big to be a key.',
  emptyFile: 'That file is empty.',
  works: 'Works',
  untested: 'Saved, not tested',
};
const FILE_LIMIT = 16 * 1024;
const LINE_BREAK = /\r\n?|\n/;

/** The boxes' `{name: value}` worth sending: trimmed, the empty ones left out. */
export function filledKeys(boxes) {
  const keys = {};
  for (const { name, value, disabled } of boxes) if (!disabled && value.trim()) keys[name] = value.trim();
  return keys;
}

const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** `Closes in N min`, in whole minutes rounded up, or null once `closesAt` has passed. */
export function timeLeft(closesAt, now) {
  return closesAt > now ? `Closes in ${Math.ceil((closesAt - now) / 60_000)} min` : null;
}

/** A held key's line: where it came from and its line count, never its content. */
export function heldLabel(source, text) {
  return `${source} · ${plural(text.trim().split(LINE_BREAK).length, 'line')}`;
}

/** The host of an `https` address, or null for anything else. */
export function httpsHost(address) {
  try {
    const url = new URL(address);
    return url.protocol === 'https:' ? url.host : null;
  } catch {
    return null;
  }
}

function start() {
  const $ = selector => document.querySelector(selector);
  const make = (tag, props) => Object.assign(document.createElement(tag), props);
  const key = new URLSearchParams(location.hash.slice(1)).get('key') ?? '';
  history.replaceState(null, '', location.pathname);
  const rows = new Map();
  let saving = '';
  const savedNames = new Set();

  const status = text => { $('#status').textContent = text ?? ''; };
  const call = (path, body) => fetch(path, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: { 'x-hand-over-key': key, ...(body && { 'content-type': 'application/json' }) },
    body: body && JSON.stringify(body),
  }).catch(() => null);
  const closed = () => {
    for (const row of rows.values()) { row.input.value = ''; row.held = null; }
    status();
    $('#closed').hidden = false;
    $('#form').hidden = true;
  };
  const completed = receipt => {
    closed();
    $('#closed h1').textContent = receipt?.notification === 'notified' ? 'Your assistant was notified' : 'Saved; return to your chat';
    $('#closed .hint').textContent = receipt?.notification === 'notified' ? 'You can return to the chat.' : "Your entries are saved. Return to chat and say continue.";
    $('#results').replaceChildren(...[...rows.values()].filter(row => row.verdict).map(row => make('p', { className: 'ok', textContent: `${row.title}: ${MESSAGES[row.verdict]}` })));
  };
  const valueOf = row => row.held ?? row.input.value;
  const update = () => {
    $('#save').textContent = saving || 'Save and continue';
    $('#save').disabled = Boolean(saving) || ![...rows.values()].some(row => !savedNames.has(row.name) && valueOf(row).trim());
    $('#done').disabled = Boolean(saving);
    for (const row of rows.values()) for (const control of row.controls) control.disabled = Boolean(saving) || savedNames.has(row.name);
  };
  const stillOpen = () => fetch('page.mjs', { cache: 'no-store' }).then(response => response.ok, () => false);
  /** A refused call means a closed link, unless the page still answers. */
  const refused = async response => response?.status === 410 || ((!response || response.status === 403) && !(await stillOpen()));

  /** A row's message; any new one withdraws *Save anyway*, which stands only beside a refusal. */
  function note(row, text, className = 'miss') {
    row.note.textContent = text ?? '';
    row.note.className = className;
    row.note.hidden = !text;
    row.anyway.hidden = true;
  }

  /** Holds text out of sight, in place of the box, under its source's name and line count; null puts the box back. */
  function hold(row, text, source, fromFile = false) {
    row.held = text;
    if (text !== null) row.input.value = '';
    row.heldLine.textContent = text === null ? '' : heldLabel(source, text);
    for (const part of [row.heldLine, row.remove]) part.hidden = text === null;
    for (const part of [row.box, row.toggle]) part.hidden = text !== null;
    row.pick.textContent = fromFile ? 'Pick another file' : 'or pick a file';
  }

  /** Puts pasted text in a row: one line goes in the box, several are held, their breaks kept. */
  function take(row, text) {
    note(row);
    if (LINE_BREAK.test(text.trim())) hold(row, text, 'Pasted key');
    else { hold(row, null); row.input.value = text.trim(); }
    update();
  }

  async function paste(row) {
    const text = await navigator.clipboard.readText().catch(() => '');
    if (text.trim()) take(row, text);
    else note(row, MESSAGES.noClipboard);
  }

  /** Reads a picked file on this device and holds it; one too big to be a key is never read. */
  async function pickFile(row, file) {
    if (!file) return;
    if (file.size > FILE_LIMIT) return note(row, MESSAGES.bigFile);
    const text = await file.text();
    if (!text.trim()) return note(row, MESSAGES.emptyFile);
    note(row);
    hold(row, text, file.name, true);
    update();
  }

  /** A key's numbered steps, the first the link to the service's key page with its host. */
  function stepList(link, steps) {
    const list = make('ol', { className: 'steps' });
    if (link) {
      const first = make('li');
      first.append(make('a', { className: 'open', href: link.url, target: '_blank', rel: 'noopener noreferrer', textContent: link.open ?? 'Open the key page' }), make('span', { className: 'host', textContent: link.host }));
      list.append(first);
    }
    for (const step of steps) list.append(make('li', { textContent: step }));
    return list;
  }

  function addRow({ name, hint, set, title, url, open, steps = [], checkHost }, alone) {
    const item = make('li');
    const id = `key-${rows.size}`;
    const input = make('input', { id, name, type: 'password', autocomplete: 'off', spellcheck: false });
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    if (alone && title) {
      $('#form h1').textContent = title;
      document.title = title;
      input.setAttribute('aria-label', title);
    } else item.append(make('label', { htmlFor: id, textContent: title ?? name }));
    const host = httpsHost(url);
    if (host || steps.length) item.append(stepList(host && { url, open, host }, steps));
    else if (hint) item.append(make('p', { className: 'hint', textContent: hint }));
    if (set) item.append(make('p', { className: 'hint', textContent: 'This replaces the one saved now.' }));

    const quiet = textContent => make('button', { type: 'button', className: 'quiet', textContent });
    const toggle = quiet('Show');
    toggle.setAttribute('aria-controls', id);
    const row = {
      name, title: title ?? name, checkHost, input, toggle, held: null, verdict: null,
      box: make('div', { className: 'row' }),
      heldLine: make('p', { className: 'held', hidden: true }),
      pick: quiet('or pick a file'),
      remove: Object.assign(quiet('Remove'), { hidden: true }),
      file: make('input', { type: 'file', hidden: true }),
      note: make('p', { hidden: true }),
      anyway: Object.assign(quiet('Save anyway'), { hidden: true }),
    };
    row.note.setAttribute('role', 'status');
    row.box.append(input);
    row.controls = [input, toggle, row.pick, row.remove, row.file, row.anyway];
    if (typeof navigator.clipboard?.readText === 'function') {
      const button = make('button', { type: 'button', textContent: 'Paste' });
      button.addEventListener('click', () => paste(row));
      row.box.append(button);
      row.controls.push(button);
    }

    input.addEventListener('input', () => { note(row); update(); });
    input.addEventListener('paste', event => {
      const text = event.clipboardData?.getData('text') ?? '';
      if (!LINE_BREAK.test(text.trim())) return;
      event.preventDefault();
      take(row, text);
    });
    toggle.addEventListener('click', () => {
      const hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      toggle.textContent = hidden ? 'Hide' : 'Show';
    });
    row.pick.addEventListener('click', () => row.file.click());
    row.file.addEventListener('change', async () => {
      await pickFile(row, row.file.files[0]);
      row.file.value = '';
    });
    row.remove.addEventListener('click', () => { note(row); hold(row, null); update(); });
    row.anyway.addEventListener('click', () => send({ [name]: valueOf(row).trim() }, [name]));

    const tools = make('div', { className: 'tools' });
    tools.append(toggle, row.pick, row.remove);
    item.append(row.box, row.heldLine, tools, row.file);
    if (checkHost) item.append(make('p', { className: 'hint', textContent: `Saving tests this key once at ${checkHost}.` }));
    item.append(row.note, row.anyway);
    rows.set(name, row);
    $('#keys').append(item);
  }

  function markSaved(name, verdict) {
    savedNames.add(name);
    const row = rows.get(name);
    row.verdict = verdict;
    hold(row, null);
    row.input.value = '';
    row.input.type = 'password';
    row.toggle.textContent = 'Show';
    note(row, MESSAGES[verdict], 'ok');
  }

  /** A key its test refused stays in its box, to fix or to save anyway. */
  function markRefused(name) {
    const row = rows.get(name);
    note(row, `${row.checkHost} refused this key. Copy it again, or save it anyway.`);
    row.anyway.hidden = false;
  }

  /** Counts down on the watcher's clock, since this device's may be off, and closes the page at the limit. */
  function countdown(closesAt, serverNow) {
    const ahead = serverNow - Date.now();
    const tick = () => {
      if (!$('#closed').hidden) return;
      const now = Date.now() + ahead;
      const text = timeLeft(closesAt, now);
      if (!text) return closed();
      $('#time').textContent = text;
      setTimeout(tick, Math.min(closesAt - now, 5000));
    };
    tick();
  }

  /** Saves `keys`, each tested first where it has a test, unless `force` names it. */
  async function send(keys, force = []) {
    if (saving) return;
    if (!Object.keys(keys).length) return status(MESSAGES.empty);
    saving = Object.keys(keys).some(name => rows.get(name).checkHost && !force.includes(name)) ? 'Testing…' : 'Saving…';
    update();
    status(saving);
    const response = await call('continue', { keys, ...(force.length && { force }) });
    saving = '';
    update();
    if (await refused(response)) return closed();
    if (!response?.ok) return status(response?.status === 413 ? MESSAGES.tooLong : MESSAGES.failed);
    const { saved, failed, refused: unwanted = [], checked = {}, missing = [], ready, receipt } = await response.json();
    for (const name of saved) markSaved(name, checked[name] ?? 'untested');
    for (const name of failed) note(rows.get(name), MESSAGES.failedRow);
    for (const name of unwanted) markRefused(name);
    for (const name of missing) if (!failed.includes(name) && !unwanted.includes(name)) note(rows.get(name), 'Paste this key before continuing.');
    update();
    if (ready && receipt) return completed(receipt);
    status(saved.length ? `Saved ${plural(saved.length, 'key')}. Complete the remaining keys.` : '');
  }

  $('#keys-form').addEventListener('submit', event => {
    event.preventDefault();
    send(filledKeys([...rows.values()].map(row => ({ name: row.name, value: valueOf(row), disabled: row.input.disabled }))));
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
    const { keys, closesAt, now } = await response.json();
    for (const each of keys) addRow(each, keys.length === 1);
    update();
    if (closesAt) countdown(closesAt, now ?? Date.now());
    rows.values().next().value?.input.focus();
  })();
}

if (typeof document !== 'undefined') start();
