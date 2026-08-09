## 1. The app's suite

- [x] 1.1 Add `vitest` to `app/package.json` `devDependencies` and a `"test": "vitest run"` script; add a vitest config under `app/` only if the app's existing Vite config doesn't already serve.
- [x] 1.2 Test `app/worker/index.ts` routing: `/api/*` returns the JSON payload, anything else is `404`.
- [x] 1.3 Test `app/worker/access.ts`'s no-network rejection paths (design.md D3): `SKIP_AUTH` yields the dev identity; unset team domain or audience yields `null`; missing assertion header and cookie yields `null`; a malformed token yields `null`; a non-`RS256` `alg` or absent `kid` yields `null` **before** any key fetch.
- [x] 1.4 Test the service-token identity — a verified assertion with `common_name` and no `email` resolves to a `service` identity — with a narrow stub for key fetching and `crypto.subtle.verify`, asserting the verify call's arguments so the stub can't mask a path that never ran.
- [x] 1.5 Reset the module-level `keyCache` between tests so a stubbed key cannot leak across cases and turn a later failure into a pass.
- [x] 1.6 Run `npm test` from `app/` and confirm it is green.

## 2. Remove the root suite

- [x] 2.1 Delete the repo-root `package.json`, `package-lock.json`, `vitest.config.js`, and `tests/`.
- [x] 2.2 Confirm nothing else references them — `.gitignore`, workflow files, skills, or wiki pages.

## 3. Manifest

- [x] 3.1 Remove `package.json` from `core.files` in `.claude/skills/wong-sync/references/payload-files.json`.
- [x] 3.2 Update the prose manifest: the default suite ships with the **scaffold**, not the repo root, and state why a root manifest is never copied (design.md D2).
- [x] 3.3 Confirm `.github/workflows/test.yml` stays in `core.files` and its content is unchanged.

## 4. Wiki

- [x] 4.1 Update any page that describes the test pipeline as running a root suite — `wiki/development/the-change-loop.md` and the walkthrough runbook's line distinguishing CI tests from the walk.

## 5. Release

- [x] 5.1 Bump `VERSION` and add the `CHANGELOG.md` entry: the root manifest is gone, the suite lives with the app, what coverage was dropped and what replaced it.
- [x] 5.2 Run `node scripts/check-payload-links.mjs`; confirm zero dead links in all four install shapes.
- [x] 5.3 Confirm CI's `Test` job discovers `app/` and runs the app's suite green, and that the `Deploy` job is unaffected.
