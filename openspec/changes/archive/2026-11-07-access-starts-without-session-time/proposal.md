# Access starts when the sign-in rule has no session time

**Status:** ready-to-ship
**Branch:** deranged-yak
**Open questions:** none

## Why

On one install, the owner opened Access again and again, and it never started. Cloudflare sent the sign-in rule without its session time, and the app refused a rule with no session time. Access then gave up without a word: no log line, nothing on the screen. Until Access starts, company knowledge and project code stay unavailable, so the whole team lost both.

## What Changes

- **Access starts when Cloudflare's sign-in rule has no session time.** At the owner's first open, the app reads who can sign in, adds them to People, and turns Access on, with or without a session time on the rule. Company knowledge and project code then work.
  ```mermaid
  flowchart TD
    o[owner opens Access] --> r[read sign-in rule]
    r -->|with or without session time| s[Access starts]
    s --> k[knowledge and code work]
  ```
- **Changes to who can sign in save on that rule too.** When you add or remove a person, the app sends the new list and leaves the session time as it was: kept when there is one, left out when there is none.
- **A failed start says why.** When Access still can not start, the app writes one log line with the reason, and the People screen says why under *The sign-in list could not be read yet*, with *Read it again*. No real picture: this notice shows only on the live app when Cloudflare's read fails, which a preview can not reach.
  ```screen
  <div class="card col gap phone">
    <p>The sign-in list could not be read yet. Everyone keeps every app until it can.</p>
    <p class="muted">Why: Cloudflare's answer was not in a shape this app reads.</p>
    <div class="row gap"><button class="btn-ghost">Read it again</button></div>
  </div>
  ```
- **The company knowledge page says when knowledge waits.** Until Access starts at the owner's first open, company knowledge and project code answer *not available*.

Non-goals: no change to the session time itself, which stays Cloudflare's; no fix of one install's rules by hand, which belongs to that install.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-onboarding`: *People who could already sign in keep their apps* adds that a sign-in rule with no session time still imports, and that a failed import is logged and shown with its reason.

## Impact

- `app/worker/employee-access/login-management.ts`: `policySchema` `session_duration` optional; the PUT body leaves out an absent field.
- `app/worker/employee-access/start.ts`: `startPermissions` logs a `permissions_start_failed` event and returns the reason code.
- `app/worker/employee-access/management.ts`: the status read carries `startError`.
- `app/src/lib/access` `Status`, `app/src/apps/access/Notices.tsx`: the reason line in the existing notice.
- Tests: `login-management.test.ts`, `start.test.ts`, the Notices test.
- Docs: `wiki/stack/company-knowledge.md`, `wiki/stack/access-screens.md` if it names the notice; `CHANGELOG.md` (`patch`).

## What the build needs

Nothing from you: no key, no account. The tests use a sample Cloudflare answer.

## Decision log

- **2026-11-07** — Assumed: the reason shows inside the existing *could not be read yet* notice, not a new one, because that notice already covers this state and has *Read it again*.
- **2026-11-07** — Assumed: the status read returns the reason from this open, not a saved one, because the start runs on every open until it works, so no database change is needed.
- **2026-11-07** — Assumed: a `screen` sketch, not a prototype, because the notice shows only on the live app after a failed Cloudflare read, which a preview can not reach.
- **2026-11-07** — Assumed: a Cloudflare timeout or failed connection gives *Cloudflare did not answer*, and only an answer the app can not parse gives *not in a shape this app reads*, because the review found a timeout would otherwise show a false reason.
- **2026-11-07** — Assumed: `wiki/stack/employee-access.md`'s first-open step names the `permissions_start_failed` log line and the *Why:* line, because that page owns the first-open steps and an owner looks there.
- **2026-11-07** — Assumed: `patch` release, because it fixes a start that should have worked, and adds only a reason line.
- **2026-11-07** — Assumed: archived and checkpointed for release 50.10.1 on deranged-yak; the local checks passed after a `checked:` date bump on `site/attachments/team-access.md`, whose source page gained one line.
