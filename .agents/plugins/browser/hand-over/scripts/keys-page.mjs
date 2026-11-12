// The key page's script (see hand-over.mjs `open --keys` and keys.mjs): one hidden box per key `GET /keys` lists.
// Text over several lines is held out of sight, as a name and a line count; every guide string is set as text.

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
const SOON_MS = 10 * 60_000;
const COUNTS = ['', '', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
/** Words a code name keeps in capitals, or spells its own way; every other word is lower-cased. */
const WORDS = { API: 'API', URL: 'URL', ID: 'ID', AWS: 'AWS', SMTP: 'SMTP', OAUTH: 'OAuth', JSON: 'JSON' };

/** The boxes' `{name: value}` worth sending: trimmed, the empty ones left out. */
export function filledKeys(boxes) {
  const keys = {};
  for (const { name, value, disabled } of boxes) if (!disabled && value.trim()) keys[name] = value.trim();
  return keys;
}

const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** `Open until <time>` on this device's clock, `ahead` of it being the watcher's, and ` tomorrow` or the weekday past
 * today, while over ten minutes remain; then `Closes in N min`, rounded up; null once `closesAt` has passed. */
export function timeLeft(closesAt, now, { ahead = 0, zone } = {}) {
  if (closesAt <= now) return null;
  if (closesAt - now <= SOON_MS) return `Closes in ${Math.ceil((closesAt - now) / 60_000)} min`;
  const at = new Date(closesAt - ahead);
  const day = time => Date.parse(new Date(time).toLocaleDateString('en-CA', { timeZone: zone }));
  const days = Math.round((day(at) - day(now - ahead)) / 86_400_000);
  const when = days === 1 ? ' tomorrow' : days > 1 ? ` ${at.toLocaleDateString([], { weekday: 'long', timeZone: zone })}` : '';
  return `Open until ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: zone })}${when}`;
}

/** A code name as words: `MAPS_API_KEY` reads `Maps API key`. */
export function readableName(name) {
  const words = name.split('_').filter(Boolean).map(word => WORDS[word] ?? word.toLowerCase()).join(' ');
  return words ? words[0].toUpperCase() + words.slice(1) : name;
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
    $('#all-set').hidden = false;
    $('#closed h1').textContent = 'All set';
    $('#closed .hint').textContent = receipt?.notification === 'notified' ? 'Your assistant is carrying on. You can close this page.' : 'Your keys are saved. Return to your chat and say continue.';
    $('#results').replaceChildren(...[...rows.values()].filter(row => row.verdict).map(row => make('p', { className: 'ok', textContent: `${row.title}: ${MESSAGES[row.verdict]}` })));
  };
  const valueOf = row => row.held ?? row.input.value;
  const update = () => {
    $('#save').textContent = saving || 'Save and continue';
    $('#save').disabled = Boolean(saving) || ![...rows.values()].some(row => !savedNames.has(row.name) && valueOf(row).trim());
    $('#done').disabled = Boolean(saving);
    for (const row of rows.values()) for (const control of row.controls) control.disabled = Boolean(saving) || savedNames.has(row.name);
    $('#progress').textContent = `${savedNames.size} of ${rows.size} saved`;
    $('#progress').hidden = rows.size < 2;
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

  /** A key's numbered steps, the first the link to the service's key page with its host, the last `pasteStep`. */
  function stepList(link, steps, pasteStep) {
    const list = make('ol', { className: 'steps' });
    if (link) {
      const first = make('li');
      first.append(make('a', { className: 'open', href: link.url, target: '_blank', rel: 'noopener noreferrer', textContent: link.open ?? 'Open the key page' }), make('span', { className: 'host', textContent: link.host }));
      list.append(first);
    }
    for (const step of steps) list.append(make('li', { textContent: step }));
    pasteStep.prepend(make('p', { className: 'step', textContent: 'Paste it here' }));
    list.append(pasteStep);
    return list;
  }

  /** Heads the page: one key's own name and what it's for, or a count of keys. */
  function heading(keys) {
    const [only] = keys;
    const title = keys.length === 1 ? only.title ?? readableName(only.name) : `${COUNTS[keys.length] ?? keys.length} keys for your assistant`;
    document.title = $('#form h1').textContent = title;
    if (keys.length > 1) return;
    $('#why').textContent = only.why ?? '';
    $('#why').hidden = !only.why;
    $('#promise').textContent = "Your key goes straight to your assistant's computer, never into the chat.";
  }

  function addRow({ name, hint, set, title, why, url, open, steps = [], checkHost }, alone) {
    const card = make('li', { className: 'card' });
    const id = `key-${rows.size}`;
    const shown = title ?? readableName(name);
    const input = make('input', { id, name, type: 'password', autocomplete: 'off', spellcheck: false });
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    const head = make('div', { className: 'head' });
    const mark = make('span', { className: 'tick', hidden: true });
    head.append(mark);
    if (alone) input.setAttribute('aria-label', shown);
    else head.append(make('label', { htmlFor: id, textContent: shown }));
    const result = make('p', { className: 'ok', hidden: true });
    const body = make('div', { className: 'body' });
    if (!title) body.append(make('p', { className: 'code', textContent: name }));
    if (why && !alone) body.append(make('p', { className: 'why', textContent: why }));
    const host = httpsHost(url);
    const guided = Boolean(host || steps.length);
    const pasteStep = make(guided ? 'li' : 'div', { className: 'paste' });
    if (guided) body.append(stepList(host && { url, open, host }, steps, pasteStep));
    else {
      if (hint) body.append(make('p', { className: 'hint', textContent: hint }));
      body.append(pasteStep);
    }
    if (set) pasteStep.append(make('p', { className: 'hint', textContent: 'This replaces the one saved now.' }));

    const quiet = textContent => make('button', { type: 'button', className: 'quiet', textContent });
    const toggle = quiet('Show');
    toggle.setAttribute('aria-controls', id);
    const row = {
      name, title: shown, checkHost, input, toggle, held: null, verdict: null, mark, result, body,
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
    pasteStep.append(row.box, row.heldLine, tools, row.file);
    if (checkHost) pasteStep.append(make('p', { className: 'check', textContent: `We'll check it with ${checkHost}` }));
    pasteStep.append(row.note, row.anyway);
    card.append(head, result, body);
    rows.set(name, row);
    $('#keys').append(card);
  }

  function markSaved(name, verdict) {
    savedNames.add(name);
    const row = rows.get(name);
    row.verdict = verdict;
    hold(row, null);
    row.input.value = '';
    row.input.type = 'password';
    row.toggle.textContent = 'Show';
    note(row);
    row.result.textContent = MESSAGES[verdict];
    row.mark.hidden = row.result.hidden = false;
    row.body.hidden = true;
  }

  /** A key its test refused stays in its box, to fix or to save anyway. */
  function markRefused(name) {
    const row = rows.get(name);
    note(row, `${row.checkHost} didn't take this key. Copy it again and paste it, or save it anyway.`);
    row.anyway.hidden = false;
  }

  /** Counts down on the watcher's clock, since this device's may be off, and closes the page at the limit. */
  function countdown(closesAt, serverNow) {
    const ahead = serverNow - Date.now();
    const tick = () => {
      if (!$('#closed').hidden) return;
      const now = Date.now() + ahead;
      const text = timeLeft(closesAt, now, { ahead });
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
    status();
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
    $('#loading').remove();
    if (!response?.ok) return (await refused(response)) ? closed() : status(MESSAGES.failed);
    const { keys, closesAt, now } = await response.json();
    if (keys.length) heading(keys);
    for (const each of keys) addRow(each, keys.length === 1);
    update();
    if (closesAt) countdown(closesAt, now ?? Date.now());
    rows.values().next().value?.input.focus();
  })();
}

if (typeof document !== 'undefined') start();
