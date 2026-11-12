// The background helper's live line to each app: a WebSocket that says only "look", so the helper polls rarely
// while the line is open. wiki/stack/live-line.md

const LINE_POLL_MS = 300_000;
const DOWN_POLL_MS = 10_000;
const TYPE = /^[a-z-]{1,20}$/;

/** How long the helper waits between rounds: 5 min while every line is open, 10 s while one is down.
 * REPLY_LINK_INBOX_POLL_MS overrides both. */
export function nextPoll(allOpen, env = process.env) {
  return Number(env.REPLY_LINK_INBOX_POLL_MS) || (allOpen ? LINE_POLL_MS : DOWN_POLL_MS);
}

/** Keeps one line open: says hello on open and every `helloMs`, calls `onLook` on a look, and dials again after a
 * close, 1 s doubling to 60 s until one opens. `connect` resolves to a WebSocket, signed in afresh each time. */
export function openLine({ connect, computer, protocol, onLook, log = () => {}, firstMs = 1000,
  maxMs = 60_000, helloMs = 30_000, timers = globalThis }) {
  let socket = null, open = false, ended = false, delay = firstMs, retry = null, hello = null;
  const hi = () => { try { socket?.send(JSON.stringify({ t: 'hello', computer, protocol })); } catch { /* closed */ } };
  const later = ms => { if (!ended) retry = timers.setTimeout(dial, ms); };
  const backoff = () => { const ms = delay; delay = Math.min(delay * 2, maxMs); return ms; };
  function heard(data) {
    let type;
    try { type = JSON.parse(String(data))?.t; } catch { /* not JSON */ }
    if (type === 'look') return onLook();
    if (type === 'bye' || type === 'pong') return;
    log({ event: 'ignored', message: typeof type === 'string' && TYPE.test(type) ? type : 'other' });
  }
  async function dial() {
    retry = null;
    let next;
    try { next = await connect(); } catch { return later(backoff()); }
    if (ended) { try { next.close(1000); } catch { /* already closed */ } return; }
    socket = next;
    next.addEventListener('open', () => { delay = firstMs; open = true; hi(); hello = timers.setInterval(hi, helloMs); });
    next.addEventListener('message', event => heard(event.data));
    next.addEventListener('close', () => {
      timers.clearInterval(hello);
      hello = null;
      if (socket === next) socket = null;
      open = false;
      later(backoff());
    });
  }
  dial();
  return {
    get open() { return open; },
    close() {
      ended = true;
      timers.clearTimeout(retry);
      timers.clearInterval(hello);
      try { socket?.close(1000); } catch { /* already closed */ }
    },
  };
}

/** One line per app origin: `sync(apps)` takes `origin → client`, opening new lines and closing gone ones. */
export function appLines({ connect, computer, protocol, onLook, log, ...options }) {
  const lines = new Map();
  return {
    sync(apps) {
      for (const [origin, line] of lines) if (!apps.has(origin)) { line.close(); lines.delete(origin); }
      for (const [origin, client] of apps) {
        if (!lines.has(origin)) lines.set(origin, openLine({ connect: () => connect(client), computer, protocol, onLook, log, ...options }));
      }
    },
    allOpen: () => lines.size > 0 && [...lines.values()].every(line => line.open),
    close() { for (const line of lines.values()) line.close(); lines.clear(); },
  };
}

/** A sleep a look cuts short; a look during a round makes the next wait return at once, so no look is lost. */
export function waiter({ timers = globalThis } = {}) {
  let wake = null, pending = false;
  return {
    poke() { if (wake) wake(); else pending = true; },
    wait(ms, signal) {
      if (pending || signal?.aborted) { pending = false; return Promise.resolve(); }
      return new Promise(resolve => {
        const done = () => { timers.clearTimeout(timer); signal?.removeEventListener('abort', done); wake = null; resolve(); };
        const timer = timers.setTimeout(done, ms);
        signal?.addEventListener('abort', done, { once: true });
        wake = done;
      });
    },
  };
}
