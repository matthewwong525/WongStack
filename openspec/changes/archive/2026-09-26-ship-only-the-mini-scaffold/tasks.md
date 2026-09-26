## 1. Manifest

- [x] 1.1 In `.agents/skills/wong-sync/references/payload-files.json`, replace the `mini-apps` scaffold folder with the four Worker files and the `mini-apps/apps/hello` folder, and drop the `mini-apps/wrangler.jsonc` exclude
- [x] 1.2 In `payload-manifest.md`, say that the scaffold lists the mini Worker and the example app file by file, and that other apps in the source repo never ship

## 2. Test

- [x] 2.1 In `scripts/tests/wong-sync-preflight.test.mjs`, add a test that copies the real manifest's `scaffold` entry into a fixture with `mini-apps/apps/hello/` and `mini-apps/apps/tips/`, and checks that a sync selects the example app and the Worker and never `tips/`

## 3. Docs

- [x] 3.1 In `wiki/stack/mini-apps.md`, say that in the source repo only `hello/` is payload, and other apps save like in any repo

## 4. Release

- [x] 4.1 Set `VERSION` to 22.0.1 and add a newest-first `CHANGELOG.md` entry
- [x] 4.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
