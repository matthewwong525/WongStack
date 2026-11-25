import { html, useState } from "./vendor/preact-htm.mjs";
import { readStatus, useAccess } from "./api.mjs";
import { partsOf, VIEWS } from "./address.mjs";
import { useScreen } from "./context.mjs";
import { Loading } from "./loading.mjs";
import { People } from "./people.mjs";
import { Roles } from "./roles.mjs";
import { useWhere } from "./router.mjs";
import { Services } from "./services.mjs";
import { Button, Skeleton } from "./ui.mjs";
import { shownViews } from "./view.mjs";

const SCREENS = { people: People, roles: Roles, services: Services };
const UNFINISHED = "That did not finish. Check the list below before trying again.";

// While people load: the view tabs' height, then a table of five rows.
export const LoadingPeople = () => html`<${Loading} label="Loading people…" class="grid gap-4">
  <${Skeleton} class="h-9 w-64 max-w-full" />
  <div class="grid gap-3">${Array.from({ length: 5 }, (_, row) => html`<div key=${row} class="grid grid-cols-4 gap-4">${Array.from({ length: 4 }, (_, cell) => html`<${Skeleton} key=${cell} class="h-5" />`)}</div>`)}</div>
<//>`;

/** Access is unavailable, with the one way to try again. */
export const Unavailable = ({ reload }) => [
  html`<p key="said" role="alert">Access is unavailable.</p>`,
  html`<${Button} key="retry" variant="outline" class="justify-self-start" onClick=${reload}>Retry<//>`,
];

// The owner's screens, and an Admin's. One read of the whole status serves the views and the pages under them.
export function Owner() {
  const { api } = useScreen();
  const { data, error, reload } = useAccess(api, "status", readStatus);
  const [pending, setPending] = useState(false);
  const { path, said, go } = useWhere();
  const [name, ...rest] = partsOf(path) ?? [];
  // An address that names no view shows People, and so does a view the project gives nothing for.
  const named = data && shownViews(data).find(item => item.name === name);
  const view = named ?? VIEWS[0];
  const Screen = SCREENS[view.name];
  const save = async (to, body, done = { text: to === "retry" ? "Checked again." : "Saved." }) => {
    setPending(true);
    let result = { failed: false, ...done };
    try { await api.change(to, body); }
    // The save may have landed: the list below is read again, so nothing is sent twice.
    catch { result = { text: UNFINISHED, failed: true }; }
    go(view.home, { replace: true, state: result, pass: true }); reload(); setPending(false);
  };
  return [
    !data && !error && html`<${LoadingPeople} key="loading" />`,
    error && html`<${Unavailable} key="error" reload=${reload} />`,
    data && html`<${Screen} key="screen" status=${data} id=${named ? rest.join("/") : ""} view=${view} pending=${pending} said=${said} save=${save} reload=${reload} />`,
  ];
}
