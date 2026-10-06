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
