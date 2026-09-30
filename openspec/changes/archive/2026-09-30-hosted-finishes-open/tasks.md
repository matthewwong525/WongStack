# Tasks

## 1. Provisioning script (payload)

- [x] 1.1 `widen()` in `.agents/skills/wong-setup/scripts/provision.mjs` takes `openWithoutLogin`: with it, an Access surface probe still refused (401/403) after the full `PROPAGATION` wait is recorded in `accessPending` and does not stop; the next surfaces get one try each. The D1 probe and every other failure stop as today.
- [x] 1.2 Tests in `scripts/tests/provision.test.mjs`: a refused Access probe stops the widen without the option and passes with it (reported in `accessPending`); a refused D1 probe stops either way; the fake `sleep` shows one full wait, not three.

## 2. Server installer and access result

- [x] 2.1 `install()` in `server/install-wongstack.mjs` reads `openWithoutLogin === true` from the job and passes it to `widen()` and `provision()`.
- [x] 2.2 `install()` passes `keepConfig: false` for an installed repo whose `app/wrangler.jsonc` carries `"WORKSPACE_LOGIN": "off"`; otherwise as today. The push step stays unchanged.
- [x] 2.3 `writeManagementResult()` in `server/access-result.mjs` writes the eight-key open result for `report.access.mode === 'open'`, with no Cloudflare token call and no cleanup; an existing open file for a restricted report is replaced by a newly minted restricted result.
- [x] 2.4 Tests in `scripts/tests/server-install.test.mjs` against the fake Cloudflare: onboarding refused with `openWithoutLogin` → `done`, committed config carries the switch, the result file has exactly the eight keys at mode 0600, and no token was minted; without the option → `cloudflare` as today; a later Access error stops either way; a rerun after onboarding turns private → `done`, restricted result, `app/wrangler.jsonc` private and uncommitted, no new commit or push; a rerun still refused → open result and no file changes; an open-file retry after the card → restricted result replaces it.

## 3. Server agent

- [x] 3.1 `CONTRACT = 2` in `server/agent/agent.mjs`; `installWongStack()` adds `openWithoutLogin: true` to the installer's stdin job.
- [x] 3.2 Tests: `server-agent.test.mjs` checks the poll body's `contract: 2` and the installer's stdin carrying `openWithoutLogin: true` and no `AGENT_TOKEN`; `server-agent-management.test.mjs` delivers an open result through `deliver()` unchanged; `server-agent-contract.test.mjs` reads the job table from the README's `### Contract <CONTRACT>` section and fails when that heading doesn't match `CONTRACT`.

## 4. Docs

- [x] 4.1 `server/README.md`: the job table's optional `openWithoutLogin`; the private result's open shape and when it is written; the reconnect leaving edits uncommitted; `### Contract 1` becomes `### Contract 2`, naming what changed from 1.
- [x] 4.2 `wiki/stack/cloudflare-access.md` and `.agents/skills/wong-setup/references/cloudflare.md`: the server installer finishes open when its host asks, instead of "stops closed".
- [x] 4.3 CHANGELOG.md: a `## Next (minor) — Hosted setup finishes without a card` entry in plain words.

## 5. Gate

- [x] 5.1 `/save`: CI passes.
- [x] 5.2 Record an unverified thread: a real hosted install on a no-card Cloudflare account (open finish, dashboard "off", card, *Turn on the login*, private config left for publish), to check on wongstack-cloud's staging walk.
