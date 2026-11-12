import { html, useState } from "./vendor/preact-htm.mjs";
import { isAdmin } from "./api.mjs";
import { at } from "./address.mjs";
import { Confirm, MakeAdmin } from "./confirm.mjs";
import { dots, setColumn, summary } from "./levels.mjs";
import { PersonPage } from "./person-page.mjs";
import { Pushers } from "./pushers.mjs";
import { RoleSelect } from "./role-select.mjs";
import { useWhere } from "./router.mjs";
import { canRetry, listed, signInLine } from "./status.mjs";
import { Cell, Name, Row, Table } from "./table.mjs";
import { RowMenu } from "./ui.mjs";
import { AddLink, View } from "./view.mjs";

/** What removing a person does, said before it happens. The project's own lines show only where it hands one out. */
function removal(status) {
  if (status.environment !== "live") return "They leave the practice list. The real sign-in list is not touched.";
  const project = status.project !== undefined;
  return [project ? "They are blocked at once and can no longer download the project." : "They are blocked at once.",
    listed(status) && (status.started ? "Everyone is signed out and signs in again."
      : "Once Access setup finishes, they leave the sign-in list, and everyone is signed out and signs in again."),
    "This can't be undone.",
    project && "A copy of the project already on their device stays there. Access given where the project is kept is removed there."].filter(Boolean).join(" ");
}

// The view that opens first: one row per person, the owner first with nothing to change. A role is picked in the row,
// and Admin asks first; the rest sits behind its menu. Only the owner removes an Admin. GitHub pushers sit below.
export function People(props) {
  const { status, id, pending, save } = props;
  const { owner, email: viewer } = status.viewer;
  const { go } = useWhere();
  const [removing, setRemoving] = useState(null);
  // The person Admin was picked for in their row, with the save that gives it once the owner says yes.
  const [making, setMaking] = useState(null);
  const opened = status.people.find(item => item.email === id);
  const you = email => email === viewer && "You";
  const column = setColumn(status);
  return html`<${View} ...${props} add=${html`<${AddLink} to=${at("people", "new")}>Add person<//>`}>
    <${Table} view=${props.view} columns=${["Person", "Sign-in", "Role", column].filter(Boolean)} actions="Actions">
      <${Row}>
        <${Name} title=${status.ownerEmail} marks=${[you(status.ownerEmail)]} />
        <${Cell} class="text-muted-foreground">${listed(status) ? "Can sign in" : "Listed"}<//>
        <${Cell}>${dots("Owner", !owner && "picks Admins")}<//>
        ${column && html`<${Cell}>Everything<//>`}
        <${Cell} actions />
      <//>
      ${status.people.map(person => {
        const signIn = signInLine(person, status);
        const active = person.status === "active";
        const page = at("people", person.email);
        const admin = isAdmin(status, person);
        const items = [{ label: active ? "Open" : "Add back", onSelect: () => go(page) },
          signIn.unfinished && canRetry(status) && { label: "Try again", disabled: pending, onSelect: () => save("retry") },
          active && (owner || !admin) && { label: "Remove", disabled: pending, onSelect: () => setRemoving(person) }].filter(Boolean);
        return html`<${Row} key=${person.email} to=${page} current=${person === opened}>
          <${Name} title=${person.email} to=${page} marks=${[you(person.email)]} />
          <${Cell} class="text-muted-foreground">${signIn.text}<//>
          <${Cell}>${active ? html`<${RoleSelect} ...${props} person=${person} ask=${give => setMaking({ email: person.email, give })} />` : "No role"}<//>
          ${column && html`<${Cell}>${summary(status, { ...person, builtIn: admin })}<//>`}
          <${Cell} actions><${RowMenu} label=${`Actions for ${person.email}`} items=${items} /><//>
        <//>`;
      })}
    <//>
    ${status.people.length === 0 && html`<p>No people added yet.</p>`}
    <${Pushers} view=${props.view} />
    ${removing && html`<${Confirm} title=${`Remove ${removing.email}?`} action="Remove access" pending=${pending}
      onConfirm=${() => save("people", { email: removing.email, removed: true })} onCancel=${() => setRemoving(null)}>
      ${removal(status)}${isAdmin(status, removing) && " They stop managing Access too."}
    <//>`}
    ${making && html`<${MakeAdmin} email=${making.email} pending=${pending} onConfirm=${making.give} onCancel=${() => setMaking(null)} />`}
    ${(opened || id === "new") && html`<${PersonPage} key=${id} ...${props} person=${opened} />`}
  <//>`;
}
