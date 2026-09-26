## Context

`payload-files.json` lists `mini-apps` under `scaffold.dirs`, with `mini-apps/wrangler.jsonc` excluded. Two readers expand it. Sync's preflight (`wong-sync/scripts/preflight.mjs`) walks each listed folder and drops any path under an exclude prefix. The link checker (`scripts/check-payload-links.mjs`) walks each folder and drops only exact excluded files. Setup follows the manifest page. Any folder a later app adds under `mini-apps/apps/` is therefore payload.

## Goals / Non-Goals

**Goals:** an app made in the source repo never ships; the example app and the Worker still ship.

**Non-Goals:** a new manifest field; moving the source repo's own apps.

## Decisions

- **List files and the one example folder.** `scaffold.files` gets `mini-apps/worker.ts`, `mini-apps/tsconfig.json`, `mini-apps/.gitignore`, and `mini-apps/apps/.assetsignore`; `scaffold.dirs` swaps `mini-apps` for `mini-apps/apps/hello`. Both readers already expand `files` and `dirs` in every category, so no code changes. The `mini-apps/wrangler.jsonc` exclude goes, because nothing lists it now.
- **Alternative rejected:** exclude `mini-apps/apps` and re-add `hello`. Preflight treats an exclude as a prefix, so it would drop `hello` too, and the link checker would still walk every app.
- **The test uses the real manifest.** It copies the real `scaffold` entry into a preflight fixture whose source has `mini-apps/apps/hello/` and `mini-apps/apps/tips/`, so the test fails when the manifest drifts back to a whole-folder entry.

## Risks / Trade-offs

- **A new scaffold file must be listed by hand.** → The manifest page says so, and the test fails if the Worker stops being selected.
