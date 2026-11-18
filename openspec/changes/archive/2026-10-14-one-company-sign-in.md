<!-- openspec-archive v1 2026-10-14-one-company-sign-in -->
<!-- file proposal.md utf8 13080 -->
# One company sign-in for everything

**Status:** ready-to-ship

**Branch:** setup-signin-link

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
- **2026-10-14** — Assumed: archive checkpoint saved by /ship on branch setup-signin-link, because the build and local checks passed.

<!-- end proposal.md -->
<!-- file design.md utf8 9602 -->
# Design

## Context

See proposal.md for why. Today:

- **The employee client signs in with Cloudflare Access.** `scripts/employee-bootstrap.mjs` gets the token from `cloudflared access token -app=<origin>`. That command is non-interactive and reads a session that lasts `720h` (`private-access.mjs:135`). The client sends it as `cf-access-token`, and the Access edge turns that header into `Cf-Access-Jwt-Assertion`.
- **The Worker already verifies Access tokens.** `getAccessIdentity` in `app/worker/access.ts` checks RS256 against the team certs, plus `aud`, `iss` and `exp`. It accepts the assertion header or the `CF_Authorization` cookie. The cookie holds the same app token that `cloudflared access token` returns.
- **Memory checks its own key.** `/_memory/*` is the one route that skips the edge wall (`private-access.mjs:136`). There, `memory-worker.mjs` checks a bearer memory key against `memory_keys`, and rows are owned by `owner_machine_id`. The live store has one active machine, `261649d2…`, labelled `matthewwong525@gmail.com`.
- **Git already goes through the app.** `/api/access/code/git/` in `app/worker/employee-access/code.ts` proxies upload-pack and receive-pack to GitHub or Artifacts. It sits behind the edge wall, though, so only `projectGit` can use it, by injecting `http.<url>.extraHeader` through `GIT_CONFIG_*` env. A plain `git fetch`, which Paseo runs in the background, is redirected to the Access login and fails.
- **The paused branch `installation-owned-memory-devices`** (draft PR #242) builds machine-owned credentials, the opposite model.

## Goals / Non-Goals

**Goals:**

- One Access session per person serves company actions, memory and git.
- Plain git works for any tool, with no secret written to disk.

**Non-Goals:**

- Changing Paseo.
- Changing push rules.
- Memory on staging.
- An Access identity provider other than the one configured.

## Decisions

### 1. The Worker verifies the app token on two bypassed routes

`/_memory/*` and `/api/access/code/git/*` both skip the edge wall. On both, the Worker verifies the app token itself with the existing `getAccessIdentity`, extended to read it from:

- `cf-access-token` (memory), and
- an HTTP Basic password (git; the username is ignored).

Any other caller gets 401.

*Alternative:* keep git behind the edge and teach git to send `cf-access-token`. Git's credential protocol only yields `Authorization`, and a static `extraHeader` would put a 30-day token in `.git/config`. Rejected.

*Alternative:* a `git-remote-wong::` remote helper. It needs a binary on Paseo's daemon `PATH`, which is fragile. Rejected.

### 2. A git credential helper by absolute path

Setup writes this into the copy's `.git/config`:

```
credential.https://<host>/api/access/code/git.helper = !"<node>" "<copy>/scripts/company-git-credential.mjs"
credential.https://<host>/api/access/code/git.useHttpPath = true
```

Both paths are absolute, so it works under any daemon `PATH`. Setup first writes an empty `credential.https://<host>/api/access/code/git.helper =` entry, which clears any global helper (`osxkeychain`, `manager`, `store`) for this one address. Otherwise git would hand the token to those helpers to store after a successful fetch. On `get`, the helper runs `cloudflared access token -app=<origin>` and checks the token is for the saved identity and not expired. It returns `username=x-access` and `password=<token>`, and it ignores `store` and `erase`. When there is no valid token, it prints nothing, and git fails with the Worker's 401 body, which names the sign-in step. The helper never runs `access login`, so it never blocks.

`projectGit` drops its header injection and uses the same path, which leaves one way in.

### 3. Pull on chat start only in a teammate's copy

`session-start.mjs` detects the app route with `delivery-route.mjs` (`routeOf === 'app'`). On the published branch with a clean tree and no commits ahead, it spawns a detached `git pull --ff-only`. That is the same rule as `projectCopy`. The owner's GitHub-linked copy is never touched.

### 4. Memory identity is the Access subject

The rows get a new `owner_subject` column (migration `0008`), with the email kept for display. The Worker derives a memory role on each call from the existing employee-access policy:

| Who | Memory role |
|---|---|
| The owner, or the Admin role | `admin` |
| Holds the `code` key | `member` |
| Any other allowed person | `reader` |
| A service token named `memory-schedule:<name>` | `team` |

`team` reads shared facts only and writes shared facts with no owner. The member and reader statement rewriting in `statements.mjs` switches from `machine_id` to `owner_subject`. The `CLOUDFLARE_API_TOKEN` admin path to D1 stays for owner jobs.

*Alternative:* key ownership on email. Rejected: an email can change at the identity provider, but the subject can't.

### 5. Migration moves linked machines' notes

`memory.mjs migrate-people` runs during the owner's update and needs the admin API token.

1. **Move the notes.** For each `memory_keys` row with a `login_identity`, it sets `owner_subject` on that machine's facts and sessions. The ownership triggers allow a one-time null → subject write.
2. **Leave the rest admin-only.** Unlinked machines' rows keep `owner_subject` null, which the Worker treats as admin-only. `memory.mjs assign <machine> <email>` handles them later.
3. **Turn off old keys.** It sets `expires_at` on every key in one statement, only after the move commits.

The step is idempotent: reruns skip moved rows.

### 6. Expiry warning and offline fallback

The client decodes `exp` locally from the token, without verifying it, only for display. When fewer than 5 days remain, the digest's first line warns and prints the sign-in link. Getting that link needs `cloudflared access login`, so the digest only names the command the assistant runs to show it.

With no valid token:

- the cached digest loads,
- spooled writes wait (the existing "A write that cannot reach the store waits"), and
- `company-api.mjs` failures attach the sign-in notice.

### 7. Setup message and report

`prompt.ts`'s `setupMessage` takes the business name from `.wong-stack.json` / app config. It says *"This file signs me in to <Business> and downloads our project; read it first if you like."*

`employee-bootstrap.mjs install` does three new things:

- installs the git helper,
- confirms memory with one `/_memory/caller` call, and
- prints a plain summary.

The `next` command field is dropped.

### 8. Publish through the app

The key registry gives Project code (`code`) the levels `["read", "write"]`. Access shows `write` as the *Can publish* tick, which needs install. `everyKey()` already gives the owner and the verification token the top level, and Admins get it too.

A new route, `POST /api/access/code/change/publish`, runs behind the same sign-in. It takes `{branch, sha}` and does the following:

1. Checks that the caller holds `code:write` now, using `holds(level, "write")`.
2. Re-reads the change's checks for that exact `sha`, and refuses unless every check has passed.
3. Publishes:
   - **GitHub:** it merges the pull request with the `WONG_CODE_WRITE` key, by squash. The PAT gains the *Pull requests: write* and *Contents: write* permissions it already needs for saving.
   - **Cloudflare:** it fast-forwards `main` on the Artifacts repo to that `sha` with a write-scoped token.
4. Records the publisher in the merge message.

The git route keeps refusing every push to the published branch, so a push can never skip the checks.

In an app copy, `ship.mjs` replaces its `APP_NEXT` stop with this:

- **With the publish tick:** archive, `/save`, wait for checks, then `app-change.mjs publish`.
- **Without it:** today's message.

*Alternative:* let a ticked person push to `main`. Rejected, because a push skips the checks and the app could no longer tell a publish from a mistake.

### 9. Retire the paused work

PR #242 is closed with a comment linking this change, and its branch is kept. Ideas carried over:

- Transcripts stay owner-only.
- A copied folder opens nothing.
- Revocation is immediate.

The rest is dropped.

## Risks / Trade-offs

- **[Risk] The `cloudflared` app token might not verify in the Worker** (different `aud` or claims) → First task: verify on staging for git, then on the live app's `/_memory/caller`. If it fails, stop and re-plan before anything else.
- **[Risk] Opening two routes past the edge wall widens the Worker's own job** → Each route verifies before any other work. Tests send anonymous, wrong-`aud`, expired and service-token requests.
- **[Risk] Turning off old keys locks out a computer that never signed in** → The update report lists those machines. Their next chat shows the sign-in link, since memory falls back to the cached digest.
- **[Risk] A 30-day session can't be renewed unattended** → The 5-day warning, and a cached digest after it runs out.
- **[Trade-off] Large clones go through the Worker** → Responses are already streamed, never held.

## Migration Plan

1. Deploy the Worker. It accepts the sign-in on both routes and still accepts memory keys.
2. The owner runs the update. It signs the owner in, runs `migrate-people`, and turns off the keys.
3. The next release removes key acceptance from the Worker.

For other installs, `/wong-sync` runs the same steps. Rollback before step 2 is a redeploy. After step 2, keys must be reissued.

## Open Questions

- The exact Access policy for `memory-schedule:` service tokens: per schedule, or one policy listing them. Either fits the spec.

<!-- end design.md -->
<!-- file tasks.md utf8 5335 -->
# Tasks

## 1. Prove the sign-in verifies in the Worker

- [x] 1.1 Extend `getAccessIdentity` in `app/worker/access.ts` to read the app token from `cf-access-token` and from a Basic password, with tests for anonymous, wrong `aud`, expired, and service-token calls; `npm test` in `app/` passes
- [x] 1.2 On staging, send a `cloudflared access token -app=<staging>` token to a test-only echo of `getAccessIdentity` and record the result in `evidence.md`; if it does not verify, stop and re-plan

## 2. Git through the app with the sign-in

- [x] 2.1 Add `/api/access/code/git/*` as a second Worker-checked route in `.agents/skills/wong-setup/scripts/private-access.mjs`, with its test, and route it in `app/worker/index.ts` to verify before `codeDenied`; tests show a 401 without a sign-in and today's push refusals unchanged
- [x] 2.2 Write `scripts/company-git-credential.mjs` (get only, never logs in, checks saved identity) with tests for a valid, expired and missing token, and a test that a global `credential.helper=store` never receives the token
- [x] 2.3 Make `employee-bootstrap.mjs` install the helper by absolute path into the copy's `.git/config` and route `projectGit` through it, dropping the env header; tests show no token in `.git/config` and fetch, clone, and save still work
- [x] 2.4 Pull a clean teammate's copy on chat start from `session-start.mjs` (app route, published branch, clean, nothing ahead), detached; tests cover clean, edited, ahead, other branch, and the owner's GitHub copy
- [x] 2.5 Make `workspace.mjs` `freshBase` warn with the sign-in step when an app-route fetch fails; test it
- [x] 2.6 Update `wiki/stack/employee-project.md` (updates, Paseo worktrees) and `wiki/stack/cloudflare-access.md` (two Worker-checked routes)

- [x] 2.7 Give Project code a publish level in the key registry and Access (a *Can publish* tick that needs install; owner and Admins hold it), with tests that nobody else gets it on update and that the panel shows two ticks
- [x] 2.8 Add `POST /api/access/code/change/publish` (holds publish now, every check passed for the exact sha, GitHub squash merge or Artifacts fast-forward, publisher recorded), with tests for no tick, a failing check, a stale sha, a machine on live, and a success on each source
- [x] 2.9 Let `ship.mjs` publish from an app copy through `app-change.mjs publish` when the person holds the tick, and keep today's stop without it; tests for both
- [x] 2.10 Update `wiki/stack/employee-project.md` (who publishes) and `wiki/stack/employee-access.md` (the publish tick)

## 3. Memory on the company sign-in

- [x] 3.1 Add migration `0008` with `owner_subject` on facts and sessions and a one-time null → subject trigger allowance; migration test passes
- [x] 3.2 Switch `memory-worker.mjs` and `statements.mjs` to verify the sign-in, derive the role from the employee-access policy, and scope by `owner_subject`, accepting old keys only until `migrate-people`; worker tests cover admin, member, reader, team, a null owner, and a cross-app token
- [x] 3.3 Switch `lib/store.mjs` to send the saved sign-in from `cloudflared access token`, falling back to the cached digest and the spool when none, with the 5-day warning in `session-start.mjs`; tests cover valid, near expiry, expired, and missing
- [x] 3.4 Add `memory.mjs migrate-people` and `assign`, retire `join`, `member add`, and `member admin` with a message pointing to Access, with tests for idempotent reruns, unlinked machines staying admin-only, and keys turned off only after success
- [x] 3.5 Add owner-made `memory-schedule:<name>` service sign-ins (make, list, revoke) in setup scripts, with tests that a team role sees shared facts only
- [x] 3.6 Make the shared helper `company-api.mjs` call memory with the same sign-in and attach the sign-in link to expired-session failures; tests pass
- [x] 3.7 Rewrite `wiki/development/memory-key.md` into `wiki/development/memory.md` (who sees what, sign-in, expiry), fix links listed by `memory.mjs areas`, and update `wiki/stack/company-api.md` and `wiki/stack/host-schedules.md`

## 4. Setup reads as trustworthy and ends cleanly

- [x] 4.1 Change `setupMessage` in `app/worker/employee-access/prompt.ts` to name the business, say what the file does, and invite a read; update its test and the Connect screen text
- [x] 4.2 Make `employee-bootstrap.mjs install` confirm memory, drop the `next` command, and print a plain done summary; tests check the output names no command, `.env`, or key
- [x] 4.3 Ready `cloudflared` and sign the owner in once in `wong-setup`, with tests for the tool check and the closing report

## 5. Release

- [x] 5.1 Add a `## Next (major)` CHANGELOG entry naming that old memory keys stop and each computer signs in
- [x] 5.2 Close draft PR #242 with a comment linking this change, keeping its branch (outward: confirm first)
- [x] 5.3 Run `node .github/scripts/checks.mjs --worktree`; all pass
After publishing (untracked; needs the live deploy):

- After publishing, run `migrate-people` on the live store (outward: confirm first) and record moved and waiting counts in `evidence.md`
- Rerun the uploaded session's steps as a first-time teammate in an empty folder: setup runs without a second request, memory search returns facts, and a new Paseo worktree is on the newest version; record in `evidence.md`

<!-- end tasks.md -->
<!-- file specs/agent-api-discovery/spec.md utf8 1976 -->
## ADDED Requirements

### Requirement: Memory and company actions share one sign-in

A memory operation called through the shared helper SHALL use the same saved employee sign-in as company actions, and SHALL keep memory's own team and private checks. Company actions and memory SHALL still report their readiness separately. The helper SHALL never fall back to owner credentials, and an origin override, staging target or remote schema SHALL NOT pick where memory calls go.

#### Scenario: One person, actions and memory

- **WHEN** a signed-in teammate lists operations and calls a company action and a memory search
- **THEN** both succeed with the one sign-in, and the search returns only what memory allows that person

## MODIFIED Requirements

### Requirement: The employee client reuses normal company login

The private helper SHALL authenticate as the employee through the company's existing Cloudflare Access login, reuse its private session while valid, and request a fresh login when needed. It SHALL expose no login token in model context, command arguments, URLs, repo files or ordinary diagnostics, and SHALL never fall back to owner or verification credentials. The employee SHALL need no Cloudflare administration account or business API key. When a call fails because the sign-in expired, the helper SHALL show the checked sign-in link with the failure, not a bare refusal.

#### Scenario: First use and a later request

- **WHEN** an allowed employee signs in for their first API request and later makes another request during that valid session
- **THEN** both requests use that employee's identity and the later request reuses private authentication automatically

#### Scenario: Expired or removed access

- **WHEN** the provider refuses the session because it expired or employee access was removed
- **THEN** the helper reports sign-in or denial without exposing credentials or widening permission, and an expired session comes with the sign-in link

<!-- end specs/agent-api-discovery/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 2459 -->
## ADDED Requirements

### Requirement: Cloud schedules get a revocable service sign-in

Provisioning SHALL let the owner make a separate service sign-in for each cloud schedule, named for it, and switch it off without touching any other sign-in. It SHALL reach memory's team notes only and SHALL NOT reach business apps beyond what its schedule lists. Its secret SHALL go only to the schedule's own secret store, never chat, git or logs.

#### Scenario: The owner makes and revokes one

- **WHEN** the owner makes a sign-in for a nightly cloud schedule and later switches it off
- **THEN** the schedule reaches team notes until then, and every call after is refused while other sign-ins keep working

## MODIFIED Requirements

### Requirement: The memory store is production-only

Provisioning SHALL bind the memory store to the production Worker only and record the store's ids under `components.memory` in the install record. It SHALL issue no memory key and write none to `.env`. On an account without R2, the store SHALL be made without a transcript bucket, the report SHALL say so with the dashboard step, and a later run SHALL add the bucket.

#### Scenario: R2 is off

- **WHEN** the account has not enabled R2
- **THEN** memory works without transcripts and the report names how to turn R2 on

#### Scenario: Staging never reads memory

- **WHEN** the app's config is written
- **THEN** only the production Worker binds the memory store

### Requirement: Machine access uses explicit authentication

Provisioning SHALL supply a dedicated app-specific service-token policy for automated verification. Membership updates SHALL preserve that machine policy. The production memory route and the project's git route SHALL be the only automatic exceptions to the edge sign-in wall, and the Worker SHALL verify the company sign-in on each of them itself; other public routes require explicit reviewed configuration. Staging and CI branch previews SHALL carry no memory bindings.

#### Scenario: Automated checks and memory

- **WHEN** automated checks use the dedicated service token and a memory caller sends a valid company sign-in
- **THEN** each reaches its intended protected service, while an anonymous memory or git caller is denied by the Worker

#### Scenario: Team membership changes

- **WHEN** a person is added or removed
- **THEN** machine permissions and the two Worker-checked routes remain intact, and no broad public prefix becomes exempt

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/company-git/spec.md utf8 2539 -->
## Purpose

Plain git in a copy installed through the company app reaches the project through the app with the person's company sign-in, so any tool that runs git, Paseo included, sees the latest published version.

## ADDED Requirements

### Requirement: Plain git reaches the project with the company sign-in

In a copy installed through the app, an ordinary `git fetch`, `pull` or `ls-remote` against its origin SHALL succeed with the person's saved company sign-in, run by any tool, with no extra flag, no GitHub account and no key on the computer. The app SHALL check the sign-in and the person's current Project code on every request, then pass the request on to where the project is kept, GitHub or Cloudflare. No sign-in SHALL be written into the copy's files, its git settings, a URL or a log. A push SHALL keep today's rules: it saves a change through the app, and never moves the published project.

#### Scenario: Paseo makes a worktree

- **WHEN** Paseo fetches in the background and makes a new worktree from `origin/main` in a teammate's copy
- **THEN** the worktree holds the newest published version

#### Scenario: Project code is taken away

- **WHEN** a person without Project code runs `git fetch` in an old copy
- **THEN** it is refused with ask-your-admin guidance, and the copy is unchanged

### Requirement: A new chat moves a clean copy forward

When a chat starts in a teammate's copy on its published branch with no changes, the copy SHALL move forward to the newest published version in the background without delaying the chat. A copy with edits, extra commits or another branch SHALL be left as it is. The owner's own copy SHALL never move by itself.

#### Scenario: A clean copy

- **WHEN** a teammate starts a chat in a clean copy one version behind
- **THEN** the copy is on the newest version by the end of the chat's start, with no question asked

#### Scenario: A copy with edits

- **WHEN** a teammate starts a chat in a copy with an unsaved edit
- **THEN** nothing in the copy changes

### Requirement: An expired sign-in falls back to the last download

When the saved sign-in is missing or expired, git in the copy SHALL fail plainly, naming the sign-in step, and work SHALL go on from the last downloaded version. Nothing SHALL open a browser or wait for one.

#### Scenario: Paseo makes a worktree after the sign-in ran out

- **WHEN** the sign-in has expired and Paseo makes a new worktree
- **THEN** the worktree starts from the last downloaded version and the next chat shows the sign-in link

<!-- end specs/company-git/spec.md -->
<!-- file specs/employee-onboarding/spec.md utf8 8431 -->
## ADDED Requirements

### Requirement: Setup ends with memory and project updates working

Setup SHALL leave the person's copy with memory and plain git working through the same sign-in, and its final report SHALL say in plain words who is signed in, which apps work, that memory and updates work, and that nothing else is needed. The report SHALL NOT tell the assistant to run a further command, and SHALL NOT mention an environment file or a key.

#### Scenario: A teammate finishes setup

- **WHEN** a teammate with Project code finishes setup in an empty folder
- **THEN** the report says they are done, memory loads in their next chat, and a new worktree starts from the newest version

### Requirement: A person allowed to publish publishes through the app

A signed-in person who currently holds Project code's publish level SHALL be able to publish a change they or a teammate saved, through the app, with their own app login as the only credential, on a project kept on GitHub and on one kept in the employer's Cloudflare account. The app SHALL publish only a change whose checks all passed for its newest commit, SHALL judge each request against the person's access at that moment, and SHALL say who published it. A person without the publish level SHALL be refused with ask-your-admin guidance, and their assistant SHALL end with *saved, and here is who publishes it*. A machine SHALL be refused on the live app.

#### Scenario: A teammate with the tick ships

- **WHEN** Ana, who holds the publish tick, runs `/ship` from her copy with no GitHub account and the change's checks pass
- **THEN** the change is live, the project records Ana as its publisher, and her copy moves to the published version

#### Scenario: The checks have not passed

- **WHEN** a person with the publish tick asks to publish a change whose newest commit has a failing or unfinished check
- **THEN** nothing is published and the reply names the check

## MODIFIED Requirements

### Requirement: Connect installs the project for a person who holds Project code

Once the installation can hand its project out, a signed-in person who currently holds Project code SHALL be able to install the whole project on their device from the app's setup prompt, with their own app login as the only credential: no repository account, no pasted key. Running the same step again SHALL bring the copy up to date. A push from the copy SHALL NOT publish: the app SHALL refuse every push that would change the published project and say that a push saves a change and that publishing is its own step. The employer SHALL hold Project code always; nobody else SHALL hold it until the employer or a manager gives it. Each download SHALL be judged against the person's current access, so unticking or removing a person refuses their next download without sign-out. The repository credential the app uses SHALL never reach a device, a prompt, a response body or a log. Until the installation can hand its project out, every signed-in person SHALL keep the apps-only connection they had.

#### Scenario: A ticked person connects from an empty folder

- **WHEN** a person who holds Project code pastes the setup prompt into their assistant and approves their app sign-in
- **THEN** the project is on their device with its history, their allowed company actions work from inside it, and no repository login was asked for

#### Scenario: Project code is taken away

- **WHEN** the employer unticks Project code for a person who installed the project
- **THEN** that person's next update is refused with ask-your-admin guidance, and the copy on their device is unchanged

#### Scenario: A person tries to publish through the app

- **WHEN** a connected person, with or without the publish tick, pushes to the published branch at the address their copy came from
- **THEN** it is refused before anything is asked of where the project is kept, nothing in the project changes, and the message says a push saves a change and publishing is its own step

### Requirement: A person who holds Project code sends their work up through the app

A signed-in person who currently holds Project code SHALL be able to send a change from their installed copy up through the app, with their own app login as the only credential, on a project kept on GitHub and on one kept in the employer's Cloudflare account. The app SHALL then give back that change's checks, the output of a check that failed, and its preview, for the exact commit sent. Each such request SHALL be judged against the person's access at that moment, and a machine SHALL be refused on the live app.

The app SHALL accept one change at a time through a push and nothing else: it SHALL refuse, before anything is asked of where the project is kept, a push that would move the published project, delete anything, or touch anything that is not a change. Publishing SHALL happen only through the separate publish request. Where the project is kept on GitHub, the change SHALL be opened or updated there for the employer to review, and SHALL say who saved it. The credential the app uses to save SHALL never reach a device, a prompt, a response body or a log.

#### Scenario: A teammate saves with no GitHub account

- **WHEN** a person who holds Project code saves work from a copy installed through Connect, on a device with no GitHub account and no GitHub tool
- **THEN** the change is where the project is kept, its checks ran for that commit, and the person's assistant has their result and the preview

#### Scenario: Project code is taken away before a save

- **WHEN** the employer unticks Project code for a person, who then saves from the copy on their device
- **THEN** the save is refused with ask-your-admin guidance and nothing reaches where the project is kept

### Requirement: A person or a role opens to apps and keys

Where a person's own set or a role is opened, Access SHALL show the apps as choices to give or not, the saved keys each with its level, and Project code as its install and publish ticks, and SHALL change nothing for the person before the employer saves. Access SHALL not mark a person, a role or an app as lacking a key level. The People and Roles lists SHALL say how many apps and keys each person and role has. A signed-in person who manages nothing SHALL see their own apps and key levels.

#### Scenario: The employer gives an app

- **WHEN** the employer opens a person, gives them Orders and saves
- **THEN** the person holds Orders, their key levels are unchanged, and no row is marked as missing anything

#### Scenario: The employer leaves without saving

- **WHEN** the employer gives an app and closes the panel without saving
- **THEN** Access asks before leaving, and the person's access is unchanged

### Requirement: One setup message serves everyone who may connect

The app SHALL give every person who may connect the same short setup message, whether or not they hold Project code. The message SHALL name the business, say in one line what the file does, invite the assistant to read the file before running it, name one download link, tell the assistant to print the sign-in link into the chat and wait, and ask for a report of what works. It SHALL carry no key, no fingerprint to check and no instruction about where to store files. What a person receives SHALL be decided by setup against their access at that moment, never by the wording of the message.

#### Scenario: Two people with different access copy the message

- **WHEN** a person who holds Project code and a person on an apps-only connection each open Connect your assistant
- **THEN** they see the same message

#### Scenario: A person without Project code runs a message meant for anyone

- **WHEN** a person who lacks Project code runs the setup file from a message someone else copied
- **THEN** setup refuses the project for them and says to ask their admin

#### Scenario: A careful assistant reads the message

- **WHEN** an assistant is given the message pasted with nothing else
- **THEN** it can tell whose file it is and what it does, reads it, and runs it without a second request

## REMOVED Requirements

### Requirement: Existing memory authority is preserved

**Reason**: Memory now uses the same company sign-in that setup makes.

**Migration**: "Setup ends with memory and project updates working" and memory's "Memory is reached through the production Worker with the company sign-in".

<!-- end specs/employee-onboarding/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 644 -->
## ADDED Requirements

### Requirement: The owner signs in once for memory

Owner setup SHALL ready `cloudflared` on the owner's computer with the other tools, and sign the owner in to their own app once, showing the sign-in link in the chat. The owner's memory SHALL then work through that sign-in like everyone else's. Owner jobs that change the account, such as setup and fixes, SHALL keep using the Cloudflare API token.

#### Scenario: A fresh owner install

- **WHEN** an owner finishes setup on a computer without `cloudflared`
- **THEN** it is installed, the owner signed in once from the chat, and the closing report says memory works

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/key-access/spec.md utf8 3511 -->
## ADDED Requirements

### Requirement: Project code has a save level and a publish level

Project code SHALL be a key offering two levels, settable per person and per role like any key and usable with no app ticked. Its first level SHALL let a person install the project and save changes through the app. Its second level SHALL also let them publish a saved change through the app. A person's page and a role's page SHALL offer the levels as two ticks: one that says the person can install the project, with a line saying they can save changes too, and one that says they can publish, with a line saying their changes go live once the checks pass. Both SHALL be off for a new person; the publish tick SHALL need the install tick. The owner and Admins SHALL hold both. Project code SHALL count as saved when the installation holds a credential that reads its one project, or is connected to its own repository in the employer's Cloudflare account. Ticking an app SHALL never give it. Its credentials SHALL be usable for that one project only, and no action or mini app SHALL be handed them.

While the installation can not hand its project out, every place Project code is given SHALL name the one step left and what it is for: a key where the project is kept on GitHub with none saved, or finishing Access setup where no project is recorded. On GitHub that step SHALL ask for one key that hands the project out, saves changes and publishes them. The employer SHALL get the request to hand their assistant; a manager SHALL read that the step is the employer's. Giving Project code SHALL still save, and SHALL take effect once the project can be handed out.

While the installation can hand its project out and can not yet save or publish changes, the same places SHALL say what needs one more step and name it, and SHALL keep handing the project out meanwhile. An installation connected to its own repository and check runner in the employer's Cloudflare account SHALL need no key and no step from the employer to save or publish.

#### Scenario: The employer gives Project code to a role

- **WHEN** the employer ticks install for a role two people hold
- **THEN** both people may install the project and save on their next request, neither may publish, and a person outside the role may not install

#### Scenario: The employer lets one teammate publish

- **WHEN** the employer ticks publish for Ana, who can already install the project
- **THEN** Ana's next publish of a change whose checks passed goes live, and Bo, who holds only the install tick, is refused

#### Scenario: The credential is not saved yet

- **WHEN** the employer opens a person on an installation that can not yet hand its project out
- **THEN** Project code shows as not saved with the one step left, and nobody's connection changes

#### Scenario: A GitHub installation holds only its read-only key

- **WHEN** the employer opens a person on a GitHub installation that holds only a read-only key
- **THEN** the ticks say saving and publishing need one more step and give the request to copy, people who hold the install tick keep installing the project, and they can save once the new key is in with no further change in Access

## REMOVED Requirements

### Requirement: Project code is a key with one level

**Reason**: Project code gains a publish level.

**Migration**: "Project code has a save level and a publish level". Everyone who holds Project code today keeps install and save; nobody but the owner and Admins gets publish.

<!-- end specs/key-access/spec.md -->
<!-- file specs/memory/spec.md utf8 9141 -->
## ADDED Requirements

### Requirement: Memory is reached through the production Worker with the company sign-in

Every non-admin store call SHALL go through the repo's production app Worker at `/_memory/` carrying the person's saved company sign-in, the same one company actions use. The Worker SHALL verify it as a signed sign-in for this app before running anything, and SHALL take the person from it, never from anything the caller sends. No memory key SHALL be issued, stored in `.env`, or accepted after the update that moves notes to people. The Worker's address SHALL come from the primary checkout's install record, never a linked worktree's. Staging and previews SHALL answer `/_memory/` with 404.

#### Scenario: A signed-in teammate starts a chat

- **WHEN** a teammate who signed in at setup starts a new chat in their copy
- **THEN** memory loads and saves with no key to install and no admin step

#### Scenario: A sign-in for another app

- **WHEN** a valid sign-in for another business's app is sent to this Worker's memory route
- **THEN** the Worker answers 401 and runs nothing

### Requirement: Private memory belongs to a person

Private facts and transcripts SHALL belong to the signed-in person, identified by the sign-in's verified subject, and SHALL be the same for that person on every computer. Emails, hostnames, labels and git authors SHALL NOT establish ownership. A copied folder without a valid sign-in SHALL open nothing.

#### Scenario: One person, two computers

- **WHEN** Ana saves a preference on her laptop and later starts a chat on her desktop
- **THEN** the desktop's digest shows the preference, and Bo never sees it

#### Scenario: A copied folder

- **WHEN** someone copies Ana's project folder to a computer where nobody is signed in
- **THEN** memory reports it is not signed in, shows the sign-in link, and returns no fact

### Requirement: Access roles decide memory roles

A person's memory role SHALL follow their current access in the app: the owner and Admins are memory admins, anyone holding Project code is a member, and any other signed-in person is a reader. A change in Access SHALL apply on the person's next memory call, with no step in memory.

#### Scenario: Project code is taken away

- **WHEN** the owner unticks Project code for a member
- **THEN** that person's next save is stored as a reader's, unshared, and their earlier facts stay

### Requirement: Machine notes move to their person

The update SHALL move each machine's private facts and transcripts to the person that machine was linked to by a verified sign-in, keeping every original author and time. Notes from a machine with no verified link SHALL stay visible only to memory admins until an admin assigns them. Nothing SHALL be deleted. The update SHALL report how many notes moved and how many wait, and SHALL turn off every old memory key only after the move succeeds.

#### Scenario: A labelled machine

- **WHEN** the update runs on a store whose only active machine is linked to `matthewwong525@gmail.com`
- **THEN** all its private notes belong to that person and show in their digest on any computer

#### Scenario: An unlabelled machine

- **WHEN** a machine never linked to a sign-in owns private notes
- **THEN** only memory admins see them, the report says they wait for an owner, and no teammate sees them

### Requirement: Cloud schedules use their own sign-in

A schedule that runs with no person signed in SHALL reach memory with its own sign-in, made by the owner and revocable by the owner. It SHALL read and write team notes only and never see a person's private notes. A schedule that runs on a computer SHALL use that computer's signed-in person.

#### Scenario: A cloud schedule reads memory

- **WHEN** a cloud schedule searches memory with its own sign-in
- **THEN** it gets team notes only, and its saves are team notes

#### Scenario: The owner switches a schedule's sign-in off

- **WHEN** the owner revokes a schedule's sign-in
- **THEN** its next memory call is refused

### Requirement: An expired sign-in keeps memory readable from its last copy

When the saved sign-in is missing or expired, a chat SHALL start with the last saved digest, say that memory is not up to date, and show the sign-in link. Saves SHALL wait locally and send once the person signs in again. Five days before the sign-in ends, each new chat SHALL say when it ends and show the link.

#### Scenario: The sign-in ends in three days

- **WHEN** a chat starts and the saved sign-in ends in three days
- **THEN** the digest's first line says it ends in three days with the sign-in link

#### Scenario: The sign-in has run out

- **WHEN** a chat starts after the sign-in ended
- **THEN** the last saved digest loads, the chat shows the sign-in link, and the session's facts are sent after the next sign-in

## MODIFIED Requirements

### Requirement: Teammates cannot change or hide each other's facts

A member or reader SHALL write facts only as its signed-in person and SHALL supersede only facts that person owns, with its own new fact in the same write; a supersede aimed at another person's fact SHALL leave that fact live. Author labels SHALL NOT grant ownership. Only a memory admin SHALL supersede anyone's fact. The Worker SHALL refuse, running nothing in the batch, any member statement that edits or deletes a fact, claims another owner, overwrites another person's or an unowned historical session, or hides a write inside a read.

#### Scenario: A member deletes a fact

- **WHEN** a member sends a delete or a body edit for fact 3
- **THEN** the Worker answers 403 and fact 3 is unchanged

#### Scenario: A member replaces a teammate's fact

- **WHEN** Ana's save supersedes fact 3, which Bo wrote
- **THEN** fact 3 stays live, Ana's new fact is stored, and the script says fact 3 was left because Bo wrote it

#### Scenario: A member writes under another name

- **WHEN** Ana's save sends a fact claiming Bo as owner
- **THEN** the Worker answers 403 and no fact is stored

### Requirement: A team keeps personal facts personal

The Worker SHALL return to a member or reader only everyone's shared `project`, `reference`, and `thread` facts plus personal and unshared facts owned by the signed-in person, however the read is written. Emails, labels, hostnames, and people pages supplied by a caller SHALL NOT expand that scope. A memory admin SHALL retain access to every fact; their default digest and search SHALL narrow personal and unshared facts to their own, and only an explicit `--everyone` SHALL widen that view.

#### Scenario: A teammate's preference

- **WHEN** a teammate wrote a `feedback` fact about deploys
- **THEN** a member's search for `deploy` hides it, with or without `--everyone`, and the admin's search for everyone shows it

#### Scenario: A reader's thread

- **WHEN** a reader wrote a `thread` fact
- **THEN** it shows in the reader's digest and never in a teammate's

#### Scenario: A personal fact in a work session

- **WHEN** a work-repo session learns the person has a medical appointment every Tuesday
- **THEN** it is stored in that repo as a `user` fact, which teammates never see and the admin can

#### Scenario: A member writes its own read

- **WHEN** a member sends a hand-written read of the facts table, its text search, or a schema-qualified name
- **THEN** the Worker returns no teammate's personal or unshared fact, or refuses the read

## REMOVED Requirements

### Requirement: Memory is reached through the production Worker with a memory key

**Reason**: Memory now uses the company sign-in; no memory key exists.

**Migration**: "Memory is reached through the production Worker with the company sign-in". The update turns old keys off after notes move to people; the owner's admin jobs keep using the Cloudflare API token.

### Requirement: Private memory belongs to an installation

**Reason**: Private memory belongs to a person, not a computer.

**Migration**: "Private memory belongs to a person" and "Machine notes move to their person".

### Requirement: Installation setup and trusted admins issue machine credentials

**Reason**: No memory credential is issued; Access decides who may use memory and with which role.

**Migration**: "Access roles decide memory roles". `memory.mjs member add` and `join` are retired with a message pointing to Access.

### Requirement: Website login identifies a machine automatically

**Reason**: The sign-in itself names the person on every call, so no separate link between a machine and a login is needed.

**Migration**: Existing links are read once by "Machine notes move to their person", then kept as history.

### Requirement: Historic private data is not automatically claimed

**Reason**: The owner chose to move each linked machine's notes to its person.

**Migration**: "Machine notes move to their person"; unlinked notes stay admin-only until assigned.

### Requirement: Shared discovery preserves memory credentials and private ownership

**Reason**: Memory and company actions now share one sign-in.

**Migration**: agent-api-discovery's "Memory and company actions share one sign-in".

<!-- end specs/memory/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-14

~~~
<!-- end .openspec.yaml -->
<!-- file evidence.md utf8 1602 -->
# Evidence

## 1.2 The cloudflared sign-in verifies in the Worker

2026-10-14. The saved session in `~/.cloudflared` gave a token for both origins with no new login:

- `cloudflared access token -app=https://prolific-bumblebee-wongstack-staging.matthewwong525.workers.dev`
- `cloudflared access token -app=https://wongstack.matthewwong525.workers.dev`

Both returned the same app token. Its claims, read without the signature:

| Claim | Value | Worker setting (`app/wrangler.jsonc`) |
|---|---|---|
| `aud` | `["b0e998ce…cd2590"]` | `CF_ACCESS_AUD` `b0e998ce…cd2590`, live and staging |
| `iss` | `https://startuptemplate.cloudflareaccess.com` | `CF_ACCESS_TEAM_DOMAIN` `startuptemplate.cloudflareaccess.com` |
| `type` | `app` | |
| `email` | `matthewwong525@gmail.com` | |
| `sub` | `759fcc53-…` | |
| `exp` | 2026-11-05T00:48:08Z (30 days from `iat`) | |

The token was then passed to the Worker's own `getAccessIdentity` from `app/worker/access.ts`, run under Node 22, with the staging env values and the live team certs fetched from `https://startuptemplate.cloudflareaccess.com/cdn-cgi/access/certs`:

```text
{"verified":true,"id":"matthewwong525@gmail.com","kind":"user","exp":"2026-11-05T00:48:08.000Z"}
wrong aud: null
tampered sig: null
```

On staging, `GET /api/actions` with only `cf-access-token: <token>` answered 200 with the action list; with no token the edge answered 302 to the sign-in.

**Result:** the `cloudflared` app token verifies against the Worker's `aud`, `iss` and certs. Live and staging share one Access application, so one token serves both. No re-plan needed.

<!-- end evidence.md -->
<!-- file review.html utf8 61335 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-14-one-company-sign-in</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:#fff; border:1px solid var(--line); border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.2); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:#fff; border:1px solid var(--line); border-radius:4px; font-size:14px; font-weight:600; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
</head>
<body data-change="2026-10-14-one-company-sign-in">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-14-one-company-sign-in</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Matthew ran setup as a first-time teammate. It worked, but three things got in the way:</p>
<p data-note="why-2" tabindex="0"><b>The assistant first refused the pasted message as possible phishing.</b></p>
<p data-note="why-3" tabindex="0"><b>Memory said to ask the admin for a separate key</b>, so remembered notes did not work.</p>
<p data-note="why-4" tabindex="0"><b>New workspaces quietly started from an old copy</b>, because plain git can not get past the sign-in page.</p>
<p data-note="why-5" tabindex="0">Things have changed: the company sign-in should work for everything, and everything should flow through the company app.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>One sign-in, everywhere.</b> The sign-in a person makes once at setup now also opens memory and the project's updates, not only company actions. There is no memory key to hand out and no GitHub account to make. It lasts 30 days.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">            company sign-in</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">                  │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">    ┌─────────────┼─────────────┐</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">    ▼             ▼             ▼</span>
<span class="ln" data-note="item-1-line-5" tabindex="0"> actions        memory       project</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">                             updates</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>New chats and workspaces start from the latest version.</b> Plain git now works through the company app with the person's sign-in. Paseo's new worktrees pick up the newest published project with no change to Paseo. A new chat in a teammate's copy also moves it forward in the background when nothing in it was changed; edits are never overwritten. Saving stays as it is today: through <code>/save</code>, never to the published project.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">Paseo / git ──▶ company app ──▶ GitHub</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">     (sign-in)       │      or Cloudflare</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">                     ▼</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">             checks the sign-in</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A new &quot;Can publish&quot; tick in Access.</b> The owner can let a trusted teammate or role publish, not only save. A teammate with the tick runs <code>/ship</code> as the owner does: the app publishes their change once its checks pass, with no GitHub account. It is off for everyone else; the owner and Admins always hold it. Pushing straight to the published project stays refused for everyone: publishing is its own step, after the checks.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">┌ Project ─────────────────────────┐</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">│ [x] Can install the project      │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│     They can save changes too.   │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ [ ] Can publish                  │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│     Their changes go live once   │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│     the checks pass.             │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Your private notes follow you, not your computer.</b> Private memory belongs to the person who signed in, so it is the same on every computer they use. Teammates still never see each other's private notes. The owner and Admins see everything, as today.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">Ana's laptop ─┐</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">              ├──▶ Ana's private notes</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">Ana's desktop ┘</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">Bo's laptop ─────▶ Bo's private notes</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">        everyone ──▶ team notes</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Existing notes move to their person.</b> A computer already linked to an email hands its private notes to that person. Here that is all of Matthew's notes. A computer never linked to an email keeps its notes visible only to the owner until someone claims them. <b>BREAKING:</b> old memory keys stop working once the update moves the notes; each computer signs in instead. Turning the old keys off can't be undone, so a computer that skipped the sign-in needs a new one.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Cloud schedules get their own sign-in.</b> A schedule that runs in the cloud, with no person signed in, gets its own sign-in that the owner can switch off. It sees and writes team notes only, never anyone's private notes. A schedule that runs on a computer uses that computer's sign-in.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The sign-in warns before it runs out.</b> A few days ahead, each new chat says when it ends and shows the link. Once it has run out, the chat keeps working from the last saved memory and the last downloaded project, and company actions show the sign-in link instead of a bare refusal. The person signs in again to call anything.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-7-line-1" tabindex="0">┌ Chat start ──────────────────────┐</span>
<span class="ln" data-note="item-7-line-2" tabindex="0">│ Your company sign-in ends in 3   │</span>
<span class="ln" data-note="item-7-line-3" tabindex="0">│ days. Sign in again: &lt;link&gt;      │</span>
<span class="ln" data-note="item-7-line-4" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Setup reads as trustworthy and ends cleanly.</b> The pasted message names the business and says what the file does, and invites the assistant to read it first, so it is not mistaken for phishing. The final report says what works and that the person is done: no long command to run and no talk of a <code>.env</code> file.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-8-line-1" tabindex="0">  BEFORE                          AFTER</span>
<span class="ln" data-note="item-8-line-2" tabindex="0">Set up my company's project…    Set up &lt;Business&gt;'s project…</span>
<span class="ln" data-note="item-8-line-3" tabindex="0">Download &lt;link&gt; and run it.     The file signs me in and</span>
<span class="ln" data-note="item-8-line-4" tabindex="0">                                downloads the project; read</span>
<span class="ln" data-note="item-8-line-5" tabindex="0">                                it first if you like.</span></pre></div></details></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>The paused &quot;memory for each machine&quot; work is closed.</b> It tied memory to computers, the opposite direction. Its useful parts carry over: transcripts stay private to their owner, and a copied folder opens nothing.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> publishing by a push to the published project; publishing a change whose checks did not pass; changing Paseo itself; memory on staging or previews (it stays live-only); signing in without a browser.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked whose private memory it is once memory uses the company sign-in → chose each person.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked what happens to the paused &quot;memory for each machine&quot; work → chose replace it.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked one plan or two → chose one plan.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked what &quot;git through the server&quot; means → chose pulling, not pushing: new sessions and worktrees start from the latest version.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked how plain git reaches the project → chose through the app, with the company sign-in, onward to GitHub or Cloudflare.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked what happens to private notes from a computer with no email label → chose the owner sees them until claimed.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked what sign-in cloud schedules use → chose their own, revocable, team notes only.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked what a chat does when the sign-in runs out → chose warn early and keep going from saved copies; actions show the sign-in link.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked, from a review note &quot;add merge to main access here as well&quot;, who may publish through the app → chose a &quot;Can publish&quot; tick in Access per person or role, off by default, held by the owner and Admins.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: publish is Project code's second level, not a new key, because Access already stores a level per key and publishing needs install and save first.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: the app publishes only a change whose checks passed for its exact newest commit, and never through a push to the published branch, because a push skips the checks.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: Paseo needs no change, because its docs say it fetches in the background and can start worktrees from <code>origin/main</code>.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: the git route skips the edge sign-in wall and the Worker checks the sign-in itself, because git can send a password but not Cloudflare's sign-in header, and the Worker already verifies the same signed token.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: the owner and Admins get memory admin, anyone holding Project code gets member, and any other signed-in person gets reader, because those match today's Access roles and memory roles one-to-one.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: a new chat moves forward only a teammate's copy, on its published branch, with no changes, because the owner's copy publishes and must never move under them.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: the warning starts 5 days before the sign-in ends, because a weekly user then always sees it once.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: the Worker accepting the saved sign-in on its own routes is tried on staging first for git, and on the live app for memory, because memory is live-only.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: task 1.2 is proven by running the Worker's own <code>getAccessIdentity</code> on a real <code>cloudflared</code> token against the live team certs, plus a staging call with <code>cf-access-token</code>, not a deployed test-only echo, because that checks the same code with no extra route to remove.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: a site open until the card keeps today's memory admin key, because it has no Access sign-in to use; <code>migrate-people</code> turns keys off only where Access is on.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: the setup message names the business by the project's repository name, else the app's address, because no setting holds a business name.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: on Cloudflare, a publish records its publisher in a <code>published/&lt;commit&gt;</code> tag, because a fast-forward leaves no merge message.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: a commit with no check that ran is refused for publishing, because &quot;every check passed&quot; must not hold vacuously.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: setup's first download still sends the sign-in through git's environment, because the helper file is not in the folder before the first clone; git in the finished copy uses the helper.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: until <code>migrate-people</code>, the Worker keeps accepting old admin keys only; member and reader keys must sign in, because their notes are owned by a machine the sign-in can't name. The live store's one active key is an admin's.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: an install with no recorded owner email gives everyone the reader role, and an install before key levels start makes everyone a member, because Access holds no finer answer there.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: a schedule's sign-in is checked by the memory Worker against a stored hash of its secret, with no Access policy, because <code>/_memory/</code> skips the edge where Access would exchange it.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked what memory does on an install with no sign-in wall → chose keep today's key until that install adds the wall.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked whether to close the paused draft PR #242 → chose close it; it was already closed, so a comment now links this change.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked whether to move notes and turn off old memory keys right after publishing → chose yes, right after.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: moving notes on the live store and rerunning setup as a first-time teammate are after-publish steps outside the task list, because both need the live deploy that publishing makes.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: archive checkpoint saved by /ship on branch setup-signin-link, because the build and local checks passed.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
