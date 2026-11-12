import { html, useState } from "./vendor/preact-htm.mjs";
import { readSetup, useAccess } from "./api.mjs";
import { useScreen } from "./context.mjs";
import { CopyText } from "./copy-text.mjs";
import { mayConnect, welcomeNote } from "./note.mjs";
import { Button, Dialog } from "./ui.mjs";

/** The viewer's own setup message, the same for everyone, read once for a person who may connect. Until it is read,
 *  or when it can't be, the note falls back to the address and email. */
function WithSetup({ status, person, children }) {
  const { data } = useAccess(useScreen().api, "setup", readSetup);
  return children(welcomeNote(status, person, data?.prompt.state === "ready" ? data.prompt.text : undefined));
}

/** The message to send a person, handed to `children`. Only a person who may connect gets the setup message, so only
 *  then is it read. */
const Note = props => (mayConnect(props.status, props.person) ? html`<${WithSetup} ...${props} />` : props.children(welcomeNote(props.status, props.person)));

/** The message as it reads, with one button to copy it. Copying sends nothing. */
const Body = ({ note, variant }) => html`<div class="grid grid-cols-[minmax(0,1fr)] gap-2">
  <p class="whitespace-pre-line wrap-anywhere text-sm text-muted-foreground">${note}</p>
  <${CopyText} text=${note} label="Copy" variant=${variant} shown />
</div>`;

/** The popup after a save that gives a person the project: the message to send them, Copy, and Done. */
export function WelcomeDialog({ status, person }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return html`<${Dialog} class="wrap-anywhere" title=${`Send ${person.email} this message`} description="They paste it into their AI assistant to connect."
    onEscape=${() => setOpen(false)} footer=${html`<${Button} variant="outline" data-dialog="cancel" onClick=${() => setOpen(false)}>Done<//>`}>
    <${Note} status=${status} person=${person}>${note => html`<${Body} note=${note} variant="default" />`}<//>
  <//>`;
}

/** The same message folded under a person's own Project tick, to copy it again. */
export const WelcomeFold = ({ status, person }) => html`<details class="text-sm">
  <summary class="cursor-pointer">Message to send them</summary>
  <div class="mt-2"><${Note} status=${status} person=${person}>${note => html`<${Body} note=${note} variant="outline" />`}<//></div>
</details>`;
