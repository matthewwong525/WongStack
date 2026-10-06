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
