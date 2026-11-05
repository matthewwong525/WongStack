# Tasks

## 1. Chrome helper (`.agents/skills/connect/scripts/`)

- [x] 1.1 On this computer, start a Chromium with remote debugging on a temp profile and confirm `agent-browser --auto-connect` attaches, opens a tab, and reads it; record the exact commands in design.md. Stop the build and return to `/plan` if it can not attach.
- [x] 1.2 Write `maskKeys()` and its tests: known prefixes, high-entropy runs, long inputs on key/token/secret pages masked to `[key …abcd]`; ordinary prose, URLs and ids under 20 characters left alone. Verify with `node --test`.
- [x] 1.3 Write `chrome.mjs` (`attach`, `open`, `read`, `click`, `fill`, `select`, `wait`, `take-key`, `picture`, `done`) with own-tab enforcement, and tests against a stand-in `agent-browser` binary: a foreign tab is refused, `read` masks, `picture` refuses while a key shows, `done` closes only own tabs, `attach` prints `CHROME=none` with no browser. Verify with `node --test`.
- [x] 1.4 Make `take-key` write `TOOL_<ID>` to the primary `app/.dev.vars` and pipe it to `cf-secrets.mjs put-tool`; test that the value appears in no argv, stdout, stderr or log, and that only `…abcd` prints. Verify with `node --test`.

## 2. Secrets (`scripts/cf-secrets.mjs`, `scripts/lib-staging-secrets.mjs`)

- [x] 2.1 Add `put-tool <NAME>` (stdin only, production only, the 10215 fallback), keep every `TOOL_*` off staging and prune any found there; extend `scripts/tests/` and verify they pass.

## 3. Tools in the app (`app/worker/`, `schema/migrations/`)

- [x] 3.1 Add the `tools` migration, and move the direct-use, purpose and guide rules into one shared module used by `forward.ts`, `keys.test.ts` and `scripts/check-app-keys.mjs`; verify `npm test` in `app/` and `node scripts/check-app-keys.mjs` pass unchanged.
- [x] 3.2 Make the registry per request (`registryFor(env)`: code keys plus D1 tools, code wins) and pass it through `key-levels.ts`, `scopedEnv` (strip every unlisted `TOOL_*`), the services list and Access status; update their tests and verify `npm test` passes.
- [x] 3.3 Add `PUT`/`DELETE /api/access/tools/:id` (owner or Admin, validated, code ids refused) and the dynamic `POST /api/direct/:id/:kind` for D1 tools through the same action builder; tests: owner adds and a look-up answers, a teammate is refused, a bad read is refused by name, Read can not run a change, a preview has no tools.
- [x] 3.4 Add `tool add <id> --file -` and `tool remove <id>` to `scripts/company-api.mjs` with tests in `scripts/tests/`; verify they pass.

## 4. Access screen (`app/src/apps/access/`)

- [x] 4.1 Show chat-added tools in Services with *Added in a chat* and their reads, no value; extend `Services.test.tsx`; update `wiki/stack/access-screens.md#the-services-view`; verify the tests pass.

## 5. Skills and docs

- [x] 5.1 Rewrite `wiki/stack/connect-your-tools.md` for the new flow (suggest, own Chrome, key link fallback, `tool add`, no publish, promotion), and trim `.agents/skills/connect/SKILL.md` to its rules: Chrome only through `chrome.mjs`, own tabs, no password, no key in chat.
- [x] 5.2 Change the *API keys/tokens* rule in `AGENTS.md`, `wiki/development/secrets.md#api-token-website-steps`, and `wiki/development/browsing.md` to allow the person's own Chrome while connecting, in one place each, linked; keep the linked heading text.
- [x] 5.3 Update `wiki/stack/api-keys.md#a-saved-key-shows-in-access`, `wiki/stack/company-api.md#build-a-skill-on-actions` and `wiki/stack/mini-apps.md` for chat-added tools and promotion into code.
- [x] 5.4 Change Step 5 in `.agents/skills/wong-setup/references/cloudflare.md`: after connect, offer the first app in the chat; the 4g sign-in counts as the human check; decline ends on the URL and the site's box. Update `wiki/stack/getting-started.md` and the README's *Make it yours* line to match.
- [x] 5.5 Add the `own-browser-connect` area to `.agents/skills/memory/references/areas.json`, and write the `## Next (minor) — Connect your tools in your own browser` CHANGELOG entry with an **Updating.** note that nothing needs doing by hand.

## 6. Verification

- [x] 6.1 Run `node .github/scripts/checks.mjs --worktree`, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs` and `node scripts/measure-context.mjs --check`; cut skill text until the budget passes.
- [x] 6.2 `/save`, wait for CI, and on the preview confirm Services shows no tools and the existing keys still work.
