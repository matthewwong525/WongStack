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
