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
