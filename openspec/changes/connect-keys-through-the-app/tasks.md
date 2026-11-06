# Tasks

## 1. Sealing (`scripts/seal-keys.mjs`, `app/src/lib/seal.ts`)

- [x] 1.1 Write one seal format `{v:1, wrapped, iv, data}` (RSA-OAEP-256 wrapping a fresh AES-256-GCM key) used by both the browser module `app/src/lib/seal.ts` and Node; tests: a sealed value opens only with the matching private key, two seals of one value differ, a 4 KB key file seals and opens. Verify with `npm test` in `app/` and `node --test`.
- [x] 1.2 Write `scripts/seal-keys.mjs pair` (makes the pair, writes `WONG_KEY_SEAL_PUBLIC` into `app/wrangler.jsonc` vars, sets `WONG_KEY_SEAL_PRIVATE` with `gh secret set` or the Artifacts runner's secret, never prints the private half) and `put` (reads `sealed_keys` with `wrangler d1 execute --remote --json`, opens each, one `wrangler secret bulk`, deletes only rows put, matched on `name` and `sent_at`; a row it can't open stays and is named without its value); tests with stand-in `wrangler` and `gh` binaries: no value in argv, stdout or stderr. Verify with `node --test`.

## 2. App (`app/worker/`, `schema/migrations/`)

- [x] 2.1 Add the `sealed_keys` migration and `PUT /api/access/keys/:name` (owner or Admin, live only, 16 KB cap, allowed names only: a code key's declared secret, or `TOOL_<ID>`/`TOOL_<ID>_ID` of a saved tool; `no_seal` when `WONG_KEY_SEAL_PUBLIC` is unset) and `GET /api/access/keys/seal`; tests: owner sends and the row holds only sealed, ends, who and when; a teammate is refused; `WONG_*`, `CLOUDFLARE_*` and an unknown name are refused; a preview refuses; no route returns `sealed`. Verify with `npm test` in `app/`.
- [x] 2.2 Report `waiting: {ends}` in the key status for a name with a waiting row, and keep `saved` from the secret alone; extend the status tests. Verify with `npm test`.
- [x] 2.3 Add `forward.exchange = { url }` to the tool schema and `key-rules.ts` (HTTPS, same host as `base`, never with `mcp`; secrets `TOOL_<ID>` and `TOOL_<ID>_ID`), and the client-credentials trade in `forward.ts` (form post, `access_token`/`expires_in`, isolate cache to 60 s before expiry, one retry on 401, echo check covers token, ID and secret); tests with a stubbed `fetch`: one trade serves two calls, an expired token is renewed, a 401 renews once, another host is refused at save, nothing secret is returned. Verify with `npm test`.
- [x] 2.4 Add `key send <name> --sealed-file -` (or `--value-stdin`, sealed in-process) to `scripts/company-api.mjs`, with tests in `scripts/tests/` that the plain value is in no argv, stdout, stderr or request but the sealed one. Verify with `node --test`.

## 3. Access screen (`app/src/apps/access/`)

- [x] 3.1 Build the paste popup from `.scratch/connect-keys-through-the-app-prototype.diff`: *Paste key*/*Replace key* on each Services row, `Confirm` with a password `Input`, sealing in the browser, *Waiting for the next publish, ends in …abcd*, *Live app only* and no button on a preview, the error kept in the popup; widen the key column. Extend `Services.test.tsx`; update `wiki/stack/access-screens.md#the-services-view`. Verify with `npm test` in `app/`.

## 4. Connect and the hand-over (`.agents/skills/connect/`, `.agents/skills/hand-over/`)

- [x] 4.1 Remove the agent-browser `--auto-connect` backend from `browser.mjs`: `attach` is Camoufox, `--server` accepted as a no-op, `where` answers `window|server|link`; retire `WHERE=chrome`, `CHROME=none` and `SERVER=possible` in `scripts/retired-names.json`; update `scripts/tests/connect-browser.test.mjs`. Verify with `node --test` and `node scripts/check-retired-names.mjs`.
- [x] 4.2 In `hand-over.mjs`, keep `watch: true` on a window-mode `--watch`, so `sign-in` gives a turn in the window (`CONNECT_PAUSED=your-turn`, `HANDOVER_VIEW=window`) that ends on the finish or `close`; `watch` in window mode opens nothing. Add the window-mode `--watch` tests to `scripts/tests/hand-over.test.mjs` and `connect-browser.test.mjs`. Verify with `node --test`.
- [x] 4.3 Make `take-key` seal in-process with the key from `/api/access/keys/seal` and send through `company-api.mjs` under the company login, printing `TOOL_<ID> sent, ends in …abcd, goes live at the next publish`; still write the primary `app/.dev.vars`; fall back to `put-tool` only on `no_seal` with a Cloudflare login present. Test that no value reaches argv, stdout or stderr. Verify with `node --test`.

## 5. Publishing (`.github/workflows/deploy.yml`, the Artifacts route)

- [x] 5.1 Add a production-only *Put waiting keys* step after Deploy that runs `seal-keys.mjs put` with `WONG_KEY_SEAL_PRIVATE`, and a `workflow_dispatch` trigger for a keys-only publish of the default branch; give the Artifacts runner the same step and manual start. Verify with the workflow tests in `scripts/tests/` and `node .github/scripts/checks.mjs --worktree`.

## 6. Skills, docs and release

- [x] 6.1 Rewrite `wiki/stack/connect-your-tools.md` for one browser (window, server, or paste in Access), the sign-in turn in the window, keys sealed through the app, the keys-only publish, and tools with an ID and a secret; trim `.agents/skills/connect/SKILL.md`; update `wiki/development/secrets.md`, `wiki/development/browsing.md`, `wiki/stack/getting-started.md`, `wiki/stack/api-keys.md` and `wiki/stack/company-api.md` in one place each, keeping linked headings.
- [x] 6.2 Add the key-pair step to `.agents/skills/wong-setup/references/cloudflare.md`, and a `## Next (minor)` entry in `CHANGELOG.md` whose **Updating.** note says in plain words that the assistant makes the pair of locks once.
- [x] 6.3 Run `node .github/scripts/checks.mjs --worktree` (payload links, OpenSpec config, context size, retired names) and `npm test` in `app/`; fix what fails.

## 7. Live

- [ ] 7.1 With WongStack's own key pair made (`seal-keys.mjs pair`), `/save` and confirm CI passes and the preview's Services opens with the Cloudflare row still *Live app only* and no paste button on a preview.
