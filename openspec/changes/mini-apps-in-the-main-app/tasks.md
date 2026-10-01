# Tasks

## 1. App: the registries and routing

- [ ] 1.1 Add `app/src/apps/index.ts`: globs `./*/app.json` (eager) and `./*/App.tsx` (lazy), validates each folder name and manifest, and exports the list (`name`, `title`, `description`, `href`) and a page lookup; add `index.test.ts` covering the real registry plus a bad name, a missing title, and a missing description, each failing with the folder named. Verify in CI through `/save`.
- [ ] 1.2 In `app/src/router.tsx`, add the `apps/:name/*` route that renders the looked-up app inside `Layout`, or `NotFound` for an unknown name; extend `router.test.tsx` for both. Verify in CI through `/save`.
- [ ] 1.3 Add `app/worker/apps/index.ts`: globs `./*/api.ts`, exports `AppEnv`, the handler type, and `handleApp(request, env, identity)`, which strips `MEMORY_DB` and `MEMORY_BUCKET`, passes `{ url, route, identity }`, and answers JSON 404 for an unknown app, route, or method; add `index.test.ts` proving a handler sees `DB` and a secret but no memory binding, gets the identity, and 404s on `constructor`/`__proto__` routes. Verify in CI through `/save`.
- [ ] 1.4 In `app/worker/index.ts`, replace the `mini-apps/` imports with `handleApp`, pass the verified identity, and keep `/_memory/` first and the `/apps/` redirect; update `index.test.ts` to probe `/`, `/apps/`, `/apps/hello/`, `/apps/hello/api/greeting`, `/apps/hello/api.mjs`, `/api/health`, and `/_memory/` with GET and POST. Update the `disallow_importable_env` comment in `app/wrangler.jsonc` and `stack-pack-fragments.md`. Verify in CI through `/save`.
- [ ] 1.5 Make `app/src/lib/apps.ts` return the compiled list; drop `Suspense`, `use()`, and the loading and failed states from `Home.tsx` and `AppList.tsx`, keeping the empty state and the Example label; update `Home.test.tsx` and any `AppList` test. Verify in CI through `/save`.

## 2. App: Hello and Tips

- [ ] 2.1 Convert Hello to `app/src/apps/hello/` (`app.json`, `App.tsx`, `Hello.css`) and `app/worker/apps/hello/` (`api.ts`, `greeting.ts`), keeping the label above the field, the announced greeting, the retry text, and the phone layout; port `page.test.mjs` and `api.test.mjs` to `App.test.tsx` and `api.test.ts`. Verify in CI through `/save`, then on the preview at 320px and 390px.
- [ ] 2.2 Convert Tips to `app/src/apps/tips/` (`app.json`, `App.tsx`, `Tips.css`, `tip.ts`), keeping immediate recalculation, labels, selected tip state, the announced result, and the empty and invalid guidance; port `tip.test.mjs` and add a page test. Verify in CI through `/save`, then on the preview.
- [ ] 2.3 Delete `mini-apps/` and `scripts/mini-dashboard.mjs`, and the copy block in `scripts/cf-build.sh`; if knip then reports app pages or handlers unused, add them as entries in `app/knip.jsonc`. Verify `npm test` passes in CI through `/save`.

## 3. CI and scripts

