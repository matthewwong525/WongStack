# Tasks

## Scaffold

- [x] Scaffold `app/` from the Cloudflare React framework guide (C3, `--framework=react --platform=workers --variant=react-ts`)
- [x] Confirm the generated `app/wrangler.jsonc` sets `main: worker/index.ts` and `assets.not_found_handling: "single-page-application"`
- [x] Keep the scaffold stock — no router, CSS framework, or bindings added

## Linting

- [x] Evaluate ESLint vs oxlint; land on the template default (oxlint)
- [x] Restore `app/.oxlintrc.json` and point `npm run lint` at oxlint
- [x] Remove all ESLint traces (`eslint.config.js`, eslint devDependencies)
- [x] Verify oxlint actually reports violations rather than silently passing

## Credentials

- [x] Document `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `.env.example`
- [x] Create the git-ignored root `.env` with both keys blank, ready to fill
- [ ] **User:** fill in the real token + account ID in `.env`

## Verification

- [x] `npm ci` clean install
- [x] `npm run lint` clean
- [x] `tsc -b` clean
- [x] `npm run build` succeeds
- [x] `npm run dev` serves the SPA (200) and `/api/` returns `{"name":"Cloudflare"}`

## Open / not started

- [ ] Decide the real Worker name in `app/wrangler.jsonc` (currently `app`, which sets the `workers.dev` URL)
- [ ] Confirm `app/` belongs in the WongStack meta-repo, or relocate it
- [ ] First deploy (`set -a; source .env; set +a; cd app && npm run deploy`) — blocked on credentials
