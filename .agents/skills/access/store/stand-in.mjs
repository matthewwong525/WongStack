// An Access store kept in memory: the shape a project's own store copies, and the store the module's tests use.
// It keeps nothing past the process, so a project never serves people from it.

const LEASE_MS = 120_000;
// The lease (120 s) and a provider's timeout (30 s) bound how long a lost list write could still land.
const SETTLED_MS = 150_000;
const ADMIN_ROLE = 'admin';
const iso = (at = Date.now()) => new Date(at).toISOString();

export function standInStore() {
  let installation = null;
  const apps = new Set();
  const members = new Map();
  const memberRoles = new Map();
  // Per person or role: app → level, and key → level. Only an app at `write` is given.
  const grants = { people: new Map(), roles: new Map() };
  const keyGrants = { people: new Map(), roles: new Map() };
  const roles = new Map();
  const log = [];
  const work = new Map();
  const writes = new Map();
  const tools = new Map();
  const sealed = new Map();
  let lease = null;
  let generation = null;

  const own = (kind, owner) => ({ apps: grants[kind].get(owner) ?? new Map(), keys: keyGrants[kind].get(owner) ?? {} });
  const given = (kind, owner, level) => [...own(kind, owner).apps].filter(([, held]) => held === level).map(([app]) => app);
  const record = (actor, event) => { if (installation) log.push({ actor, event, revision: installation.revision, at: iso() }); };
  const writeSet = (kind, owner, set) => {
    grants[kind].set(owner, new Map(set.apps.map(app => [app, 'write'])));
    keyGrants[kind].set(owner, { ...set.keys });
  };
  const clearSet = (kind, owner) => { grants[kind].delete(owner); keyGrants[kind].delete(owner); };
  /** One save: the apps listed, the revision moved once, the changes, read-only rows cleared, a line per event. */
  const save = (actor, listedApps, events, changes) => {
    if (!installation) throw new Error('no installation');
    for (const app of listedApps) apps.add(app);
    installation.revision += 1;
    changes(installation.revision);
    for (const kind of ['people', 'roles']) {
      for (const held of grants[kind].values()) for (const [app, level] of held) if (level === 'read') held.delete(app);
    }
    for (const event of events) record(actor, event);
  };
  const current = holder => !!holder && lease?.holder === holder && lease.expires > Date.now();
  const open = () => [...writes.values()].some(write => write.status !== 'completed');

  return {
    async policy(email) {
      if (!installation) return null;
      const member = members.get(email);
      const role = member ? memberRoles.get(email) ?? null : null;
      const [kind, owner] = role ? ['roles', role] : ['people', email];
      return { started: installation.policy, keysStarted: installation.keys, revision: installation.revision,
        status: member?.status ?? null, role, apps: member ? given(kind, owner, 'write') : [], keys: member ? { ...own(kind, owner).keys } : {} };
    },
    async open({ origin, owner, subject }) {
      if (installation) return;
      installation = { origin, owner, subject, revision: 1, policy: false, keys: false };
      record(owner, `owner_first_seen:${subject}`);
      roles.set(ADMIN_ROLE, { name: 'Admin', revision: 1 });
    },
    async admin(email) {
      return !!installation && members.get(email)?.status === 'active' && memberRoles.get(email) === ADMIN_ROLE;
    },
    async installed() { return installation && { origin: installation.origin }; },
    async started() { return { policy: !!installation?.policy, keys: !!installation?.keys }; },
    async listApps(ids) { if (installation) for (const id of ids) apps.add(id); },
    async sets() {
      const people = [...members].sort(([a], [b]) => a < b ? -1 : 1).map(([email, member]) => ({ email, status: member.status,
        settled: member.revision <= (generation ?? 1), role: memberRoles.get(email) ?? null,
        apps: given('people', email, 'write'), unticked: given('people', email, 'read'), keys: { ...own('people', email).keys } }));
      const listed = [...roles].sort(([a, first], [b, second]) => (b === ADMIN_ROLE) - (a === ADMIN_ROLE) ||
        first.name.toLowerCase().localeCompare(second.name.toLowerCase()));
      return { people, roles: listed.map(([id, role]) => ({ id, name: role.name, apps: given('roles', id, 'write'),
        unticked: given('roles', id, 'read'), keys: { ...own('roles', id).keys } })) };
    },
    async savePerson({ actor, apps: listedApps, email, status, own: set, role, steps, events }) {
      save(actor, listedApps, events, revision => {
        const before = members.get(email);
        // A person's revision moves only when their sign-in changes.
        members.set(email, { status, revision: before && before.status === status ? before.revision : revision });
        writeSet('people', email, set);
        if (role === null) memberRoles.delete(email); else if (role !== undefined) memberRoles.set(email, role);
        for (const kind of steps) work.set(kind, { generation: revision, status: 'pending', scope: 'both', outcome: null, error_code: null });
      });
    },
    async saveRole({ actor, apps: listedApps, id, name, set, events }) {
      save(actor, listedApps, events, revision => { roles.set(id, { name, revision }); writeSet('roles', id, set); });
    },
    async removeRole({ actor, apps: listedApps, id, holders, events }) {
      save(actor, listedApps, events, () => {
        for (const [email, held] of memberRoles) if (held === id) memberRoles.delete(email);
        for (const holder of holders) writeSet('people', holder.email, holder.set);
        clearSet('roles', id);
        roles.delete(id);
      });
    },
    async start({ actor, apps: listedApps, given: every, owner, admitted }) {
      if (!installation) throw new Error('no installation');
      for (const app of listedApps) apps.add(app);
      // The owner needs no row, and a person already listed keeps the apps chosen for them.
      const fresh = [...new Set(admitted)].filter(email => email !== owner && !members.has(email));
      for (const email of fresh) {
        // Revision 1 marks a person the sign-in list admitted before Access managed it.
        members.set(email, { status: 'active', revision: 1 });
        grants.people.set(email, new Map(every.map(app => [app, 'write'])));
      }
      if (!installation.policy) { installation.policy = true; installation.revision += 1; }
      record(actor, `permissions_started:${fresh.length}`);
      return fresh.length;
    },
    async startKeys() { if (installation?.policy) installation.keys = true; },
    async status() {
      if (!installation) return null;
      const note = log.find(line => line.revision === installation.revision && line.event.startsWith('permissions_started:'));
      return { started: installation.policy, keysStarted: installation.keys,
        imported: Number(note?.event.slice('permissions_started:'.length) ?? 0),
        work: ['policy', 'sessions'].filter(kind => work.has(kind)).map(kind => {
          const { status, outcome, error_code } = work.get(kind);
          return { kind, status, outcome, error_code };
        }) };
    },
    async audit(actor, event) { record(actor, event); },
    async audited(event) { return log.some(line => line.event === event); },

    async lease() {
      if (lease && lease.expires >= Date.now()) return null;
      lease = { holder: crypto.randomUUID(), expires: Date.now() + LEASE_MS };
      return lease.holder;
    },
    async release(holder) { if (lease?.holder === holder) lease = null; },
    async leaseCurrent(holder) { return current(holder); },
    async step(kind) {
      const found = work.get(kind);
      return found ? { generation: found.generation, status: found.status, scope: found.scope } : null;
    },
    async stepFailed({ kind, generation: at, code }) {
      const found = work.get(kind);
      if (found?.generation === at) Object.assign(found, { status: 'failed', retryAfter: iso(Date.now() + 30_000), error_code: code, outcome: null });
    },
    async stepStale(kind) { const found = work.get(kind); if (found) Object.assign(found, { status: 'pending', outcome: null }); },
    async stepUnresolved() {
      const found = work.get('policy');
      if (found) Object.assign(found, { status: 'pending', outcome: 'previous_policy_write_unresolved' });
    },
    async stepDone({ kind, generation: at, holder, outcome }) {
      const found = work.get(kind);
      if (found?.generation !== at || !current(holder) || (kind === 'policy' && open())) return;
      Object.assign(found, { status: 'ready', retryAfter: null, error_code: null, outcome });
      // The newest generation the sign-in list is known to match: each person's state reads from it.
      if (kind === 'policy') generation = Math.max(generation ?? at, at);
    },
    async stepWaiting() { const found = work.get('policy'); return !!found && found.status !== 'ready'; },
    async beginWrite({ generation: at, holder }) {
      if (!current(holder) || work.get('policy')?.generation !== at) return null;
      const intent = crypto.randomUUID();
      writes.set(intent, { generation: at, status: 'in_flight', started: Date.now() });
      Object.assign(work.get('policy'), { status: 'pending', outcome: null });
      return intent;
    },
    async endWrite(intent, status) {
      const write = writes.get(intent);
      if (write && (status === 'completed' || write.status === 'in_flight')) write.status = status;
    },
    async unresolvedWrites() {
      for (const write of writes.values()) if (write.status !== 'completed' && write.started < Date.now() - SETTLED_MS) write.status = 'completed';
      return open();
    },
    async listed() { return [...members].filter(([, member]) => member.status === 'active').map(([email]) => email); },

    async tools() { return [...tools.values()].sort((a, b) => a.id < b.id ? -1 : 1).map(row => ({ ...row })); },
    async saveTool({ row, actor, clearLevels }) {
      if (clearLevels) for (const kind of ['people', 'roles']) for (const held of keyGrants[kind].values()) delete held[row.id];
      tools.set(row.id, { ...row });
      record(actor, 'tool_saved');
    },
    async removeTool(id, actor) {
      tools.delete(id);
      for (const kind of ['people', 'roles']) for (const held of keyGrants[kind].values()) delete held[id];
      record(actor, 'tool_removed');
    },
    async sealed() { return new Map([...sealed].map(([name, row]) => [name, row.ends])); },
    async saveSealed({ name, sealed: value, ends, actor }) {
      sealed.set(name, { sealed: value, ends, actor, at: Date.now() });
      record(actor, `key_sent:${name}`);
    },
  };
}
