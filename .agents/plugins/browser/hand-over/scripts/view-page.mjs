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

/** What a watch link shows while each holds the browser: its line when it has its own, its one button and how loud,
 * and whether the person's taps and typing reach the browser. */
export const WATCH = {
  assistant: { button: 'Take over', main: true, hands: false },
  person: { line: 'Tap Hand back when you\'re done.', button: 'Hand back', main: true, hands: true },
  turn: { button: 'Hand back', main: false, hands: true },
};
const WATCH_ENDINGS = { done: 'All done. Go back to the chat.', stopped: 'Stopped. Go back to the chat.' };
/** How often a page asks the link for who holds a watch's browser, or for a turn view's tabs. */
const POLL_MS = 1000;

/** What a watch link shows for the link's `{control, line}`: the agent's line, or the turn's note, as the link gives
 * it; the person's own hold keeps its own line. */
export function watchShows({ control, line } = {}) {
  const shows = WATCH[control] ?? WATCH.assistant;
  return { ...shows, text: shows.line ?? line ?? '' };
}

/** What a turn view shows for the link's `{tabs, shown, note}`: the row, one tab per chat that is shown or new, none
 * with one tab; the shown turn's line, and its id, which a chat's next turn does not share. */
export function tabsShow({ tabs = [], shown = null, note = null } = {}) {
  const row = tabs.length > 1 ? tabs.map(tab => ({ chat: tab.chat, shown: tab.chat === shown, fresh: Boolean(tab.fresh) && tab.chat !== shown })) : [];
  const turn = tabs.find(tab => tab.chat === shown);
  return { row, line: turn?.note ?? note ?? '', id: turn?.id ?? shown ?? '' };
}

/** A watch link's closing line for a `receipt`. */
export const watchEnding = receipt => WATCH_ENDINGS[receipt?.result] ?? ENDINGS.closed;

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

/** The closing line for a receipt: done only when the person handed back. */
export function ending(receipt) {
  if (receipt?.result !== 'handed-back') return ENDINGS.closed;
  return receipt.notification === 'notified' ? ENDINGS.done : ENDINGS.unannounced;
}

function start(RFB = globalThis.RFB) {
  const $ = selector => document.querySelector(selector);
  const key = new URLSearchParams(location.hash.slice(1)).get('key') ?? '';
  if (RFB) history.replaceState(null, '', location.pathname);
  let viewer = null;
  let fit = null;
  let over = false;
  // A watch link: who holds the browser, and whether the person's taps and typing reach it.
  let watch = null;
  let mayType = true;
  // A turn view: the chat whose tab shows, its turn's id, the turn whose Hand back was pressed, and the limit's timer.
  let shownChat = null;
  let shownId = null;
  let handed = null;
  let closer = null;

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
    const ended = receipt => end(watch ? watchEnding(receipt) : ending(receipt));
    if (response?.status === 200) return ended(await response.json().catch(() => null));
    if (response?.status !== 202) return ended(null);
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
    rfb.viewOnly = !mayType;
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
    if (!viewer || !mayType || !text || $('#text').contains(event.target)) return;
    event.preventDefault();
    if (chord) for (const [keysym, code] of MODIFIERS) viewer.sendKey(keysym, code, false);
    chord = false;
    press(strokes('', text));
    empty();
  });

  /** Shows who holds a watch's browser, from the link's `info`. */
  const render = info => {
    if (over || !info) return;
    const shows = watchShows(info);
    watch = info.control;
    mayType = shows.hands;
    if (viewer) viewer.viewOnly = !mayType;
    $('#line-text').textContent = shows.text;
    Object.assign($('#hand'), { textContent: shows.button, className: shows.main ? 'btn-primary' : 'btn-ghost' });
    $('#text').hidden = !mayType;
    if (!mayType) empty();
  };
  const follow = async () => {
    const response = await call('watch');
    if (response?.ok) render(await response.json().catch(() => null));
    if (!over) setTimeout(follow, POLL_MS);
  };

  /** Ends the page at the link's limit. A browser keeps a timer's wait in 32 bits, so a limit long past could wrap
   * to weeks: a past limit waits 0. */
  const closeAt = (closesAt, now) => {
    clearTimeout(closer);
    if (closesAt) closer = setTimeout(() => end(ENDINGS.closed), Math.max(0, closesAt - (now ?? Date.now())));
  };
  /** Shows a turn view's tabs and the shown chat's line, from the link's `view`. */
  const renderTabs = view => {
    if (over || !view) return;
    const { row, line, id } = tabsShow(view);
    // The box mirrors what was typed on the page shown before.
    if ((view.shown ?? null) !== shownChat) empty();
    shownChat = view.shown ?? null;
    shownId = id;
    $('#line-text').textContent = line;
    if (line) document.title = line;
    $('#tabs').hidden = !row.length;
    $('#tabs').replaceChildren(...row.map(tab => {
      const button = Object.assign(document.createElement('button'), { type: 'button', textContent: tab.chat, className: tab.shown ? 'shown' : tab.fresh ? 'fresh' : '' });
      if (tab.shown) button.setAttribute('aria-current', 'page');
      if (tab.fresh) button.setAttribute('aria-label', `${tab.chat}, new`);
      button.addEventListener('click', () => showTab(tab.chat));
      return button;
    }));
    $('#hand').disabled = handed !== null && handed === shownId;
    closeAt(view.closesAt, view.now);
    layout();
  };
  /** Asks the link to show `chat`'s tab. */
  async function showTab(chat) {
    const response = await call('show', { chat });
    if (response?.ok) renderTabs(await response.json().catch(() => null));
  }
  const followTabs = async () => {
    const response = await call('view');
    if (response?.ok) renderTabs(await response.json().catch(() => null));
    if (!over) setTimeout(followTabs, POLL_MS);
  };
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

  // Hand back ends the shown chat's turn: the next tab shows, or after the last the link closes, and the screen's drop
  // shows how it ended. On a watch link the button takes the browser or hands it back, and the link stays open.
  $('#hand').addEventListener('click', async () => {
    if (!watch) {
      handed = shownId;
      $('#hand').disabled = true;
      return call('give', { chat: shownChat ?? undefined });
    }
    const response = await call(watch === 'assistant' ? 'take' : 'give', {});
    if (response?.ok) render(await response.json().catch(() => null));
  });

  (async () => {
    if (!key) return end(ENDINGS.closed);
    if (!RFB) return end(ENDINGS.unloaded);
    const response = await call('view');
    if (!response?.ok) return end(ENDINGS.closed);
    const view = await response.json();
    fit = view.fit;
    if (view.watch) {
      if (view.note) document.title = view.note;
      closeAt(view.closesAt, view.now);
      watch = 'assistant';
      mayType = false;
      await follow();
    } else {
      renderTabs(view);
      setTimeout(followTabs, POLL_MS);
    }
    await report();
    if (!over) connect();
  })();
}

if (typeof document !== 'undefined') start();
