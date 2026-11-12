import { html } from "./vendor/preact-htm.mjs";
import { at } from "./address.mjs";
import { count, setColumn, summary } from "./levels.mjs";
import { BuiltInRole, RolePage } from "./role-page.mjs";
import { holders } from "./subjects.mjs";
import { Cell, Name, Row, Table } from "./table.mjs";
import { AddLink, View } from "./view.mjs";

// Each role on one line: how many apps and keys it gives, and how many people hold it. Admin, the role made for
// you, is first and gives everything: its panel only says so.
export function Roles(props) {
  const { status, id } = props;
  const opened = status.roles.find(item => item.id === id);
  const column = setColumn(status);
  return html`<${View} ...${props} add=${html`<${AddLink} to=${at("roles", "new")}>Add role<//>`}>
    <${Table} view=${props.view} columns=${["Role", column, "People"].filter(Boolean)}>
      ${status.roles.map(role => {
        const page = at("roles", role.id);
        const people = holders(status, role.id).length;
        return html`<${Row} key=${role.id} to=${page} current=${role === opened}>
          <${Name} title=${role.name} to=${page} />
          ${column && html`<${Cell}>${summary(status, role)}<//>`}
          <${Cell} label="People">${people ? count(people, "person", "people") : "Nobody yet"}<//>
        <//>`;
      })}
    <//>
    ${opened?.builtIn ? html`<${BuiltInRole} ...${props} role=${opened} />` : (opened || id === "new") && html`<${RolePage} key=${id} ...${props} role=${opened} />`}
  <//>`;
}
