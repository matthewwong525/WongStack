// The hand-over page's script: shows the agent's live page and sends the person's clicks and typing
// to it through the watcher's `/stream` proxy (see hand-over.mjs). It speaks agent-browser's
// documented stream messages: `frame` in; `input_mouse` and `input_keyboard` out.
// Under the picture it lists the page's fields from the watcher's `/fields`. A box's typing goes out
// only as key presses over the stream, after `/focus` clears and focuses its field; a dropdown goes
// to `/select` and a tick box to `/check`. The list refreshes every 3 seconds and after each pick.
// The pure helpers `toPage`, `typedKeys`, and `sendPlan` are exported for the tests; the rest runs
// only in a browser.

/** Key names the page sends with their Windows key code and the text they insert, as the dashboard does. */
const SPECIAL_KEYS = {
  Enter: { text: '\r', keyCode: 13 },
  Tab: { text: '\t', keyCode: 9 },
  Backspace: { text: '\b', keyCode: 8 },
  Escape: { keyCode: 27 },
  ArrowLeft: { keyCode: 37 },
  ArrowUp: { keyCode: 38 },
  ArrowRight: { keyCode: 39 },
  ArrowDown: { keyCode: 40 },
  Delete: { keyCode: 46 },
  Home: { keyCode: 36 },
  End: { keyCode: 35 },
  PageUp: { keyCode: 33 },
  PageDown: { keyCode: 34 },
};
const DRAG_PX = 8;
const GIVE_UP_AFTER = 8;
const FIELDS_EVERY_MS = 3000;
const HINTS = {
  some: 'For a field not in the list, tap it on the page above, then type here. On a computer you can also click and type on the page itself.',
  none: 'No fields found on this page. Tap one above and type here.',
};

/**
 * Maps a point on the shown picture to the page's own pixels, using the picture's size, never the
 * size the feed reports. `rect` is the canvas's box; a picture fitted inside it (`object-fit:
 * contain`) leaves bars, and a point on a bar maps to null.
 */
export function toPage(point, rect, frame) {
  const scale = Math.min(rect.width / frame.width, rect.height / frame.height);
  const left = rect.left + (rect.width - frame.width * scale) / 2;
  const top = rect.top + (rect.height - frame.height * scale) / 2;
  const x = Math.round((point.x - left) / scale);
  const y = Math.round((point.y - top) / scale);
  return x < 0 || y < 0 || x > frame.width || y > frame.height ? null : { x, y };
}

/**
 * The key presses that turn a text box's `before` value into `after` in the agent's field, whose
 * caret sits at the end: a Backspace for each character after the shared start, then each new one.
 */
export function typedKeys(before, after) {
  const old = Array.from(before);
  const now = Array.from(after);
  let same = 0;
  while (same < old.length && same < now.length && old[same] === now[same]) same++;
  return [...old.slice(same).map(() => ({ key: 'Backspace' })), ...now.slice(same).map(text => ({ text }))];
}

/**
 * How a list box's text reaches its page field. With the field focused and only letters added at the
 * end, press just the new ones; otherwise (another field, a deletion, a whole value filled in) clear
 * and focus the field, then press every character, so a field that adds its own spaces stays in step.
 */
export function sendPlan(sent, now, focused) {
  return focused && now.startsWith(sent) ? { focus: false, keys: Array.from(now.slice(sent.length)) } : { focus: true, keys: Array.from(now) };
}

/** The `input_keyboard` pair for one key name or one typed character. */
function keyEvents({ key, text }, modifiers = 0) {
  const name = key ?? text;
  const special = SPECIAL_KEYS[name];
  const typed = special?.text ?? (name.length === 1 ? name : text);
  const keyCode = special?.keyCode ?? (/^[a-z0-9]$/i.test(name) ? name.toUpperCase().charCodeAt(0) : 0);
  const code = /^[a-z]$/i.test(name) ? `Key${name.toUpperCase()}` : /^\d$/.test(name) ? `Digit${name}` : special ? name : '';
  const base = { type: 'input_keyboard', key: name, code, windowsVirtualKeyCode: keyCode, modifiers };
  return [{ ...base, eventType: 'keyDown', text: typed }, { ...base, eventType: 'keyUp' }];
}

/** The CDP modifier bits of a DOM event: Alt 1, Ctrl 2, Meta 4, Shift 8. */
const modifierBits = event => (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);

