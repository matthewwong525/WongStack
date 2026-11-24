import { html } from "./vendor/preact-htm.mjs";
import { Label } from "./ui.mjs";

/** One field of an opened item: its name, then the field under it. */
export const Field = ({ label, children }) => html`<${Label} class="grid gap-2">${label}${children}<//>`;

/** A group of ticks or level choices under its own bold name, for a person and a role. No box goes round it:
 *  the name and more room above than between its lines set it apart. */
export const Group = ({ legend, children }) =>
  html`<fieldset class="mt-2 grid min-w-0 gap-3.5"><legend class="mb-3 font-bold">${legend}</legend>${children}</fieldset>`;

/** One tick with its words: a real checkbox, so the device draws it and the keyboard reaches it. */
export const Tick = ({ checked, onChange, disabled, children }) => html`<${Label} class="font-semibold">
  <input type="checkbox" class="size-4 accent-primary" checked=${checked} disabled=${disabled} onChange=${event => onChange(event.currentTarget.checked)} />
  ${children}
<//>`;
