// The hand-over page's script: shows the agent's live page and sends the person's clicks and typing
// to it through the watcher's `/stream` proxy (see hand-over.mjs). It speaks agent-browser's
// documented stream messages: `frame` in; `input_mouse` and `input_keyboard` out.
// Beside the picture, or in a separate phone tab, it lists the page's fields from the watcher's `/fields`. A box's typing goes out
// only as key presses over the stream, after `/focus` clears and focuses its field; a dropdown goes
// to `/select` and a tick box to `/check`. The list refreshes every 3 seconds and after each pick.
// It posts the stage width and at least 720px of height to `/viewport` under 800 wide, so the site
// shows its phone layout in a pannable preview, else 1280×720. It posts when width changes, never
// on a height-only change such as a phone's keyboard opening.
// The pure helpers `toPage`, `typedKeys`, `sendPlan`, and `wantedSize` are exported for the tests; the
// rest runs only in a browser.

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
const RESIZE_WAIT_MS = 300;
const NARROW_BELOW = 800;
const DESKTOP = { width: 1280, height: 720 };
const HINTS = {
  some: 'For a field not in the list, tap it on Page, then type here. On a computer you can also click and type on the page itself.',
  none: 'No fields found on this page. Tap one on Page and type here.',
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

/** Give short phone screens room to pan a whole login; desktop follows the window breakpoint. */
export function wantedSize({ boxWidth, boxHeight, windowWidth = boxWidth, formWidth = 0 }) {
  if (!(windowWidth < NARROW_BELOW)) return { ...DESKTOP };
  return { width: Math.max(320, Math.min(1280, Math.round(Math.max(boxWidth, formWidth)))), height: Math.max(720, Math.min(1280, Math.round(boxHeight))) };
}

/** Scale wheel and swipe distances to the fitted image, including any letterboxing. */
export function pageScale(rect, frame) {
  return 1 / Math.min(rect.width / frame.width, rect.height / frame.height);
}

/** The least pan that reveals text, shrinking the margin when a wide field nearly fills the view. */
export function revealOffset(start, end, lower, upper) {
  const spare = upper - lower - (end - start);
  if (spare < 0) return start <= lower && end >= upper ? 0 : start - lower;
  const margin = Math.min(10, spare / 2);
  return start < lower + margin ? start - lower - margin : end > upper - margin ? end - upper + margin : 0;
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
  const stage = document.querySelector('#stage');
  const preview = document.querySelector('#preview');
  const targets = document.querySelector('#targets');
  const overlays = new Map();
  let currentFields = new Map();
  let formWidth = 0;
  let requestedViewport = null;
  let geometryReady = false;
  const suspendTargets = () => { geometryReady = false; targets.style.pointerEvents = 'none'; for (const input of overlays.values()) input.style.pointerEvents = 'none'; };
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
  let pageUrl = null;
  const resetPreview = () => { stage.scrollTop = 0; stage.scrollLeft = 0; };

  const say = text => { status.textContent = text; };
  const send = message => { if (socket?.readyState !== WebSocket.OPEN || closed) return false; socket.send(JSON.stringify(message)); return true; };
  const press = (step, modifiers) => keyEvents(step, modifiers).every(send);
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
      const changedSize = !frame || frame.width !== bitmap.width || frame.height !== bitmap.height;
      frame = { width: bitmap.width, height: bitmap.height };
      if (changedSize) refresh();
      layoutPreview();
      positionTargets();
      bitmap.close();
    } catch { /* a bad frame; the next one replaces it */ }
    drawing = false;
    draw();
  }

  function giveUp() {
    closed = true;
    fitShell();
    clearBox();
    box.disabled = true;
    for (const control of document.querySelectorAll('[data-key], [data-navigate]')) control.disabled = true;
    suspendTargets();
    for (const input of overlays.values()) input.disabled = true;
    clearInterval(polling);
    for (const control of form.elements) control.disabled = true;
    say('Link closed; return to chat. Ask for a new link if needed.');
  }

  function connect() {
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${scheme}://${location.host}/stream?key=${encodeURIComponent(key)}`);
    socket.onopen = () => { failures = 0; say('Live'); };
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.type === 'url') {
        if (pageUrl !== null && pageUrl !== message.url) { formWidth = 0; currentFields.clear(); overlays.forEach(input => input.remove()); overlays.clear(); signature = null; form.replaceChildren(); sentText.clear(); fieldValues.clear(); editedFields.clear(); suspendTargets(); fit(); refresh(); }
        if (pageUrl !== message.url) { resetPreview(); fitShell(); }
        pageUrl = message.url;
        return;
      }
      if (message.type !== 'frame') return;
      pending = message.data;
      draw();
    };
    socket.onclose = async () => {
      for (let attempt = 0; attempt < 30 && !closed; attempt++) {
        const response = await fetch('receipt', { headers: { 'x-hand-over-key': key }, cache: 'no-store' }).catch(() => null);
        const receipt = response?.status === 200 && await response.json().catch(() => null);
        if (receipt) { giveUp(); say(receipt.notification === 'notified' ? 'Your assistant was notified. You can return to the chat.' : receipt.result === 'done' ? 'Finished; chat was not notified. Return to chat and say continue.' : 'Link closed; return to chat.'); return; }
        if (response?.status !== 202 || !(await response.json().catch(() => null))?.finishing) break;
        await new Promise(done => setTimeout(done, 200));
      }
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
  let geometryTimer = null;
  const at = event => frame && toPage({ x: event.clientX, y: event.clientY }, canvas.getBoundingClientRect(), frame);
  const mouse = (eventType, spot, extra = {}) => spot && send({ type: 'input_mouse', eventType, x: spot.x, y: spot.y, button: 'none', clickCount: 0, ...extra });
  const click = spot => {
    mouse('mouseMoved', spot);
    mouse('mousePressed', spot, { button: 'left', clickCount: 1 });
    mouse('mouseReleased', spot, { button: 'left', clickCount: 1 });
  };
  const BUTTONS = ['left', 'middle', 'right'];
  const visiblePoint = point => {
    const rect = stage.getBoundingClientRect();
    return { x: Math.max(rect.left + 1, Math.min(rect.right - 1, point.x)), y: Math.max(rect.top + 1, Math.min(rect.bottom - 1, point.y)) };
  };
  // First reveal the taller phone picture, then send any remaining distance to the website.
  const scrollPage = (deltaX, deltaY, point, modifiers = 0, gestureSpot = null) => {
    if (!frame || closed || navigating) return;
    if (window.innerWidth < NARROW_BELOW) {
      const beforeX = stage.scrollLeft;
      stage.scrollLeft = Math.max(0, Math.min(stage.scrollWidth - stage.clientWidth, beforeX + deltaX));
      deltaX -= stage.scrollLeft - beforeX;
      const before = stage.scrollTop;
      stage.scrollTop = Math.max(0, Math.min(stage.scrollHeight - stage.clientHeight, before + deltaY));
      deltaY -= stage.scrollTop - before;
    }
    if (!deltaX && !deltaY) return;
    // A captured drag keeps its starting container even when the finger moves outside it.
    const spot = gestureSpot ?? toPage(visiblePoint(point), canvas.getBoundingClientRect(), frame);
    const scale = pageScale(canvas.getBoundingClientRect(), frame);
    suspendTargets();
    clearTimeout(geometryTimer);
    geometryTimer = setTimeout(refresh, 180);
    mouse('mouseWheel', spot, { deltaX: deltaX * scale, deltaY: deltaY * scale, modifiers });
  };

  stage.addEventListener('pointerdown', event => {
    const native = event.target.closest?.('#targets input');
    if (closed || navigating || (native && !geometryReady)) return;
    event.preventDefault();
    if (!native) canvas.focus({ preventScroll: true });
    clearBox();
    focusedRef = null;
    if (event.pointerType === 'mouse') {
      mouse('mousePressed', at(event), { button: BUTTONS[event.button] ?? 'left', clickCount: 1, modifiers: modifierBits(event) });
      return;
    }
    if (touch || event.isPrimary === false || !at(event)) return;
    touch = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, spot: at(event), native, target: event.target, dragging: false };
    event.target.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') return void mouse('mouseMoved', at(event), { modifiers: modifierBits(event) });
    if (touch?.id !== event.pointerId) return;
    const dx = event.clientX - touch.x;
    const dy = event.clientY - touch.y;
    event.preventDefault();
    if (!touch.dragging && Math.hypot(event.clientX - touch.startX, event.clientY - touch.startY) < DRAG_PX) return;
    touch.dragging = true;
    suppressReveal();
    scrollPage(-dx, -dy, { x: event.clientX, y: event.clientY }, 0, touch.spot);
    Object.assign(touch, { x: event.clientX, y: event.clientY });
  });
  stage.addEventListener('pointerup', event => {
    if (event.pointerType === 'mouse') return void mouse('mouseReleased', at(event), { button: BUTTONS[event.button] ?? 'left', clickCount: 1, modifiers: modifierBits(event) });
    if (touch?.id !== event.pointerId) return;
    event.preventDefault();
    const target = touch.target;
    if (!touch.dragging && Math.hypot(event.clientX - touch.startX, event.clientY - touch.startY) < DRAG_PX) {
      if (touch.native && geometryReady && currentFields.has(touch.native.dataset.identity)) touch.native.focus({ preventScroll: true });
      else if (!touch.native) click(at(event));
    }
    touch = null;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  });
  const cancelTouch = event => {
    if (touch?.id !== event.pointerId) return;
    const target = touch.target; touch = null;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  };
  stage.addEventListener('pointercancel', cancelTouch);
  stage.addEventListener('lostpointercapture', cancelTouch);
  stage.addEventListener('wheel', event => {
    event.preventDefault();
    if (!frame) return;
    suppressReveal();
    const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
    scrollPage(event.deltaX * units, event.deltaY * units, { x: event.clientX, y: event.clientY }, modifierBits(event));
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
  const fieldValues = new Map();
  const editedFields = new Set();
  let focusedRef = null;
  let signature = null;
  let revision = null;
  let submitting = false;
  let navigating = false;
  const failedFields = new Set();
  const fieldPlaces = new Map();
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
  const navigationButtons = document.querySelectorAll('[data-navigate]');
  const lockNavigation = () => {
    for (const button of navigationButtons) button.disabled = closed || navigating || submitting;
    canvas.toggleAttribute('inert', closed || navigating);
    for (const input of overlays.values()) input.disabled = closed || navigating || submitting;
    box.disabled = closed || navigating;
    for (const control of document.querySelectorAll('[data-key]')) control.disabled = closed || navigating;
  };
  for (const button of navigationButtons) button.addEventListener('click', async () => {
    if (closed || navigating || submitting) return;
    const active = document.activeElement;
    let refused = false;
    navigating = true;
    fitShell();
    lockNavigation();
    for (const control of form.elements) control.disabled = true;
    try {
      for (const input of form.querySelectorAll('input:not([type=checkbox])')) if ((editedFields.has(input.dataset.identity) || input.value) && sentText.get(Number(input.id.slice(2))) !== input.value) syncBox(input, Number(input.id.slice(2)));
      await queue;
      if (closed || socket?.readyState !== WebSocket.OPEN) throw new Error('unavailable');
      const response = await call('navigate', { action: button.dataset.navigate });
      if (response?.status === 410) return giveUp();
      if (response?.status === 409) {
        const reason = (await response.json())?.reason;
        if (reason === 'no-history' || reason === 'unavailable-start') {
          refused = true;
          say(reason === 'unavailable-start' ? 'The original page is unavailable. Use Page to choose where to go.' : button.dataset.navigate === 'back' ? 'No previous page. Use Return to start to open the original page.' : 'No next page. Use Return to start to open the original page.');
          return;
        }
      }
      if (!response?.ok || closed) throw new Error('uncertain');
      formWidth = 0;
      currentFields.clear(); overlays.forEach(input => input.remove()); overlays.clear(); fieldValues.clear(); editedFields.clear(); suspendTargets();
      resetPreview();
      form.replaceChildren();
      signature = null;
      sentText.clear();
      failedFields.clear();
      focusedRef = null;
      clearBox();
      say('Live');
    } catch { if (!closed) say('Could not confirm navigation. It was not repeated; check Page before trying again.'); }
    finally {
      navigating = false;
      fitShell();
      lockNavigation();
      for (const control of form.elements) control.disabled = closed || control.dataset.disabled === 'true';
      if (refused && !closed) {
        if (active?.isConnected && active.matches('input, textarea, select')) active.focus({ preventScroll: true });
      } else await refresh();
    }
  });

  /** Runs a field route; after a 409 it rescans and retries once, then asks for a tap on the picture. */
  async function act(path, body) {
    for (let tries = 0; tries < 2; tries++) {
      const response = await call(path, body);
      if (response?.ok) {
        failedFields.delete(body.ref);
        showMiss(body.ref, false);
        return true;
      }
      if (response?.status !== 409) break;
      await refresh();
    }
    failedFields.add(body.ref);
    showMiss(body.ref, true);
    return false;
  }

  const syncBox = (input, ref) => {
    const identity = input.dataset.identity;
    const now = input.value;
    if (identity) {
      editedFields.add(identity); fieldValues.set(identity, now);
      const row = [...form.elements].find(control => control.dataset.identity === identity);
      if (row && row !== input) row.value = now;
      const overlay = overlays.get(identity); if (overlay && overlay !== input) overlay.value = now;
    }
    later(async () => {
      const field = identity && currentFields.get(identity);
      if (identity && !field) return; // A removed or navigated field must never receive queued text.
      const targetRef = field?.ref ?? ref;
      if (closed || socket?.readyState !== WebSocket.OPEN) { failedFields.add(targetRef); return; }
      const plan = sendPlan(sentText.get(targetRef) ?? '', now, focusedRef === targetRef);
      if (plan.focus) {
        focusedRef = null;
        if (!(await act('focus', { ref: targetRef, ...(identity && { identity }) }))) return;
        if (identity && currentFields.get(identity)?.ref !== targetRef) return;
        focusedRef = targetRef;
      }
      if (!plan.keys.every(text => press({ text }))) { failedFields.add(targetRef); return; }
      sentText.set(targetRef, now);
      failedFields.delete(targetRef);
    });
  };
  const pick = (path, body) => later(async () => {
    focusedRef = null;
    await act(path, body);
    await refresh();
  });

  function textBox(field) {
    const input = document.createElement('input');
    input.dataset.identity = field.identity ?? '';
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
    control.dataset.identity = field.identity ?? '';
    if (field.kind === 'text' && fieldValues.has(field.identity)) control.value = fieldValues.get(field.identity);
    const previous = rows.get(place);
    const old = previous && (!field.identity || previous.dataset.identity === field.identity) ? previous : null;
    if (old && field.kind === 'checkbox') control.checked = old.checked;
    else if (old && field.kind === 'text' && !fieldValues.has(field.identity)) control.value = old.value;
    else if (old && field.kind === 'select' && old.options.length === control.options.length) control.selectedIndex = old.selectedIndex;
    const label = Object.assign(document.createElement('label'), { htmlFor: control.id, textContent: field.label || 'Field' });
    const miss = Object.assign(document.createElement('p'), { id: `miss-${field.ref}`, className: 'miss', hidden: true, textContent: 'Tap it on the page instead' });
    const row = Object.assign(document.createElement('div'), { className: field.kind === 'checkbox' ? 'check' : 'row' });
    row.append(...(field.kind === 'checkbox' ? [control, label] : [label, control]));
    return [row, miss];
  }

  /** Redraws the list when its signature changes; the next edit in a box retypes it whole. */
  function drawFields(list) {
    if (submitting || navigating || closed) return;
    const activeIdentity = document.activeElement?.dataset.identity;
    const activeGeometry = JSON.stringify(currentFields.get(activeIdentity)?.geometry);
    currentFields = new Map(list.fields.filter(field => field.identity).map(field => [field.identity, field]));
    if (list.viewport?.width === requestedViewport?.width && list.viewport?.height === requestedViewport?.height && Number(list.formWidth) > list.viewport.width) formWidth = Math.max(formWidth, Math.min(1280, Number(list.formWidth) || 0));
    fit();
    drawTargets(list);
    if (activeIdentity && activeGeometry !== JSON.stringify(currentFields.get(activeIdentity)?.geometry)) requestReveal();
    revision = list.revision;
    if (list.signature === signature) return;
    signature = list.signature;
    // A row is known by its kind, label, and which of that pair it is: a new field shifts the refs.
    const old = new Map(Array.from(form.elements, control => [control.dataset.place, control]));
    const active = form.contains(document.activeElement) ? document.activeElement.dataset.place : null;
    const count = new Map();
    const failedPlaces = new Set([...failedFields].map(ref => fieldPlaces.get(ref)));
    failedFields.clear();
    fieldPlaces.clear();
    const children = [];
    const forms = [...new Set([...list.fields.map(field => field.form), ...(list.actions ?? []).map(action => action.form)])];
    for (const formId of forms) {
      for (const field of list.fields.filter(field => field.form === formId)) {
        const pair = `${field.kind}|${field.label}`;
        count.set(pair, (count.get(pair) ?? 0) + 1);
        const place = `${pair}|${count.get(pair)}`;
        fieldPlaces.set(field.ref, place);
        if (failedPlaces.has(place)) failedFields.add(field.ref);
        children.push(...fieldRow(field, place, old));
      }
      const group = Object.assign(document.createElement('div'), { className: 'actions' });
      for (const action of (list.actions ?? []).filter(action => action.form === formId)) {
        const button = Object.assign(document.createElement('button'), { type: 'button', textContent: action.label, disabled: action.disabled || submitting });
        button.dataset.submit = 'true';
        button.dataset.disabled = String(Boolean(action.disabled));
        const actionRevision = revision;
        button.addEventListener('click', async () => {
          if (submitting || navigating || closed || action.disabled) return;
          submitting = true;
          lockNavigation();
          for (const control of form.elements) control.disabled = true;
          try {
            // Include autofill/change events and immediately typed final characters before resolving.
            for (const input of form.querySelectorAll('input:not([type=checkbox])')) if ((editedFields.has(input.dataset.identity) || input.value) && sentText.get(Number(input.id.slice(2))) !== input.value) syncBox(input, Number(input.id.slice(2)));
            await queue;
            if (closed || failedFields.size || socket?.readyState !== WebSocket.OPEN) throw new Error('unavailable');
            const response = await call('action', { ref: action.ref, revision: actionRevision });
            const point = response?.ok && await response.json();
            if (!point || closed || socket?.readyState !== WebSocket.OPEN) throw new Error('stale');
            click(point);
            focusedRef = null;
            say('Sent. Continue on the next page if it asks for more.');
          } catch { if (!closed) say('Tap the button on the page. This action was not resent.'); }
          finally {
            submitting = false;
            lockNavigation();
            for (const control of form.elements) control.disabled = closed || control.dataset.disabled === 'true';
            await refresh();
          }
        });
        group.append(button);
      }
      if (group.children.length) children.push(group);
    }
    children.push(Object.assign(document.createElement('p'), { className: 'hint', textContent: 'For a button not listed here, tap the button on the page.' }));
    form.replaceChildren(...children);
    sentText.clear();
    focusedRef = null;
    if (active && !document.querySelector('#fields-panel').hasAttribute('inert')) Array.from(form.elements).find(control => control.dataset.place === active)?.focus({ preventScroll: true });
    const empty = !list.fields.length && !(list.actions ?? []).length;
    form.hidden = empty;
    otherHint.textContent = HINTS[empty ? 'none' : 'some'];
    if (empty !== listEmpty) other.open = empty;
    listEmpty = empty;
  }

  function layoutPreview() {
    if (!frame) return;
    if (window.innerWidth < NARROW_BELOW) {
      preview.style.width = `${Math.max(stage.clientWidth, frame.width)}px`;
      canvas.style.width = '100%';
    } else { preview.style.width = ''; canvas.style.width = ''; }
  }
  function positionTargets() {
    if (!frame || window.innerWidth >= NARROW_BELOW) { targets.hidden = true; return; }
    targets.hidden = false;
    const scale = 1 / pageScale(canvas.getBoundingClientRect(), frame);
    for (const [identity, input] of overlays) {
      const field = currentFields.get(identity); const rect = field?.hit ?? field?.geometry;
      if (!rect) continue;
      const text = field.geometry ?? rect;
      input.hidden = text.x + text.width <= 0 || text.y + text.height <= 0 || text.x >= frame.width || text.y >= frame.height;
      Object.assign(input.style, { left: `${rect.x * scale}px`, top: `${rect.y * scale}px`, width: `${rect.width * scale}px`, height: `${rect.height * scale}px`, pointerEvents: geometryReady ? 'auto' : 'none' });
    }
  }
  function drawTargets(list) {
    geometryReady = Boolean(frame && list.viewport?.width === frame.width && list.viewport?.height === frame.height);
    const live = new Set();
    for (const field of list.fields) {
      if (field.kind !== 'text' || !field.identity || !(field.hit ?? field.geometry) || !['text', 'email', 'password', 'tel', 'url', 'search', 'number', 'textarea'].includes(field.type)) continue;
      live.add(field.identity);
      let input = overlays.get(field.identity);
      if (!input) {
        input = textBox(field); input.dataset.identity = field.identity;
        input.setAttribute('aria-label', field.label || 'Field');
        if (fieldValues.has(field.identity)) input.value = fieldValues.get(field.identity);
        // Prevent the post-pointer native click from refocusing after a drag.
        input.addEventListener('click', event => event.preventDefault());
        overlays.set(field.identity, input); targets.append(input);
      }
      input.type = field.type === 'textarea' ? 'text' : field.type;
      input.setAttribute('aria-label', field.label || 'Field');
      for (const name of ['autocomplete', 'inputmode']) {
        if (field[name]) input.setAttribute(name, field[name]); else input.removeAttribute(name);
      }
    }
    for (const [identity, input] of overlays) if (!live.has(identity)) { input.remove(); overlays.delete(identity); fieldValues.delete(identity); editedFields.delete(identity); }
    positionTargets();
  }

  async function refresh() {
    if (closed || submitting || navigating) return;
    const response = await call('fields');
    const list = response?.ok && await response.json().catch(() => null);
    if (list) drawFields(list);
  }

  // Keep phone panels mounted, with only the selected one available to focus and assistive tools.
  let selectedPanel = 'page';
  const panels = ['page', 'fields'];
  function showPanel(name, moveFocus = false) {
    selectedPanel = name;
    const narrow = window.innerWidth < NARROW_BELOW;
    for (const id of panels) {
      const panel = document.querySelector(`#${id}-panel`);
      const tab = document.querySelector(`#${id}-tab`);
      const inactive = narrow && id !== name;
      if (inactive && panel.contains(document.activeElement)) document.activeElement.blur();
      panel.toggleAttribute('inert', inactive);
      panel.setAttribute('aria-hidden', String(inactive));
      tab.setAttribute('aria-selected', String(id === name));
      tab.tabIndex = id === name ? 0 : -1;
    }
    if (moveFocus) document.querySelector(`#${name}-tab`).focus();
  }
  for (const name of panels) {
    const tab = document.querySelector(`#${name}-tab`);
    tab.addEventListener('click', () => { showPanel(name); fit(); });
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      showPanel(event.key === 'Home' ? 'page' : event.key === 'End' ? 'fields' : selectedPanel === 'page' ? 'fields' : 'page', true);
      fit();
    });
  }

  // The page size: asked for on load, and again when the width changes, after resizing settles.
  let sentLayout = null;
  let resizing = null;
  const fit = () => {
    const width = stage.clientWidth;
    const layout = `${window.innerWidth < NARROW_BELOW}|${width}|${formWidth}`;
    if (closed || !width || layout === sentLayout) return;
    sentLayout = layout;
    resetPreview();
    layoutPreview();
    suspendTargets();
    requestedViewport = wantedSize({ boxWidth: width, boxHeight: stage.clientHeight, windowWidth: window.innerWidth, formWidth });
    call('viewport', requestedViewport).then(() => { clearTimeout(geometryTimer); geometryTimer = setTimeout(refresh, 180); });
  };
  // The visual viewport shrinks above a software keyboard; keep layout width and page pixels.
  const shell = document.querySelector('.shell');
  const viewport = window.visualViewport;
  let baselineWidth = window.innerWidth;
  let baselineHeight = viewport?.height ?? window.innerHeight;
  let keyboardOpen = false;
  let viewportShape = '';
  let revealSuppressed = false;
  let revealGeneration = 0;
  let revealTimer = null;
  const nextFrame = callback => window.requestAnimationFrame ? window.requestAnimationFrame(callback) : setTimeout(callback, 0);
  const editable = control => control?.matches?.('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, [contenteditable=true]') && !control.disabled;
  function suppressReveal() {
    revealSuppressed = true;
    revealGeneration++;
    clearTimeout(revealTimer);
  }
  function revealFocused() {
    if (!keyboardOpen || closed || revealSuppressed || touch?.dragging) return;
    const active = document.activeElement;
    if (!editable(active)) return;
    const onPage = targets.contains(active);
    const scroller = onPage ? stage : document.querySelector('#fields-panel');
    if (!scroller.contains(active) || scroller.hasAttribute('inert')) return;
    let rect = active.getBoundingClientRect();
    if (onPage) {
      // The tap outline can surround a whole label. Reveal just the actual text, never that outline.
      const field = currentFields.get(active.dataset.identity);
      if (!geometryReady || !frame || !field?.geometry) return;
      const image = canvas.getBoundingClientRect();
      const scale = 1 / pageScale(image, frame);
      if (active.hidden) return;
      rect = { left: image.left + Math.max(0, field.geometry.x) * scale, top: image.top + Math.max(0, field.geometry.y) * scale, right: image.left + Math.min(frame.width, field.geometry.x + field.geometry.width) * scale, bottom: image.top + Math.min(frame.height, field.geometry.y + field.geometry.height) * scale };
    }
    const bounds = scroller.getBoundingClientRect();
    const left = Math.max(bounds.left, viewport.offsetLeft || 0);
    const right = Math.min(bounds.right, (viewport.offsetLeft || 0) + viewport.width);
    const top = Math.max(bounds.top, viewport.offsetTop || 0);
    const bottom = Math.min(bounds.bottom, (viewport.offsetTop || 0) + viewport.height);
    if (right <= left || bottom <= top) return;
    const dx = revealOffset(rect.left, rect.right, left, right);
    const dy = revealOffset(rect.top, rect.bottom, top, bottom);
    scroller.scrollLeft = Math.max(0, Math.min(scroller.scrollWidth - scroller.clientWidth, scroller.scrollLeft + dx));
    scroller.scrollTop = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, scroller.scrollTop + dy));
  }
  function requestReveal(resume = false) {
    if (resume && !touch?.dragging) revealSuppressed = false;
    if (!keyboardOpen || revealSuppressed) return;
    const generation = ++revealGeneration;
    const settled = () => nextFrame(() => nextFrame(() => { if (generation === revealGeneration) revealFocused(); }));
    settled();
    clearTimeout(revealTimer);
    revealTimer = setTimeout(settled, 120); // Flex layout and mobile keyboard animations may finish later.
  }
  function fitShell() {
    const narrow = window.innerWidth < NARROW_BELOW;
    const height = viewport?.height ?? window.innerHeight;
    const scale = viewport?.scale ?? 1;
    if (baselineWidth !== window.innerWidth) {
      baselineWidth = window.innerWidth;
      baselineHeight = window.innerHeight; // Orientation/breakpoint changes start a fresh baseline.
    }
    if (Math.abs(scale - 1) < 0.01) baselineHeight = Math.max(baselineHeight, height);
    keyboardOpen = Boolean(narrow && viewport && Math.abs(scale - 1) < 0.01 && !closed && !navigating && editable(document.activeElement) && baselineHeight - height > Math.max(120, baselineHeight * 0.2));
    shell.classList.toggle('keyboard-open', keyboardOpen);
    shell.style.height = narrow && viewport ? `${height}px` : '';
    shell.style.position = narrow && viewport ? 'relative' : '';
    shell.style.top = narrow && viewport ? `${viewport.offsetTop || 0}px` : '';
    const shape = `${keyboardOpen}|${height}|${viewport?.offsetTop || 0}|${viewport?.offsetLeft || 0}`;
    if (shape !== viewportShape) { viewportShape = shape; requestReveal(true); }
  }
  viewport?.addEventListener('resize', fitShell);
  viewport?.addEventListener('scroll', fitShell);
  document.addEventListener('focusin', () => { fitShell(); requestReveal(true); });
  document.addEventListener('focusout', () => setTimeout(fitShell, 0));
  fitShell();
  window.addEventListener('resize', () => {
    fitShell();
    clearTimeout(resizing);
    showPanel(selectedPanel);
    resizing = setTimeout(fit, RESIZE_WAIT_MS);
  });

  form.addEventListener('submit', event => event.preventDefault());
  if (!key) return giveUp();
  say('Connecting…');
  showPanel(selectedPanel);
  fit();
  connect();
  refresh();
  polling = setInterval(() => { if (!document.hidden && !closed) refresh(); }, FIELDS_EVERY_MS);
}

if (typeof document !== 'undefined') start();
