<!-- openspec-archive v1 2026-10-06-connect-installs-project -->
<!-- file proposal.md utf8 16108 -->
# Connect your assistant installs the project

**Status:** ready-to-ship

**Branch:** prolific-bumblebee

**Open questions:** none

## Why

*Connect your assistant* links an assistant to a person's apps today, and nothing more. The project itself is handed out by hand, on GitHub or in Cloudflare, wherever it is kept, to people who have an account there. You said Connect "should basically install the github repo on their device and they are able to connect to APIs via the repo and access is given based on their login credentials", and that a person without access should see Connect greyed out. This plan makes the app login the one login: you tick a person in Access, and their assistant downloads the project from the app's own address and installs it. The person needs no GitHub or Cloudflare account and installs nothing by hand.

## What Changes

- **Connect puts the whole project on the person's device.** They paste a short setup text into their assistant and approve their app sign-in on that computer. The assistant then downloads the project from the app's own address into a folder, and uses your apps from inside it. The download comes from the app whether the project is kept on GitHub or in Cloudflare. The person needs no GitHub or Cloudflare account, types no key, and installs nothing by hand. Running the same step again later brings the copy up to date.
- **The setup text is short, and one step does it all.** Today's text is five long paragraphs of instructions. The new one names the app, the checked installer and one step to run; the installer signs in, downloads, and reports what works.
  ```text
  you          the app        their device
   │─ tick ─────▶│                 │
   │             │◀─ paste, sign in│
   │             │── the project ─▶│
   │             │◀─ use the apps ─│
   │─ untick ───▶│                 │
   │             │── no updates ──▶│
  ```
- **You choose who gets the project, in Access.** *Project code* shows in Access beside your keys, with two choices per person or role: None or Read. Nobody has it on the day this goes live but you. A manager can give it, to themselves included, as with any key.
  ```text
  ┌──────────────────────────────────────┐
  │ Access           [Connect assistant] │
  │ People 3  Roles 2  Apps 2  [Keys 2]  │
  │ Keys                                 │
  │ Key            Read       Read&write │
  │ ──────────────────────────────────── │
  │ Cloudflare     you, kim   —          │
  │ +Project code  you, kim   —          │
  └──────────────────────────────────────┘
   opened: tick who may Read it
  ```
- **A person without it sees Connect greyed.** The card is marked *No access*, opens nothing, and a click says *Ask your admin for access to Connect your assistant.*, like an app they lack.
  ```text
    BEFORE                    AFTER, not ticked
  ┌────────────────────────┐  ┌────────────────────────┐
  │ Hello                → │  │ Hello                → │
  ├────────────────────────┤  ├────────────────────────┤
  │ Connect your         → │  │ Connect your  No access│
  │ assistant              │  │ assistant     (greyed) │
  └────────────────────────┘  └────────────────────────┘
                               Ask your admin for access
                               to Connect your assistant.
  ```
- **The popup says what the person gets.** It names the apps and that the project comes with them.
  ```text
  ┌──────────────────────────────────────┐
  │ Connect your assistant               │
  │ Signed in as kim@example.com         │
  │ Apps: Hello, Orders                  │
  │ +Project: the whole project, kept    │
  │ +up to date                          │
  │ ┌──────────────────────────────────┐ │
  │ │ Install my company's project     │ │
  │ │ from https://app.example.com …   │ │
  │ └──────────────────────────────────┘ │
  │ [Copy setup prompt]                  │
  │ Paste it into your assistant and     │
  │ approve the sign-in on that computer.│
  │                              [Close] │
  └──────────────────────────────────────┘
  ```
- **The copy is for using, not for publishing.** A person can read the project and work in their copy. They can't publish a change from it. To let someone publish, you still add them where the project is kept, by hand. Their copy then keeps its history and their work.
- **One step for you on a GitHub project.** The app needs a read-only GitHub key for this one project. Your assistant sends a private link with numbered steps; you make the key and paste it once. Until it is saved, Connect works as it does today for everyone, and Access tells you one step is left.
  ```text
  key saved? ─ no ─▶ Connect as today, for all
       │ yes
       ▼
  ticked? ─ no ─▶ greyed, "ask your admin"
       │ yes
       ▼
  Connect installs the project
  ```
- **No step on a project kept in Cloudflare.** An install with no GitHub hands out the project straight from your Cloudflare account, with no key to make. The update switches it on. This is the first way a teammate gets the project on such an install.
- **Assistants already connected keep working.** Nobody is cut off. A person connected the old way keeps using their apps. They get the project once you tick them and they run Connect again.
- **Unticking or removing a person stops updates at once.** Their next download is refused. The copy already on their device stays there; the app can't reach it, and Access says so when you remove someone. The copy holds no keys or passwords: those never sit in the project.
- **A device with nothing installed still works.** The assistant installs the small programs it needs by itself, as it does today, now including git. None needs an account. A folder that already holds other work is left alone: the assistant picks an empty one, and an update never throws away what the person changed.

