import { html } from "./vendor/preact-htm.mjs";
import { isAdmin } from "./api.mjs";
import { sent } from "./levels.mjs";
import { givesProject } from "./note.mjs";
import { offered } from "./subjects.mjs";
import { Select } from "./ui.mjs";

/** A person's role, picked in their row, in the device's own picker. A pick saves at once, sending the role alone,
 *  and carries the undo. Admin is the owner's to give: picking it hands the save to `ask`, which asks first. */
export function RoleSelect({ status, pending, save, person, ask }) {
  const roles = offered(status);
  if (isAdmin(status, person) && !status.viewer.owner) return "Admin";
  const who = { email: person.email, removed: false };
  const undo = person.role ? { ...who, role: person.role } : { ...who, role: null, ...sent(status, person) };
  // A pick that newly gives them the project also opens the message to send them.
  const give = role => save("people", { ...who, role: role?.id ?? null }, { text: `${person.email} now has ${role?.name ?? "their own set"}.`, undo,
    welcome: givesProject(status, person, { role: role?.id ?? null, keys: person.keys }) ? person.email : undefined });
  return html`<${Select} aria-label=${`Role for ${person.email}`} value=${person.role ?? ""} disabled=${pending}
    options=${[["", "Own set"], ...roles.map(item => [item.id, item.name])]} onChange=${event => {
      const role = roles.find(item => item.id === event.currentTarget.value);
      // The picker shows what is saved until the save comes back.
      event.currentTarget.value = person.role ?? "";
      if (role?.builtIn) ask(() => give(role));
      else give(role);
    }} />`;
}
