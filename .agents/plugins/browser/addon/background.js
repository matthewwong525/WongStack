// The toolbar's Hand back, a green check: a badge counts the tabs that wait on the person; one click ends them all.
// config.json, written at each start beside this copy, holds the browser server's port and the hand-back key.
const POLL_MS = 2000;
const config = fetch(browser.runtime.getURL('config.json')).then(answer => answer.json());

async function call(method, path) {
  const { port, key } = await config;
  const answer = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { authorization: `Bearer ${key}` } });
  return answer.json();
}

async function show() {
  const count = await call('GET', '/turns').then(answer => answer.count ?? 0, () => 0);
  await browser.browserAction.setBadgeText({ text: count ? String(count) : '' });
  await browser.browserAction.setTitle({ title: count ? `Done: give the browser back to the chat (${count} waiting)` : 'Nothing waits on you' });
  await (count ? browser.browserAction.enable() : browser.browserAction.disable());
}

browser.browserAction.onClicked.addListener(() => call('POST', '/hand-back').catch(() => null).then(show));
show();
setInterval(show, POLL_MS);
