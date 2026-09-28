// The hand-over page's script: shows the agent's live page and sends the person's clicks and typing
// to it through the watcher's `/stream` proxy (see hand-over.mjs). It speaks agent-browser's
// documented stream messages: `frame` in; `input_mouse` and `input_keyboard` out.
// The pure helpers `toPage` and `typedKeys` are exported for the tests; the rest runs only in a browser.

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

  if (!key) return giveUp();
  say('Connecting…');
  connect();
}

if (typeof document !== 'undefined') start();
