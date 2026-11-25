// The page's own addresses, kept in the browser's history: a move inside Access draws the new view without a reload,
// and an opened item with changes holds every move until it is answered. Leaving Access is the host's to do.
import { createContext, html, useContext, useEffect, useLayoutEffect, useRef, useState } from "./vendor/preact-htm.mjs";
import { homePath, readSaid } from "./address.mjs";

const Where = createContext(null);
let made = 0;
const read = () => {
  const state = window.history.state;
  return { path: window.location.pathname, said: readSaid(state?.usr), key: state?.key ?? "default" };
};

/** Holds the address and the one way to move. `leave(to)` goes outside Access. `handle` gets `{ update, hold }`
 *  for the host: read the address again, and ask before the host moves; `hosted`: Back is the host's to hold. */
export function Router({ leave, handle, hosted = false, children }) {
  const [where, setWhere] = useState(read);
  const hold = useRef(null);
  const last = useRef(where);
  last.current = where;
  const go = (to, { replace = false, state, pass = false } = {}) => {
    if (!pass && hold.current?.(to)) return;
    if (pass) hold.current = null;
    if (!`${to}/`.startsWith(homePath())) return leave(to);
    const before = window.history.state;
    const index = typeof before?.idx === "number" ? before.idx : 0;
    const entry = { usr: state ?? null, key: `access-${++made}`, idx: replace ? index : index + 1 };
    window.history[replace ? "replaceState" : "pushState"](entry, "", to);
    setWhere(read());
  };
  useEffect(() => {
    // A host's router holds Back and Forward itself, before the address moves, and calls `update()` after.
    if (hosted) return;
    // Back or Forward has moved already: with changes to lose, the address goes back to the open item and asks.
    const moved = () => {
      const to = window.location.pathname;
      if (hold.current?.(to)) {
        const index = window.history.state?.idx;
        window.history.pushState({ usr: null, key: last.current.key, idx: typeof index === "number" ? index + 1 : 0 }, "", last.current.path);
        return;
      }
      setWhere(read());
    };
    window.addEventListener("popstate", moved);
    return () => window.removeEventListener("popstate", moved);
  }, [hosted]);
  if (handle) handle.current = { update: () => setWhere(read()), hold: to => !!hold.current?.(to) };
  return html`<${Where.Provider} value=${{ ...where, go, hold }}>${children}<//>`;
}

/** The current address, what the last change said, and `go(to, { replace, state, pass })`. */
export const useWhere = () => useContext(Where);

/** While drawn, an opened item holds every move: `ask(to)` returns true once it has asked. A move with `pass` goes. */
export function useHold(ask) {
  const { hold } = useWhere();
  useLayoutEffect(() => { hold.current = ask; });
  useLayoutEffect(() => () => { if (hold.current) hold.current = null; }, []);
}

/** A link inside Access: a plain click moves without a reload; a click that opens a new tab is the browser's. */
export function Link({ to, onClick, children, ...props }) {
  const { go } = useWhere();
  return html`<a href=${to} ...${props} onClick=${event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    go(to);
  }}>${children}</a>`;
}
