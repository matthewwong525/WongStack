// The Access page: `mount(element, options)` draws it into any element, and server/page.mjs serves it alone. No build:
// every file here is a plain ES module, and Preact with htm is vendored in vendor/.
import { html, render } from "./vendor/preact-htm.mjs";
import { setHome } from "./address.mjs";
import { client } from "./api.mjs";
import { App } from "./app.mjs";
import { Screen } from "./context.mjs";
import { Router } from "./router.mjs";

/** Draws the Access page into `element`, with the options and handle main.d.mts names. The host calls `update()`
 *  after it moves the address, and holds its own move while `hold(to)` is true. */
export function mount(element, { base = "/api/access/", home = "/apps/access/", appTitle = id => id, leave = to => window.location.assign(to), hosted = false } = {}) {
  setHome(home);
  const handle = { current: null };
  // The page's own styles, in access.css, apply inside this mark only.
  element.setAttribute("data-access-screen", "");
  render(html`<${Screen.Provider} value=${{ api: client(base), appTitle }}>
    <${Router} leave=${leave} handle=${handle} hosted=${hosted}><${App} /><//>
  <//>`, element);
  return {
    update: () => handle.current?.update(),
    hold: to => handle.current?.hold(to) ?? false,
    unmount: () => { render(null, element); element.removeAttribute("data-access-screen"); },
  };
}
