/** The people who hold a role, by email. A role not saved yet has nobody. */
export const holders = (status, role) => status.people.filter(person => person.role === role).map(person => person.email);
export const holdersLine = (status, role) => holders(status, role).join(", ") || "nobody yet";
/** The roles the one looking may give: the built-in role is the owner's alone to give. */
export const offered = status => status.roles.filter(role => status.viewer.owner || !role.builtIn);