function start() {
  const canvas = document.querySelector('#view');
  const box = document.querySelector('#type');
  const status = document.querySelector('#status');
  const context = canvas.getContext('2d');
  const key = new URLSearchParams(location.hash.slice(1)).get('key') ?? '';
  history.replaceState(null, '', location.pathname);
  let socket = null;
  let frame = null;
  let pending = null;
  let drawing = false;
  let failures = 0;
  let closed = false;
  let typed = '';
  let polling = null;

  const say = text => { status.textContent = text; };
  const send = message => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); };
  const press = (step, modifiers) => keyEvents(step, modifiers).forEach(send);
  const clearBox = () => { box.value = ''; typed = ''; };

  async function draw() {
    if (drawing || !pending) return;
    drawing = true;
    const data = pending;
    pending = null;
    try {
      const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))], { type: 'image/jpeg' }));
      if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) Object.assign(canvas, { width: bitmap.width, height: bitmap.height });
      context.drawImage(bitmap, 0, 0);
      frame = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
    } catch { /* a bad frame; the next one replaces it */ }
    drawing = false;
    draw();
  }

  function giveUp() {
    closed = true;
    clearBox();
    box.disabled = true;
    clearInterval(polling);
    for (const control of form.elements) control.disabled = true;
    say('This link has closed.');
  }

  function connect() {
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${scheme}://${location.host}/stream?key=${encodeURIComponent(key)}`);
    socket.onopen = () => { failures = 0; say('Live'); };
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.type !== 'frame') return;
      pending = message.data;
      draw();
    };
    socket.onclose = async () => {
      if (closed) return;
      failures++;
      const up = await fetch('page.mjs', { cache: 'no-store' }).then(response => response.ok, () => false);
      if (!up || failures >= GIVE_UP_AFTER) return giveUp();
      say('Reconnecting…');
      setTimeout(connect, Math.min(4000, 500 * failures));
    };
  }

  // Pointer: a mouse is passed through; a finger taps to click and drags to scroll.
  let touch = null;
  const at = event => frame && toPage({ x: event.clientX, y: event.clientY }, canvas.getBoundingClientRect(), frame);
  const mouse = (eventType, spot, extra = {}) => spot && send({ type: 'input_mouse', eventType, x: spot.x, y: spot.y, button: 'none', clickCount: 0, ...extra });
  const click = spot => {
    mouse('mouseMoved', spot);
    mouse('mousePressed', spot, { button: 'left', clickCount: 1 });
    mouse('mouseReleased', spot, { button: 'left', clickCount: 1 });
  };
  const BUTTONS = ['left', 'middle', 'right'];

  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    canvas.focus();
    clearBox();
    focusedRef = null;
    if (event.pointerType === 'mouse') {
      mouse('mousePressed', at(event), { button: BUTTONS[event.button] ?? 'left', clickCount: 1, modifiers: modifierBits(event) });
      return;
    }
    touch = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') return void mouse('mouseMoved', at(event), { modifiers: modifierBits(event) });
    if (touch?.id !== event.pointerId) return;
    const dx = event.clientX - touch.x;
    const dy = event.clientY - touch.y;
    if (!touch.dragging && Math.hypot(dx, dy) < DRAG_PX) return;
    touch.dragging = true;
    const scale = frame ? frame.width / canvas.getBoundingClientRect().width : 1;
    mouse('mouseWheel', at(event), { deltaX: -dx * scale, deltaY: -dy * scale });
    Object.assign(touch, { x: event.clientX, y: event.clientY });
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerType === 'mouse') return void mouse('mouseReleased', at(event), { button: BUTTONS[event.button] ?? 'left', clickCount: 1, modifiers: modifierBits(event) });
    if (touch?.id === event.pointerId && !touch.dragging) click(at(event));
    touch = null;
  });
  canvas.addEventListener('pointercancel', () => { touch = null; });
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    mouse('mouseWheel', at(event), { deltaX: event.deltaX, deltaY: event.deltaY, modifiers: modifierBits(event) });
  }, { passive: false });
  canvas.addEventListener('contextmenu', event => event.preventDefault());

  // Computer keyboard: keys typed while the view has focus.
  for (const type of ['keydown', 'keyup']) {
    canvas.addEventListener(type, event => {
      event.preventDefault();
      const special = SPECIAL_KEYS[event.key];
      const text = type === 'keydown' && !event.ctrlKey && !event.metaKey ? special?.text ?? (event.key.length === 1 ? event.key : undefined) : undefined;
      send({ type: 'input_keyboard', eventType: type === 'keydown' ? 'keyDown' : 'keyUp', key: event.key, code: event.code, text, windowsVirtualKeyCode: special?.keyCode ?? event.keyCode, modifiers: modifierBits(event) });
    });
  }

  // Type here: the phone's keyboard, diffed, so composed and autocorrected words still land.
  box.addEventListener('input', () => {
    typedKeys(typed, box.value).forEach(step => press(step));
    typed = box.value;
  });
  box.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    press({ key: 'Enter' });
    clearBox();
  });
  for (const button of document.querySelectorAll('[data-key]')) {
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('click', () => {
      const name = button.dataset.key;
      press({ key: name });
      if (name === 'Backspace') {
        box.value = Array.from(box.value).slice(0, -1).join('');
        typed = box.value;
      } else {
        clearBox();
      }
    });
  }

  // The field list: one row per page field, sent to the page one change at a time.
  const form = document.querySelector('#fields');
  const other = document.querySelector('#other');
  const otherHint = document.querySelector('#other-hint');
  const sentText = new Map();
  let focusedRef = null;
  let signature = null;
  let listEmpty = true;
  let queue = Promise.resolve();
  const later = job => { queue = queue.then(job).catch(() => {}); };
  const call = (path, body) => fetch(path, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: { 'x-hand-over-key': key, ...(body && { 'content-type': 'application/json' }) },
    body: body && JSON.stringify(body),
  }).catch(() => null);
  const showMiss = (ref, on) => { const note = document.getElementById(`miss-${ref}`); if (note) note.hidden = !on; };

  /** Runs a field route; after a 409 it rescans and retries once, then asks for a tap on the picture. */
  async function act(path, body) {
    for (let tries = 0; tries < 2; tries++) {
      const response = await call(path, body);
      if (response?.ok) {
        showMiss(body.ref, false);
        return true;
      }
      if (response?.status !== 409) break;
      await refresh();
    }
    showMiss(body.ref, true);
    return false;
  }

  const syncBox = (input, ref) => later(async () => {
    const now = input.value;
    const plan = sendPlan(sentText.get(ref) ?? '', now, focusedRef === ref);
    if (plan.focus) {
      focusedRef = null;
      if (!(await act('focus', { ref }))) return;
      focusedRef = ref;
    }
    plan.keys.forEach(text => press({ text }));
    sentText.set(ref, now);
  });
  const pick = (path, body) => later(async () => {
    focusedRef = null;
    await act(path, body);
    await refresh();
  });

  function textBox(field) {
    const input = document.createElement('input');
    Object.assign(input, { type: field.type, name: field.autocomplete || `field-${field.ref}`, spellcheck: false });
    for (const [name, value] of [['autocomplete', field.autocomplete], ['inputmode', field.inputmode], ['autocapitalize', 'off'], ['autocorrect', 'off'], ['enterkeyhint', 'enter']]) if (value) input.setAttribute(name, value);
    for (const type of ['input', 'change']) input.addEventListener(type, () => syncBox(input, field.ref));
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      syncBox(input, field.ref);
      later(() => { if (focusedRef === field.ref) press({ key: 'Enter' }); });
    });
    return input;
  }

  function dropdown(field) {
    const select = document.createElement('select');
    if (field.autocomplete) select.setAttribute('autocomplete', field.autocomplete);
    select.append(new Option('Choose…', ''), ...field.options.map(option => new Option(option.text || option.value, option.value)));
    select.addEventListener('change', () => { if (select.selectedIndex > 0) pick('select', { ref: field.ref, value: select.value }); });
    return select;
  }

  function tickBox(field) {
    const input = Object.assign(document.createElement('input'), { type: 'checkbox' });
    input.addEventListener('change', () => pick('check', { ref: field.ref, checked: input.checked }));
    return input;
  }

  /** One labelled row, keeping what the person entered in the row at the same place before. */
  function fieldRow(field, place, rows) {
    const control = { select: dropdown, checkbox: tickBox }[field.kind]?.(field) ?? textBox(field);
    control.id = `f-${field.ref}`;
    control.dataset.place = place;
    const old = rows.get(place);
    if (old && field.kind === 'checkbox') control.checked = old.checked;
    else if (old && field.kind === 'text') control.value = old.value;
    else if (old && old.options.length === control.options.length) control.selectedIndex = old.selectedIndex;
    const label = Object.assign(document.createElement('label'), { htmlFor: control.id, textContent: field.label || 'Field' });
    const miss = Object.assign(document.createElement('p'), { id: `miss-${field.ref}`, className: 'miss', hidden: true, textContent: 'Tap it on the page instead' });
    const row = Object.assign(document.createElement('div'), { className: field.kind === 'checkbox' ? 'check' : 'row' });
    row.append(...(field.kind === 'checkbox' ? [control, label] : [label, control]));
    return [row, miss];
  }

  /** Redraws the list when its signature changes; the next edit in a box retypes it whole. */
  function drawFields(list) {
    if (list.signature === signature) return;
    signature = list.signature;
    // A row is known by its kind, label, and which of that pair it is: a new field shifts the refs.
    const old = new Map(Array.from(form.elements, control => [control.dataset.place, control]));
    const active = form.contains(document.activeElement) ? document.activeElement.dataset.place : null;
    const count = new Map();
    form.replaceChildren(...list.fields.flatMap(field => {
      const pair = `${field.kind}|${field.label}`;
      count.set(pair, (count.get(pair) ?? 0) + 1);
      return fieldRow(field, `${pair}|${count.get(pair)}`, old);
    }));
    sentText.clear();
    focusedRef = null;
    if (active) Array.from(form.elements).find(control => control.dataset.place === active)?.focus({ preventScroll: true });
    const empty = !list.fields.length;
    form.hidden = empty;
    otherHint.textContent = HINTS[empty ? 'none' : 'some'];
    if (empty !== listEmpty) other.open = empty;
    listEmpty = empty;
  }

  async function refresh() {
    if (closed) return;
    const response = await call('fields');
    const list = response?.ok && await response.json().catch(() => null);
    if (list) drawFields(list);
  }

  if (!key) return giveUp();
  say('Connecting…');
  connect();
  refresh();
  polling = setInterval(() => { if (!document.hidden && !closed) refresh(); }, FIELDS_EVERY_MS);
}

if (typeof document !== 'undefined') start();
