import { html, useState } from "./vendor/preact-htm.mjs";
import { Confirm } from "./confirm.mjs";
import { Field } from "./fields.mjs";
import { NOTHING, sameSet, sent } from "./levels.mjs";
import { Page } from "./page.mjs";
import { SetFields } from "./set-fields.mjs";
import { holdersLine } from "./subjects.mjs";
import { Button, Input, Select } from "./ui.mjs";

/** Admin, opened: what it gives and who holds it. Nothing here changes, so the panel only closes. */
export const BuiltInRole = ({ role, ...props }) => html`<${Page} ...${props} name=${role.name} changed=${false}>
  <p>Every app and every key, including new ones.</p>
  <p>Can manage Access.</p>
  <p>Only the owner gives it.</p>
  <p>People: ${holdersLine(props.status, role.id)}</p>
<//>`;

/** One role, opened: a name, its apps and key levels, and who holds it. Without `role`, a new one.
 *  Removing it asks first, over the panel. */
export function RolePage({ role, ...props }) {
  const { status, pending, save } = props;
  const [name, setName] = useState(role?.name ?? "");
  const [set, setSet] = useState(role ?? NOTHING);
  // The person a new role copies its apps and key levels from.
  const [from, setFrom] = useState("");
  const [removing, setRemoving] = useState(null);
  const active = status.people.filter(person => person.status === "active").map(person => [person.email, person.email]);
  return html`<${Page} ...${props} name=${role?.name ?? "Add role"} changed=${name !== (role?.name ?? "") || !sameSet(set, role ?? NOTHING)} action="Save role"
    onSave=${() => save("roles", { id: role?.id, name, ...sent(status, set) })}
    extra=${role && html`<${Button} variant="outline" onClick=${() => setRemoving(role)}>Remove role<//>`}>
    ${removing && html`<${Confirm} title=${`Remove ${removing.name}?`} action="Remove role" pending=${pending}
      onConfirm=${() => save("roles", { id: removing.id, removed: true })} onCancel=${() => setRemoving(null)}>
      Its people keep the access they have now, as their own set.
    <//>`}
    <${Field} label="Name"><${Input} type="text" required maxLength=${60} autofocus=${!role} value=${name} onValue=${setName} /><//>
    ${!role && html`<${Field} label="Copy from a person"><${Select} value=${from} options=${[["", "Nobody"], ...active]}
      onChange=${event => { const email = event.currentTarget.value; setFrom(email); setSet(status.people.find(person => person.email === email) ?? NOTHING); }} /><//>`}
    <${SetFields} status=${status} set=${set} onChange=${setSet} />
    <p>People: ${holdersLine(status, role?.id)}</p>
  <//>`;
}