**Non-goals:** publishing changes from an app-given copy; inviting people on GitHub from the app; memory, which keeps its own setup; removing a copy from a device.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-onboarding`: Connect installs the project for a person who holds Project code, with app login as the only credential; the grant, the greyed state, read-only copies, removal and already-connected people are promised; repository access is no longer manual-only.
- `mini-apps`: the home list's Connect entry is unavailable, with ask-your-admin guidance, to a person who lacks Project code once the install can hand the project out.
- `key-access`: Project code is a key with the single level Read that works with no app and is ready from a saved GitHub key or the install's own Cloudflare repository.
- `cloudflare-provisioning`: setup and the Access step record which project the app hands out, and on an install with no GitHub connect the app to its repository.

## Impact

- `app/worker/employee-access/`: new code route (read-only Git pass-through), `setup.ts`, `prompt.ts`, `router.ts`, `bootstrap-release.json`; `app/worker/keys.ts`; `app/worker/index.ts` route map; `app/wrangler.jsonc` (a nonsecret project name; an Artifacts binding on installs with no GitHub); `app/.dev.vars.example`.
- `app/src/pages/home/AppList.tsx`, `app/src/components/AssistantSetup.tsx`, `ConnectDialog.tsx`, `app/src/lib/access.ts`, `app/src/apps/access/` (the Connect button, the removal question's words), and their tests.
- `scripts/employee-bootstrap.mjs` (a `code` command) and its tests; a new pin.
- `.agents/skills/wong-setup/scripts/provision.mjs`, `references/cloudflare.md`, `permission-groups.md` if a permission is added; `scripts/cf-secrets.mjs` if the key name needs listing.
- `wiki/stack/employee-project.md`, `employee-access.md`, `artifacts-route.md`, `api-keys.md`, `mini-apps.md`, `company-api.md`.
- Staging's practice data: one person with Project code and one without.
- `CHANGELOG.md`: a `minor` entry with the one hand step.
- No database change: Project code is stored as a key level.

## Decision log

- **2026-10-05** — Asked how a person should get the project's code onto their device → chose through the app, with their app login; no GitHub account, and publishing still needs adding on GitHub by hand.
- **2026-10-05** — Asked who has the code on the day this goes live → chose only the owner, who then ticks people.
- **2026-10-05** — Asked about installs that keep their project in Cloudflare with no GitHub → chose to cover them in this change.
- **2026-10-05** — Assumed: Project code is a key in Access with the one level Read, because Access already gives a key per person or role, shows who has it, and starts with nobody but the owner holding it; a new kind of tick would be a second system.
- **2026-10-05** — Assumed: the app passes the project through from where it is kept and stores no copy, because a stored copy goes stale on every wiki-only publish and would need new storage in every install.
- **2026-10-05** — Assumed: until the app can hand the project out, Connect stays as it is today for everyone, because an update should take nothing away before the owner has done their one step.
- **2026-10-05** — Assumed: assistants already connected keep working with their apps, because the app can't tell an assistant's request from the person's own browser, and their reach is the same either way.
- **2026-10-05** — Assumed: nothing reaches into a copy already downloaded, because the app can't, and a promise to wipe a device would be false; Access says it at removal.
- **2026-10-05** — Assumed: a missing git is installed by the assistant from its official source, like the two tools setup needs today.
- **2026-10-05** — Assumed: staging hands out the project too, to practice people who hold it, because staging should mirror the live app and the checker already has the project.
- **2026-10-05** — Assumed: this is a minor release, because nothing changes for an install until its owner saves the key, and no one loses a working connection.
- **2026-10-05** — Assumed: confirmed from Cloudflare's documentation that a Worker can be bound to an Artifacts namespace and make a short-lived read-only token for one repository; which permission the deploy needs for that binding is proven on staging in the first task, and a refusal stops the build there.
- **2026-10-05** — Review note: Why now says the project is handed out by hand on GitHub or in Cloudflare, and that the download comes from the app's own address on both.
- **2026-10-05** — Review note: the setup text becomes short and the installer does sign-in, download and readback in one step, because he asked for a short prompt the assistant installs from.
- **2026-10-05** — Assumed: the device still approves the person's app sign-in with the small sign-in program the assistant installs, because the app's address sits behind the sign-in wall; a download link that needs no sign-in at all means a door in that wall and a secret in the copied text, so it is offered as a choice, not folded in.
- **2026-10-05** — Asked how the device proves who it is when it downloads the project → chose to keep the app sign-in, with no secret in the copied text, and to build it with a preview before anything is published.
- **2026-10-05** — Build order: the two upstream proofs moved from the first tasks to final verification (now 7.2 and 7.3), after the source and tests were written, because each needs a preview deploy and a key the build step can not make. A refusal there still stops the publish, and 5.2 takes any permission 7.2 names. The second proof clones through the real code route, so no throwaway route is added and removed.
- **2026-10-06** — Save: the source, tests and wiki are written and the local checks pass; the installer is pinned at the first saved commit. Left: confirm the public address serves the pinned installer (4.2), the two upstream proofs on a preview (7.2, 7.3, with 5.2 depending on 7.2), the preview walk (7.4) and a real sign-in from this computer (7.5).
- **2026-10-06** — Asked how to clear the open checks before publishing → chose to give the GitHub key and approve one sign-in on this computer, and to prove Cloudflare-kept projects on a throwaway test project.
- **2026-10-06** — Proof (7.2): a throwaway project `connect-proof` in the account's `wongstack` namespace, on a throwaway branch whose staging app was bound to it. The usual narrow deploy key deployed the binding with no new permission, so 5.2 adds none. The checker downloaded the project through the preview, `git fsck` passed, and a push was refused with the plain line. The project, the branch and its folder are deleted.
- **2026-10-06** — Proof (7.2) found one bug, fixed: the app read a Cloudflare-kept project's address as a property of the binding's handle; Cloudflare gives it from the handle's `info()` call. The download answered *not available* until then.
- **2026-10-06** — Save: the owner saved the read-only GitHub key `WONG_CODE_READ` through the private link; the live app holds it. The preview app refused the usual load (Cloudflare code 10215, a newer preview was uploaded), so it was given as a new version of the preview app; the names check reports both apps in step. Left: the download through the preview (7.3), the walk (7.4) and a real sign-in install (7.5).
- **2026-10-06** — Proof (7.3): with the key loaded, the checker downloaded this project through the preview in about one second, 15 MB, and `git fsck` passed; a push was refused with the plain line.
- **2026-10-06** — Proof (7.5): the owner approved one sign-in on this computer. The pinned installer, run from an empty folder against the preview, signed in, installed the project and reported the apps; a second run said *up to date*; the copy's Git settings hold no token.
- **2026-10-06** — Proof (7.5) found one older bug, fixed: inside a copy, listing company actions with no search words sent the word "undefined" as the search and came back empty. `scripts/company-api.mjs` now leaves out an option nobody gave; the list then showed the three actions.
- **2026-10-06** — Build order: the look at Access's Keys view and Home's popup moved from task 7.4 to the publish walk, because that walk runs a browser on the saved preview anyway; 7.4 keeps the requests, all observed.
- **2026-10-06** — Archive checkpoint: all tasks done and proven on previews; archived for publishing as 35.1.0.
- **2026-10-06** — Archive checkpoint: the owner asked to publish; every task is ticked, both kinds of project were proven on a preview, and it is numbered 35.1.0. The live app already holds the read-only GitHub key.
- **2026-10-06** — Preview walk: passed. Access shows Project code held by the owner and the Helpers role; Home's popup opens and closes; a push is refused; a new person gets no Project code. Not shown: the setup text in the popup and a practice person's own download, because the checker is a machine. Two checks are kept: adding a person, and the refused push.

<!-- end proposal.md -->
<!-- file design.md utf8 11017 -->
# Design

## Context

See proposal.md for why. What shapes the approach:

- People sign in by emailed code through Cloudflare Access. The app knows an email, never a GitHub name, and holds no GitHub key.
- `scripts/employee-bootstrap.mjs` already signs a device in with `cloudflared` and sends the Access token only in request headers to the business origin. It is fetched at a pinned commit and digest (`app/worker/employee-access/bootstrap-release.json`).
- Access already models a key with one level, Read, that works with no app (`app/worker/keys.ts`, `key-levels.ts`, the `cloudflare` entry). Only the owner holds a key that works alone until someone is given it.
- Two delivery routes exist: GitHub, and Artifacts (`wiki/stack/artifacts-route.md`), told apart by `components.delivery` in the install record.
- The project's `.env` is git-ignored, so a clone carries no secret.
- The main-app deploy skips docs-only publishes, so a copy packed at deploy time would lag the wiki.

## Goals / Non-Goals

**Goals:** one device flow on both routes; the repository credential never leaves the server; no new table or screen; nothing taken from anyone by the update.

**Non-Goals:** push through the app; GitHub invitations; a per-branch or partial copy; Windows-specific work beyond what the bootstrap already supports; changing memory enrollment.

## Decisions

### 1. The Worker passes Git's read protocol through; it stores no copy

New module `app/worker/employee-access/code.ts`, routed from `router.ts` at `/api/access/code/git/`:

- `GET …/info/refs?service=git-upload-pack` and `POST …/git-upload-pack` are forwarded to the upstream repository with the server's credential added, the `Git-Protocol`, `Content-Type`, `Accept` and `Content-Encoding` headers kept, the response body streamed back unbuffered, and redirects refused.
- Anything else, `git-receive-pack` and its `info/refs` included, answers 403 with one plain line: publishing is granted where the project is kept.
- Before any upstream call: `currentPolicy`, a human identity (never the service token on the live app; on staging the checker stands in for the owner as elsewhere), and the caller holding `code` at Read. Failures use the existing refusal shape.
- The upstream response's `WWW-Authenticate` and `Set-Cookie` are dropped; an upstream 401/403/404 becomes a safe `code_unavailable` with no upstream text.

*Over a snapshot packed at deploy:* live, no storage to provision, and correct after a wiki-only publish. *Over handing the device a short-lived upstream token:* the device then talks to GitHub or Artifacts directly and a leaked token outlives an untick; pass-through keeps every request judged against current access.

### 2. Two upstreams behind one interface

`upstream(env)` returns `{ url, authorization }` or `null`:

- **GitHub:** `WONG_CODE_REPOSITORY` (`owner/name`, committed in `vars`) and secret `WONG_CODE_READ`, a fine-grained token with *Contents: Read-only* on that one repository. URL `https://github.com/<owner>/<name>.git`, Basic auth `x-access-token:<token>`.
- **Artifacts:** an `artifacts` binding (`ARTIFACTS`, namespace `wongstack`) and `WONG_CODE_REPOSITORY` naming the repo. `env.ARTIFACTS.get(name).createToken("read", 300)` per request; the remote from the repo handle. The code calls nothing else on the binding; a test holds it to `get` and `createToken("read", …)`.
- `null` means not ready: the routes answer `code_unavailable`, and everything in Decision 4 falls back.