- [ ] 3.1 In `.github/scripts/app-untouched.sh`, drop `mini_apps`, `mini_changed`, and the `mini-apps/apps/` skip path, and update its header; in `.github/actions/change-scope/action.yml`, drop those outputs; update `scripts/tests/app-untouched.test.mjs`. Verify in CI through `/save`.
- [ ] 3.2 In `test.yml`, drop the mini-app Node and test steps and their header text; in `deploy.yml`, gate on `untouched != 'true'` alone, drop `mini_changed=false` from `skip-when`, and update its header; in `payload.yml`, drop the `mini-apps/` lint paths. Verify the workflows run green on the branch through `/save`.
- [ ] 3.3 Move the test-file pattern to `.github/scripts/test-file.mjs` (no CLI), import it in `loosened-checks.mjs`, and update `scripts/tests/loosened-checks.test.mjs`; add the new file to `payload-files.json` core. Verify in CI through `/save`.
- [ ] 3.4 Update the remaining script tests that name `mini-apps/` or `mini-dashboard.mjs` (`mini-apps.test.mjs` removed, `payload-rule-paths`, `cli-conventions`, `checkpoint-helpers`, `wrangler-config`, `.c8rc.json`, and any other `grep -rl mini scripts/tests` hit), and the `cf-preview.sh` header. Verify in CI through `/save`.

## 4. Sync and setup

- [x] 4.1 In `payload-files.json`, drop `mini-apps/apps/hello` from `scaffold.dirs`, the five `mini-apps/` files from `scaffold.files`, and `scripts/mini-dashboard.mjs` from `pack.files`; add `app/src/apps/tips` and `app/worker/apps/tips` to `scaffold.exclude`. Verify a `wong-sync-preflight` test that `tips` paths are never selected and `hello` paths are.
- [ ] 4.2 In `preflight.mjs`'s `catchUpNeeds`, add the `mini-apps-folder` reason listing each `mini-apps/apps/<name>`; cover present and absent folders in `scripts/tests/wong-sync-preflight.test.mjs`. Verify in CI through `/save`.
- [x] 4.3 Add step 8, `mini-apps-folder`, to `catch-up.md` by design.md's *Find existing installs in preflight*, and add the code to the payload manifest's `catchUp` list; rewrite the manifest's mini-app paragraph and the scaffold paragraph's `/apps/apps.json` sentence. Verify `node scripts/check-payload-links.mjs` passes.
- [x] 4.4 In `/apply`'s preview step, skip the upload on `untouched=true` alone; in setup's `cloudflare.md`, update the `/apps/` sentence and the *Moving older mini apps* paragraph to point at the catch-up step. Verify `node scripts/measure-context.mjs --check` passes, trimming the same files if it does not.

## 5. Docs and rules

- [x] 5.1 Rewrite `wiki/stack/mini-apps.md` by design.md's decisions: the two folders, the tree, the reach (everything but memory, plus the signed-in person), the checks, build-preview-publish, and the home list. Verify it against the spec delta and `node scripts/check-payload-links.mjs`.
- [x] 5.2 Update `.agents/rules/code.md` (`paths:` and the *A mini app* line), `.agents/rules/payload.md` paths, `the-change-loop.md` (*Mini apps* and the gate's skip paragraph), `memory.md`'s cost paragraph, the `d1-pipeline.md` script table, `getting-started.md`, `wiki/README.md`, `wiki/stack/README.md`, `README.md`, `AGENTS.md`, and the `style.css` and `style.test.ts` comments. Verify `grep -rn "mini-apps/" --exclude-dir=archive --exclude-dir=node_modules .` finds only the catch-up page, the changelog, and this change.
- [x] 5.3 Add `mini-apps/apps/`, `mini-dashboard.mjs`, `is-test-file.mjs`, `mini_changed`, and `apps.json` to `scripts/retired-names.json` with replacements, allowing the catch-up page and changelog. Verify `node scripts/check-retired-names.mjs` passes.

## 6. Release and preview

- [x] 6.1 Add `## Next (major) — Mini apps live in the main app` at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note saying the update moves each mini app into the main app at the same address, keeping its data, and shows each in the preview before publishing. Verify `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs` pass.
- [ ] 6.2 On the `/apply` preview, open `/`, `/apps/hello/`, and `/apps/tips/` at 320px and 390px in light and dark, submit Hello's form, compute $100 / 4 people / 20% in Tips, and probe `/apps/`, `/apps/hello/api/greeting`, `/api/health`, and `/_memory/` with GET and POST. Record the result in the Decision log.
