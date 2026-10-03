import { need, shaOK, uuidOK } from './security.mjs';
import { verificationHeaders } from './access.mjs';

export const observationBounds = Object.freeze({ attempts: 12, readMs: 5000, totalMs: 60000, waitMs: 5000 });
const clock = {
  now: () => Date.now(),
  wait: ms => new Promise(resolve => setTimeout(resolve, ms)),
  timer: (fn, ms) => setTimeout(fn, ms),
  cancel: timer => clearTimeout(timer),
};
const transient = error => error?.name === 'TypeError' || error?.name === 'AbortError' || error?.name === 'TimeoutError';

// Only authenticated identity reads repeat. Fetch AND body consumption share an abortable
// deadline; the race still stops observation if a transport ignores its abort signal.
async function readIdentity(state, url, fetcher, ms, timing) {
  // Local configuration failures are permanent, not transport failures to retry.
  const headers = { ...verificationHeaders(state), 'X-WongStack-Runtime': state.runtimeSecret };
  const abort = new AbortController();
  let timer, response;
  const timeout = new Promise((_, reject) => {
    timer = timing.timer(() => {
      abort.abort(); reject(Object.assign(new Error('Publication identity read timed out'), { name: 'TimeoutError' }));
    }, ms);
  });
  const read = async () => {
    try {
      response = await fetcher(`${url}/__wongstack/identity`, { redirect: 'manual', signal: abort.signal, headers });
    } catch (error) {
      if (transient(error)) return null;
      throw error;
    }
    need(!response.redirected && !(response.status >= 300 && response.status < 400), 'Publication identity redirect refused');
    if (response.status >= 500 && response.status <= 599) return null;
    need(response.ok, 'Publication identity permanently denied');
    let identity;
    try { identity = await response.json(); }
    catch (error) {
      if (transient(error)) return null;
      throw new Error('Publication identity malformed');
    }
    need(identity && !Array.isArray(identity) && typeof identity === 'object' && identity.projectId === state.id, 'Publication identity tenant mismatch or malformed');
    need(shaOK(identity.sha) || identity.sha === 'bootstrap', 'Publication identity malformed');
    return identity;
  };
  try { return await Promise.race([read(), timeout]); }
  catch (error) { if (error?.name === 'TimeoutError') return null; throw error; }
  finally {
    timing.cancel(timer);
    // Early HTTP refusals do not consume the response body. Abort the transport on
    // every exit, and release an unlocked body without waiting on its cancellation.
    abort.abort();
    if (response?.body && !response.body.locked) void response.body.cancel().catch(() => {});
  }
}

export async function observePublicationIdentity(state, receipt, sha, fetcher = (...args) => fetch(...args), timing = clock) {
  const deadline = timing.now() + observationBounds.totalMs;
  const previous = shaOK(state.production?.sha) ? state.production.sha : null;
  const bootstrap = state.bootstrap?.production;
  const knownBootstrap = !state.production && bootstrap?.status === 'verified' && bootstrap.target === receipt.target && uuidOK(bootstrap.version) && uuidOK(bootstrap.deployment);
  for (let attempt = 0; attempt < observationBounds.attempts; attempt++) {
    const remaining = deadline - timing.now();
    need(remaining > 0, 'Publication identity observation exhausted; reservation retained');
    const identity = await readIdentity(state, receipt.url, fetcher, Math.min(observationBounds.readMs, remaining), timing);
    need(timing.now() < deadline, 'Publication identity observation exhausted; reservation retained');
    if (identity?.sha === sha) return { sha, projectId: state.id };
    need(!identity || identity.sha === previous || knownBootstrap && identity.sha === 'bootstrap', 'Publication identity unexpected commit');
    need(attempt + 1 < observationBounds.attempts, 'Publication identity observation exhausted; reservation retained');
    await timing.wait(Math.min(observationBounds.waitMs, deadline - timing.now()));
  }
}