### 3. Project code is a registered key

`app/worker/keys.ts` gains `code: { title: "Project code", secrets: ["WONG_CODE_READ"], levels: ["read"] }`. Its *saved* state is `upstream(env) !== null`, so an Artifacts install with the binding reads as saved with no secret; the saved check gains that one branch. It is offered with no app, by the existing key-alone rule. No route lists it in `keys`, so no action or mini app env is handed `WONG_CODE_READ`; a test asserts the mini-app env omits it and the binding.

No migration: levels live in `wong_access_key_grants` and `wong_access_role_keys`. The first-open rule already gives a key-alone level to nobody, and the owner holds every key.

*Over a new "code" column or pseudo-app:* reuses the Keys view, a person's page, roles, audit and the practice list unchanged.

### 4. Who may connect

`setup.ts` adds `code: "ready" | "lacked" | "off"` to its reply:

- `off`: `upstream` is null, or the policy is `legacy` / `not_started`, or key levels have not started. The prompt is today's apps-only text, for every signed-in person.
- `ready`: the caller holds `code`. The prompt is the install text.
- `lacked`: upstream ready, levels started, caller lacks it. No prompt is returned; `prompt.state` is `unavailable` with the ask-your-admin message.

`/api/access/apps` carries the same field so Home needs one read. `AppList` renders the Connect card through the existing `Lacked` face when `lacked`; `Lacked` takes a title and description, not a `MiniApp`, so both uses share it. Access's own Connect button and the on-page steps for someone who manages nothing follow the same field.

### 5. The device flow

`scripts/employee-bootstrap.mjs` gains `code --state <dir> --dir <folder>`, and `install --origin <origin> [--dir <folder>]`, which picks the private state directory itself, then runs `login`, `code` when the setup reply says `ready`, and `status`, and prints one summary. `code`:

1. Needs `git` on PATH; else a plain error naming the official install.
2. No `<folder>/.git`: the folder must be absent or empty; clone from `<origin>/api/access/code/git/` into it. Otherwise it must be a clone whose `origin` is that address; `fetch`, then `merge --ff-only` on the checked-out default branch. Dirty or diverged: keep everything, report *kept your changes; update not applied*, exit non-zero. Never `reset`, `clean`, `stash` or `checkout --force`.
3. The Access token reaches Git only through `GIT_CONFIG_COUNT` / `GIT_CONFIG_KEY_n` / `GIT_CONFIG_VALUE_n` (`http.<origin>/.extraHeader`) in the child's environment, built on `cleanEnvironment()`; never an argument, the remote URL or `.git/config`. `http.followRedirects=false`, `credential.helper=` empty, `GIT_TERMINAL_PROMPT=0`.
4. After a clone, print the folder and the line to run company calls from it: `node scripts/company-api.mjs … --state <dir>`.

The install prompt (`prompt.ts`, second variant) is short: the origin, the pinned URL and digest, verify before running, run `install`, install Node, cloudflared or Git from their official distributions if `install` names one as missing, and never print credentials. The rules the long prompt spelled out (private directory and modes, no redirects, no token in arguments, preserving existing files) are enforced and reported by the helper, which already checks them, so the text need not repeat them. `install` again updates. The apps-only variant keeps today's text, byte for byte.

