// Where the page lives and how its addresses are made. `mount` sets the page's own address once, before it draws.
let home = "/apps/access/";

/** Sets the page's own address, such as `/apps/access/`, with one slash at the end. */
export const setHome = value => { home = value.endsWith("/") ? value : `${value}/`; };
/** The page's own address. */
export const homePath = () => home;

/** An address inside Access: `at()` is People, `at('roles')` a view, `at('roles', id)` one role beside its list. */
export const at = (...parts) => `${home}${parts.map(encodeURIComponent).join("/")}`;

/** The parts of an address inside Access, decoded; null for an address outside it. */
export const partsOf = path => {
  if (!`${path}/`.startsWith(home)) return null;
  return path.slice(home.length).split("/").map(part => { try { return decodeURIComponent(part); } catch { return part; } });
};

/** The owner's three views, in the order the switch shows them. People opens first. Services shows only when the
 *  project gives keys. */
export const VIEWS = [
  { name: "people", title: "People", get home() { return at(); } },
  { name: "roles", title: "Roles", get home() { return at("roles"); } },
  { name: "services", title: "Services", get home() { return at("services"); } },
];

/** The id of a view's name in the switch: the list under the switch is labelled by it. */
export const viewLabel = view => `access-view-${view.name}`;

/** What the last change came to, as it rides with the address it led to: the words, whether it failed, the save that
 *  puts a person back, and a person just given the project to welcome. Anything else is no change said. */
export function readSaid(state) {
  if (typeof state !== "object" || state === null || typeof state.text !== "string" || typeof state.failed !== "boolean") return undefined;
  const undo = typeof state.undo === "object" && state.undo !== null ? state.undo : undefined;
  const welcome = typeof state.welcome === "string" ? state.welcome : undefined;
  return { text: state.text, failed: state.failed, ...(undo && { undo }), ...(welcome && { welcome }) };
}
