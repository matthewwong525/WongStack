<!-- openspec-archive v1 2026-10-14-save-through-the-app -->
<!-- file proposal.md utf8 13726 -->
# Let a teammate save through the app

**Status:** ready-to-ship
**Branch:** lavish-crocodile
**Open questions:** none

## Why

A teammate who connects through *Connect your assistant* can read the project and use the apps, but their work stays on their own computer. To send it up they need a GitHub account, an invitation from the owner, and GitHub's tool installed. On a project kept in Cloudflare they can not send it up at all. Matthew asked that the app do this for them, so a teammate needs nothing but their app sign-in.

## What Changes

- **A teammate's assistant saves their work through the app.** The work goes up as a change. The app starts its checks, and gives back the result and a link to look at, as a save does today. The teammate needs no GitHub account, no invitation and no GitHub tool: their app sign-in is the only login.
  ```text
  teammate       the app      project
   │── save ──────▶│             │
   │               │── change ──▶│
   │               │◀── checks ──│
   │◀── preview ───│             │
  ```
- **Saving never publishes.** The app takes a change and nothing else. It refuses anything aimed at the live project, and it refuses to delete. The owner or an Admin looks at the change and publishes it, the way they publish today. The teammate's assistant ends with *saved, and here is who publishes it*, never *publish it?*
- **Everyone who can install the project can save.** There is no second tick. *Can install the project* now gives both, and the panel says so under it. Unticking it stops that person's next save at once. People who hold the tick today can save once the update is in.
  ```text
    BEFORE                     AFTER
  ┌ Project ─────────────┐   ┌ Project ─────────────┐
  │ [x] Can install the  │   │ [x] Can install the  │
  │     project          │   │     project          │
  └──────────────────────┘   │ +They can save       │
                             │ +changes too.        │
                             └──────────────────────┘
  ```
- **A project kept in Cloudflare, the usual install, needs nothing from the owner.** The app already reaches its own project there, so there is no key to make. After the next update and publish, saving works. A teammate can save there for the first time.
- **Only on GitHub, the owner makes one key.** A new GitHub install is asked for one key that both installs and saves, at the same moment it is asked for a key today. An install that already holds the read-only key keeps handing the project out; under the tick, Access says saving needs one more step and gives the owner a request to copy for their assistant. Once the new key is in, the old one is no longer needed. Deleting the old key on GitHub can't be undone; it is optional.
  ```text
  ┌ Project ─────────────────────────┐
  │ [x] Can install the project      │
  │ Saving needs one more step: a    │
  │ GitHub key that can save.        │
  │ [Copy the request]               │
  └──────────────────────────────────┘
  ```
- **What a teammate who can save is trusted with.** Their change runs through the checks and gets a preview, like the owner's own. They can add to any change that is not published yet, not only their own. They can not change the files that define the checks on GitHub. On GitHub the change shows under the owner's name, with a line saying who saved it.
- **The owner's own computer is untouched.** It keeps saving and publishing the way it does today. On GitHub, nothing changes for teammates until the owner adds the new key.

**Non-goals:** publishing through the app; changing how the owner's own first setup saves; telling the owner inside the app that a change is waiting; letting a teammate read review comments left on GitHub; a teammate on Windows where the project is kept in Cloudflare.

## Decision log