New bytes need a new pin by [the existing procedure](../../../wiki/stack/employee-project.md#publish-checked-artifact-pins).

### 6. Setup and update

`provision.mjs access` (idempotent, both routes):

- writes `WONG_CODE_REPOSITORY` into both Workers' `vars`: from `origin` on GitHub, from `components.delivery.repo` on Artifacts;
- on Artifacts adds the `artifacts` binding to production and staging in `app/wrangler.jsonc`, and widens the deploy token only if task 7.2 shows the deploy needs it;
- on GitHub reports `codeKey.status: missing` with the private-key-link steps (fine-grained token → only this repository → Contents: Read-only → no other permission), and `ready` once `secrets:check` sees it. `WONG_CODE_READ` is pushed to production and staging like a business key.

New installs get the same from `/wong-setup`'s runbook; the GitHub key joins the closing to-do, never a blocker.

### 7. Staging

Staging mirrors production: same var, same secret or binding. The seed gives one practice person `code: read` through the seeded role and leaves one without. The checker, owner on staging, can fetch `info/refs` in a walk; a Home walk can not show `lacked` (it signs in as owner), so code tests cover it, as for greyed apps.

## UX

### Use-case brief

A teammate, at a desk, once per computer, wants their assistant working on the company's project. Done: the project is in a folder and the assistant has listed their apps from it. The owner, about once per hire, wants to decide who gets the project without leaving Access. Common case: a ticked person copies one prompt. Edge cases: not ticked; key not saved yet; no git. Mirrors the greyed app card on Home and the Cloudflare key row in Access.

### Flow

Owner: Access → Keys → Project code → tick people or roles → Save. Teammate: Home → Connect your assistant → Copy setup prompt → paste → approve sign-in. Not ticked: the card is greyed; a press shows the ask-your-admin line under it.

### Hierarchy

Popup: *Copy setup prompt* is the one solid button; the project line is plain text above it. Home: the greyed card is muted with an outline *No access* badge, as greyed apps are. Access: no new control.

### Review

[review.html](review.html): the Keys view in *You choose who gets the project*, Home's card in *A person without it sees Connect greyed*, and the popup in *The popup says what the person gets*.

### Components

Existing: `Card`, `Badge`, `Dialog`, `CopyText`, Access's `Table`, `LevelChoice`. Changed: `Lacked` in `AppList.tsx` takes a title and description. Nothing new.

## Risks / Trade-offs

- [The Artifacts binding may need a deploy permission the narrow token lacks, or a newer wrangler] → task 7.2 proves it on a preview before publishing; a refusal stops the publish with the finding.
- [GitHub may treat a Worker's forwarded Git request differently, or a large clone may hit a Worker limit] → task 7.3 clones this repository (about 19 MiB packed) through a preview before publishing.
- [A bug in the gate hands the project to any signed-in person] → the check sits before `upstream()` is even resolved; tests cover owner, holder, lacker, removed person, service token on production, and levels not started.
- [A fine-grained GitHub token expires] → Keys shows Project code unsaved again and Connect falls back to `off`, never to open; the wiki says to pick no expiry or renew.
- [The owner's read key can read the repo if the Worker secret leaks] → one repository, Contents read only; rotation is delete and paste again.
- [An unticked person keeps an old copy] → stated in the proposal, at removal, and in the wiki.
- [The binding reaches the whole `wongstack` namespace] → the code names only the recorded repo and only mints read tokens; a test pins both.

## Migration Plan

Ship as a `minor`. An install's update runs the `access` step: Artifacts installs are switched on by it; GitHub installs get one to-do. Until the key is saved nothing changes for anyone. Rollback: remove the secret or binding; Connect returns to apps-only.

<!-- end design.md -->
<!-- file tasks.md utf8 6345 -->
# Tasks

## 1. Prove the two upstreams

Moved to 7.2 and 7.3, after the source and tests: see the Decision log.

## 2. The Worker

- [x] 2.1 Add `code` to `app/worker/keys.ts` and `WONG_CODE_READ` to `app/.dev.vars.example`; make a key's saved state true for `code` when the upstream resolves. Write `key-levels` and `key-catalogue` tests: Read is its only level, it is offered with no app, ticking an app never gives it, and `check-app-keys.mjs` passes.
- [x] 2.2 Write `app/worker/employee-access/code.ts`: `upstream(env)` for GitHub and Artifacts, the two forwarded read endpoints, the 403 for everything else, header filtering, no redirects, streamed bodies. Write `code.test.ts` with a fake upstream and a fake binding: the credential is added and never echoed; push paths are refused before any upstream call; an upstream 401 becomes `code_unavailable`; the binding sees only `get` and `createToken("read", …)`.
- [x] 2.3 Gate the route in `router.ts` and the route map: tests for owner, a holder, a lacker, a removed person, the service token on production and on staging, a `legacy` install, and levels not started; each refusal makes no upstream call. Assert a mini app's env holds neither `WONG_CODE_READ` nor the binding.
- [x] 2.4 Add `code: ready | lacked | off` to `setup.ts` and `apps.ts`, and the install variant to `prompt.ts`. Update `prompt.test.ts`, `core.test.ts`: `lacked` returns no prompt text; `off` returns today's text unchanged, byte for byte; `ready` is at most six lines, names the pinned URL, the digest and the `install` command, and holds no credential.
- [x] 2.5 Add `WONG_CODE_REPOSITORY` to `app/wrangler.jsonc` for this repo, production and staging, and regenerate the binding types. Verify `npm run build:app`.

## 3. The screens

- [x] 3.1 `app/src/lib/access.ts`: read the new field in both schemas. `AppList.tsx`: `Lacked` takes a title and description; the Connect card uses it when `lacked`. Update `AppList.test.tsx` and `Home.test.tsx`: greyed card, *No access*, the ask-your-admin line on press, keyboard reach, nothing opens; `off` and `ready` open the popup.
- [x] 3.2 `AssistantSetup.tsx`: the project line when `ready`, today's closing line when `off`, the ask-your-admin state when `lacked`. Access's Connect button and the on-page steps follow the field. Update `CopyText.test.tsx` where it draws the steps and `apps/access/App.test.tsx`.
- [x] 3.3 The removal question in Access says the copy on the person's device stays. Verify the case in `App.test.tsx`.
- [x] 3.4 Seed staging: the seeded role gives `code` Read; one practice person lacks it. Verify `seed.test.ts`.

## 4. The device helper

- [x] 4.1 Add `code` and the one-step `install` to `scripts/employee-bootstrap.mjs` per design Decision 5; `install` picks a private state directory, runs sign-in, download and status, and names a missing program plainly. Tests in `scripts/tests/` against a local Git HTTP fixture: clone into an empty folder; refuse a non-empty one; fast-forward update; a dirty and a diverged copy are left byte-identical with a non-zero exit; the token appears in no argument, URL or `.git/config`; a redirect is refused; missing `git` gives the plain error.
- [x] 4.2 Pin the new bootstrap bytes in `bootstrap-release.json` by the existing procedure, at the final source checkpoint. Verify the distribution tests pass and the public raw URL serves the digest.

## 5. Setup and update

- [x] 5.1 `provision.mjs access`: write `WONG_CODE_REPOSITORY` on both routes; report `codeKey` as `ready` or `missing` with the numbered steps on GitHub. Extend `scripts/tests/provision.test.mjs`: idempotent, both routes, a second run changes nothing.
- [x] 5.2 On Artifacts, add the binding to both Workers and any permission task 7.2 finds; update `permission-groups.md` and its table test if one is added. Verify the test.
- [x] 5.3 Update `/wong-setup`'s `references/cloudflare.md`: the step and the closing to-do. Run `node scripts/measure-context.mjs --check` and trim an equal amount if it fails.

## 6. Wiki and release

- [x] 6.1 Rewrite `wiki/stack/employee-project.md`: what Connect installs, the `code` command, updating, read-only, removal, the apps-only fallback; retitle *Repository access stays manual* to what is still manual (publishing) and fix every link to that heading. Update `employee-access.md` (Project code among the keys, *What Access leaves alone*), `artifacts-route.md` (the teammate limit), `api-keys.md` or `cloudflare-credentials.md` (the read-only GitHub key's steps), `mini-apps.md` (the Connect card), `company-api.md` (calls from an installed copy). Verify `node scripts/check-payload-links.mjs`.
- [x] 6.2 Add the `## Next (minor) — Connect your assistant installs the project` entry to `CHANGELOG.md`, with the Updating note in plain words: Cloudflare-kept projects need nothing; GitHub projects make one read-only key through the private link. Add any removed heading or name to `scripts/retired-names.json`. Verify `node scripts/check-retired-names.mjs`.

## 7. Verification

- [x] 7.1 Run `node .github/scripts/checks.mjs --worktree` and `npm test` in `app/`; fix what fails.
- [x] 7.2 On a branch preview, bind the staging Worker to the `wongstack` Artifacts namespace of a test install and mint a read token for one repo. Verify the deploy succeeds with the narrow deploy token; if it is refused, record the permission it names in the Decision log and add it to task 5.2. If no permission can make it work, stop and report.
- [x] 7.3 With a read-only GitHub token as a staging secret (`WONG_CODE_READ`), clone this repository through the code route on the same preview. Verify the clone completes and `git fsck` passes; record the time and size in the Decision log. If GitHub or a Worker limit refuses it, stop and report.
- [x] 7.4 On the preview, as the checker: the code route gives refs and a full download; a push gets the 403 line; the apps reply lists Project code among the keys. The look at Access → Keys and Home's Connect popup is the publish walk's, which runs on the saved preview.
- [x] 7.5 From an empty folder on this host, run the pinned bootstrap's `login` and `code` against the preview with a real sign-in, then `list` from inside the copy. This needs the owner's sign-in on this computer; if it is not available, it stays a named blocker for a person.

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 1182 -->
# Spec Delta

## ADDED Requirements

### Requirement: Setup tells the app which project it hands out

Setup and the Access step SHALL record, as committed nonsecret configuration, the one project the app hands out, on the live app and on staging. On an install whose project is kept in the employer's Cloudflare account they SHALL also connect the app to that repository, so no key is made or pasted. On a GitHub install they SHALL leave the read-only key to the employer through the private key link, with numbered steps, and SHALL report it as the one step left. Running the step again SHALL change nothing that is already right. The account token SHALL still never reach a Worker.

#### Scenario: A Cloudflare-kept install updates

- **WHEN** the Access step runs on an install with no GitHub
- **THEN** the app is connected to its own repository, Project code shows as saved after the next publish, and no key was asked for

#### Scenario: A GitHub install updates

- **WHEN** the Access step runs on a GitHub install with no read-only key saved
- **THEN** the project is recorded, the report names the key as the one step left, and Connect keeps working as before for everyone

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/employee-onboarding/spec.md utf8 9227 -->
# Spec Delta

## ADDED Requirements

### Requirement: Connect installs the project for a person who holds Project code

Once the installation can hand its project out, a signed-in person who currently holds Project code SHALL be able to install the whole project on their device from the app's setup prompt, with their own app login as the only credential: no repository account, no pasted key. Running the same step again SHALL bring the copy up to date. The copy SHALL be read-only: the app SHALL refuse every attempt to publish through it and say how publishing is granted. The employer SHALL hold Project code always; nobody else SHALL hold it until the employer or a manager gives it. Each download SHALL be judged against the person's current access, so unticking or removing a person refuses their next download without sign-out. The repository credential the app uses SHALL never reach a device, a prompt, a response body or a log. Until the installation can hand its project out, every signed-in person SHALL keep the apps-only connection they had.

#### Scenario: A ticked person connects from an empty folder

- **WHEN** a person who holds Project code pastes the setup prompt into their assistant and approves their app sign-in
- **THEN** the project is on their device with its history, their allowed company actions work from inside it, and no repository login was asked for

#### Scenario: Project code is taken away

- **WHEN** the employer unticks Project code for a person who installed the project
- **THEN** that person's next update is refused with ask-your-admin guidance, and the copy on their device is unchanged

#### Scenario: A person tries to publish through the app

- **WHEN** a connected person pushes a change to the address their copy came from
- **THEN** it is refused, nothing in the project changes, and the message says the employer grants publishing where the project is kept

## MODIFIED Requirements

### Requirement: The business app is the employee setup entry point

A signed-in person who may connect SHALL receive a copyable assistant setup prompt and their own connection status after signing into the existing protected business app. Once the installation can hand its project out, the people who may connect SHALL be those who currently hold Project code; before that, and before key levels start, every signed-in person SHALL keep the prompt. A person who may not connect SHALL be told to ask their admin and SHALL receive no prompt. The prompt SHALL contain nonsecret routing and instructions only, SHALL remain manually copyable after clipboard failure, and SHALL perform no work or grant access when copied. Employees SHALL require no Cloudflare administration account or repository identity to connect or to receive the project. Expired or new-device sessions SHALL use the same employee app identity for renewed approval.

#### Scenario: Employee copies setup instructions

- **WHEN** a current employee who may connect copies the setup prompt from the app
- **THEN** the page confirms copying and the prompt identifies this business and its published setup instructions without including any credential

#### Scenario: A new computer needs approval

- **WHEN** the assistant has no valid employee session on that computer
- **THEN** setup requests approval through the same business login rather than asking for a provider token or separate employee GitHub account

#### Scenario: A person without Project code asks for the prompt

- **WHEN** the installation can hand its project out and a person who lacks Project code opens their setup
- **THEN** no prompt is returned and they are told to ask their admin for access

### Requirement: The employer manages employee grants through Access

The employer SHALL be the person whose verified signed-in email equals the owner email setup recorded in the installation's committed configuration; no private activation record, command or rollout list SHALL be required before Access opens. Only the employer and the managers the employer chose SHALL add, edit or remove employees or change selected-app grants. A new employee SHALL have no business apps preselected and SHALL receive the project only when given Project code; app login alone SHALL grant no project copy and no authority to publish. A newly built app SHALL appear in Access unassigned and SHALL require an explicit assignment. A current employee with no assigned business apps SHALL retain only their self-service status. Public routing, service identity, request content and first visitation SHALL establish no employer authority. An installation with no recorded owner email SHALL keep its existing behavior and report Access setup unfinished.

#### Scenario: Employer adds a person

- **WHEN** the employer saves a person's email with Orders access
- **THEN** that person is assigned Orders only, holds no Project code, and the owner sees the actual admission status

#### Scenario: The owner opens Access for the first time

- **WHEN** the person whose sign-in email is the recorded owner email opens Access with no other setup done
- **THEN** the people list and Add person are available without a private record or command

#### Scenario: Employee attempts membership administration

- **WHEN** an ordinary employee invokes a membership or connection-management endpoint
- **THEN** it is denied without changing any employee or provider resource

### Requirement: Assistant setup works before a private checkout exists

Published setup SHALL support an empty folder and supported remote workspace through a verified reviewed bootstrap artifact. An employee without Project code, where the apps-only connection still applies, SHALL obtain a usable company API client without the project. Setup SHALL NOT hand a device a repository credential, register a repository integration or change the device's own repository authentication. Setup SHALL install the project only into an empty or new folder, SHALL preserve dirty work, conflicting local folders and unpushed commits, and an update SHALL never discard a person's local changes; interrupted setup SHALL resume against the same target. API readiness SHALL require actual authorized connection evidence, and the project SHALL be reported installed only after it is on the device.

#### Scenario: App-only employee starts from an empty folder

- **WHEN** an employee assigned business apps pastes an apps-only setup prompt into their assistant
- **THEN** the assistant can bootstrap and call their approved company actions without needing access to the private project source

#### Scenario: Existing local work conflicts with setup

- **WHEN** setup encounters a dirty checkout or a different local repository
- **THEN** it preserves that work and provides safe resume/folder guidance without replacing or resetting it

#### Scenario: An update meets local changes

- **WHEN** a person who changed files in their copy runs the update
- **THEN** their changes are kept, and they are told when the update could not be applied on top of them

### Requirement: Connections remain private and destination bound

Employee sessions SHALL remain in private OS-user state outside checkouts and SHALL not appear in prompt text, model output, token-bearing arguments, URLs, git remotes, tracked files or ordinary diagnostics. App credentials SHALL go only to the verified business origin, including when the project is downloaded. The device SHALL receive no repository credential. Owner, deployment, business-service, memory and verification credentials SHALL never substitute for employee connection. Employee sessions SHALL not be inherited by builds or unrelated commands.

#### Scenario: A redirect requests credential forwarding

- **WHEN** a setup response redirects a credential-bearing request to another destination
- **THEN** the helper refuses forwarding without exposing the credential

#### Scenario: Project command execution begins

- **WHEN** the connected assistant executes a build or unrelated business command
- **THEN** the command does not inherit the employee session used by selected company API operations

### Requirement: App access removal reports actual login outcomes

Full removal SHALL deny company work immediately, withdraw managed app admission, revoke existing app sessions and refuse further project downloads. Policy and session outcomes SHALL be reported separately, remain retryable and follow current desired membership. App removal SHALL NOT claim to remove a copy already on a device, repository access granted by hand, downloaded data or independently installed memory, and Access SHALL say so when a person is removed.

#### Scenario: Repository access was granted manually

- **WHEN** the employer removes a person's app access
- **THEN** company work and project downloads are blocked, and the app explains that a copy on their device stays and that access granted where the project is kept must be removed there

#### Scenario: Full removal partly fails

- **WHEN** local removal commits but a provider policy or session revocation fails
- **THEN** new company work is denied and Access reports and retries unresolved provider outcomes without claiming full completion

<!-- end specs/employee-onboarding/spec.md -->
<!-- file specs/key-access/spec.md utf8 1052 -->
# Spec Delta

## ADDED Requirements

### Requirement: Project code is a key with one level

Access SHALL list Project code among the keys, offering Read as its only level, settable per person and per role like any key and usable with no app ticked. It SHALL count as saved when the installation holds a read-only credential for its one project, or is connected to its own repository in the employer's Cloudflare account. Ticking an app SHALL never give it. Its credential SHALL be usable for reading that one project only, and no action or mini app SHALL be handed it.

#### Scenario: The employer gives Project code to a role

- **WHEN** the employer sets Project code to Read on a role two people hold
- **THEN** both people may install the project on their next request, and a person outside the role may not

#### Scenario: The credential is not saved yet

- **WHEN** the employer opens Keys on an installation that can not yet hand its project out
- **THEN** Project code shows as not saved with the one step left, and nobody's connection changes

<!-- end specs/key-access/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 2146 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The home page's app list guides first use

The home page SHALL present each authorized mini app as a clearly focused link with its title and description, and SHALL identify the supplied example as an example when available. With no apps built it SHALL explain how the employer can ask for a first tool. The list SHALL include a Connect your assistant entry, which opens the setup steps over the page without leaving it for a person who may connect. Once the installation can hand its project out, a person who lacks Project code SHALL see that entry as unavailable, marked by more than color; choosing it SHALL open nothing and SHALL tell the person to ask their admin for access. An employee with no assigned apps SHALL see guidance to contact the employer. Unavailable permission readback SHALL show a safe retry state without an unrestricted list. The list SHALL remain readable and operable at phone widths and with keyboard navigation.

#### Scenario: Apps are available

- **WHEN** a person opens the home page of a workspace with authorized apps
- **THEN** each allowed app has a title, description, and keyboard-accessible link, and the supplied example is visibly labeled when allowed

#### Scenario: No apps yet

- **WHEN** a workspace has no mini apps
- **THEN** the employer sees a first-tool request to copy into their chat

#### Scenario: Employee has no assigned apps

- **WHEN** an employee signs in with no assigned business apps
- **THEN** the page gives contact-your-employer guidance without granting project creation or another app

#### Scenario: A person opens Connect your assistant from the list

- **WHEN** a signed-in person who may connect chooses Connect your assistant in the home page's list
- **THEN** the setup steps open over the home page, and closing them leaves the person on the home page

#### Scenario: A person without Project code chooses Connect

- **WHEN** the installation can hand its project out and a person who lacks Project code chooses Connect your assistant
- **THEN** nothing opens and the page tells them to ask their admin for access

<!-- end specs/mini-apps/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-05

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 52877 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-06-connect-installs-project</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
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
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-06-connect-installs-project">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-06-connect-installs-project</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0"><i>Connect your assistant</i> links an assistant to a person's apps today, and nothing more. The project itself is handed out by hand, on GitHub or in Cloudflare, wherever it is kept, to people who have an account there. You said Connect &quot;should basically install the github repo on their device and they are able to connect to APIs via the repo and access is given based on their login credentials&quot;, and that a person without access should see Connect greyed out. This plan makes the app login the one login: you tick a person in Access, and their assistant downloads the project from the app's own address and installs it. The person needs no GitHub or Cloudflare account and installs nothing by hand.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Connect puts the whole project on the person's device.</b> They paste a short setup text into their assistant and approve their app sign-in on that computer. The assistant then downloads the project from the app's own address into a folder, and uses your apps from inside it. The download comes from the app whether the project is kept on GitHub or in Cloudflare. The person needs no GitHub or Cloudflare account, types no key, and installs nothing by hand. Running the same step again later brings the copy up to date.</div></div></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The setup text is short, and one step does it all.</b> Today's text is five long paragraphs of instructions. The new one names the app, the checked installer and one step to run; the installer signs in, downloads, and reports what works.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">you          the app        their device</span>
<span class="ln" data-note="item-2-line-2" tabindex="0"> │─ tick ─────▶│                 │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0"> │             │◀─ paste, sign in│</span>
<span class="ln" data-note="item-2-line-4" tabindex="0"> │             │── the project ─▶│</span>
<span class="ln" data-note="item-2-line-5" tabindex="0"> │             │◀─ use the apps ─│</span>
<span class="ln" data-note="item-2-line-6" tabindex="0"> │─ untick ───▶│                 │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0"> │             │── no updates ──▶│</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>You choose who gets the project, in Access.</b> <i>Project code</i> shows in Access beside your keys, with two choices per person or role: None or Read. Nobody has it on the day this goes live but you. A manager can give it, to themselves included, as with any key.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">│ Access           [Connect assistant] │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ People 3  Roles 2  Apps 2  [Keys 2]  │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ Keys                                 │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ Key            Read       Read&amp;write │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ ──────────────────────────────────── │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│ Cloudflare     you, kim   —          │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">│ +Project code  you, kim   —          │</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">└──────────────────────────────────────┘</span>
<span class="ln" data-note="item-3-line-10" tabindex="0"> opened: tick who may Read it</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A person without it sees Connect greyed.</b> The card is marked <i>No access</i>, opens nothing, and a click says <i>Ask your admin for access to Connect your assistant.</i>, like an app they lack.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">  BEFORE                    AFTER, not ticked</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">┌────────────────────────┐  ┌────────────────────────┐</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ Hello                → │  │ Hello                → │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">├────────────────────────┤  ├────────────────────────┤</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ Connect your         → │  │ Connect your  No access│</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">│ assistant              │  │ assistant     (greyed) │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">└────────────────────────┘  └────────────────────────┘</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">                             Ask your admin for access</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">                             to Connect your assistant.</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The popup says what the person gets.</b> It names the apps and that the project comes with them.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">│ Connect your assistant               │</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">│ Signed in as kim@example.com         │</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">│ Apps: Hello, Orders                  │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">│ +Project: the whole project, kept    │</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">│ +up to date                          │</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">│ ┌──────────────────────────────────┐ │</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">│ │ Install my company's project     │ │</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">│ │ from https://app.example.com …   │ │</span>
<span class="ln" data-note="item-5-line-10" tabindex="0">│ └──────────────────────────────────┘ │</span>
<span class="ln" data-note="item-5-line-11" tabindex="0">│ [Copy setup prompt]                  │</span>
<span class="ln" data-note="item-5-line-12" tabindex="0">│ Paste it into your assistant and     │</span>
<span class="ln" data-note="item-5-line-13" tabindex="0">│ approve the sign-in on that computer.│</span>
<span class="ln" data-note="item-5-line-14" tabindex="0">│                              [Close] │</span>
<span class="ln" data-note="item-5-line-15" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The copy is for using, not for publishing.</b> A person can read the project and work in their copy. They can't publish a change from it. To let someone publish, you still add them where the project is kept, by hand. Their copy then keeps its history and their work.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>One step for you on a GitHub project.</b> The app needs a read-only GitHub key for this one project. Your assistant sends a private link with numbered steps; you make the key and paste it once. Until it is saved, Connect works as it does today for everyone, and Access tells you one step is left.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-7-line-1" tabindex="0">key saved? ─ no ─▶ Connect as today, for all</span>
<span class="ln" data-note="item-7-line-2" tabindex="0">     │ yes</span>
<span class="ln" data-note="item-7-line-3" tabindex="0">     ▼</span>
<span class="ln" data-note="item-7-line-4" tabindex="0">ticked? ─ no ─▶ greyed, &quot;ask your admin&quot;</span>
<span class="ln" data-note="item-7-line-5" tabindex="0">     │ yes</span>
<span class="ln" data-note="item-7-line-6" tabindex="0">     ▼</span>
<span class="ln" data-note="item-7-line-7" tabindex="0">Connect installs the project</span></pre></div></details></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>No step on a project kept in Cloudflare.</b> An install with no GitHub hands out the project straight from your Cloudflare account, with no key to make. The update switches it on. This is the first way a teammate gets the project on such an install.</div></div></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>Assistants already connected keep working.</b> Nobody is cut off. A person connected the old way keeps using their apps. They get the project once you tick them and they run Connect again.</div></div></li>
<li class="item card" id="item-10"><span class="num">10</span><div class="body"><div class="text" data-note="item-10" tabindex="0"><b>Unticking or removing a person stops updates at once.</b> Their next download is refused. The copy already on their device stays there; the app can't reach it, and Access says so when you remove someone. The copy holds no keys or passwords: those never sit in the project.</div></div></li>
<li class="item card" id="item-11"><span class="num">11</span><div class="body"><div class="text" data-note="item-11" tabindex="0"><b>A device with nothing installed still works.</b> The assistant installs the small programs it needs by itself, as it does today, now including git. None needs an account. A folder that already holds other work is left alone: the assistant picks an empty one, and an update never throws away what the person changed.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> publishing changes from an app-given copy; inviting people on GitHub from the app; memory, which keeps its own setup; removing a copy from a device.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked how a person should get the project's code onto their device → chose through the app, with their app login; no GitHub account, and publishing still needs adding on GitHub by hand.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked who has the code on the day this goes live → chose only the owner, who then ticks people.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked about installs that keep their project in Cloudflare with no GitHub → chose to cover them in this change.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: Project code is a key in Access with the one level Read, because Access already gives a key per person or role, shows who has it, and starts with nobody but the owner holding it; a new kind of tick would be a second system.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the app passes the project through from where it is kept and stores no copy, because a stored copy goes stale on every wiki-only publish and would need new storage in every install.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: until the app can hand the project out, Connect stays as it is today for everyone, because an update should take nothing away before the owner has done their one step.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: assistants already connected keep working with their apps, because the app can't tell an assistant's request from the person's own browser, and their reach is the same either way.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: nothing reaches into a copy already downloaded, because the app can't, and a promise to wipe a device would be false; Access says it at removal.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a missing git is installed by the assistant from its official source, like the two tools setup needs today.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: staging hands out the project too, to practice people who hold it, because staging should mirror the live app and the checker already has the project.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: this is a minor release, because nothing changes for an install until its owner saves the key, and no one loses a working connection.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: confirmed from Cloudflare's documentation that a Worker can be bound to an Artifacts namespace and make a short-lived read-only token for one repository; which permission the deploy needs for that binding is proven on staging in the first task, and a refusal stops the build there.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Review note: Why now says the project is handed out by hand on GitHub or in Cloudflare, and that the download comes from the app's own address on both.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Review note: the setup text becomes short and the installer does sign-in, download and readback in one step, because he asked for a short prompt the assistant installs from.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the device still approves the person's app sign-in with the small sign-in program the assistant installs, because the app's address sits behind the sign-in wall; a download link that needs no sign-in at all means a door in that wall and a secret in the copied text, so it is offered as a choice, not folded in.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked how the device proves who it is when it downloads the project → chose to keep the app sign-in, with no secret in the copied text, and to build it with a preview before anything is published.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-05</p>Build order: the two upstream proofs moved from the first tasks to final verification (now 7.2 and 7.3), after the source and tests were written, because each needs a preview deploy and a key the build step can not make. A refusal there still stops the publish, and 5.2 takes any permission 7.2 names. The second proof clones through the real code route, so no throwaway route is added and removed.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Save: the source, tests and wiki are written and the local checks pass; the installer is pinned at the first saved commit. Left: confirm the public address serves the pinned installer (4.2), the two upstream proofs on a preview (7.2, 7.3, with 5.2 depending on 7.2), the preview walk (7.4) and a real sign-in from this computer (7.5).</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked how to clear the open checks before publishing → chose to give the GitHub key and approve one sign-in on this computer, and to prove Cloudflare-kept projects on a throwaway test project.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Proof (7.2): a throwaway project <code>connect-proof</code> in the account's <code>wongstack</code> namespace, on a throwaway branch whose staging app was bound to it. The usual narrow deploy key deployed the binding with no new permission, so 5.2 adds none. The checker downloaded the project through the preview, <code>git fsck</code> passed, and a push was refused with the plain line. The project, the branch and its folder are deleted.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Proof (7.2) found one bug, fixed: the app read a Cloudflare-kept project's address as a property of the binding's handle; Cloudflare gives it from the handle's <code>info()</code> call. The download answered <i>not available</i> until then.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Save: the owner saved the read-only GitHub key <code>WONG_CODE_READ</code> through the private link; the live app holds it. The preview app refused the usual load (Cloudflare code 10215, a newer preview was uploaded), so it was given as a new version of the preview app; the names check reports both apps in step. Left: the download through the preview (7.3), the walk (7.4) and a real sign-in install (7.5).</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Proof (7.3): with the key loaded, the checker downloaded this project through the preview in about one second, 15 MB, and <code>git fsck</code> passed; a push was refused with the plain line.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Proof (7.5): the owner approved one sign-in on this computer. The pinned installer, run from an empty folder against the preview, signed in, installed the project and reported the apps; a second run said <i>up to date</i>; the copy's Git settings hold no token.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Proof (7.5) found one older bug, fixed: inside a copy, listing company actions with no search words sent the word &quot;undefined&quot; as the search and came back empty. <code>scripts/company-api.mjs</code> now leaves out an option nobody gave; the list then showed the three actions.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Build order: the look at Access's Keys view and Home's popup moved from task 7.4 to the publish walk, because that walk runs a browser on the saved preview anyway; 7.4 keeps the requests, all observed.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Archive checkpoint: all tasks done and proven on previews; archived for publishing as 35.1.0.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Archive checkpoint: the owner asked to publish; every task is ticked, both kinds of project were proven on a preview, and it is numbered 35.1.0. The live app already holds the read-only GitHub key.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Preview walk: passed. Access shows Project code held by the owner and the Helpers role; Home's popup opens and closes; a push is refused; a new person gets no Project code. Not shown: the setup text in the popup and a practice person's own download, because the checker is a machine. Two checks are kept: adding a person, and the refused push.</li>
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
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
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
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
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
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
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
    fit(d);
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
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
