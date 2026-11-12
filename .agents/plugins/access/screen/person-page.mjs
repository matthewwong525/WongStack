import { html, useState } from "./vendor/preact-htm.mjs";
import { isAdmin } from "./api.mjs";
import { at } from "./address.mjs";
import { MakeAdmin } from "./confirm.mjs";
import { Field } from "./fields.mjs";
import { SetLabels } from "./labels.mjs";
import { NOTHING, sameSet, sent } from "./levels.mjs";
import { givesProject } from "./note.mjs";
import { Page } from "./page.mjs";
import { Link } from "./router.mjs";
import { SetFields } from "./set-fields.mjs";
import { signInLine } from "./status.mjs";
import { offered } from "./subjects.mjs";
import { Input, Select } from "./ui.mjs";

// What a role gives, named as labels: the role itself, opened, is the one place to change it. Admin gives
// everything, so it is said in words.
function RoleSet({ status, role }) {
  if (role.builtIn) return html`<p>Every app and key. Can manage Access. Full trust.</p>`;
  return html`<div class="grid gap-2">
    <p>From the ${role.name} role:</p>
    <${SetLabels} status=${status} set=${role} />
    <${Link} to=${at("roles", role.id)}>Edit the ${role.name} role<//>
  </div>`;
}

/** One person, opened: sign-in, role, then what it gives, or their own apps and key levels. Without `person`, a new
 *  one. Admin is the owner's to give and take: a save that newly gives it asks first. */
export function PersonPage({ person, ...props }) {
  const { status, save } = props;
  // Where the fields start: the person as saved, or a new one with nothing.
  const start = { email: person?.email ?? "", role: person?.role ?? "", set: person ?? NOTHING };
  const [email, setEmail] = useState(start.email);
  const [role, setRole] = useState(start.role);
  const [set, setSet] = useState(start.set);
  // Admin is newly chosen, and the save waits for the owner's yes.
  const [asking, setAsking] = useState(false);
  const held = isAdmin(status, start);
  const chosen = status.roles.find(item => item.id === role);
  // A role is the whole answer: apps and levels are sent only for a person's own set, every app and every key named.
  const access = chosen ? { role } : { role: null, ...sent(status, set) };
  const changed = email !== start.email || role !== start.role || !sameSet(set, start.set);
  // A save that newly gives them the project comes back with a message to send them.
  const send = () => save("people", { email, removed: false, ...access }, givesProject(status, person, { role: role || null, keys: set.keys }) ? { text: "Saved.", welcome: email } : undefined);
  return html`<${Page} ...${props} name=${person?.email ?? "Add person"} changed=${changed} action="Save access" onSave=${chosen?.builtIn && !held ? () => setAsking(true) : send}>
    ${asking && html`<${MakeAdmin} email=${email} pending=${props.pending} onConfirm=${send} onCancel=${() => setAsking(false)} />`}
    ${person ? html`<p class="text-muted-foreground">${signInLine(person, status).text}</p>`
      : html`<${Field} label="Email"><${Input} type="email" required autofocus value=${email} onValue=${setEmail} /><//>`}
    ${held && !status.viewer.owner ? html`<p>Admin · only the owner changes this</p>`
      : html`<${Field} label="Role"><${Select} value=${role} options=${[["", "Their own set"], ...offered(status).map(item => [item.id, item.name])]}
        onChange=${event => { const next = event.currentTarget.value; setRole(next); setSet(status.roles.find(item => item.id === next) ?? set); }} /><//>`}
    ${chosen ? html`<${RoleSet} status=${status} role=${chosen} />` : html`<${SetFields} status=${status} set=${set} onChange=${setSet} person=${person} />`}
  <//>`;
}
