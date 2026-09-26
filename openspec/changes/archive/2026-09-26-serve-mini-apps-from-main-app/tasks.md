## 1. Router and build (scripts, mini-apps)

- [x] 1.1 Add `mini-apps/router.mjs` and `router.d.mts`: `MINI_PREFIX`, `handleMiniApp` (strip `/apps`, route `/<name>/api/*` with `{ DB }` only, else `ASSETS`), carrying over `worker.ts`'s source-path refusal
- [x] 1.2 Add `mini-apps/routes.mjs` (a Vite glob over `apps/*/api.mjs`); change `scripts/mini-dashboard.mjs` to `--into <assets-dir>`: copy pages (no `api.mjs`, `*.test.*`, `*.ts`, dotfiles) and write `index.html` and `apps.json` under `apps/`
- [x] 1.3 Run it from `scripts/cf-build.sh`, locally and in CI, with the assets folder from a new `assets-dir` read in `lib-wrangler-config`
- [x] 1.4 Add `scripts/cf-preview.sh` (install when missing, staging-name check, alias rule, staging migrations, create staging on first use, build, `versions upload`, print URL); delete `scripts/cf-mini.sh`
- [x] 1.5 Delete `mini-apps/worker.ts`, `mini-apps/wrangler.jsonc`, `mini-apps/tsconfig.json`, `mini-apps/.gitignore`, and `mini-apps/apps/.assetsignore`
- [x] 1.6 Drop the `mini-apps/` skip from `scripts/lib-wrangler-config.mjs` and `.sh`
- [x] 1.7 Tests: rewrite `scripts/tests/mini-apps.test.mjs` for the router (routing, `{ DB }` only, source refused, asset fallback), both dashboard modes, and `cf-preview.sh` (alias refusal, staging-name check, no production deploy); update `wrangler-config.test.mjs`

## 2. Main app (app/)

- [x] 2.1 `app/worker/index.ts`: send `MINI_PREFIX` paths to `handleMiniApp`; `app/wrangler.jsonc`: `assets.binding: "ASSETS"` and `run_worker_first: ["/apps/*"]`
- [x] 2.2 Landing page: replace the Vite template in `App.tsx` with `AppList` and `Tutorial` components, and trim `App.css`
- [x] 2.3 Tests: `App.test.tsx` and component tests for loading, empty, error, and list states, and the tutorial; a Worker test that `/apps/` reaches the router; keep 100% coverage

## 3. CI (.github)

- [x] 3.1 `app-untouched.sh`: only `mini-apps/apps/*` counts as untouched; update `scripts/tests/app-untouched.test.mjs`
- [x] 3.2 `deploy.yml`: run the main-app steps when `mini_changed` is true; delete the mini block and its `staging-mini` publication; rewrite the header and summary lines
- [x] 3.3 `test.yml`: update the header and summary wording

## 4. Skills and setup (.agents)

- [x] 4.1 `/apply` mini-app path: call `cf-preview.sh --alias mini-<name>`, report `/apps/<name>/` on the preview, and drop the expiry line
- [x] 4.2 `save/references/mini-app-save.md`: CI deploys the main Worker; the app is live at `/apps/<name>/` when it finishes; update the fallback paths
- [x] 4.3 `/ship` mini-app merge: the dashboard entry is `/apps/` on the main app
- [x] 4.4 `wong-setup/references/cloudflare.md`: remove the mini Workers from the names table and the config step; add "Moving older mini apps" with the post-deploy Worker delete
- [x] 4.5 `wong-sync`: update `payload-files.json`, the payload manifest, and `stack-pack-fragments.md` (remove the mini fragment; add `ASSETS` and `run_worker_first` to the main fragment); update `wong-sync-preflight.test.mjs`

## 5. Docs

- [x] 5.1 Rewrite `wiki/stack/mini-apps.md` for one Worker, the full-build preview, and `/apps/`
- [x] 5.2 Update `wiki/development/the-change-loop.md`, `wiki/stack/cloudflare-access.md`, `wiki/stack/README.md`, `wiki/ux-principles.md`, `README.md`, and the `WONG-STACK` block in `AGENTS.md`

## 6. Release

- [x] 6.1 Bump `VERSION` to 24.0.0 and add the `CHANGELOG.md` entry
- [x] 6.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
- [x] 6.3 Local evidence before the ship checkpoint: every script test, and the app's lint, `tsc -b`, Vitest at 100% coverage, and Stryker at 100% on the changed files; CI and the preview walk come from `/ship`'s one checkpoint
