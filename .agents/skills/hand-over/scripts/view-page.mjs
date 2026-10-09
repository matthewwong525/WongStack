// The live view's script (see hand-over.mjs `open --view` and view.mjs). It shows the assistant's
// browser on the page it has open, and carries the person's taps and typing to it.
//
// The page has one line while it connects, *Opening the browser...*, and one when it ends: *Done. Go
// back to the chat.* or *This link has closed. Ask in the chat for a new one.* Live, the browser's
// screen fills the page, over one box. The note from `GET /view` is the page's title only. When a
// phone's keyboard opens, the page shrinks to what is still in sight, so the box sits on the keyboard
// and the screen stays above it. There is no close button: the person closes the tab.
//
// The screen is drawn by the viewer view-page.html loads into `RFB`, noVNC's `core/rfb.js` and nothing
// else of noVNC: its own page and clipboard panel are never loaded. The viewer finishes loading a beat
// late, so the page's one script tag loads it first and this script only after it; as two tags, this
// script ran first, found no viewer, and showed the closed line on a link that was open. A viewer that
// fails to load is reloaded twice by that tag; after that this script says to reload, and keeps the key
// in the address so a reload works. The viewer connects to `/screen`
// with the link's key as the WebSocket subprotocol, since a WebSocket can send no header. The key
// leaves the page only there and in the `x-hand-over-key` header of its own requests.
//
// The page reports its shape, `phone` under 700 wide and `wide` otherwise, through `POST /fit` on
// connect and when it changes, as on a rotate. The reply is the fit: the strip's width and the
// screen's size. The viewer's box is scaled so the strip fills the page's width, or its height above
// the bar when that is the tighter one, and the holder cuts off the rest of the screen, so a phone
// shows only the page's own strip.
//
// The box types straight into the browser, key by key, with no send. Each change to the box is turned
// into key presses by `strokes`: a Backspace for each character that went, then each character that
// came, so a phone's autocorrect and a paste arrive as they look. Enter, Tab, and a Backspace in an
// empty box are pressed as they are. A tap on the screen empties the box, since the browser's cursor
// has moved. A phone's own keyboard never reaches the screen, so this box is how a phone types.
//
// When the screen drops, the page asks `/receipt`: a result ends the page, a link still open connects
// again, and no answer closes it. The page also closes at `closesAt`, on the watcher's clock.
// `shapeOf` and `ending` are exported for tests.

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

/**
 * The key presses that turn the box's text from `before` into `after`, as X keysyms: a Backspace for
 * each character past what they share at the start, then each new character. A character's keysym is
 * its own code up to Latin-1, and X's Unicode form above it; a line break is Enter.
 */
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

/** The closing line for a receipt: done only when the site let the person through. */
export function ending(receipt) {
  if (receipt?.result !== 'done') return ENDINGS.closed;
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

  /** Scales the viewer's box so the fit's strip fills the stage, by its width or its height; the holder cuts off the rest. */
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

  /** The screen dropped: end on the link's result, or connect again while it is still open. */
  async function dropped() {
    viewer = null;
    if (over) return;
    show(CONNECTING);
    const response = await call('receipt');
    if (response?.status === 200) return end(ending(await response.json().catch(() => null)));
    if (response?.status !== 202) return end(ENDINGS.closed);
    await new Promise(done => setTimeout(done, RETRY_MS));
    if (!over) connect();
  }

  function connect() {
    $('#screen').replaceChildren();
    viewer = new RFB($('#screen'), `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/screen`, { wsProtocols: [key] });
    viewer.scaleViewport = true;
    viewer.addEventListener('connect', () => {
      show('');
      layout();
    });
    viewer.addEventListener('disconnect', dropped);
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

  (async () => {
    if (!key) return end(ENDINGS.closed);
    if (!RFB) return end(ENDINGS.unloaded);
    const response = await call('view');
    if (!response?.ok) return end(ENDINGS.closed);
    const { note, closesAt, now, ...view } = await response.json();
    if (note) document.title = note;
    fit = view.fit;
    if (closesAt) setTimeout(() => end(ENDINGS.closed), closesAt - (now ?? Date.now()));
    await report();
    if (!over) connect();
  })();
}

if (typeof document !== 'undefined') start();
