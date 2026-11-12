import { html } from "./vendor/preact-htm.mjs";
import { Button, Dialog } from "./ui.mjs";

/** The one way Access asks a question: a popup, open while it is drawn. The way out is focused first and is Escape's
 *  answer too; a click on the dimmed page answers nothing. The answer closes it, so a save shows as on its way. */
export function Confirm({ title, action, cancel = "Cancel", pending, onConfirm, onCancel, children }) {
  return html`<${Dialog} class="wrap-anywhere" title=${title} description=${children} onEscape=${onCancel} footer=${[
    html`<${Button} key="cancel" variant="outline" data-dialog="cancel" disabled=${pending} onClick=${onCancel}>${cancel}<//>`,
    html`<${Button} key="action" data-dialog="action" disabled=${pending} onClick=${onConfirm}>${action}<//>`,
  ]} />`;
}

/** Giving Admin asks first, in a person's row and in their panel: it is full trust. */
export const MakeAdmin = ({ email, ...props }) =>
  html`<${Confirm} title=${`Make ${email} an Admin?`} action="Make Admin" ...${props}>Every app, every key, and can change anyone's access.<//>`;
