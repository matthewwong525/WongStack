// The live view's script (see hand-over.mjs `open --view` and view.mjs), also under live/ for a press or sign-in.
// view-page.html's one script tag must load the noVNC viewer before this script.

const CONNECTING = 'Opening the browser...';
const ENDINGS = {
  done: 'Done. Go back to the chat.',
  unannounced: 'Done. Go back to the chat, and say continue.',
  closed: 'This link has closed. Ask in the chat for a new one.',
  unloaded: 'The browser\'s picture didn\'t load. Reload this page to try again.',
};
/** A view that stays open: its line, when the agent gave no note, and its one button. */
export const KEEP_OPEN = { line: 'Tap through the steps you need, then tap I\'m finished.', button: 'I\'m finished' };
const PHONE_BELOW = 700;
const RETRY_MS = 500;
/** The keys pressed as they are, by the name a keydown gives: each one's X keysym. */
const KEYS = { Backspace: 0xff08, Tab: 0xff09, Enter: 0xff0d };

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

/** The line above a form's or a sign-in's view, for its `site` and `kind` (`pay` or `sign-in`): what it does and for
 * how many `seconds`, then after `waitS` not to pay again; with a `receipt`, how it ended. */
export function liveLine({ site, kind }, seconds, waitS, receipt) {
  const paying = kind === 'pay';
  if (receipt !== undefined) {
    if (receipt?.result !== 'done') return 'Closed. Your chat will say how it went.';
    return paying ? `${site} accepted. Done.` : `Signed in to ${site}. Done.`;
  }
  if (seconds < waitS) return `${paying ? 'Paying' : 'Signing in to'} ${site} · ${Math.max(0, seconds)} s`;
  return paying ? `${site} hasn't finished. Don't pay again unless it shows an error.` : `${site} hasn't finished signing in. Finish it here.`;
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
  // A form's or a sign-in's view: its site, kind, press time, and wait, on the link's clock (`ahead` of this one).
  let live = null;

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
  /** Writes a form's or a sign-in's line: counting, late, or, with a `receipt`, how it ended. */
  const writeLine = receipt => {
    const seconds = Math.floor((Date.now() + live.ahead - live.since) / 1000);
    const waitS = live.waitMs / 1000;
    $('#line-text').textContent = liveLine(live, seconds, waitS, receipt);
    $('#line').classList.toggle('late', receipt === undefined && seconds >= waitS);
  };
  /** Ends a form's or a sign-in's view: its line says how, the last picture stays, and nothing takes taps or typing. */
  const endLive = receipt => {
    if (over) return;
    over = true;
    viewer?.disconnect();
    empty();
    writeLine(receipt ?? null);
    $('#viewed').hidden = $('#type').hidden = true;
  };
  /** Keeps the screen's last picture in place of the screen that dropped, `rfb`. */
  const freeze = rfb => {
    let url = null;
    try { url = rfb?.toDataURL('image/jpeg', 0.85); } catch { /* no picture */ }
    if (url) $('#screen').replaceChildren(Object.assign(document.createElement('img'), { src: url, alt: 'The site\'s last picture' }));
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
   * finishing is asked again until its result comes. A form's or a sign-in's view keeps its last picture meanwhile. */
  async function dropped(rfb) {
    viewer = null;
    if (over) return;
    if (live) freeze(rfb);
    else show(CONNECTING);
    const response = await call('receipt');
    const ended = receipt => (live ? endLive(receipt) : end(ending(receipt)));
    if (response?.status === 200) return ended(await response.json().catch(() => null));
    if (response?.status !== 202) return ended(null);
    const { finishing } = (await response.json().catch(() => null)) ?? {};
    await new Promise(done => setTimeout(done, RETRY_MS));
    if (over) return;
    if (finishing) return dropped(null);
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
    rfb.addEventListener('disconnect', () => dropped(rfb));
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
    if (live || shapeOf(innerWidth) === fit.kind) layout();
    else report();
  });

  // The person says they're finished: the link ends and the chat reads the page.
  $('#viewed').addEventListener('click', () => {
    $('#viewed').disabled = true;
    call('done', {});
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
    if (view.live) {
      live = { ...view.live, ahead: (now ?? Date.now()) - Date.now() };
      document.title = live.site;
      $('#line').hidden = false;
      const tick = () => { if (!over) { writeLine(); setTimeout(tick, 1000); } };
      tick();
    } else {
      if (view.keepOpen) {
        $('#line').hidden = false;
        $('#line-text').textContent = note || KEEP_OPEN.line;
        $('#viewed').textContent = KEEP_OPEN.button;
      }
      await report();
    }
    if (!over) connect();
  })();
}

if (typeof document !== 'undefined') start();
