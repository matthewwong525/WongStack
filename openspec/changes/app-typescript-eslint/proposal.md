# app-typescript-eslint

**Status:** in-progress
**Open questions:** (1) Cloudflare credentials — `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the git-ignored root `.env` are still blank, so nothing can deploy. (2) The Worker is named `app` in `app/wrangler.jsonc`, which determines the `app.<subdomain>.workers.dev` URL — is that the real name? (3) Does `app/` belong in this repo at all, given it's the WongStack meta-repo?

## Why

There was no application in this repo — only the WongStack payload (prose: skills, wiki, CLAUDE.md). We need a running React frontend with a Worker backend to build against, scaffolded the way Cloudflare currently recommends rather than hand-assembled, so the toolchain matches upstream and stays upgradable.

## What Changes

- Add `app/` — a React 19 + TypeScript SPA with a Cloudflare Worker backend, scaffolded from the official template per the [Cloudflare React framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/):
  ```
  npm create cloudflare@latest -- app --framework=react --platform=workers \
    --lang=ts --variant=react-ts --no-agents --no-git --no-deploy
  ```
  - `app/src/App.tsx` — the React SPA; `app/worker/index.ts` — the Worker backend serving `/api/`
  - `app/wrangler.jsonc` — `main: worker/index.ts`, `assets.not_found_handling: "single-page-application"` for SPA routing, `nodejs_compat`, observability on
  - `app/vite.config.ts` — `@cloudflare/vite-plugin`, so `npm run dev` runs the Worker in the real workerd runtime rather than a Node shim
  - Four `tsconfig.*.json` files (root/app/node/worker) — the worker gets its own so it isn't typed against the DOM
  - Scripts: `dev`, `build`, `lint`, `preview`, `deploy`, `cf-typegen`
- **Linting is oxlint, not ESLint** — the deciding factor is below and in the Decision log. Config is the template's `app/.oxlintrc.json` (react + typescript + oxc plugins, `rules-of-hooks` as an error).
- Document Cloudflare credentials in `.env.example` (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), each with where to obtain it — following the repo's [secrets convention](../../../wiki/development/secrets.md). Real values go in the git-ignored root `.env`, which is created but blank.

## Capabilities

### New Capabilities

None. `app/` is application code, not a WongStack capability — it adds no requirement to the payload and gets no spec.

### Modified Capabilities

None.

## Impact

- **New:** `app/` (24 tracked files). `app/node_modules/`, `app/dist/`, and `app/.env*` are ignored by the template's own `app/.gitignore`.
- **Modified:** `.env.example` — two documented Cloudflare variables added above the placeholder examples.
- **Not touched:** the WongStack payload. `app/` is not payload, so this change does **not** bump `VERSION` or add a `CHANGELOG.md` entry — the release ritual in `CLAUDE.md` applies to payload edits only.
- **Deploy** is `cd app && npm run deploy` (`wrangler deploy`). Wrangler reads credentials from the process environment, not from a parent-directory `.env`, so they must be exported first:
  ```bash
  set -a; source .env; set +a; cd app && npm run deploy
  ```

## Non-goals

No router, CSS framework, test runner, or Cloudflare bindings (D1/KV/R2) — the scaffold is deliberately stock so upstream template updates stay easy to diff in. No CI workflow for `app/`. No deploy performed.

## Decision log

- **2026-07-28** — Scaffolded `app/` from the Cloudflare React framework guide. Notable findings and decisions:
  - **The C3 CLI prompts even under `CI=1`** and ignores `--lang=ts` for the variant choice. Piping stdin doesn't work (it wants a TTY). The flags that actually make it non-interactive: `--variant=react-ts` (`--variant=TypeScript` is rejected — valid values are `react-ts` / `react`) plus `--no-agents` (otherwise it prompts to add an `AGENTS.md`, which this repo already has at root). Recorded because re-running the scaffold is otherwise a dead end.
  - **The current template ships oxlint, not ESLint.** The original ask was ESLint, so it was swapped in first — `eslint.config.js` with typescript-eslint + react-hooks + react-refresh, a separate flat-config block giving `worker/**` worker globals instead of DOM globals, oxlint removed. Two config-shape gotchas surfaced: `eslint-plugin-react-hooks` v7 exposes the flat config at `configs.flat['recommended-latest']` (the bare `configs['recommended-latest']` is legacy format and ESLint rejects it), and the eslint/oxlint split means `lint` must point at exactly one.
  - **Reverted to oxlint** after comparing the two: oxlint is Rust/multi-threaded (~50–100× faster) and covers the popular rules but can't run custom JS plugins and has only limited type-aware linting; ESLint is slower but has the full plugin ecosystem and real type-aware rules via the TS compiler. At this size the speed difference is invisible either way, so the tiebreaker was **staying on the template default** — Cloudflare switched to oxlint, and matching upstream keeps future template diffs clean. Revisit if we ever want type-aware rules like `no-floating-promises`, which oxlint can't do today.
  - **Reverted by re-scaffolding rather than hand-unwinding** the ESLint edits, then `rm -rf node_modules && npm ci`, to guarantee the tree is exactly the template. The restored `app/.oxlintrc.json` was recovered from `vitejs/vite`'s `template-react-ts/_oxlintrc.json` (it is not in `cloudflare/templates`).
  - **Verified, not assumed:** `npm run lint` clean, `tsc -b` clean, `npm run build` succeeds, and `npm run dev` serves the SPA (HTTP 200) with `/api/` returning `{"name":"Cloudflare"}`. Because a passing linter and a no-op linter look identical, oxlint was checked against a throwaway file with deliberate violations — it flagged `no-unused-vars` and `no-constant-condition`, confirming it actually scans. The file was deleted.
  - **Naming drift, left alone:** this branch is `app-typescript-eslint`, from before the oxlint decision. The branch name is the change name that `/continue` and `/ship` key off, so renaming mid-flight costs more than the stale word is worth.
  - Nothing has been deployed and no Cloudflare credentials exist yet — see Open questions.
