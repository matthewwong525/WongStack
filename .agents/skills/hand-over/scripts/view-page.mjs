// The live view's script (see hand-over.mjs `open --view` and view.mjs): the person's turn in the browser.
// view-page.html's one script tag must load the noVNC viewer before this script.

const CONNECTING = 'Opening the browser...';
const ENDINGS = {
  done: 'Done. Go back to the chat.',
  unannounced: 'Done. Go back to the chat, and say continue.',
  closed: 'This link has closed. Ask in the chat for a new one.',
  unloaded: 'The browser\'s picture didn\'t load. Reload this page to try again.',
};
const PHONE_BELOW = 700;
const RETRY_MS = 500;
/** The keys pressed as they are, by the name a keydown gives: each one's X keysym. */
const KEYS = { Backspace: 0xff08, Tab: 0xff09, Enter: 0xff0d };
/** The modifier keys a held Ctrl+V or Cmd+V leaves down in the browser, each with its key code. */
const MODIFIERS = [[0xffe3, 'ControlLeft'], [0xffe4, 'ControlRight'], [0xffeb, 'MetaLeft'], [0xffec, 'MetaRight'], [0xffe7, 'MetaLeft'], [0xffe8, 'MetaRight']];

/** The key presses that turn the box's text from `before` into `after`, as X keysyms: a Backspace for each
 * character past the shared start, then each new one. Above Latin-1 a keysym is X's Unicode form; a break is Enter. */
export function strokes(before, after) {
  const [was, now] = [[...before], [...after]];
  let same = 0;
  while (same < was.length && same < now.length && was[same] === now[same]) same++;
  const keysym = char => (char === '\n' ? KEYS.Enter : char.codePointAt(0) <= 0xff ? char.codePointAt(0) : 0x01000000 + char.codePointAt(0));
  return [...was.slice(same).map(() => KEYS.Backspace), ...now.slice(same).map(keysym)];
}

/** The shape a page `width` wide reports: `phone` or `wide`. */
export function shapeOf(width) {
  return width < PHONE_BELOW ? 'phone' : 'wide';
}

/** The closing line for a receipt: done when the finish showed or the person handed back. */
export function ending(receipt) {
  if (receipt?.result !== 'done' && receipt?.result !== 'handed-back') return ENDINGS.closed;
  return receipt.notification === 'notified' ? ENDINGS.done : ENDINGS.unannounced;
}

