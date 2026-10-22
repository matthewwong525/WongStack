# Tasks

## 1. Data and GitHub reads

- [x] 1.1 New D1 migration in `schema/migrations/` adding `wong_access_pushers` (design: *A pushers table*), and a `scope` column on the `sessions` row of `wong_access_work` (default `both`).
- [x] 1.2 `app/worker/employee-access/github.ts`: `githubUser(token, login)`, with the same headers, timeout, 4 MB limit and refused redirects as the repo call.
- [x] 1.3 New `app/worker/employee-access/pushers.ts`: `refreshPushers(core)` (live, GitHub source and permissions started only; paged collaborators read, `type === "User"` with `permissions.push`; upsert by GitHub id; delete gone ids; keep `owner` emails; hourly email lookup from profile, then commits, skipping no-reply addresses; on a changed email set, bump the `policy` generation, queue previews-scoped `sessions` when an email left, then `reconcileLogin`). A failed GitHub read throws before any write.
- [x] 1.4 Tests in `pushers.test.ts`, with GitHub stubbed: a new pusher with a commit email is listed with `email_source = 'commit'`; a no-reply commit address and a commit linked to another login are skipped; a profile email wins over commits; an owner-typed email survives a refresh; a pusher gone from GitHub is deleted and previews-only revocation is queued; a 500 on page two writes nothing; a preview, an Artifacts project and a project with no key call GitHub zero times.

## 2. Sign-in lists

- [x] 2.1 `app/worker/employee-access/login-management.ts`: `updatePolicy` writes the live app's list as today and the previews app's as that list plus pusher emails, deduplicated; the readback checks each against its own; `sessions` with scope `previews` revokes the previews app alone.
- [x] 2.2 Tests in `login-management.test.ts`: a pusher's email reaches the previews policy and not the live one; a pusher who is also a member appears once and stays when they leave GitHub; a previews-scoped revocation calls `revoke_tokens` on the previews app only; a version 2 authority writes one list with no pusher emails.

## 3. Schedule and routes

- [x] 3.1 `app/worker/index.ts`: a `scheduled` handler calling `refreshPushers`. `app/wrangler.jsonc`: top-level `triggers.crons: ["*/15 * * * *"]` and `env.staging.triggers.crons: []`, with the matching stack-pack fragment in `.agents/skills/wong-sync/references/stack-pack-fragments.md`.
- [x] 3.2 Access routes (`app/worker/employee-access/router.ts`): `GET /api/access/pushers` (owner or Admin; states per design; on the People load it also starts `refreshPushers` through `waitUntil` on the live app) and `PUT /api/access/pushers/{githubId}` (owner or Admin; validated email, or empty to clear; reconciles).
- [x] 3.3 Route tests: a non-manager is refused both; a typed email is saved as `owner` and reaches the previews policy; an invalid email is refused; a preview answers `live_only` and never calls GitHub; no answer carries the key or GitHub's error text.

## 4. Previews open every app for an unlisted person

- [x] 4.1 `app/worker/employee-access/policy.ts`: on `WONG_ENVIRONMENT === "staging"`, a signed-in human with no practice-list row gets `current` with every app, every key once keys started, `manages: false`. A practice person and a removed one keep today's answer. Production is unchanged.
- [x] 4.2 Tests in `policy.test.ts`: an unlisted person on staging gets every app and manages nothing; the same person on production is denied; a practice person on staging keeps only their apps; a removed practice person is still denied.

## 5. The Access screen

- [x] 5.1 A *Can push on GitHub* section under the People table (`app/src/apps/access/People.tsx` and a new `Pushers.tsx`), per the design's UX: rows in the People columns, *Needs an email* with one field and *Save*, and one line for *No GitHub key*, *Live app only*, *Finish Access setup* and *Couldn't reach GitHub*. Hidden for a project kept in Cloudflare and for someone who manages nothing.
- [x] 5.2 Tests in `Pushers.test.tsx`: rows render with their status; saving an email posts it and the row turns to *Can open previews*; each state shows its one line; a phone width stacks a row.

## 6. Docs and release

- [x] 6.1 `wiki/stack/employee-access.md`: a *People who can push on GitHub* section (who, where the email comes from, how fast, what removal does, previews only), and the practice-list section's new every-app rule. `wiki/stack/cloudflare-access.md#two-private-apps-one-per-worker`: the previews app also admits pushers. `wiki/stack/access-screens.md#three-views`: the People view's new section. `wiki/stack/staging-bindings.md`: name this as a job whose schedule stays off on staging.
- [x] 6.2 `CHANGELOG.md`: a `## Next (minor) — People who can push on GitHub can open previews` entry. Its *Updating* note: publish the update. Nothing else is needed when the app already holds the project's GitHub key; otherwise Access says which step is left.

## 7. Verification

- [ ] 7.1 Run `npm test` in `app/`, `node .github/scripts/checks.mjs --worktree` and `openspec validate preview-access-for-pushers --strict --no-interactive`, then `/save` for CI.
- [ ] 7.2 On the saved branch's preview, with `/verify`: People shows the section reading *Live app only*. A signed-in person outside the practice list opens every app and sees no Access management (walked by the route tests if no second sign-in is at hand; say which).
