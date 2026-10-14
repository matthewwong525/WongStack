# One company sign-in for everything

**Status:** planned

**Branch:** macho-flamingo

**Open questions:** none

## Why

Matthew ran setup as a first-time teammate. It worked, but three things got in the way:

- **The assistant first refused the pasted message as possible phishing.**
- **Memory said to ask the admin for a separate key**, so remembered notes did not work.
- **New workspaces quietly started from an old copy**, because plain git can not get past the sign-in page.

Things have changed: the company sign-in should work for everything, and everything should flow through the company app.

## What Changes

- **One sign-in, everywhere.** The sign-in a person makes once at setup now also opens memory and the project's updates, not only company actions. There is no memory key to hand out and no GitHub account to make. It lasts 30 days.
  ```text
              company sign-in
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
   actions        memory       project
                               updates
  ```

- **New chats and workspaces start from the latest version.** Plain git now works through the company app with the person's sign-in. Paseo's new worktrees pick up the newest published project with no change to Paseo. A new chat in a teammate's copy also moves it forward in the background when nothing in it was changed; edits are never overwritten. Saving stays as it is today: through `/save`, never to the published project.
  ```text
  Paseo / git ──▶ company app ──▶ GitHub
       (sign-in)       │      or Cloudflare
                       ▼
               checks the sign-in
  ```

- **A new "Can publish" tick in Access.** The owner can let a trusted teammate or role publish, not only save. A teammate with the tick runs `/ship` as the owner does: the app publishes their change once its checks pass, with no GitHub account. It is off for everyone else; the owner and Admins always hold it. Pushing straight to the published project stays refused for everyone: publishing is its own step, after the checks.
  ```text
  ┌ Project ─────────────────────────┐
  │ [x] Can install the project      │
  │     They can save changes too.   │
  │ [ ] Can publish                  │
  │     Their changes go live once   │
  │     the checks pass.             │
  └──────────────────────────────────┘
  ```

- **Your private notes follow you, not your computer.** Private memory belongs to the person who signed in, so it is the same on every computer they use. Teammates still never see each other's private notes. The owner and Admins see everything, as today.
  ```text
  Ana's laptop ─┐
                ├──▶ Ana's private notes
  Ana's desktop ┘
  Bo's laptop ─────▶ Bo's private notes
          everyone ──▶ team notes
  ```

- **Existing notes move to their person.** A computer already linked to an email hands its private notes to that person. Here that is all of Matthew's notes. A computer never linked to an email keeps its notes visible only to the owner until someone claims them. **BREAKING:** old memory keys stop working once the update moves the notes; each computer signs in instead. Turning the old keys off can't be undone, so a computer that skipped the sign-in needs a new one.

- **Cloud schedules get their own sign-in.** A schedule that runs in the cloud, with no person signed in, gets its own sign-in that the owner can switch off. It sees and writes team notes only, never anyone's private notes. A schedule that runs on a computer uses that computer's sign-in.

- **The sign-in warns before it runs out.** A few days ahead, each new chat says when it ends and shows the link. Once it has run out, the chat keeps working from the last saved memory and the last downloaded project, and company actions show the sign-in link instead of a bare refusal. The person signs in again to call anything.
  ```text
  ┌ Chat start ──────────────────────┐
  │ Your company sign-in ends in 3   │
  │ days. Sign in again: <link>      │
  └──────────────────────────────────┘
  ```

- **Setup reads as trustworthy and ends cleanly.** The pasted message names the business and says what the file does, and invites the assistant to read it first, so it is not mistaken for phishing. The final report says what works and that the person is done: no long command to run and no talk of a `.env` file.
  ```text
    BEFORE                          AFTER
  Set up my company's project…    Set up <Business>'s project…
  Download <link> and run it.     The file signs me in and
                                  downloads the project; read
                                  it first if you like.
  ```

- **The paused "memory for each machine" work is closed.** It tied memory to computers, the opposite direction. Its useful parts carry over: transcripts stay private to their owner, and a copied folder opens nothing.

**Non-goals:** publishing by a push to the published project; publishing a change whose checks did not pass; changing Paseo itself; memory on staging or previews (it stays live-only); signing in without a browser.

## Capabilities

### New Capabilities

- `company-git`: plain git in an app-installed copy fetches through the company app with the person's sign-in; a new chat moves a clean copy forward.

### Modified Capabilities

- `memory`: memory is reached with the company sign-in instead of a memory key; private memory belongs to a person; cloud schedules use their own sign-in; old machine notes move to their person or stay owner-only.
- `employee-onboarding`: the setup message names the business and invites a read; setup installs the git helper, connects memory and ends with a plain report; a person with the publish tick publishes through the app after checks pass.
- `agent-api-discovery`: memory operations use the same employee sign-in as company actions; an expired sign-in shows the link.
- `cloudflare-provisioning`: the git route joins memory as a route the Worker authenticates itself; memory needs no memory key; cloud schedules get a revocable service token.
- `key-access`: Project code offers a second level, publish, shown as a "Can publish" tick.
- `install-onboarding`: owner setup readies `cloudflared` and signs the owner in once, so the owner's memory works the same way.

## Impact