function start(RFB = globalThis.RFB) {
  const $ = selector => document.querySelector(selector);
  const key = new URLSearchParams(location.hash.slice(1)).get('key') ?? '';
  if (RFB) history.replaceState(null, '', location.pathname);
  let viewer = null;
  let fit = null;
  let over = false;

  const call = (path, body) => fetch(path, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: { 'x-hand-over-key': key, ...(body && { 'content-type': 'application/json' }) },
    body: body && JSON.stringify(body),
  }).catch(() => null);
  /** Shows the one line, or with none the live view. */
  const show = line => {
    $('#status').textContent = line;
    $('#view').hidden = Boolean(line);
  };
  const end = line => {
    if (over) return;
    over = true;
    viewer?.disconnect();
    empty();
    show(line);
  };
  /** Scales the viewer's box so the fit's strip fills the stage, by width or height; the holder cuts off the rest. */
  function layout() {
    if (!fit) return;
    const room = $('#stage');
    const across = Math.min(room.clientWidth, (room.clientHeight || Infinity) * fit.width / fit.screen[1]);
    const [width, height] = fit.screen.map(side => `${side * across / fit.width}px`);
    Object.assign($('#screen').style, { width, height });
    Object.assign($('#holder').style, { width: `${across}px`, height });
  }

  /** Tells the link this page's shape, and lays the screen out by the fit it answers. */
  async function report() {
    const response = await call('fit', { fit: shapeOf(innerWidth) });
    if (response?.ok) fit = (await response.json().catch(() => null))?.fit ?? fit;
    document.body.classList.toggle('wide', fit?.kind === 'wide');
    layout();
  }

  /** The screen `rfb` dropped: end on the link's result, or connect again while it is still open; a link that is
   * finishing is asked again until its result comes. */
  async function dropped() {
    viewer = null;
    if (over) return;
    show(CONNECTING);
    const response = await call('receipt');
    if (response?.status === 200) return end(ending(await response.json().catch(() => null)));
    if (response?.status !== 202) return end(ending(null));
    const { finishing } = (await response.json().catch(() => null)) ?? {};
    await new Promise(done => setTimeout(done, RETRY_MS));
    if (over) return;
    if (finishing) return dropped();
    connect();
  }

  function connect() {
    $('#screen').replaceChildren();
    const rfb = new RFB($('#screen'), `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/screen`, { wsProtocols: [key] });
    viewer = rfb;
    rfb.scaleViewport = true;
    rfb.addEventListener('connect', () => {
      show('');
      layout();
    });
    rfb.addEventListener('disconnect', dropped);
  }

  let typed = '';
  /** Presses each keysym in the browser. */
  const press = keysyms => { for (const keysym of keysyms) viewer?.sendKey(keysym, null); };
  const empty = () => { typed = $('#text').value = ''; };
  $('#text').addEventListener('input', () => {
    if (!viewer) return;
    press(strokes(typed, $('#text').value));
    typed = $('#text').value;
  });
  $('#text').addEventListener('keydown', event => {
    const keysym = KEYS[event.key];
    if (!keysym || !viewer || (event.key === 'Backspace' && $('#text').value)) return;
    event.preventDefault();
    press([keysym]);
    if (event.key === 'Enter') empty();
  });
  // A tap on the screen moves the browser's cursor, so what the box holds no longer mirrors it.
  $('#holder').addEventListener('pointerdown', empty);
  // The viewer takes Ctrl+V and Cmd+V as keys for the browser, whose clipboard is empty: let the page's paste happen.
  let chord = false;
  $('#screen').addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'v') return;
    chord = true;
    event.stopPropagation();
  }, true);
  // A paste anywhere on the view types into the browser, as the box does; nothing pasted is kept or sent elsewhere.
  // A paste in the box is the box's own: its input handler types it, over the box's selection.
  document.addEventListener('paste', event => {
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (!viewer || !text || $('#text').contains(event.target)) return;
    event.preventDefault();
    if (chord) for (const [keysym, code] of MODIFIERS) viewer.sendKey(keysym, code, false);
    chord = false;
    press(strokes('', text));
    empty();
  });
  // A phone's keyboard covers the page's foot without resizing it: follow what is still in sight.
  globalThis.visualViewport?.addEventListener('resize', () => {
    $('#view').style.height = `${visualViewport.height}px`;
    scrollTo(0, 0);
    layout();
  });

  addEventListener('resize', () => {
    if (over || !fit) return;
    if (shapeOf(innerWidth) === fit.kind) layout();
    else report();
  });

  // Hand back ends the turn: the link closes, and the screen's drop shows how it ended.
  $('#hand').addEventListener('click', () => {
    $('#hand').disabled = true;
    call('give', {});
  });

  (async () => {
    if (!key) return end(ENDINGS.closed);
    if (!RFB) return end(ENDINGS.unloaded);
    const response = await call('view');
    if (!response?.ok) return end(ENDINGS.closed);
    const { note, closesAt, now, ...view } = await response.json();
    if (note) document.title = note;
    fit = view.fit;
    // A browser keeps a timer's wait in 32 bits, so a limit long past could wrap to weeks: a past limit waits 0.
    if (closesAt) setTimeout(() => end(ENDINGS.closed), Math.max(0, closesAt - (now ?? Date.now())));
    $('#line-text').textContent = note ?? '';
    await report();
    if (!over) connect();
  })();
}

if (typeof document !== 'undefined') start();
