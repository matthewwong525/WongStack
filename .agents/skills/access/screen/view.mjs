import { html } from "./vendor/preact-htm.mjs";
import { VIEWS, viewLabel } from "./address.mjs";
import { keyRows } from "./levels.mjs";
import { Notices } from "./notices.mjs";
import { Link } from "./router.mjs";
import { buttonClass } from "./ui.mjs";

// The current view is boxed, bold and underlined: never marked by colour alone.
const TAB = "rounded-md border border-transparent px-3 py-2 no-underline aria-[current=page]:border-border aria-[current=page]:font-bold aria-[current=page]:underline";

/** The add button that ends the views' line: a link drawn as the one solid button. */
export const AddLink = ({ to, children }) =>
  html`<${Link} to=${to} data-slot="button" data-variant="default" class=${buttonClass()}><span aria-hidden="true">+ </span>${children}<//>`;

/** The views the switch shows: Services only for a project that gives keys. */
export const shownViews = status => VIEWS.filter(view => view.name !== "services" || status.keys);

/** The frame of every owner screen: the switch between the views with the add button, the one spot for notices,
 *  the list, and whatever is opened beside it. An opened item with changes holds a move itself. */
export function View({ add, children, ...props }) {
  const { status, view } = props;
  // The owner is a person too; a removed one is not counted. Services counts its keys.
  const counts = { people: 1 + status.people.filter(person => person.status === "active").length, roles: status.roles.length,
    services: keyRows(status.keys).length };
  return html`<section aria-label=${view.title} class="grid min-w-0 gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2.5">
      <nav aria-label="Access views" class="flex flex-wrap gap-2.5">${shownViews(status).map(item =>
        html`<${Link} key=${item.name} to=${item.home} class=${TAB} aria-current=${item === view ? "page" : undefined}><span id=${viewLabel(item)}>${item.title}</span> <span class="font-normal text-muted-foreground">${counts[item.name]}</span><//>`)}</nav>
      ${add}
    </div>
    <${Notices} ...${props} />
    ${children}
  </section>`;
}
