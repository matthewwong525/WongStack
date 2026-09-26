## 1. Config

- [x] 1.1 `app/wrangler.jsonc` and the `wrangler.jsonc` fragment: `run_worker_first` lists `/api/*`, `/_memory/*`, and `/apps/*`, with the reason in a comment

## 2. Tests

- [x] 2.1 `scripts/tests/wrangler-config.test.mjs`: the app config and the fragment both list the three routes

## 3. Release

- [x] 3.1 `VERSION` 24.0.1 and a `CHANGELOG.md` entry
- [x] 3.2 `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
