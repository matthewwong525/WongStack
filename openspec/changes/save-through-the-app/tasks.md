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

- [ ] 7.1 Declare `WONG_CODE_WRITE` and send Matthew the key link with the steps from 6.1; load it into WongStack's staging and live apps with `npm run secrets:push`. Done when both Workers list the secret. (A hand step for Matthew.)
- [x] 7.2 Run `node .github/scripts/checks.mjs --worktree`, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs` and `node scripts/measure-context.mjs --check`; fix what fails. Done when all pass locally.
- [ ] 7.3 `/save` after implementation. Done on `SAVE_GATE_RESULT=SUCCESS`.
- [ ] 7.4 On the preview, as the checker: open a person in Access and see the tick, its new line and no step; then from a clean home folder, install the project through Connect, commit one throwaway file on a branch named `wong-check-<date>`, and run `/save` there. Done when the change is on GitHub naming who saved it, its checks were read for that commit, the preview came back, a push at `main` was refused with the plain line, and no `gh` ran. Then close that change and delete its branch on GitHub with the owner's own login (an outward step: confirm it first), and read both back as gone.
- [ ] 7.5 On the preview, as the seeded person without Project code: a push and a download are both refused with the *ask your admin* line.
- [ ] 7.6 On a real Cloudflare account with the paid plan: an Artifacts install, a teammate ticked to install the project, one save through the app with its check result and preview, a push at `main` refused. No such account to hand → record it as unverified in the Decision log and as an open thread, and say so in the report before publishing.
