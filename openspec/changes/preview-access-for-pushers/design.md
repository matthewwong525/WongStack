# Design

## Context

- The live app keeps both Access policies' email lists itself. `updatePolicy` in `app/worker/employee-access/login-management.ts` writes one `desired` list (owner + active `wong_access_members`) to every reviewed application. `revoke_tokens` runs on both applications for the `sessions` kind.
- The live app already holds a GitHub key for the one repository: `codeSource(env)` in `app/worker/employee-access/code.ts` returns `{ github, token }` from `WONG_CODE_READ` or `WONG_CODE_WRITE`. Either is a fine-grained token, which always has Metadata read. That is all `GET /repos/{repo}/collaborators` needs ([GitHub](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)). Each collaborator carries `permissions.push`, but `email` is usually null.
- On staging, `currentPolicy` in `app/worker/employee-access/policy.ts` returns `denied` for a signed-in human who isn't on the practice list once permissions started, and staging's seed starts them. So anyone but the checker and practice people is refused every app on a preview.
- The Worker has no `scheduled` handler and no cron. `triggers` is inherited by `env.staging` unless set ([staging bindings](../../../wiki/stack/staging-bindings.md#cron-triggers-inherit-omitting-them-does-not-disable-them)).
- Cloudflare Access has no rule for "collaborator on a repository". Its GitHub selector matches organizations and teams only. So admission stays by email.

## Goals / Non-Goals

**Goals:**
- GitHub pushers sign in to previews, never the live app, without the owner doing anything when GitHub knows their email.
- Losing push rights removes preview sign-in within 15 minutes.
- A preview opens every app for a signed-in person outside its practice list.

**Non-Goals:**
- A GitHub login method on either Access app.
- A GitHub webhook. It needs another secret and setup step, and 15 minutes is fast enough.
- ClaymooApp's matching change.

## Decisions

### A pushers table, refreshed by a cron and on Access open

A new migration adds `wong_access_pushers(installation_id, github_id, login, email, email_source, checked_at, PRIMARY KEY(installation_id, github_id))`. `email_source` is `owner`, `profile` or `commit`. Rows exist only for current pushers. Keying on GitHub's numeric id, not the login, keeps a renamed account from being dropped and re-added.

`refreshPushers(core)` in a new `app/worker/employee-access/pushers.ts`:

1. Returns at once unless `core.live`, `codeSource` is GitHub, and permissions have started. Before the first open, a list write could drop a teammate, as in `reconcileLogin`.
2. Pages `GET /collaborators?affiliation=all&per_page=100` and keeps `type === "User"` with `permissions.push`. Any failed page throws, and nothing is written.
3. Upserts current pushers and deletes rows for ids no longer present. A row whose `email_source` is `owner` keeps its email across refreshes.
4. For a row with no email, it looks one up at most once an hour (`checked_at`). First `GET https://api.github.com/users/{login}` for `email`. Else `GET /commits?author={login}&per_page=20`, taking the newest `commit.author.email` where `author.login === login` and the address isn't `@users.noreply.github.com`. GitHub links a commit to a login only through an email verified on that account, so both sources are the person's own. `github.ts` gains a `githubUser(token, login)` call beside the repo-scoped one: same headers, timeout, size limit and refusal of redirects.
5. If the set of pusher emails changed, it bumps the `policy` work generation the same way a member save does, then calls `reconcileLogin(core, "policy")`. If an email left, it also queues previews-only session revocation.

`scheduled()` in `app/worker/index.ts` calls it every 15 minutes (`"triggers": { "crons": ["*/15 * * * *"] }` at the top level, and `env.staging.triggers.crons: []`). The People view's load also calls it on the live app, through `ctx.waitUntil`, so an owner who just added someone on GitHub can open Access instead of waiting. Both paths call the same function, as the staging-bindings convention asks.

Alternative considered: refresh only when Access opens. Rejected: a removal would wait until someone opens Access.

### Each application gets its own desired list

`updatePolicy` computes `desired` for the live app as today. The previews app gets `desired ∪ pusher emails`, lowercased and deduplicated. The readback compares each application with its own list. A pusher who is also an active member, or the owner, appears once, and leaving GitHub doesn't remove them, because they're still in `desired`.

Session revocation gets a `scope` on the `sessions` work: `both` for a member removal (today's behavior) and `previews` when only a pusher left. It then calls `revoke_tokens` on the previews app alone, so removing a pusher doesn't sign everyone out of the live app.

### An email the owner types

`PUT /api/access/pushers/{githubId}` with `{ email }` sets `email_source = 'owner'` and triggers the same reconcile. It takes the owner or an Admin, like every Access save. An empty email clears it back to found-or-unknown. The email is validated like a member's. Typing an email that belongs to an active member is allowed; it changes nothing.

### Staging gives an unlisted signed-in person every app

In `currentPolicy`, when `env.WONG_ENVIRONMENT === "staging"` and a signed-in human has no practice-list row, return `current` with `everyApp()`, `everyKey()` when keys started, `manages: false`, `role: "employee"`. A practice person, or one marked removed, keeps today's answer, so the owner can still rehearse refusals. This is safe because the previews wall decides who gets in, previews hold only test keys and made-up data, and anyone the wall lets in through push rights can already change preview code.

### What the screen gets from the server

`GET /api/access/pushers` returns `{ state: "listed" | "no_github" | "not_started" | "unavailable", pushers: [{ githubId, login, email, emailSource, canOpenPreviews }] }`. On a preview the state is `live_only`. The response never includes the GitHub key or GitHub's own error text.

## UX

**Use case.** The owner, or an Admin, gave someone push rights on GitHub and wants to know they can open the preview links. It's done when every pusher row says *Can open previews*. It's mostly checked on a laptop and sometimes on a phone. It's rare: a few times a year per team. The common case needs no action because GitHub knew the email. The edge case is a pusher whose email GitHub hides. Mirrors the People view's rows ([Access screens](../../../wiki/stack/access-screens.md#three-views)).

**Flow.** Open Access → People → the *Can push on GitHub* section under the people table → a row with *Needs an email* has one field and *Save*. Two steps from intent to done.

**Hierarchy.** The people table stays the screen's main thing. The section sits under it. Its one action is *Save* on a row that needs an email.

**Components.** The section heading with a count `tag`, one muted line (*They can open previews, not the live app.*), table rows in the People table's columns (GitHub name, email, `tag-outline` status), one `field` plus `btn-primary` per row needing an email. States: *listed*. *No GitHub key*: one line naming the project's GitHub key step. *Kept in Cloudflare*: the section is hidden. *Live app only* on a preview. *Couldn't reach GitHub*: the last list stays, with a muted note.

### Review

[review.html](review.html). The second What Changes item sketches the section.

## Risks / Trade-offs

- **A pusher's commit email is a work or old address they don't read** → the owner can type a better one. Typed emails win.
- **GitHub rate limits** → one list call per 15 minutes, plus at most two lookups per unknown pusher per hour. That's far under the 5,000 calls an hour a token gets.
- **An Access policy write every time a pusher's email resolves** → it happens only when the set of emails changes, so normally never.
- **Cron runs on the live app only** → the schedule itself can't be walked on a preview. Unit tests cover `refreshPushers` with a stubbed GitHub, and the first live deploy shows the trigger in the Worker's Triggers tab.
- **Older installs on authority version 2 (one shared app)** → there is no previews app to widen. `refreshPushers` keeps the table, and the section says *Finish Access setup* instead of *Can open previews*.

## After publishing

These checks need the live app, so they run after `/ship` and aren't build tasks: the production Worker's Triggers tab shows the 15-minute cron; a throwaway GitHub collaborator with a commit email reaches the previews sign-in list and not the live one, then leaves it within 15 minutes of being removed. Each GitHub and Cloudflare step is outward and confirmed first.
