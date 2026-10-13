# An Admin role that holds everything, there from the start

**Status:** in-progress
**Branch:** default-admin-role
**Open questions:** none

## Why

To give someone full control today you tick every app, set every key, tick *Can manage Access*, and do it again each time a new app is built. One role that always means everything does it in one pick.

## What Changes

- **An Admin role is in every Roles list.** It sits first. It holds every app and every key at its highest level, including ones added later, and its holders can manage Access. It can't be renamed, changed or removed. Nobody is given it for you: you pick who.
  ```text
  BEFORE                AFTER
  Roles                 Roles
  ┌─────────────────┐   ┌──────────────────┐
  │ No roles yet.   │   │+Admin            │
  │                 │   │ Everything       │
  │                 │   │ Nobody yet       │
  │ [+ Add role]    │   │ [+ Add role]     │
  └─────────────────┘   └──────────────────┘

  Admin, opened
  ┌──────────────────────────────┐
  │ Admin                      ✕ │
  │ Every app and every key,     │
  │ including new ones.          │
  │ Can manage Access.           │
  │ Only the owner gives it.     │
  │ People: kim@…                │
  └──────────────────────────────┘
   nothing to save or remove
  ```
- **Admin replaces the *Can manage Access* tick.** A person's panel loses the *Managing* group. You make someone an Admin by picking it as their role, in the panel or in their row. Picking it asks first, because it is full trust. The *Manager* mark beside an email goes; the Role column says *Admin*.
  ```text
  BEFORE                 AFTER
  ┌──────────────────┐   ┌──────────────────┐
  │ kim@…            │   │ kim@…            │
  │ Role [Own set ▾] │   │ Role [+Admin ▾]  │
  │ Apps  ☑ ☐ ☑      │   │ Every app and    │
  │ Keys  Read …     │   │ key. Can manage  │
  │ Managing         │   │ Access. Full     │
  │ ☑ Can manage     │   │ trust.           │
  │   Access         │   │                  │
  │ [Save access]    │   │ [Save access]    │
  └──────────────────┘   └──────────────────┘

  Picked in a row
  ┌──────────────────────────────┐
  │ Make kim@… an Admin?         │
  │ Every app, every key, and    │
  │ can change anyone's access.  │
  │ [Make Admin]  [Cancel]       │
  └──────────────────────────────┘
  ```
- **Only the owner gives or takes Admin.** An Admin does everything else in Access, as a manager does today: adds, changes and removes people, makes and edits roles. An Admin can't make another Admin, remove one, give up their own, or change the owner. For an Admin, the role picker doesn't offer Admin.
  ```text
            │ owner │ Admin │ others
  ──────────┼───────┼───────┼───────
  every app │  yes  │  yes  │ as set
  every key │  yes  │  yes  │ as set
  manage    │  yes  │  yes  │  no
  pick      │  yes  │  no   │  no
  Admins    │       │       │
  ```
- **Today's managers become Admins when this update lands.** They keep managing Access and now hold every app and key, which they could already give themselves. Their earlier role, or their own apps and key levels, is replaced by Admin. This can't be undone.
- **Taking Admin away stops managing at once.** Moved to another role, the person has exactly that role. Moved to their own set, they keep every app and key until you untick them, as with any role.
- **A role you already named Admin keeps working.** It is renamed *Admin (custom)* with the same apps, keys and people. Nobody in it gains anything.

**Non-goals:** Changing who the owner is, a second built-in role, limits on what an Admin can reach, or a screen for the record of changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-onboarding`: A built-in Admin role holds every app and key and manages Access; the per-person manager switch is removed; only the employer gives or takes Admin; an update moves managers onto Admin and keeps a role already named Admin.

## Impact

Access's Worker (`app/worker/employee-access/`: policy, caller check, people and role saves, status), its screens (`app/src/apps/access/`), one migration and the preview seed, tests beside each, the employer journeys, [employee access](../../../wiki/stack/employee-access.md) and [the Access screens](../../../wiki/stack/access-screens.md), and a major payload release: the manager tick and its save field are removed. No new dependency. `wong_access_managers` stays, unread.

## Decision log

- **2026-10-13** — Asked what "control over everything" covers for the Admin role → chose every app, every key and managing Access, replacing the *Can manage Access* tick, with today's managers becoming Admins.
- **2026-10-13** — Assumed: Admin always holds every app and every key at its highest level, ones added later included, because a fixed list stops meaning everything at the next new app.
- **2026-10-13** — Assumed: Admin can't be renamed, changed or removed, because an edited Admin no longer means everything.
- **2026-10-13** — Assumed: nobody is given Admin automatically except today's managers, because an update should not hand out full trust by surprise. It shows in every install, old and new.
- **2026-10-13** — Assumed: only the owner gives or takes Admin, because an Admin edits people's roles, and one who could give Admin would pick who manages.
- **2026-10-13** — Assumed: an Admin is not the owner and can't change the owner, because who the owner is stays a setup step.
- **2026-10-13** — Assumed: giving Admin asks first, in the row and in the panel's save, because a pick in a row saves at once and this one is full trust.
- **2026-10-13** — Assumed: an Admin moved to their own set keeps every app and key, because that is the rule for leaving any role; managing ends at once.
- **2026-10-13** — Assumed: an existing role named Admin is renamed *Admin (custom)* and left as it is, because adopting it would give its holders everything unasked.
- **2026-10-13** — Assumed: the move from managers to Admins runs as a database migration, not at the owner's next open, because the app would otherwise read both the old switch and the new role until every install's owner opened Access.
- **2026-10-13** — Asked what to do with the finished plan → chose build and publish.
- **2026-10-13** — Built: tasks 1.1 to 6.1 are written and pass the local checks; the preview walk, 6.2, waits on this save. Decided while building: the question before giving Admin from a row lives with the people list, not the picker, because a click inside the popup would otherwise open the person; the read-only Admin panel is the shared panel with no save action; the words *Can manage Access.* stay as a line describing Admin, so the retired tick's name is allowed in those two screens and their tests; the main specs keep the word *manager*, which the new requirement defines as a current person who holds Admin; the journey *the employer makes a person an Admin* was written by hand and first runs at the preview walk.
