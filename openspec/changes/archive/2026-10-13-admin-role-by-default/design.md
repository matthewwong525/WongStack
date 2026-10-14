# Design

## Context

See [proposal.md](proposal.md) for why. Today Access has three authorities, read fresh on each request in `app/worker/employee-access/`:

- **The owner**, by `WONG_OWNER_EMAIL`: every app, every key, all of Access.
- **A manager**, a row in `wong_access_managers` only the owner writes: all of Access but picking managers, and no app or key by itself.
- **A role**, rows in `wong_access_roles` with fixed lists in `wong_access_role_apps` and `wong_access_role_keys`. A manager edits roles, so managing was kept off roles: a role that carried it would let a manager pick managers.

A role's lists are fixed, so no stored role can mean *everything* past the next new app. The owner's set is computed (`everyApp()`, `everyKey()`), never stored.

## Goals / Non-Goals

**Goals:**

- One built-in role whose set is computed like the owner's, so it never goes stale.
- One way to say who manages Access: holding that role. No second switch, no code that reads both.
- The owner alone still picks who manages.

**Non-Goals:**

- Making an Admin the owner. `policy.role` stays `"employee"`, so a route of kind `owner` and an app name not built yet stay the owner's.
- Dropping `wong_access_managers`. It stays, unread, like `wong_access_key_direct`.

## Decisions

### Admin is a real role row with a reserved id

The role is a row in `wong_access_roles` with `role_id = 'admin'` and name `Admin`, named by one exported constant. `wong_access_member_roles` already references roles by foreign key, so holding Admin is an ordinary member-role row and *one role or an own set, never both* holds unchanged. A user-made role can't take the id: the server makes every new id with `crypto.randomUUID()`.

*Over a flag column on roles:* a column changes a table an older Worker inserts into without naming columns, which `0003_key_levels.sql` warns against. *Over a virtual role with no row:* the foreign key needs the row.

The row is written in three places, each for a database the others miss:

- `installation()` in `core.ts`, in the batch that creates the installation row: a new install.
- The migration: an install that already has its installation row.
- `schema/seed.sql`: staging.

### Its set is computed, never stored

Admin has no rows in the role app or key tables. Where a set is read, the id decides:

- `currentPolicy` selects the held role id. An active person holding `admin` gets `apps: everyApp()`, `keys: keysStarted ? everyKey() : null` and `manages: true`. Keys wait for key levels like everyone's but the owner's.
- `readSets` returns Admin first, marked `builtIn`, with every business app and each registered key at its top offered level. `heldSet` then needs no change, so *leaving a role keeps what it gave* applies to Admin too.

### Managing is holding Admin

`managedInstallation` in `core.ts` and `manages` in `policy.ts` read the member-role row, joined to an active member, in place of `wong_access_managers`. Nothing else reads who manages.

### Only the owner moves anyone on or off Admin

`changeMember` drops `manager` from its strict schema, so a save naming it is `invalid_person`. A save needs the owner's pass when the person holds Admin before and not after, after and not before, or is removed while holding it; anyone else gets `owner_required`, 403, as the manager switch does today. The Admin member-role write takes an `OwnerCore`, so [the checked-caller test](../../../app/worker/checked-caller.test.ts) still proves it can't run for a manager. Audit events become `admin_given` and `admin_taken`.

`changeRole` refuses any save whose id is `admin` with `role_locked`, 403. Its existing name check already refuses a second role named Admin, in any case.

### The move from managers is one migration

A new timestamped file under `schema/migrations/`, self-contained, in this order:

1. Rename any role whose name is `admin` in any case to `Admin (custom)`; where that name is taken too, add a piece of the role's id so the unique index can't fail the file.
2. Insert the Admin role for every installation row.
3. For each active member in `wong_access_managers`: delete their own app and key grant rows, and upsert their member-role row to `admin`.

It leaves `wong_access_managers` and its rows alone. Its timestamp is later than the files that made the tables it reads, so a replay from empty runs it after them ([migration order](../../../wiki/stack/d1-pipeline.md#timestamp-migrations-additive-and-order-independent)).

*Over converting at the owner's next open, as permissions and key levels start:* until every install's owner opened Access, the Worker would have to honor both the old rows and the new role, and that double read would need a second release to remove.

### Screens

- `lib/access.ts`: a role gains `builtIn`; a person loses `manager`. One helper says whether a person holds the built-in role.
- **Roles:** Admin is the first row, its set shown as *Everything*. Opened, it is a read-only panel: what it gives, who holds it, no name field, no *Save role*, no *Remove role*. The *No roles yet* empty state goes: the list is never empty.
- **People:** the *Manager* mark goes. The row's role picker offers Admin to the owner alone; for anyone else an Admin's role is plain text. Picking Admin opens the existing `Confirm` before the save. An Admin's row menu has no *Remove* for an Admin. The owner's row reads *picks Admins* for a non-owner.
- **A person's panel:** the *Managing* group goes. With Admin chosen, the panel says what it gives and that it is full trust; *Save access* asks through `Confirm` when Admin is newly chosen. A non-owner reads *Admin · only the owner changes this*.

## UX

### Use-case brief

The owner, on a computer or a phone, wants one trusted person to run the business app with them. Done means that person opens every app, uses every key and manages Access, and still does after the next app is built. Assume it happens a few times in an install's life. The common case is one pick for one person; taking Admin back and an old role named Admin are the edges. Mirrors the role picker and the *Remove* popup Access already has.

### Flow

People → the person's role picker → *Admin* → *Make Admin* in the popup. Saved; the notice offers *Undo*. From the panel: choose Admin as the role, *Save access*, confirm.

### Hierarchy

One primary action per state: *Make Admin* in the popup, *Save access* in a person's panel. The Admin role's panel has none; it only closes.

### Review

[review.html](review.html): What Changes item 1 sketches the Roles list before and after and the opened Admin role; item 2 sketches a person's panel before and after and the popup; item 3 compares the owner, an Admin and everyone else.

### Components

The existing `Table`, `Row`, `Page`, `NativeSelect`, `Confirm` and `SetLabels`. No new component; the *Managing* group and its `Tick` use are removed.

## Risks / Trade-offs

- [Managers gain every app and key at the update] → Chosen in the proposal; the changelog's Updating note says it first, and names how to take Admin back.
- [A manager's earlier role or own set is gone after the migration] → The proposal says it can't be undone; taking Admin away to *own set* starts from everything, where the owner unticks.
- [Between the migration and the new Worker going live, an older Worker sees an ex-manager on a role with no apps] → Seconds, during a deploy; they still manage, since the old rows stay. Writing stand-in app rows for the old Worker was rejected: the new code would have to ignore them forever.
- [A Worker rolled back after the migration] → It reads the kept manager rows, so managing works; Admin shows as an empty role it can edit. Roll forward.
- [A linked heading changes] → The wiki's *Managers* section becomes *Admin*; in-repo links move with it and the changelog names it for an install's own pages.

## Migration Plan

The migration ships in the release and runs through each install's usual database step. No hand step. The release is `major`: the manager tick and the `manager` save field are removed.