- **Worker:** `app/worker/index.ts`, `app/worker/access.ts` (verify an Access app token from `cf-access-token` or a git Basic password), `app/worker/employee-access/code.ts`, `app/worker/employee-access/prompt.ts`, `.agents/skills/memory/worker/*` (person-owned rows, roles from Access).
- **Memory client:** `.agents/skills/memory/scripts/lib/store.mjs`, `session-start.mjs`, `before-edit.mjs`, `run.mjs`, `members.mjs`, `join.mjs`, a D1 migration.
- **Employee client:** `scripts/employee-bootstrap.mjs`, `scripts/company-api.mjs`, a new git credential helper.
- **Setup and Access:** `.agents/skills/wong-setup/scripts/private-access.mjs` (a second Worker-checked route), `provision.mjs`.
- **Docs:** `wiki/development/memory-key.md` (retired into `memory.md`), `wiki/stack/employee-project.md`, `wiki/stack/cloudflare-access.md`, `wiki/stack/company-api.md`, `wiki/stack/host-schedules.md`.
- **Other work:** draft PR #242 and workspace `installation-owned-memory-devices` are closed.
- **Release:** a major version, since old memory keys stop working.

## Decision log

- **2026-10-14** — Asked whose private memory it is once memory uses the company sign-in → chose each person.
- **2026-10-14** — Asked what happens to the paused "memory for each machine" work → chose replace it.
- **2026-10-14** — Asked one plan or two → chose one plan.
- **2026-10-14** — Asked what "git through the server" means → chose pulling, not pushing: new sessions and worktrees start from the latest version.
- **2026-10-14** — Asked how plain git reaches the project → chose through the app, with the company sign-in, onward to GitHub or Cloudflare.
- **2026-10-14** — Asked what happens to private notes from a computer with no email label → chose the owner sees them until claimed.
- **2026-10-14** — Asked what sign-in cloud schedules use → chose their own, revocable, team notes only.
- **2026-10-14** — Asked what a chat does when the sign-in runs out → chose warn early and keep going from saved copies; actions show the sign-in link.
- **2026-10-14** — Asked, from a review note "add merge to main access here as well", who may publish through the app → chose a "Can publish" tick in Access per person or role, off by default, held by the owner and Admins.
- **2026-10-14** — Assumed: publish is Project code's second level, not a new key, because Access already stores a level per key and publishing needs install and save first.
- **2026-10-14** — Assumed: the app publishes only a change whose checks passed for its exact newest commit, and never through a push to the published branch, because a push skips the checks.
- **2026-10-14** — Assumed: Paseo needs no change, because its docs say it fetches in the background and can start worktrees from `origin/main`.
- **2026-10-14** — Assumed: the git route skips the edge sign-in wall and the Worker checks the sign-in itself, because git can send a password but not Cloudflare's sign-in header, and the Worker already verifies the same signed token.
- **2026-10-14** — Assumed: the owner and Admins get memory admin, anyone holding Project code gets member, and any other signed-in person gets reader, because those match today's Access roles and memory roles one-to-one.
- **2026-10-14** — Assumed: a new chat moves forward only a teammate's copy, on its published branch, with no changes, because the owner's copy publishes and must never move under them.
- **2026-10-14** — Assumed: the warning starts 5 days before the sign-in ends, because a weekly user then always sees it once.
- **2026-10-14** — Assumed: the Worker accepting the saved sign-in on its own routes is tried on staging first for git, and on the live app for memory, because memory is live-only.
- **2026-10-14** — Assumed: task 1.2 is proven by running the Worker's own `getAccessIdentity` on a real `cloudflared` token against the live team certs, plus a staging call with `cf-access-token`, not a deployed test-only echo, because that checks the same code with no extra route to remove.
- **2026-10-14** — Assumed: a site open until the card keeps today's memory admin key, because it has no Access sign-in to use; `migrate-people` turns keys off only where Access is on.
- **2026-10-14** — Assumed: the setup message names the business by the project's repository name, else the app's address, because no setting holds a business name.
- **2026-10-14** — Assumed: on Cloudflare, a publish records its publisher in a `published/<commit>` tag, because a fast-forward leaves no merge message.
- **2026-10-14** — Assumed: a commit with no check that ran is refused for publishing, because "every check passed" must not hold vacuously.
- **2026-10-14** — Assumed: setup's first download still sends the sign-in through git's environment, because the helper file is not in the folder before the first clone; git in the finished copy uses the helper.
- **2026-10-14** — Assumed: until `migrate-people`, the Worker keeps accepting old admin keys only; member and reader keys must sign in, because their notes are owned by a machine the sign-in can't name. The live store's one active key is an admin's.
- **2026-10-14** — Assumed: an install with no recorded owner email gives everyone the reader role, and an install before key levels start makes everyone a member, because Access holds no finer answer there.
- **2026-10-14** — Assumed: a schedule's sign-in is checked by the memory Worker against a stored hash of its secret, with no Access policy, because `/_memory/` skips the edge where Access would exchange it.
- **2026-10-14** — Asked what memory does on an install with no sign-in wall → chose keep today's key until that install adds the wall.
- **2026-10-14** — Asked whether to close the paused draft PR #242 → chose close it; it was already closed, so a comment now links this change.
- **2026-10-14** — Asked whether to move notes and turn off old memory keys right after publishing → chose yes, right after.
- **2026-10-14** — Assumed: moving notes on the live store and rerunning setup as a first-time teammate are after-publish steps outside the task list, because both need the live deploy that publishing makes.