- **2026-10-13** — Asked "we should be able to push to github via through the api through the server so the user doesn't need to install github" → chose plan it as its own part.
- **2026-10-13** — Asked what a teammate may do through the app without GitHub → chose Save only: the work goes up as a change with its checks and preview, and the owner or an Admin publishes. Save and publish, and Leave saving for later, were offered and not chosen.
- **2026-10-13** — Asked whether a project kept in Cloudflare is covered → chose yes.
- **2026-10-13** — Assumed: this is for teammates who connect through Connect your assistant, not the owner's own first setup, because it was stated to Matthew and not objected to.
- **2026-10-13** — Assumed: the app passes the save on itself and never hands a teammate's computer a key, because the rule today is that the project's key never leaves the server.
- **2026-10-13** — Assumed: the new GitHub key gets its own name beside the read-only one, because the app can then tell with no call whether saving is possible, and an install that never ticks the box is never asked for a wider key.
- **2026-10-13** — Assumed: the key may not change the files that define the checks, because a key that could would let a saved change rewrite its own checks.
- **2026-10-13** — Assumed: a teammate may add to any unpublished change, because that is what an invited GitHub teammate can do today, and tracking who started each change needs new stored data.
- **2026-10-13** — Assumed: the teammate's assistant gets the failing check's output through the app, because without it the assistant can not fix a failed save.
- **2026-10-13** — Assumed: a save takes one change at a time, because that is all a save sends, and it keeps the app's check on what it lets through simple.
- **2026-10-13** — Assumed: the check before publishing sends one throwaway change to this project through the preview app and removes it after, because nothing else shows the whole path working.
- **2026-10-13** — Assumed: the Cloudflare half is tried on a real paid account before it is called working, and is reported as unverified if no such trial runs, because no stand-in shows a real save landing there.
- **2026-10-13** — Asked, in a review note on the new tick, "By default should be on if they have access to repo no need for this" → chose no second tick: everyone who can install the project can save. This replaces the earlier choice of one new tick.
- **2026-10-13** — Asked, in a review note on the GitHub key, "Only if they use github. But by default it should be cloudflare artifacts which shouldnt need this" → chose Cloudflare first with nothing to do, and the key as the GitHub-only step.
- **2026-10-13** — Assumed: people who already hold the install tick can save after the update with no new yes from the owner, because the note says saving comes with access to the project.
- **2026-10-13** — Assumed: the tick keeps its name and gains a line under it, because renaming it would change a label people already know.
- **2026-10-13** — Assumed: a new GitHub install is asked for one key that does both, because the note wants no extra step, and two keys would be two.
- **2026-10-13** — Read GitHub's page of what each fine-grained key permission allows (https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens) → the five permissions in the design stand as written: Contents (write) for the push, Pull requests (read to find a change, write to open and update it), Actions (read) for a commit's runs, their jobs and a job's log, Commit statuses (read), Deployments (read) for a deployment and its statuses. Reading the repository's default branch needs only Metadata (read), which every such key carries. Workflows is its own permission, for writing workflow files, and the key is made without it. The page lists no Checks permission, so reading checks from Actions, as designed, is the only way. No fallback was needed.
- **2026-10-13** — Read Cloudflare's Workflows page for Workers (https://developers.cloudflare.com/workflows/build/workers-api/) → the design stands: a Workflow binding with `script_name` reaches a Workflow defined in another Worker, and offers the same calls as any binding: `get(id)`, then `status()` (which carries the run's state, error and output) and `restart()`. The page names no limit on a binding to another Worker. The service-binding fallback is not built. This is the documentation's word only: the first real proof is the trial on a paid account (task 7.6).
- **2026-10-14** — Built in one pass: every source task ticked, the connection tool re-pinned, and the local checks green. A refused save answers in Git's own words so the plain line reaches the person. Still to do: the new GitHub key for WongStack's own apps, the checks on the preview, and the try on a real Cloudflare account. The saved check for a refused publish names the old message and waits for the walk to record it again.
- **2026-10-14** — Assumed: the refusal for a person without the tick is shown by the app's own tests, not on the preview, because a preview lets the checker act only as the owner.
- **2026-10-14** — Asked how to prove the Cloudflare half → chose try it on Matthew's paid account: a throwaway project kept in Cloudflare, one save through the app as a teammate, then everything it made removed.
- **2026-10-14** — Asked whether to give the new GitHub key before publishing → chose publish without it. No real save through the app to GitHub was tried; the app's own tests stand behind that half, and WongStack's own apps hold no `WONG_CODE_WRITE` yet.
- **2026-10-14** — Tried on Matthew's paid Cloudflare account with a throwaway install, `wsave-trial-1014`: a save through its preview app landed the branch where the project is kept, the app read that commit's check run back as passed with its preview, a failing test came back failed with its output, and a push at `main`, a delete, a tag and two branches at once were each refused with the plain line. The checker stood in for the owner, so a real teammate's sign-in, the live app and a person holding only the tick were not walked. Everything the install made was then removed and read back as gone.
- **2026-10-14** — Archived for publishing as 41.2.0: every task settled, the Cloudflare half seen passing on a real account, the GitHub half carried by tests alone by Matthew's choice.
- **Check:** `.agents/verification/journeys/employee-onboarding/a-person-tries-to-publish-through-the-app.json` no longer checks the refusal's wording on a preview. The old line, *This copy is for reading*, is gone by design, and WongStack's preview holds no save key, so it refuses a push earlier with *Saving through the app is not set up yet*. The check still shows a download works and that the app reports its save step; `code.test.ts` and the router's tests hold the refusal of `main`, a delete and a tag.
- **Check:** `.agents/verification/journeys/key-access/the-project-can-be-handed-out.json` is re-recorded for the reworded scenario: it now also expects *They can save changes too.* under the tick, and keeps every earlier expectation.
- **Check:** `scripts/retired-names.json` drops its entry for `app/worker/employee-access/github.ts`, because this change brings a file of that name back, to open a change on GitHub and read its checks. The three sibling entries stay.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `key-access`: Project code keeps its one level, which now also lets a person save changes through the app; on GitHub the step it names asks for a key that can save.
- `employee-onboarding`: the copy a person installs is no longer read-only: they can send a change up through the app, and nobody publishes through it.
- `delivery-gate`: `/save` runs in a copy installed through the app with no `gh`, opens no change on the default branch, and never offers to publish from there.

## Impact

- **App server:** `app/worker/employee-access/code.ts` forwards Git's two write calls for one non-default branch; a new handler beside it opens or updates the change and reads its checks, failing output and preview; `router.ts` judges a save like a download; `keys.ts` gives Project code a second secret, `WONG_CODE_WRITE`; `members.ts` reports the save step.
- **Access screen:** `app/src/apps/access/SetFields.tsx`, `ProjectStep.tsx`, `status.ts`.
- **Save scripts:** `delivery-route.mjs` gains a third route, `app`; a new `app-change.mjs` beside `artifacts-run.mjs`; `checkpoint.mjs`, `wait-for-checks.sh`, `preview-url.sh`, `saved-revision.mjs`, `ship.mjs` and `other-work.mjs` ask the route.
- **Connection tool:** `scripts/employee-bootstrap.mjs` gains one call that runs Git against the app with the person's session; `bootstrap-release.json` is re-pinned. The change `one-connect-message` rewrites the same file, so this one catches up with it at publish.
- **Setup:** `provision.mjs` binds the app to the check runner on an Artifacts install; `app/.dev.vars.example` declares `WONG_CODE_WRITE`.
- **Docs:** `wiki/stack/employee-project.md`, `artifacts-route.md`, `access-screens.md`, `employee-access.md`, `wiki/development/the-change-loop.md`, the save preconditions, and a `CHANGELOG.md` minor entry.
- **Outside this repo:** one new GitHub token for WongStack's own staging and live apps, given by Matthew through a key link. No database change.

<!-- end proposal.md -->
<!-- file design.md utf8 15887 -->
# Design

## Context

See `proposal.md` for why. What exists today:

- `app/worker/employee-access/code.ts` forwards Git's two read calls at `/api/access/code/git/` with the server's own credential, and answers every other call 403 before any upstream request. `router.ts` judges the caller first: a signed-in person who holds the `code` key, the checker on a preview, never a service token on the live app.
- The credential is `WONG_CODE_READ` on GitHub (fine-grained, Contents: Read-only), or a five-minute token from the `ARTIFACTS` binding on a project kept in Cloudflare. `app/worker-configuration.d.ts` types that binding's `createToken(scope?: 'write' | 'read', ttl?)`, so it can issue a write token too.
- An installed copy's `origin` is `https://<app>/api/access/code/git/`. Git reaches it only through `git()` in `scripts/employee-bootstrap.mjs`, which sets the person's session as a request header in the child's environment. A plain `git push` in the copy carries no session.
- `/save` is `checkpoint.mjs`. It asks `delivery-route.mjs` once: `github` (uses `gh` for the default branch, the pull request, its body, failing logs) or `artifacts` (no `gh`; `artifacts-run.mjs` reads the check run with the owner's `CLOUDFLARE_API_TOKEN`). In a teammate's copy neither works: on GitHub there is no `gh`; on Artifacts the committed install record says `artifacts` while `origin` is on the app, so the route is refused, and the teammate has no Cloudflare token.
- `wait-for-checks.sh`, `preview-url.sh` and `saved-revision.mjs` each branch on the same route. The preview comes from the GitHub deployment `deploy.yml` records for the commit, or from the check run's output on Artifacts.

## Goals / Non-Goals

**Goals:**

- One path for both places a project is kept: the device talks only to the app, with the app session.
- The server alone holds the write credential and alone decides what a push may touch.
- `/save` prints the same lines on the new route, so `/apply`, `/verify` and the skill text read it unchanged.
- Holding Project code is the whole permission: no second level, tick or step where the project is kept in Cloudflare.
- A GitHub install that holds only its read-only key keeps handing the project out.

**Non-Goals:**

- Merging, or reading or writing `main`, through the app.
- A general GitHub proxy: the app offers the four things a save needs and nothing else.
- Recording who started a branch, or an in-app list of waiting changes.
- Review threads (`/continue`'s unresolved-comment count) on the new route.

## Decisions

### 1. Forward Git's push, with the ref list checked on the server

The app forwards `GET info/refs?service=git-receive-pack` and `POST git-receive-pack` at the same address, with the write credential. Before the POST is sent upstream, the Worker reads the head of the body: the pkt-lines up to the first flush packet are the ref updates (`<old> <new> <ref>`), and the pack follows. It forwards only when:

- there is exactly one update;
- its ref is `refs/heads/<name>`, `<name>` matching a conservative pattern and not the default branch;
- `<new>` is not all zeros (no delete);
- the section holds nothing else (`shallow`, a push certificate), is under 64 KB, and the request carries no `Content-Encoding`.

Then it sends the bytes it read followed by the rest of the stream, unbuffered. The default branch is `main` on a project kept in Cloudflare; on GitHub it is the repository's `default_branch`, read once per isolate with the same credential, and `main` and `master` are refused whatever it says.

*Over handing the device a short-lived token:* a token is the whole repository's, `main` included, on both GitHub and Artifacts, and it would break today's rule that the credential never leaves the server. *Over an upload endpoint that builds commits itself:* a Worker can not run Git, and the device already speaks it.

Force updates of a non-default branch are let through: the server can not tell one from a fast-forward without the objects, and `/save` never forces.

### 2. One level, and a second secret `WONG_CODE_WRITE` on GitHub

Project code keeps its one level, Read, and that level now covers saving: the review note asked for no second tick. `keys.ts`: `code` gets `secrets: ["WONG_CODE_READ", "WONG_CODE_WRITE"]`. Reads use `WONG_CODE_READ`, else `WONG_CODE_WRITE`; writes need `WONG_CODE_WRITE`. So:

- the app knows whether it can save by which name is set, with no call to GitHub;
- a new GitHub install is asked for one key, the wide one, which covers both;
- an existing install keeps `WONG_CODE_READ` working for downloads, is told saving needs one more step, and may delete the old key once the wide one is in;
- a project kept in Cloudflare uses its binding for both and holds neither secret.

The key's *saved* state in Access must not need both names: `codeStep` stays the install answer (`ready` with either secret), and a new `saveStep` (`ready` | `key` | `setup`) is the save answer. Where the registry computes *saved* from `secrets`, `code` is the one key with an either-or, handled in `code.ts`, not in the generic rule.

The wide key is a fine-grained token for the one repository with:

| Permission | Level | For |
|---|---|---|
| Contents | Read and write | the push, and the read it replaces |
| Pull requests | Read and write | open, find and update the change |
| Actions | Read-only | the checks of a commit, and a failed job's log |
| Commit statuses | Read-only | a check or preview reported as a status |
| Deployments | Read-only | the preview `deploy.yml` records |

It gets **no Workflows permission**, so GitHub itself refuses a push that edits `.github/workflows/`. The app turns that refusal into a plain line. Checks are read from the Actions API (runs for the head commit, then their jobs), not the Checks API: a fine-grained token's Checks permission is not reliably offered, and WongStack's gate is its own Actions workflows. Task 1.1 confirms the list against GitHub's token page before anything is built on it.

### 3. Three more calls under `/api/access/code/`, judged like the push

All need Project code, as a download does, are refused to a service token on the live app, and return no upstream text beyond what is named here.

- `POST /api/access/code/change` with `{ branch, title, body }`. GitHub: finds the pull request for that head (`state=all`); opens one against the default branch, or patches the open one's body; a closed one is reported `CLOSED`, a merged one `MERGED`, and neither is touched. The app appends *Saved through the app by `<email>`* to the body. Artifacts: nothing to open; answers `{ change: null }`. Returns `{ state, url, number }`.
- `GET /api/access/code/change?branch=<name>&sha=<sha>`. One read, no waiting. GitHub: `{ head, state, url, rows: [{ name, bucket, link, job }], workflows, preview }`, where `rows` are the head commit's Actions jobs and commit statuses in the `pass | fail | pending | skipping | cancel` buckets `wait-for-checks.sh` already uses, and `preview` is the commit's deployment `environment_url`, else a status `target_url` that passes the same host filter as `preview-url.sh`. Artifacts: `{ run }`, the check run's state and output for the run named by `runId(sha, ref)`, the shape `verdict()` in `artifacts-run.mjs` takes.
- `GET /api/access/code/change/log?job=<id>` (GitHub only): the last 60 lines of that failed job's log, for a job that belongs to this repository.
- `POST /api/access/code/change/restart` with `{ branch, sha }` (Artifacts only): restarts that run when, and only when, it was cut off, as `artifacts-run.mjs restart` does for the owner.

The device, not the server, keeps the waiting rules (two equal polls, the grace period, a skipped-only list, the `guard` check): they are tested where they live today and the server stays one stateless read.

### 4. The Worker reads an Artifacts check run through a Workflow binding

The runner's Workflow is `<runner>`, class `Checks`, in the `<runner>` Worker. The Access step in `provision.mjs` (`codeInConfig`) adds, beside the `ARTIFACTS` binding, `"workflows": [{ "binding": "CODE_CHECKS", "name": "<runner>", "script_name": "<runner>", "class_name": "Checks" }]` to production and staging, reading `<runner>` from the install record's `components.delivery.workflow`. `scripts/check-runner/run-id.mjs` is Web Crypto only and is imported by the Worker as it is. `keys.ts` lists `CODE_CHECKS` in the key's `bindings`, so no route that does not list the key is handed it.

`saveStep` on Artifacts is `ready` when both bindings are present, else `setup`. A new install gets both from setup; an install made before this release gets the second from the update's to-do, with nothing for the owner to make or paste.

*Alternative:* a service binding to an endpoint on the runner. Kept as the fallback if a cross-script Workflow binding can not read another script's instance output; task 1.2 settles it on a real account before the Artifacts half is built.

### 5. A third delivery route, `app`

`delivery-route.mjs` answers `app` when `origin` is `https://<host>/api/access/code/git/`, whatever the install record says: the record is the owner's, committed, and names where the *project* is kept, not how this copy reaches it. Every other disagreement still throws.

On `app`:

- `checkpoint.mjs` pushes with the connection's Git (decision 6), calls `POST …/change` where it calls `gh pr create` or patches the body today, and prints `PR_URL` only when the app returned one. `defaultBranch` is `main` or what `origin/HEAD` names; no `gh`.
- A new `app-change.mjs`, beside `artifacts-run.mjs`, owns `wait [minutes]`, `preview` and `result <sha> <ref>`. `wait-for-checks.sh`, `preview-url.sh` and `saved-revision.mjs` hand over to it as they do to `artifacts-run.mjs`. For a GitHub-kept project it applies the waiter's rules to `rows`; for a Cloudflare-kept one it calls `verdict()` on `run`, and restarts a cut-off run once through the app.
- A `FAILURE` prints each failing row with the tail from `…/change/log`, under the same `FAILED_CHECK=` and `CAUSE:` lines; there is no `RERUN=` line, and a failure outside the diff is reported, as on Artifacts.
- `RECEIPT=none`, as on Artifacts, so `/verify` reads the gate again.
- `ship.mjs prepare` and `finish` stop with one `NEXT:` line: the change is saved and the owner or an Admin publishes it. `other-work.mjs` lists `savedBranches` from the remote, as on Artifacts, and no pull requests.
- A 403 from the app is printed as its own message (decision 8), never as a Git failure.

### 6. One new call on the connection, and a re-pin

`companyClient` in `scripts/employee-bootstrap.mjs` gains `git(args, cwd)`: it runs Git in the copy against `<origin>/api/access/code/git/` with the session header, exactly as `code()` does for a download. The save scripts use it for `push`, `fetch` and `ls-remote`. It refuses a copy whose `origin` is not the connected company's address.

Bootstrap bytes change, so `bootstrap-release.json` is re-pinned by the documented two-commit step. `one-connect-message` rewrites the same file: whichever publishes second brings `main` in, re-applies its own lines, and pins again.

### 7. Access keeps one tick and says what it gives

`SetFields.tsx`: under *Can install the project*, one line: *They can save changes too.* `ProjectStep` renders at most one step: the install step while the project can not be handed out, else the save step while `projectSave` is not `ready`. On GitHub with no key, the install step now asks for the wide key (`PROJECT_REQUEST` names `WONG_CODE_WRITE`). With only the read-only key, the save step reads *Saving needs one more step* with its own request to copy; it blocks nothing. `members.ts` adds `projectSave` to the status beside `project`.

### 8. Words

- A push while the app can not save yet: *Saving through the app is not set up yet. Ask the owner to finish it in Access.*
- A push at the default branch, a delete, a tag, or more than one branch: *The app saves a change and never publishes. Push one branch that is not main.*
- GitHub refusing a workflow file: *This change edits the files that define the checks, which can not be saved through the app. Ask the owner to save it.*

## UX

### Use-case brief

The owner or an Admin, on a person's or a role's panel in Access, deciding whether a teammate gets the project. The tick is the one that is there today; it now also lets them save, and says so. Common case: a project kept in Cloudflare, where nothing shows under the tick. Edge case: a GitHub install, where one step shows until its key is in. Done on a desktop, a few times in an install's life.

### Flow

Open a person or role → tick *Can install the project* → *Save access*. On GitHub with a step left: copy the request, hand it to the assistant, paste the key into its link; saving starts working by itself.

### Hierarchy

The panel's primary action stays *Save access*. The step's one button is *Copy the request*, shown only while a step is left; an Admin sees a line naming the owner and no button.

### Review

`review.html` in this folder. The What Changes items *Everyone who can install the project can save* and *Only on GitHub, the owner makes one key* sketch the two states.

### Components

`Tick`, `Group`, `FinishStep` and `ProjectStep` as they are; nothing new.

## Risks / Trade-offs

- **A saved change runs in the checks, and its preview is deployed with the deploy token.** → The same trust as a GitHub collaborator today. The install tick is off for a new person, the proposal says in plain words what it now gives, and the key can not edit workflow files. On Artifacts the checks stage already runs with no credential.
- **`main` on Artifacts is guarded only by the app's ref check.** → One small parser, tested against real `git push` bodies for a branch, `main`, a delete, a tag, two refs and an oversized head; refusal is the default for anything it does not recognise.
- **Every change on GitHub is authored by the owner's token.** → The body names the signed-in person; commits keep the teammate's own name and email.
- **A push streams through the Worker.** → The pack is never buffered; a save's pack is small. A body over the platform's request limit fails as `code_unavailable` and the report says so.
- **GitHub's token page may not offer a permission the design names.** → Task 1.1 runs first; decision 2 names the Actions-only fallback.
- **A cross-script Workflow binding may not read the run.** → Task 1.2 runs first; decision 4 names the fallback.
- **Two changes edit the bootstrap.** → Decision 6.
- **Skill text has a size ceiling.** → The route's differences go in `wiki/stack/employee-project.md`, as Artifacts' sit in its own page; `preconditions.md` gains a few words, offset by a cut in the same file, and `measure-context.mjs --check` runs in the last phase.

## Migration Plan

1. The release reaches an install through `/wong-sync`. Everyone who holds Project code can save as soon as the app can.
2. GitHub: writes stay refused until the wide key is in; Access shows the step under the tick. The owner hands over the request, pastes the wide token into the key link, and `npm run secrets:push` loads it into both Workers. `WONG_CODE_READ` may then be deleted on GitHub and removed from the secrets file.
3. Cloudflare: the update's to-do reruns the Access step, which adds the check-runner binding; saving works after the next publish, with no key.
4. Rollback: untick a person, or, to stop saving for everyone, delete the wide token on GitHub or remove the check-runner binding. Reads fall back to `WONG_CODE_READ` where it is still set; an install that deleted it goes back to apps only until a key is pasted.

WongStack's own staging and live apps need the wide token before the deployed check: Matthew makes it through a key link (task 7.1).

<!-- end design.md -->
<!-- file tasks.md utf8 8636 -->
# Tasks

## 1. Settle two facts before building on them

- [x] 1.1 Read GitHub's fine-grained token permission reference and confirm the five permissions in design decision 2 exist and cover: push, open and patch a pull request, list a commit's Actions runs and jobs, download a job log, list deployments and commit statuses. Done when the Decision log holds the confirmed list with its source URL, or the amended list and what it changes.
- [x] 1.2 Read Cloudflare's Workflows binding reference and confirm a binding with `script_name` can read another Worker's instance status and output, and restart it. Done when the Decision log holds the answer with its source URL, or names the service-binding fallback from design decision 4 as the one to build.

## 2. App server

- [x] 2.1 `app/worker/keys.ts`: keep `code` at its one level and give it the secrets `WONG_CODE_READ` and `WONG_CODE_WRITE`, and the `CODE_CHECKS` binding. `code.ts`: read with either secret, add `saveSource` and `saveStep` (`ready` | `key` | `setup`), keep `codeStep` unchanged for an install that holds only the read key. Tests in `code.test.ts` and `keys.test.ts` for each combination of the two secrets and the two bindings.
- [x] 2.2 `code.ts`: forward `info/refs?service=git-receive-pack` and `git-receive-pack` with the write credential (the GitHub secret, or `createToken("write", …)`), after the ref check of design decision 1. Tests feed the parser the head of a real push body for: one branch, the default branch, `master`, a delete, a tag, two refs, a `shallow` line, a head over 64 KB, a `Content-Encoding` header; and assert nothing is fetched upstream on a refusal and the pack bytes arrive whole on a pass.
- [x] 2.3 New `app/worker/employee-access/change.ts`: `POST /api/access/code/change`, `GET /api/access/code/change`, `GET …/change/log` and `POST …/change/restart` as design decision 3 describes, GitHub and Artifacts. Tests with a stand-in `fetch` and a stand-in binding cover: open, update, closed, merged; rows and buckets from runs, jobs and statuses; the preview from a deployment and from a status; a log tail; a job from another repository refused; a cut-off run restarted and a failed one refused; no upstream text or credential in any answer.
- [x] 2.4 `router.ts`: judge a write call and the four change calls as a read call is judged today, against Project code; a service token refused on the live app, the checker standing in on a preview. The refusals use the lines in design decision 8. Tests in the router's suite for a person without Project code, a person with it, an Admin, the owner, a machine, and an install that can read but not yet save.
- [x] 2.5 `members.ts` and `app/src/lib/access`: add `projectSave` to the Access status. Test in `management.test.ts`.

## 3. Access screen

- [x] 3.1 `SetFields.tsx`: the line under the tick. `ProjectStep.tsx`: one step at a time, install before save; the install step on GitHub asks for `WONG_CODE_WRITE`, and the save step is the non-blocking *Saving needs one more step* with its own request in `status.ts` and the Admin's line naming the owner. Tests in `ProjectStep.test.tsx` and `PersonPage.test.tsx` for: no step, no key at all, the read-only key only, each as owner and as Admin, and a role's panel.
- [x] 3.2 `schema/seed.sql`: confirm the seed holds one made-up person with Project code and one without, adding whichever is missing, so the preview check has both. Done when `seed.test.ts` asserts both rows.

## 4. Connection tool and save scripts

- [x] 4.1 `scripts/employee-bootstrap.mjs`: `companyClient().git(args, cwd)` per design decision 6, refusing a copy whose `origin` is not the connected company's. Tests in `employee-bootstrap.test.mjs`: the session is in the child's environment only, never an argument or config file; a foreign origin is refused.
- [x] 4.2 `delivery-route.mjs`: answer `app` for an origin at `/api/access/code/git/`, whatever the install record says; every other disagreement still throws. Tests beside the existing route tests, including an Artifacts install record with an app origin.
- [x] 4.3 New `.agents/skills/save/scripts/app-change.mjs` with `wait`, `preview` and `result`, per design decision 5: the waiter's rules over `rows` for a GitHub-kept project, `verdict()` over `run` for a Cloudflare-kept one, one restart of a cut-off run. Tests port the `wait-for-checks.sh` cases (settled on two polls, skipped-only, `guard`, grace, head not yet registered, TIMEOUT, UNKNOWN on an unreadable answer) and the Artifacts verdicts, against a stand-in client.
- [x] 4.4 `checkpoint.mjs`, `wait-for-checks.sh`, `preview-url.sh`, `saved-revision.mjs`: take the `app` route as design decision 5 describes, with no `gh` call. Tests assert no `gh` is spawned on `app`, the printed lines for SUCCESS, FAILURE with its log tail, a 403 from the app, a closed change and a merged one, and `RECEIPT=none`.
- [x] 4.5 `ship.mjs` and `other-work.mjs`: on `app`, `prepare` and `finish` stop with the one `NEXT:` line and publish nothing; other work lists saved branches and no pull requests. Tests beside each.

## 5. Setup and secrets

- [x] 5.1 `provision.mjs`: `codeInConfig` adds the `CODE_CHECKS` Workflow binding on an Artifacts install, in place and comments kept, as it adds `ARTIFACTS`; the report's `codeKey` gains the save half (`ready`, or `missing` with the wide key's steps). Tests in `provision.test.mjs`, and `scripts/check-target-app.mjs` builds a config that holds the binding.
- [x] 5.2 `app/.dev.vars.example`: declare `WONG_CODE_WRITE` with a comment naming its five permissions and its owning page; reword `WONG_CODE_READ`'s comment to say the wide key replaces it. Done when the secrets-convention tests that read the example pass in phase 7.
- [x] 5.3 Re-pin `app/worker/employee-access/bootstrap-release.json` to the new bootstrap bytes by the two-commit step in `wiki/stack/employee-project.md`. Done when the distribution tests name the new digest.

## 6. Docs and release

- [x] 6.1 `wiki/stack/employee-project.md`: *Who gets what* says the tick also saves; a section on saving through the app (what the app takes and refuses, what the teammate's assistant reports, how the verbs differ on this route); the wide key's steps beside the read-only key's, and what an existing install does; keep the heading text of every linked anchor. Done when `check-payload-links.mjs` passes in phase 7.
- [x] 6.2 `wiki/stack/artifacts-route.md` (Limits: a teammate can save, the owner publishes), `access-screens.md` (what the tick now gives, and its steps), `employee-access.md` (Project code also saves), `wiki/development/the-change-loop.md` (a connected teammate's reply ends with who publishes), `.agents/skills/save/references/preconditions.md` (the `app` route needs the app sign-in, no `gh`), with an offsetting cut in that file.
- [x] 6.3 `CHANGELOG.md`: a `## Next (minor)` entry. Its **Updating.** note in plain words: everyone who can install the project can now save changes for you to publish, so untick anyone who should not. Where the project is kept in Cloudflare, finish Access setup once more and it works. On GitHub, Access asks for one new key first.

## 7. Verification

- [x] 7.1 Declare `WONG_CODE_WRITE` in `app/.dev.vars.example`. Matthew chose to publish without giving the key (Decision log, 2026-10-14), so WongStack's own apps hold none and Access there shows *Saving needs one more step*.
- [x] 7.2 Run `node .github/scripts/checks.mjs --worktree`, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs` and `node scripts/measure-context.mjs --check`; fix what fails. Done when all pass locally.
- [x] 7.3 `/save` after implementation. Done on `SAVE_GATE_RESULT=SUCCESS`.
- [x] 7.4 A real save through the app to GitHub was not tried, by Matthew's choice (Decision log, 2026-10-14): it needs the key from 7.1. The app's own tests carry the GitHub half; recorded as an open thread and said in the publish report.
- [x] 7.5 A person without Project code is refused both a save and a download with the *ask your admin* line. A preview shows only the owner's view, so the app's own tests carry this one: done when they pass in the saved checks.
- [x] 7.6 On a real Cloudflare account with the paid plan: an Artifacts install, one save through the app with its check result and preview, a failing test read back as failed, and a push at `main`, a delete and a tag each refused. Seen passing on 2026-10-14 against the install's preview app, the checker standing in for the owner; a real teammate's sign-in was not walked (Decision log).

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 1471 -->
# Spec Delta

## ADDED Requirements

### Requirement: Save works in a copy installed through the app

In a copy installed through Connect your assistant, `/save` SHALL commit, send the change up through the app, and wait on the same gate, with no `gh` call, no GitHub sign-in and no repository credential on the device. It SHALL report the same gate result, failing output and preview it reports elsewhere, for the pushed commit only, and a result the app can not give SHALL be unverified, never passed and never "no checks". It SHALL NOT merge, force-push, or bypass hooks. `/save`, `/continue` and `/ship` SHALL check there that the person is signed in to the app, in place of the GitHub checks.

No verb SHALL publish from such a copy: `/ship` SHALL stop after the save and say that the employer or a manager publishes it, and a reply SHALL NOT offer to publish. A copy whose origin and install record disagree in any other way SHALL still stop the verb, never fall back to a guessed route.

#### Scenario: A teammate saves from an installed copy

- **WHEN** `/save` runs in a copy installed through Connect by a person who holds Project code
- **THEN** the change goes up through the app, the report ends with one gate result and the preview, and no `gh` command ran

#### Scenario: A teammate asks to publish

- **WHEN** `/ship` runs in a copy installed through Connect
- **THEN** it saves, publishes nothing, and says the employer or a manager publishes the change

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/employee-onboarding/spec.md utf8 3725 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Connect installs the project for a person who holds Project code

Once the installation can hand its project out, a signed-in person who currently holds Project code SHALL be able to install the whole project on their device from the app's setup prompt, with their own app login as the only credential: no repository account, no pasted key. Running the same step again SHALL bring the copy up to date. The copy SHALL NOT publish: the app SHALL refuse every attempt to change the published project through it and say that it saves changes and never publishes. The employer SHALL hold Project code always; nobody else SHALL hold it until the employer or a manager gives it. Each download SHALL be judged against the person's current access, so unticking or removing a person refuses their next download without sign-out. The repository credential the app uses SHALL never reach a device, a prompt, a response body or a log. Until the installation can hand its project out, every signed-in person SHALL keep the apps-only connection they had.

#### Scenario: A ticked person connects from an empty folder

- **WHEN** a person who holds Project code pastes the setup prompt into their assistant and approves their app sign-in
- **THEN** the project is on their device with its history, their allowed company actions work from inside it, and no repository login was asked for

#### Scenario: Project code is taken away

- **WHEN** the employer unticks Project code for a person who installed the project
- **THEN** that person's next update is refused with ask-your-admin guidance, and the copy on their device is unchanged

#### Scenario: A person tries to publish through the app

- **WHEN** a connected person pushes to the published branch at the address their copy came from
- **THEN** it is refused before anything is asked of where the project is kept, nothing in the project changes, and the message says the app saves changes and never publishes

## ADDED Requirements

### Requirement: A person who holds Project code sends their work up through the app

A signed-in person who currently holds Project code SHALL be able to send a change from their installed copy up through the app, with their own app login as the only credential, on a project kept on GitHub and on one kept in the employer's Cloudflare account. The app SHALL then give back that change's checks, the output of a check that failed, and its preview, for the exact commit sent. Each such request SHALL be judged against the person's access at that moment, and a machine SHALL be refused on the live app.

The app SHALL accept one change at a time and nothing else: it SHALL refuse, before anything is asked of where the project is kept, a request that would move the published project, delete anything, or touch anything that is not a change. Where the project is kept on GitHub, the change SHALL be opened or updated there for the employer to review, and SHALL say who saved it. The credential the app uses to save SHALL never reach a device, a prompt, a response body or a log.

#### Scenario: A teammate saves with no GitHub account

- **WHEN** a person who holds Project code saves work from a copy installed through Connect, on a device with no GitHub account and no GitHub tool
- **THEN** the change is where the project is kept, its checks ran for that commit, and the person's assistant has their result and the preview

#### Scenario: Project code is taken away before a save

- **WHEN** the employer unticks Project code for a person, who then saves from the copy on their device
- **THEN** the save is refused with ask-your-admin guidance and nothing reaches where the project is kept

<!-- end specs/employee-onboarding/spec.md -->
<!-- file specs/key-access/spec.md utf8 3295 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Project code is a key with one level

Project code SHALL be a key offering Read as its only level, settable per person and per role like any key and usable with no app ticked. That one level SHALL let a person install the project and save changes through the app. A person's page and a role's page SHALL offer it as one tick that says the person can install the project, with a line saying they can save changes too, off for a new person. It SHALL count as saved when the installation holds a credential that reads its one project, or is connected to its own repository in the employer's Cloudflare account. Ticking an app SHALL never give it. Its credentials SHALL be usable for that one project only, and no action or mini app SHALL be handed them.

While the installation can not hand its project out, every place Project code is given SHALL name the one step left and what it is for: a key where the project is kept on GitHub with none saved, or finishing Access setup where no project is recorded. On GitHub that step SHALL ask for one key that both hands the project out and saves changes. The employer SHALL get the request to hand their assistant; a manager SHALL read that the step is the employer's. Giving Project code SHALL still save, and SHALL take effect once the project can be handed out.

While the installation can hand its project out and can not yet save changes, the same places SHALL say saving needs one more step and name it, and SHALL keep handing the project out meanwhile. An installation connected to its own repository and check runner in the employer's Cloudflare account SHALL need no key and no step from the employer to save.

#### Scenario: The employer gives Project code to a role

- **WHEN** the employer sets Project code to Read on a role two people hold
- **THEN** both people may install the project on their next request, and a person outside the role may not

#### Scenario: The credential is not saved yet

- **WHEN** the employer opens a person on an installation that can not yet hand its project out
- **THEN** Project code shows as not saved with the one step left, and nobody's connection changes

#### Scenario: The employer lets a new person install the project with no key saved

- **WHEN** the employer adds a person on a GitHub installation with no key and ticks that they can install the project
- **THEN** the page says a GitHub key comes first and gives the request to copy, the tick saves, and the person can install the project and save changes once the key is saved with no further change in Access

#### Scenario: The project can be handed out

- **WHEN** the employer opens a person on an installation that can hand its project out and save changes
- **THEN** the tick shows with no step under it, and ticking it and saving lets that person install the project and save changes on their next request

#### Scenario: A GitHub installation holds only its read-only key

- **WHEN** the employer opens a person on a GitHub installation that holds only a read-only key
- **THEN** the tick says saving needs one more step and gives the request to copy, people who hold the tick keep installing the project, and they can save once the new key is in with no further change in Access

<!-- end specs/key-access/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-13

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 60005 fence=~~~ -->
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
<title>Review · 2026-10-14-save-through-the-app</title>
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
<body data-change="2026-10-14-save-through-the-app">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-14-save-through-the-app</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A teammate who connects through <i>Connect your assistant</i> can read the project and use the apps, but their work stays on their own computer. To send it up they need a GitHub account, an invitation from the owner, and GitHub's tool installed. On a project kept in Cloudflare they can not send it up at all. Matthew asked that the app do this for them, so a teammate needs nothing but their app sign-in.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A teammate's assistant saves their work through the app.</b> The work goes up as a change. The app starts its checks, and gives back the result and a link to look at, as a save does today. The teammate needs no GitHub account, no invitation and no GitHub tool: their app sign-in is the only login.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">teammate       the app      project</span>
<span class="ln" data-note="item-1-line-2" tabindex="0"> │── save ──────▶│             │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0"> │               │── change ──▶│</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> │               │◀── checks ──│</span>
<span class="ln" data-note="item-1-line-5" tabindex="0"> │◀── preview ───│             │</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Saving never publishes.</b> The app takes a change and nothing else. It refuses anything aimed at the live project, and it refuses to delete. The owner or an Admin looks at the change and publishes it, the way they publish today. The teammate's assistant ends with <i>saved, and here is who publishes it</i>, never <i>publish it?</i></div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Everyone who can install the project can save.</b> There is no second tick. <i>Can install the project</i> now gives both, and the panel says so under it. Unticking it stops that person's next save at once. People who hold the tick today can save once the update is in.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">  BEFORE                     AFTER</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">┌ Project ─────────────┐   ┌ Project ─────────────┐</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ [x] Can install the  │   │ [x] Can install the  │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│     project          │   │     project          │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">└──────────────────────┘   │ +They can save       │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">                           │ +changes too.        │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">                           └──────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A project kept in Cloudflare, the usual install, needs nothing from the owner.</b> The app already reaches its own project there, so there is no key to make. After the next update and publish, saving works. A teammate can save there for the first time.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Only on GitHub, the owner makes one key.</b> A new GitHub install is asked for one key that both installs and saves, at the same moment it is asked for a key today. An install that already holds the read-only key keeps handing the project out; under the tick, Access says saving needs one more step and gives the owner a request to copy for their assistant. Once the new key is in, the old one is no longer needed. Deleting the old key on GitHub can't be undone; it is optional.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">┌ Project ─────────────────────────┐</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">│ [x] Can install the project      │</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">│ Saving needs one more step: a    │</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">│ GitHub key that can save.        │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">│ [Copy the request]               │</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>What a teammate who can save is trusted with.</b> Their change runs through the checks and gets a preview, like the owner's own. They can add to any change that is not published yet, not only their own. They can not change the files that define the checks on GitHub. On GitHub the change shows under the owner's name, with a line saying who saved it.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The owner's own computer is untouched.</b> It keeps saving and publishing the way it does today. On GitHub, nothing changes for teammates until the owner adds the new key.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> publishing through the app; changing how the owner's own first setup saves; telling the owner inside the app that a change is waiting; letting a teammate read review comments left on GitHub; a teammate on Windows where the project is kept in Cloudflare.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked &quot;we should be able to push to github via through the api through the server so the user doesn't need to install github&quot; → chose plan it as its own part.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked what a teammate may do through the app without GitHub → chose Save only: the work goes up as a change with its checks and preview, and the owner or an Admin publishes. Save and publish, and Leave saving for later, were offered and not chosen.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked whether a project kept in Cloudflare is covered → chose yes.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: this is for teammates who connect through Connect your assistant, not the owner's own first setup, because it was stated to Matthew and not objected to.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the app passes the save on itself and never hands a teammate's computer a key, because the rule today is that the project's key never leaves the server.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the new GitHub key gets its own name beside the read-only one, because the app can then tell with no call whether saving is possible, and an install that never ticks the box is never asked for a wider key.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the key may not change the files that define the checks, because a key that could would let a saved change rewrite its own checks.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: a teammate may add to any unpublished change, because that is what an invited GitHub teammate can do today, and tracking who started each change needs new stored data.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the teammate's assistant gets the failing check's output through the app, because without it the assistant can not fix a failed save.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: a save takes one change at a time, because that is all a save sends, and it keeps the app's check on what it lets through simple.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the check before publishing sends one throwaway change to this project through the preview app and removes it after, because nothing else shows the whole path working.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the Cloudflare half is tried on a real paid account before it is called working, and is reported as unverified if no such trial runs, because no stand-in shows a real save landing there.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked, in a review note on the new tick, &quot;By default should be on if they have access to repo no need for this&quot; → chose no second tick: everyone who can install the project can save. This replaces the earlier choice of one new tick.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked, in a review note on the GitHub key, &quot;Only if they use github. But by default it should be cloudflare artifacts which shouldnt need this&quot; → chose Cloudflare first with nothing to do, and the key as the GitHub-only step.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: people who already hold the install tick can save after the update with no new yes from the owner, because the note says saving comes with access to the project.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the tick keeps its name and gains a line under it, because renaming it would change a label people already know.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: a new GitHub install is asked for one key that does both, because the note wants no extra step, and two keys would be two.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Read GitHub's page of what each fine-grained key permission allows (https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens) → the five permissions in the design stand as written: Contents (write) for the push, Pull requests (read to find a change, write to open and update it), Actions (read) for a commit's runs, their jobs and a job's log, Commit statuses (read), Deployments (read) for a deployment and its statuses. Reading the repository's default branch needs only Metadata (read), which every such key carries. Workflows is its own permission, for writing workflow files, and the key is made without it. The page lists no Checks permission, so reading checks from Actions, as designed, is the only way. No fallback was needed.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Read Cloudflare's Workflows page for Workers (https://developers.cloudflare.com/workflows/build/workers-api/) → the design stands: a Workflow binding with <code>script_name</code> reaches a Workflow defined in another Worker, and offers the same calls as any binding: <code>get(id)</code>, then <code>status()</code> (which carries the run's state, error and output) and <code>restart()</code>. The page names no limit on a binding to another Worker. The service-binding fallback is not built. This is the documentation's word only: the first real proof is the trial on a paid account (task 7.6).</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Built in one pass: every source task ticked, the connection tool re-pinned, and the local checks green. A refused save answers in Git's own words so the plain line reaches the person. Still to do: the new GitHub key for WongStack's own apps, the checks on the preview, and the try on a real Cloudflare account. The saved check for a refused publish names the old message and waits for the walk to record it again.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: the refusal for a person without the tick is shown by the app's own tests, not on the preview, because a preview lets the checker act only as the owner.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked how to prove the Cloudflare half → chose try it on Matthew's paid account: a throwaway project kept in Cloudflare, one save through the app as a teammate, then everything it made removed.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked whether to give the new GitHub key before publishing → chose publish without it. No real save through the app to GitHub was tried; the app's own tests stand behind that half, and WongStack's own apps hold no <code>WONG_CODE_WRITE</code> yet.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Tried on Matthew's paid Cloudflare account with a throwaway install, <code>wsave-trial-1014</code>: a save through its preview app landed the branch where the project is kept, the app read that commit's check run back as passed with its preview, a failing test came back failed with its output, and a push at <code>main</code>, a delete, a tag and two branches at once were each refused with the plain line. The checker stood in for the owner, so a real teammate's sign-in, the live app and a person holding only the tick were not walked. Everything the install made was then removed and read back as gone.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-14</p>Archived for publishing as 41.2.0: every task settled, the Cloudflare half seen passing on a real account, the GitHub half carried by tests alone by Matthew's choice.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span></p><b>Check:</b> <code>.agents/verification/journeys/employee-onboarding/a-person-tries-to-publish-through-the-app.json</code> no longer checks the refusal's wording on a preview. The old line, <i>This copy is for reading</i>, is gone by design, and WongStack's preview holds no save key, so it refuses a push earlier with <i>Saving through the app is not set up yet</i>. The check still shows a download works and that the app reports its save step; <code>code.test.ts</code> and the router's tests hold the refusal of <code>main</code>, a delete and a tag.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span></p><b>Check:</b> <code>.agents/verification/journeys/key-access/the-project-can-be-handed-out.json</code> is re-recorded for the reworded scenario: it now also expects <i>They can save changes too.</i> under the tick, and keeps every earlier expectation.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span></p><b>Check:</b> <code>scripts/retired-names.json</code> drops its entry for <code>app/worker/employee-access/github.ts</code>, because this change brings a file of that name back, to open a change on GitHub and read its checks. The three sibling entries stay.</li>
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
