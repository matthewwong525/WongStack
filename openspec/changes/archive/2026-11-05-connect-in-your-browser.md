<!-- openspec-archive v1 2026-11-05-connect-in-your-browser -->
<!-- file proposal.md utf8 12380 -->
# Connect your tools in your own browser

**Status:** shipped as 48.4.0
**Branch:** onboarding-flow-after-setup
**Open questions:** none

## Why

After install, connecting your work tools is the step that makes the assistant useful, but today it is slow. You make each key by hand on a private link, and every tool the app does not know yet waits for a change, its checks and a publish. Your own Chrome is already signed in to those tools, so the assistant can make the keys there, and a new tool can work at once.

## What Changes

- **Connecting comes first after install, with your tools already suggested.** Setup reads your past chats while it installs. The assistant uses what it learned to suggest your tools: *You seem to use Stripe, Notion and Figma. Connect these?* You say yes, or change the list.
  ```mermaid
  flowchart TD
    done[install finishes] --> ask["suggest your tools"]
    ask --> chrome{"use your Chrome?"}
    chrome -->|yes| make[assistant makes each key]
    chrome -->|no or other computer| link[key link, as today]
    make --> saved[keys saved, unseen]
    link --> saved
    saved --> works[each tool shows one result]
    works --> app["your first app?"]
  ```

- **The assistant uses your own Chrome, where you are already signed in.** It asks first. You turn on one Chrome setting once, and Chrome asks you to allow it. The assistant works only in new tabs it opens. You watch it go to each tool's key page and make the narrowest key that only reads. If you are signed out of a tool, you sign in yourself in that tab. It never asks for a password. When your Chrome is on another computer, or you say no, the private key link works as it does today.
  ```text
  You seem to use Stripe, Notion and Figma.
  I can make their keys in your own Chrome,
  in new tabs, while you watch. Each key
  only reads.
  Turn this on once: in Chrome, open
  chrome://inspect/#remote-debugging and
  switch it on. Chrome then asks "Allow?"
  [ Use my Chrome ]  [ Send me the key link ]
  ```

- **Keys go to your app, and the chat never sees them.** The assistant takes each new key from the page and sends it straight to your live app. The chat shows only its last four characters. While a key is on the screen, the assistant's view of the page hides it, and it takes no picture.
  ```text
  ✓ Stripe   key saved, ends in …4f2a
  ✓ Notion   key saved, ends in …91c0
  ✓ Figma    key saved, ends in …7d13
  ```

- **A new tool works at once, with no publish.** The assistant works out each tool from its own developer pages. It writes how to reach the tool, and which requests only read, into your app. No code changes and no checks run, so the tool works a few seconds later. It also writes a notes page, so the next chat does not work the tool out again. The app holds each new tool to the same safety rules as before, and refuses one that breaks them. No ready-made tool list ships.
  | | Today | After |
  |---|---|---|
  | A tool the app does not know | a change, its checks, then *publish it?* | ready in seconds |
  | Who makes the key | you, from steps on a link | the assistant, in your Chrome |
  | Where the key passes | your copy and paste | page to app, unseen |

- **Each new tool shows in Access, and you give teammates their levels there.** The Services list shows each tool you connected in a chat, and the requests that tool counts as reads. A teammate gets a tool only when you give them a level for it, so you see what *Read* lets them do before you give it.
  ```screen
  <div class="card col gap">
    <div class="row gap"><h3>Services</h3></div>
    <div class="row gap"><b>Stripe</b><span class="grow muted">Payments and refunds</span><span>Saved</span></div>
    <div class="muted">Added in a chat · reads: GET anything, POST /v1/search</div>
    <div class="sep"></div>
    <div class="row gap"><b>Notion</b><span class="grow muted">Docs and project notes</span><span>Saved</span></div>
    <div class="muted">Added in a chat · reads: GET anything, POST /v1/search</div>
  </div>
  ```
  A sketch, not a picture: the plan step changes no code, so no prototype runs yet.

- **Your first app comes next, in the same chat.** When your tools work, the assistant offers a first app built on them, such as *this week's charges from Stripe*. You no longer open the site to copy the *Make it yours* request. The box stays on the site for anyone who skipped. Your sign-in on the live site during setup now counts as the check that you can sign in.
  ```text
  Your tools
    ✓ Stripe   works: 3 charges today
    ✓ Notion   works: 12 pages
    – Gmail    not connected yet: it needs a
               sign-in the app can't keep yet
  Want a first app on these? For example,
  this week's charges and who paid.
  ```

**Non-goals:** tools that offer only a sign-in that renews, such as Gmail and Google Calendar, stay *not connected yet*. Teammates' computers still send the owner a message and make no key. The assistant's own browser, and saved passwords, are not used for keys. No ready-made tool list ships.

## What the build needs

- **Nothing.** The last check, on a computer where your Chrome and the assistant run together, comes after the build.

## Capabilities

### New Capabilities

- `own-browser-connect`: connecting a tool through the person's own open Chrome: asking first, working only in tabs it opens, making the narrowest key, moving the key to the app unseen, hiding keys from page readings and pictures, and falling back to the key link.

### Modified Capabilities

- `connect-tools`: suggest the tool list, connect a new tool with no change and no publish, and drop the "never open a browser" rule for the person's own Chrome.
- `key-access`: tools added from a chat are kept as app data, held to the direct-use rules when saved, listed in Services with their reads, and moved into code when an app first uses one.
- `browser-logins`: the own-browser rule for key pages allows the connect helper in the person's own Chrome, with their yes.
- `install-onboarding`: after connecting, setup offers the first app in the same chat; the site's request stays as a fallback.
- `cloudflare-provisioning`: the owner's sign-in on the live site during setup counts as the human login check.

## Impact

- `.agents/skills/connect/` (skill, new `scripts/chrome.mjs` wrapping `agent-browser --auto-connect`), `wiki/stack/connect-your-tools.md`, `wiki/development/secrets.md#api-token-website-steps`, `wiki/development/browsing.md`, `AGENTS.md` (the *API keys/tokens* rule).
- `app/worker/keys.ts` and `app/worker/employee-access/key-levels.ts` (registry becomes code keys plus D1 tools, read per request), a new D1 migration (`tools`), an owner/Admin route to add and remove a tool, `app/worker/api/forward.ts`, `scripts/check-app-keys.mjs` (rules shared with the Worker), `scripts/cf-secrets.mjs` (live-only `TOOL_*` secrets), `scripts/company-api.mjs` (`tool add|remove`).
- `app/src/apps/access/Services.tsx` and `wiki/stack/access-screens.md`.
- `.agents/skills/wong-setup/references/cloudflare.md` Step 5, `wiki/stack/getting-started.md`, `wiki/stack/api-keys.md`.
- Depends on `agent-browser` 0.38.1's `--auto-connect` and Chrome's remote-debugging setting; neither is tried on a real Chrome yet.

## Decision log

- **2026-11-04** — Asked whether connecting tools comes first after install → chose connecting first; everything else comes after.
- **2026-11-04** — Asked whether the browser could help connect → chose using the person's own open browser, with agent-browser as the tool, so they need not sign in.
- **2026-11-04** — Asked whether to ship ready-made common tools → chose no: the assistant works out each tool and helps connect it.
- **2026-11-04** — Asked how keys reach Cloudflare → chose straight from the page to the app, safely, with no copy and paste.
- **2026-11-04** — Asked whether to try the browser on a real Chrome first or plan now → chose plan now and test during the build.
- **2026-11-04** — Asked, earlier the same day, for steps only and no browser sign-in when connecting → this plan replaces that choice for the person's own Chrome, because they are already signed in and type no password.
- **2026-11-04** — Assumed: a tool added in a chat lives in the app's data, not code, because a code change needs checks and a publish for every tool.
- **2026-11-04** — Assumed: the owner gives no extra approval for a tool; giving a teammate a level in Access, where its reads show, is the approval, because the owner already holds every key and an extra click slows the first run.
- **2026-11-04** — Assumed: when an app is first built on a tool added in a chat, that change moves the tool into code, because an app lists its keys in code and the checks then review it.
- **2026-11-04** — Assumed: the assistant makes the narrowest key that only reads, and a key that can change things only when the person asks, because Read covers the first look-ups.
- **2026-11-04** — Assumed: the assistant reads and acts only in tabs it opened, and leaves the person's other tabs alone, because they can hold mail and banks.
- **2026-11-04** — Assumed: the owner's sign-in on the live site during setup counts as the human login check, because it is a real email login on the live app.
- **2026-11-04** — Assumed: the *Make it yours* box stays on the site as a fallback, because a person who skips connecting still needs a way to start.
- **2026-11-04** — Assumed: a teammate's computer keeps today's message-to-the-owner path, because it can not store a key.
- **2026-11-05** — Assumed: each request's key list rides on its bindings and is passed to every key helper, not held in request-wide state, because the app's Worker code has no Node types for that.
- **2026-11-05** — Assumed: a tool saved with no `levels` offers Read alone, because Read covers the first look-ups.
- **2026-11-05** — Assumed: saving or removing a tool off the live app is refused (`live_only`), and no seed rows hold a tool, because a preview runs branch code and must hold no tool.
- **2026-11-05** — Assumed: the check on this server used the Chromium at `chromium-1248`, because `chromium-1243` was not there.
- **2026-11-05** — Assumed: `take-key` with no ref takes the page's one key and refuses when it finds none or several, because a guess could save the wrong value.
- **2026-11-05** — Assumed: `fill` refuses password and sign-in-code boxes, because the person types no password for the assistant.
- **2026-11-05** — Assumed: `take-key` saves to the primary `app/.dev.vars` first, so a failed live save leaves the key on this computer and says so.
- **2026-11-05** — Assumed: only a signed-in person's request reads the tool list, and only for Access, discovery, the services list and `/api/direct/`, because a machine is refused before anything is read and no other route uses a tool.
- **2026-11-05** — Asked when to test it on Matthew's own Chrome → chose after publish, together, including signing in when signed out; a camoufox backup and any sign-in fixes go to a new workspace.
- **2026-11-05** — Assumed: a code key that is not saved takes the key link under its declared name, and `take-key` saves only a new tool's `TOOL_<ID>`, because the services list holds no secret names and the key link already routes declared names.
- **2026-11-05** — Assumed: the key link takes an undeclared `TOOL_<ID>` with the same shape `put-tool` takes (a letter after `TOOL_`), so both paths accept one set of names.
- **2026-11-05** — Assumed: a tool save drops its levels when its address, look-ups, MCP reads or offered levels change, and keeps them for a new title, purpose, guide or header, because only the first set changes what a level allows.
- **2026-11-05** — Assumed: a key page is one whose address, title or a heading names API, developer, integration, key, token or secret, and only there are long hex runs and UUIDs hidden, because ids of that shape are common on other pages.
- **2026-11-05** — Assumed: a tool added in a chat whose key never came goes to the person's Chrome first, then the key link, because the key link is only the fallback; a code key that is not saved goes to the key link.
- **2026-11-05** — Assumed: archived for 48.4.0 after CI passed and the preview held no tools and refused a tool save as live only.

<!-- end proposal.md -->
<!-- file design.md utf8 10167 -->
# Design

## Context

See proposal.md for why. Today (48.3.0) the [connect skill](../../../.agents/skills/connect/SKILL.md) follows [connect your tools](../../../wiki/stack/connect-your-tools.md): every tool the app does not know becomes an OpenSpec change that edits `app/worker/keys.ts`, waits for CI, and is published. The registry is a module-level `const` that `app/worker/employee-access/key-levels.ts`, `app/worker/api/forward.ts` (`forwardRoutes`, `problem`), `scripts/check-app-keys.mjs` and the Access screens read synchronously. It holds only `cloudflare` and `code`.

Key pages are fenced off by [the token-website rule](../../../wiki/development/secrets.md#api-token-website-steps), the `AGENTS.md` rule *API keys/tokens: human steps; never browse*, and `browser-logins`' own-browser requirement. Errands browse in camofox (`browse.mjs`); `agent-browser` 0.38.1 is installed by setup for `/verify` and offers `--auto-connect` (attach to a running Chrome) and `--cdp`.

Chrome 136 and later ignore `--remote-debugging-port` on the default profile. Recent Chrome adds a per-user switch at `chrome://inspect/#remote-debugging` that lets a local tool attach to the running browser after an *Allow* prompt. Whether `agent-browser --auto-connect` finds a Chrome opened that way is unproven (task 1.1).

## Goals / Non-Goals

**Goals:** a new tool works on the live app seconds after its key exists; the key passes from page to app with no chat, log or argv copy; the person types no password; one path for setup and for *connect my tools* later.

**Non-Goals:** OAuth sign-ins; a key on a teammate's computer; driving the person's Chrome for anything but making keys while connecting; changing camofox errands or saved passwords.

## Decisions

### 1. Tools added from a chat live in D1, beside the code registry

A new migration in `schema/migrations/` adds `tools(id PRIMARY KEY, title, purpose, docs, forward_json, levels_json, added_by, added_at)`. The secret name is derived, never stored free-form: `TOOL_<ID>` (id upper-cased, `-` → `_`).

- `key-levels.ts` stops reading a module `const`. A `registryFor(env)` returns code keys plus D1 tools, read once per request and cached on the request; the existing helpers take that registry. Code wins on an id clash, and a save whose id is a code key is refused.
- Direct use: `forwardRoutes` stays for code keys. A second handler serves `POST /api/direct/:id/:kind` for a D1 tool, through the same `action()` builder, so levels, look-up sorting and errors are identical.
- Validation: the save route runs the same `problem()` used by `forwardRoutes`, plus the purpose and HTTPS-guide rules from `keys.test.ts`, moved into one shared module that `scripts/check-app-keys.mjs` also imports. One rule set, two callers.
- Route: `PUT` and `DELETE /api/access/tools/:id`, owner or Admin only, recorded like other Access changes. `scripts/company-api.mjs tool add <id> --file -` and `tool remove <id>` call it.
- Every `TOOL_*` secret is live-only: `scopedEnv` strips every `TOOL_*` binding a route does not list; `cf-secrets.mjs` never puts one on staging and `pruneStaging` removes any it finds; staging's D1 has no rows, so previews show none.

*Alternative:* keep editing `keys.ts` (today). Rejected: every tool costs a change, CI and a publish. *Alternative:* store key values in D1 too. Rejected: Worker secrets are the existing home, and Matthew dropped a Cloudflare vault for secrets as too risky (2026-10-22).

### 2. Promotion into code when an app first uses a tool

Apps list `keys` typed as code `KeyId`s. The change that first builds an app or action on a D1 tool copies its row into `keys.ts`, declares `TOOL_<ID>` in `app/.dev.vars.example`, and leaves the D1 row, which the code entry now shadows. The [mini-apps](../../../wiki/stack/mini-apps.md) and [company API](../../../wiki/stack/company-api.md#build-a-skill-on-actions) pages say so. The secret name never changes, so the saved key keeps working.

### 3. The person's Chrome through `connect/scripts/chrome.mjs`

A thin wrapper over `agent-browser --auto-connect --session connect-<pid>`, the only way the connect skill touches the person's browser:

- `attach`: connect, or print `CHROME=none` plus the one-line switch step; the skill then falls back to the key link.
- `open <url>`: a new tab; the script records the tab ids it opened in a temp state file and refuses every other command on a tab it did not open.
- `read`, `click`, `fill`, `select`, `wait`: pass-through by ref, on own tabs only. `read` runs the page text through `maskKeys()`.
- `take-key <ref> --tool <id>`: reads the ref's value or text inside the script, writes `TOOL_<ID>` to the primary `app/.dev.vars`, pipes it on stdin to `cf-secrets.mjs put-tool TOOL_<ID>` (`wrangler secret put` on production only, with the 10215 fallback `cf-secrets` already has), and prints only `TOOL_<ID> saved, ends in …abcd`.
- `picture`: refuses while `maskKeys()` found a key on the page.
- `done`: closes its own tabs and detaches; never closes Chrome.

`maskKeys()` replaces any run of 20 or more characters that has known key prefixes (`sk_`, `rk_`, `pk_`, `ntn_`, `secret_`, `figd_`, `ghp_`, `github_pat_`, `xox`, `glpat-`, …) or that mixes upper case, lower case and digits with high entropy, by `[key …abcd]`. It also masks every `<input>` value of type password or text longer than 20 characters on a page whose URL or title says *key*, *token* or *secret*.

**Tried on this server (task 1.1, 2026-11-05)** with Chromium 156 (`chromium-1248`) and `agent-browser` 0.38.1:

```bash
chrome --headless=new --no-sandbox --remote-debugging-port=9222 --user-data-dir="$(mktemp -d)" about:blank &
agent-browser --auto-connect --session connect-check tab list         # attaches; adds one about:blank tab, active
agent-browser --auto-connect --session connect-check --json tab new http://127.0.0.1:8765/  # tabId + targetId
agent-browser --auto-connect --session connect-check snapshot         # shows input values: masked by chrome.mjs
agent-browser --auto-connect --session connect-check get value @e2    # one input's value, for take-key
agent-browser --auto-connect --session connect-check tab close t5     # own tabs only
agent-browser --auto-connect --session connect-check close            # detaches; Chrome keeps running
```

Every command must carry `--auto-connect`: a later command without it makes the session daemon launch its own browser, and the tabs it then lists are not the person's. `open` navigates the active tab, so the helper opens with `tab new` only. With no Chrome, `--auto-connect` exits 1 with *No running Chrome instance found* and launches nothing. Discovery reads `DevToolsActivePort`, which Chrome's own switch writes; a real Chrome is task 6.3.

*Alternative:* `agent-browser --auto-connect state save` and drive a copy. Rejected: it writes every session cookie in plain text. *Alternative:* the person's Chrome through a Chrome extension or a host's own browser tool. Rejected for now: `agent-browser` ships with setup and works for any assistant ([host-agnostic](../../../wiki/stack/getting-started.md)).

### 4. The connect flow

`connect-your-tools.md` changes to: suggest → ask *use your Chrome?* → `attach` → per tool, work out how (notes page, developer pages) → `open` its key page; if signed out, ask the person to sign in in that tab → make the narrowest read-only key → `take-key` → `company-api.mjs tool add` → one look-up on the live app → list. A tool whose key page the agent can not get through (a robot check, an unknown layout) goes to one key link for all such tools at the end. The no-Chrome path uses the key link, then the same `tool add`, still with no publish. Teammate computers keep the message path.

The suggested list comes from the owner's people page and memory: `memory.mjs search <tool words>` over facts setup wrote while reading past chats.

### 5. Rule text

`AGENTS.md`'s *API keys/tokens* line becomes: human steps, or the person's own Chrome while connecting, with their yes; never the agent's own browser. `secrets.md#api-token-website-steps` and `browsing.md` say the same once and link `connect-your-tools.md`. Skill-text growth is offset by cuts (`measure-context.mjs --check`).

### 6. Setup's ending

Step 5 in `wong-setup/references/cloudflare.md`: after `connect`, offer the first app in the same chat, built on the tools that work (the *Make it yours* request's behavior: one question at a time, suggest, build the pick, remove the welcome, preview before publish). Decline → end on the URL and say the box on the site starts it later. Human login counts as verified when 4g's `company-api.mjs login --origin <production>` finished (a real Access email login on production). `Tutorial.tsx` is unchanged.

## Risks / Trade-offs

- [`--auto-connect` may not find a Chrome opened by the new switch] → task 1.1 proves it first; on failure the build stops and the plan returns with the extension route as the alternative.
- [A key shape `maskKeys()` misses lands in a reading and so in memory] → prefixes plus entropy, the input-value rule, `picture` refusal, and the skill reads a key page only through `chrome.mjs`. A leak is fixed by [replacing the key](../../../wiki/stack/api-keys.md#if-a-key-leaks).
- [The agent reads the person's other tabs] → own-tab enforcement in the script; the skill forbids raw `agent-browser` on the person's Chrome.
- [A chat-added read that is really a write] → the shared validator, and Services shows each tool's reads before any level is given; teammates hold no level until the owner gives one.
- [Per-request D1 read on every API call] → one small query per request, cached on it; tools are few.
- [`wrangler secret put` deploys a new version] → it redeploys the current code with the new secret; `cf-secrets`' existing 10215 handling covers a version in flight.

## Migration Plan

Additive. The migration creates an empty table; existing installs see no change until they connect a tool. Rollback: drop the D1 rows and `TOOL_*` secrets; code keys are untouched. The CHANGELOG **Updating.** note says nothing needs doing by hand.

<!-- end design.md -->
<!-- file tasks.md utf8 4437 -->
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

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 2307 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: People handle API token websites in their own browser

When a task needs a website to get, create, reveal, copy, rotate, edit permissions for, or revoke an API key or token, the agent SHALL ask the person to do that step in their own browser, providing the service's token-management link and short instructions including required permissions when relevant. When a new or replacement value is to come back, that link and those instructions SHALL be on the private key link's page; for a change needing no new value they SHALL be in the chat. It SHALL NOT use its own browser, saved logins, screenshots, page extraction, or a private form for that token step. The one exception SHALL be connecting a tool, where the person said yes to the agent using their own open Chrome: the agent MAY then make the key in that Chrome by the own-browser connect requirements. A newly supplied or replacement value SHALL otherwise use the existing private key link; a change needing no new value SHALL wait for the person's confirmation. The agent SHALL resume dependent work only after the required value is saved or the person confirms completion. Ordinary website tasks, use of stored credentials, and existing authorized token management through APIs SHALL continue unchanged.

#### Scenario: A token request with a saved service login

- **WHEN** a task needs a missing API token and the agent has a saved login for the service
- **THEN** it sends the private key link, whose page carries the token-management link and steps, without opening the service in its browser, receives the value there, and then resumes

#### Scenario: A token edit during an ordinary browsing task

- **WHEN** an ordinary browsing task reaches a step requiring a token permission change or revocation
- **THEN** the agent stops browser interaction for that step, gives the person the website link and instructions, waits for confirmation without taking token-page pictures or extracting its content, and resumes ordinary work afterward

#### Scenario: Connecting in the person's own Chrome

- **WHEN** the owner connects Stripe and says yes to the agent using their own Chrome
- **THEN** the agent makes the Stripe key in that Chrome, and no key-page picture or reading holds the key

<!-- end specs/browser-logins/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 2317 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The closing report says only what was checked

Before reporting success, provisioning SHALL check the actual production URL and report whether protection is configured, whether real human login is verified, and whether memory is reachable. It SHALL warn when a new address is not ready and SHALL never equate successful configuration or machine authentication with proven human access. It SHALL say memory is on only when a read through the production Worker answered. Interactive setup SHALL run its protection check automatically with the workspace's machine credentials and SHALL NOT ask the person to sign in on each site; the owner's own email sign-in to the production app during setup, or the person opening the production link and seeing their app, SHALL count as the human check. A site open without login SHALL be reported as open to anyone with the link, followed by the optional card steps and what the person gives up without them.

#### Scenario: Production not live yet

- **WHEN** the memory read has not answered
- **THEN** the report says memory starts once the site first goes live

#### Scenario: A mismatch

- **WHEN** the fetched URL does not answer as its configuration implies
- **THEN** the run reports a failure naming the request, not success

#### Scenario: Configuration without human evidence

- **WHEN** the API configuration and service-token probe succeed but nobody has completed a real email login
- **THEN** the report labels human login unverified and does not call the entire security rollout complete

#### Scenario: The person sees their app

- **WHEN** a private site's automatic probe passes and the person reports the app from the production link
- **THEN** setup counts human login as verified without further sign-ins on staging or previews

#### Scenario: The owner signed in during setup

- **WHEN** the owner finished the email sign-in to the production app during setup
- **THEN** the closing report says human login is verified, with no paste from the site needed

#### Scenario: No card yet

- **WHEN** interactive setup finishes with the site open without login
- **THEN** the report says anyone with the link can see the site and memory keeps no full transcripts, and lists the optional card steps as links

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/connect-tools/spec.md utf8 3791 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: A person connects their tools by asking in plain words

A person SHALL be able to start connecting all their tools by asking in plain words, such as *connect my tools*, and one tool by naming it, such as *connect my Figma*. When none is named, the helper SHALL suggest the tools it already knows the person uses, from what setup and memory learned about them, and SHALL let them confirm or change the list; with nothing known, it SHALL ask which tools they use. It SHALL end with a short list of each tool as working, waiting, or not connected yet.

#### Scenario: All tools

- **WHEN** an owner types *connect my tools* and names Stripe, Figma and Gmail
- **THEN** the helper ends with one line for each of the three tools

#### Scenario: One tool later

- **WHEN** a person types *connect my Figma*
- **THEN** the helper handles Figma only, and does not ask about other tools

#### Scenario: Tools already known

- **WHEN** setup learned from past chats that the owner uses Stripe and Notion
- **THEN** the helper suggests Stripe and Notion and asks to confirm or change the list, before it asks anything else

### Requirement: The helper works out how to add a tool the app does not know

For a tool the company app does not know, the helper SHALL find from the tool's own developer pages how the app can reach it with a fixed key, directly or through the tool's own MCP server, SHALL add that to the app, and SHALL write what it found on that tool's notes page. A tool that offers only a renewing sign-in SHALL be shown as not connected yet, with the reason.

#### Scenario: A tool with a personal token

- **WHEN** the owner names Figma, which offers a personal access token
- **THEN** the helper makes that token in the owner's Chrome, or the key link's steps say how to make it, and Figma's notes page says how the app reaches it

#### Scenario: A tool with only a sign-in

- **WHEN** the owner names a tool that only offers a sign-in that renews, with no fixed key
- **THEN** the list shows it as not connected yet and says it needs a sign-in the app can not keep yet

### Requirement: A website with no API is not connected yet

For a tool the company app can not reach by a key, such as the person's own mail, the helper SHALL say it is not connected yet. It SHALL NOT sign in to that site, open its own browser, or send a password link while connecting.

#### Scenario: The person's own mail

- **WHEN** the person names their own Gmail
- **THEN** the list shows it as not connected yet, and no browser page or password link opens

## REMOVED Requirements

### Requirement: The owner adds new tools with one key link and one yes

**Reason**: A new tool no longer needs a change, its checks and a publish; it is added to the app at once.
**Migration**: See *The owner's new tools work with no publish*. A change already saved by an earlier run stays saved and can still be published.

## ADDED Requirements

### Requirement: The owner's new tools work with no publish

On a computer that can store keys in the company app, the helper SHALL add every named tool the app does not know, and its key, to the live app with no code change, no checks, and no *publish it?*, and SHALL then show each one working with one look-up. Keys SHALL never be asked for in the chat.

#### Scenario: Two new tools

- **WHEN** the owner names Figma and Notion, which the app does not know, and their keys are made
- **THEN** both tools show a look-up working on the live app in the same chat, and no change waits for publish

#### Scenario: A key that does not come

- **WHEN** the Notion key is not made, because the owner stopped
- **THEN** the list says Notion waits for its key, Figma still works, and *connect my Notion* later picks it up

<!-- end specs/connect-tools/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 1148 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Setup goes on to connecting the owner's tools

After a finished install's closing report, setup SHALL go on in the same chat to connecting the tools the owner works with. When that ends, setup SHALL offer in the same chat a first app built on the tools that work, with no step that opens the site to copy a request; the site's first request SHALL stay as a fallback. The owner SHALL be able to skip connecting, and setup SHALL then offer the first app at once. An evaluation run, or an install that did not finish, SHALL NOT start it.

#### Scenario: A fresh install

- **WHEN** an owner's install finishes and the closing report is given
- **THEN** the chat suggests the tools they use, connects them, and then offers a first app built on the tools that work

#### Scenario: The owner skips

- **WHEN** the owner answers *skip*
- **THEN** the chat connects nothing and offers the first app at once

#### Scenario: The owner declines the first app

- **WHEN** the owner says no to the first app
- **THEN** the chat ends on the site's address and says the request on the site starts it later

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/key-access/spec.md utf8 2664 -->
# Spec Delta

## ADDED Requirements

### Requirement: A tool added from a chat works with no publish

The owner or an Admin SHALL be able to add a tool to the live app, and remove it, with no code change and no publish: its name, purpose, API guide, address, the secret it sends and how, and the requests it counts as reads. The tool SHALL be used directly like any key, live only, and governed by the same key levels. A preview SHALL hold no such tool. Nobody else SHALL be able to add or remove one, and a tool SHALL NOT take the name of a key in the code. Removing a tool, or a save that changes what it reads or the levels it offers, SHALL drop every level given on it, so it is given again on purpose.

#### Scenario: The owner adds Stripe

- **WHEN** the owner's assistant adds Stripe and its key is saved
- **THEN** a Stripe look-up through the app answers within seconds, with no publish

#### Scenario: A teammate tries to add a tool

- **WHEN** a teammate with no Admin role asks the app to add a tool
- **THEN** the app refuses and nothing is added

### Requirement: A tool added from a chat is held to the direct-use rules when saved

The app SHALL refuse to save a tool, naming the rule, when it has no purpose, no HTTPS API guide, an address that is not HTTPS, a secret that is not its own, or a read that could match a path outside its address. These SHALL be the same rules the checks hold a key in the code to before publishing.

#### Scenario: A read outside the address

- **WHEN** a tool is saved with a read that could match a path outside its address
- **THEN** the app refuses it and names that read

### Requirement: Services shows a chat-added tool's reads

The Services view SHALL list each tool added from a chat with the other keys, mark it as added in a chat, and show the requests it counts as reads, so the owner sees what *Read* allows before giving anyone a level. It SHALL show no key value.

#### Scenario: The owner opens Services

- **WHEN** the owner opens Services after adding Stripe from a chat
- **THEN** Stripe shows Saved, *added in a chat*, and its reads, and no key value

### Requirement: An app's first use of a chat-added tool moves it into code

A change that first builds an app or action on a tool added from a chat SHALL move that tool into the code's keys, keeping its secret, so the checks review it before publishing; from then on the code's entry SHALL win over the stored one.

#### Scenario: A first app on Stripe

- **WHEN** a change builds an app that lists the chat-added Stripe tool
- **THEN** Stripe is a key in the code in that change, its checks pass, and its saved key keeps working after publish

<!-- end specs/key-access/spec.md -->
<!-- file specs/own-browser-connect/spec.md utf8 3101 -->
# Spec Delta

## Purpose

Lets the assistant connect a person's work tools through the Chrome they already use and are signed in to, making each key there and sending it to the company app without the chat ever holding it.

## ADDED Requirements

### Requirement: The assistant asks before it uses the person's Chrome

The assistant SHALL use the person's own open Chrome only after the person says yes in the chat and Chrome itself allows the connection. It SHALL act and read only in tabs it opened, SHALL leave the person's other tabs unread and untouched, and SHALL close only its own tabs when it is done, never Chrome. When no Chrome on the assistant's computer allows the connection, or the person says no, the assistant SHALL connect the tools by the private key link instead.

#### Scenario: The person says yes

- **WHEN** the owner says yes and allows the connection in Chrome, with their mail open in another tab
- **THEN** the assistant opens each tool in a new tab, never reads the mail tab, and closes only its own tabs at the end

#### Scenario: Chrome is on another computer

- **WHEN** the assistant runs on a server and finds no Chrome it may connect to
- **THEN** it sends the private key link for the tools, as before, and nothing waits on the browser

### Requirement: The assistant makes the narrowest key and handles no password

In the person's Chrome, the assistant SHALL make for each tool the narrowest key the tool offers that only reads, and SHALL make a key that can change things only when the person asks for it by name. When the tool's page asks the person to sign in, the assistant SHALL ask them to sign in in that tab themselves, and SHALL NOT type, save, or ask for a password or a sign-in code.

#### Scenario: Signed in already

- **WHEN** the person's Chrome is signed in to Stripe
- **THEN** the assistant makes a Stripe key that only reads, and the person types nothing

#### Scenario: Signed out

- **WHEN** Notion shows its sign-in page in the assistant's tab
- **THEN** the assistant asks the person to sign in there and waits, and no password reaches the assistant

### Requirement: A key moves from the page to the app unseen

A key the assistant makes SHALL go from the page to the ignored live file and to the live company app without passing through the chat, a command line, a log, or a tracked file. The chat SHALL show only the tool and the key's last four characters, and SHALL NOT say the live app holds a key that waits for the next publish. While a key shows on a page, every reading of that page the assistant gets SHALL hide it, and the assistant SHALL take no picture of that page.

#### Scenario: A Stripe key is made

- **WHEN** Stripe shows a new key on its page
- **THEN** the key reaches the live app, the chat says the Stripe key is saved and ends in its last four characters, and no reading, picture, or chat record holds the rest

#### Scenario: A reading while the key shows

- **WHEN** the assistant reads the page while the new key is on the screen
- **THEN** the reading shows the key hidden, with only its last four characters

<!-- end specs/own-browser-connect/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-04

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 118164 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes: each button shows when the link offers it.
  A preview page (data-kind="preview", from apply's preview-review.mjs) names the finished build and offers Publish.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-11-05-connect-in-your-browser</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .back { display:flex; align-items:center; gap:8px; min-width:0; margin:0 0 8px; }
  .back .muted { margin:0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  /* Picture files: a wrapping row of labelled figures in em, so the fit and zoom scale them like a drawing; two sit side by side when they fit. */
  .art.photo { width:49.2em; display:flex; flex-wrap:wrap; align-items:flex-start; gap:.8em; white-space:normal; line-height:1.3; }
  .art.photo figure { flex:1 1 18em; min-width:0; margin:0; text-align:center; }
  .art.photo img { display:block; width:100%; height:auto; max-height:40em; object-fit:contain; border:1px solid var(--border); border-radius:.4em; background:var(--background); }
  .art.photo figcaption { margin-top:.3em; color:var(--muted-foreground); font-size:.95em; }
  .shot { position:relative; display:block; } .art .pin.spot { position:absolute; margin:0; transform:translate(-50%, -50%); }
  /* An ad: the card a feed or a story shows, in em like a picture; several sit side by side when they fit. */
  .art.ads { width:auto; max-width:49.2em; margin-right:1px; }
  .ad { flex:1 1 15em; max-width:20em; min-width:0; overflow:hidden; border:1px solid var(--border); border-radius:.6em; background:var(--card); color:var(--card-foreground); text-align:left; }
  .ad .ad-account { margin:0; padding:.5em .7em; } .ad .ad-account span { color:var(--muted-foreground); font-size:.85em; }
  .art.photo .ad img { max-height:none; aspect-ratio:4 / 5; object-fit:cover; border:0; border-radius:0; }
  .ad-words { display:flex; flex-wrap:wrap; align-items:center; gap:.3em .6em; padding:.6em .7em; }
  .ad-words .ad-text { flex:1 1 100%; margin:0; } .ad-words .ad-headline { flex:1 1 0; min-width:0; }
  .ad-button { padding:.3em .8em; border-radius:.4em; background:var(--primary); color:var(--primary-foreground); font-size:.9em; }
  .ad.story { position:relative; } .art.photo .ad.story img { aspect-ratio:9 / 16; }
  .ad.story .ad-account { position:absolute; top:0; left:0; right:0; z-index:1; background:color-mix(in oklab, var(--background) 70%, transparent); }
  .ad.story .ad-words { position:absolute; left:0; right:0; bottom:0; background:color-mix(in oklab, var(--background) 80%, transparent); }
  .try { margin:8px 0 0; padding:0 var(--pad); }
  .item > .verdict { grid-column:1 / -1; display:flex; align-items:center; gap:8px; margin-top:10px; }
  .verdict button { min-width:64px; }
  .note-list .group { margin:12px 0 6px; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  .item > .table { grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; overflow-x:auto; border-top:1px solid var(--border); }
  .item > .table:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(var(--cols, 1), minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  body.read-only .bar, body.read-only .add, body.read-only .verdict, body.read-only .hint, body.read-only .vhint .note-it, body.read-only #chip, body.read-only .drop, body.read-only .files button { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  /* Live cards, forms, files, and the needs list: the look's parts, with inputs at 16px so a phone never zooms. */
  .item > .live, .item > .form { grid-column:1 / -1; margin-top:10px; min-width:0; }
  .live-tools { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 6px; }
  .live-tools [aria-pressed="true"] { background:var(--secondary); color:var(--secondary-foreground); }
  .live-box { overflow:hidden; border:1px solid var(--border); border-radius:var(--radius); background:var(--muted); }
  .live iframe { display:block; border:0; transform-origin:0 0; background:var(--background); }
  .live.full { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; margin:0; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; background:var(--background); }
  .live.full .live-box { flex:1; min-height:0; overflow:auto; }
  .live.full iframe { margin:0 auto; }
  .live-said { margin:6px 0 0; }
  .form { display:grid; gap:14px; }
  .need .form { margin-top:10px; }
  .q { min-width:0; margin:0; padding:0; border:0; }
  .q-label { display:block; margin:0 0 4px !important; font-weight:500; }
  .q :is(input:not([type=checkbox], [type=radio], [type=file]), textarea) { display:block; width:100%; padding:8px 10px; font:inherit; font-size:16px; }
  .opt { display:flex; align-items:center; gap:8px; min-height:40px; }
  .opt input { width:20px; height:20px; margin:0; }
  .drop { position:relative; display:flex; align-items:center; justify-content:center; min-height:64px; padding:12px; border:1px dashed var(--input); border-radius:var(--radius); text-align:center; cursor:pointer; }
  .drop.over, .drop:focus-within { border-color:var(--ring); background:var(--accent); }
  .drop input { position:absolute; width:1px; height:1px; opacity:0; }
  .files { list-style:none; margin:6px 0 0; padding:0; }
  .files li { display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:14px; }
  .files .why { color:var(--destructive); }
  .needs { list-style:none; margin:0; padding:0; }
  .need { scroll-margin-top:8px; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-11-05-connect-in-your-browser" data-own-back>
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-11-05-connect-in-your-browser</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#needs">Needs</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint"><span class="lead">Tap + Note to comment.</span> <span class="copies">Saving a note copies all your notes.</span> <span class="tail">Open a drawing and tap it to see it full screen.</span></p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">After install, connecting your work tools is the step that makes the assistant useful, but today it is slow. You make each key by hand on a private link, and every tool the app does not know yet waits for a change, its checks and a publish. Your own Chrome is already signed in to those tools, so the assistant can make the keys there, and a new tool can work at once.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Connecting comes first after install, with your tools already suggested.</b> Setup reads your past chats while it installs. The assistant uses what it learned to suggest your tools: <i>You seem to use Stripe, Notion and Figma. Connect these?</i> You say yes, or change the list.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-1-picture-1" tabindex="0" style="width:33.385em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 434 742" width="434" height="742" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_done_ask_0"><path d="M232.07,56L232.07,97"/><path class="pele-marker" d="M232.07,104L228.71,96L235.43,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_ask_chrome_0"><path d="M232.07,152L232.07,193"/><path class="pele-marker" d="M232.07,200L228.71,192L235.43,192Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_chrome_make_0"><path d="M212.43,311.98C212.43,328.36 117.59,328.36 117.59,344.75L117.59,390.25"/><path class="pele-marker" d="M117.59,397.25L114.23,389.25L120.95,389.25Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_chrome_link_0"><path d="M251.71,311.98C251.71,328.36 346.54,328.36 346.54,344.75L346.54,390.25"/><path class="pele-marker" d="M346.54,397.25L343.18,389.25L349.9,389.25Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_make_saved_0"><path d="M117.59,445.25C117.59,462.75 195.36,462.75 195.36,480.25L195.36,486.25"/><path class="pele-marker" d="M195.36,493.25L192,485.25L198.72,485.25Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_link_saved_0"><path d="M346.54,445.25C346.54,462.75 268.77,462.75 268.77,480.25L268.77,486.25"/><path class="pele-marker" d="M268.77,493.25L265.41,485.25L272.13,485.25Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_saved_works_0"><path d="M232.07,541.25L232.07,582.25"/><path class="pele-marker" d="M232.07,589.25L228.71,581.25L235.43,581.25Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_works_app_0"><path d="M232.07,637.25L232.07,678.25"/><path class="pele-marker" d="M232.07,685.25L228.71,677.25L235.43,677.25Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_chrome_make_0"><rect x="102.7" y="346.75" width="29.78" height="21" rx="3" fill="var(--_bg)"/><text x="117.59" y="362.15" text-anchor="middle">yes</text></g><g class="pele-edge-label" data-id="L_chrome_link_0"><rect x="277.57" y="346.75" width="137.95" height="21" rx="3" fill="var(--_bg)"/><text x="346.54" y="362.15" text-anchor="middle">no or other computer</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="done" transform="translate(232.07,32)"><rect x="-67.79" y="-24" width="135.58" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">install finishes</text></g><g class="pele-node pele-shape-rect" data-id="ask" transform="translate(232.07,128)"><rect x="-82.92" y="-24" width="165.84" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">suggest your tools</text></g><g class="pele-node pele-shape-diam" data-id="chrome" transform="translate(232.07,262.13)"><polygon points="0,-62.12 99.4,0 0,62.12 -99.4,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">use your Chrome?</text></g><g class="pele-node pele-shape-rect" data-id="make" transform="translate(117.59,421.25)"><rect x="-109.59" y="-24" width="219.18" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">assistant makes each key</text></g><g class="pele-node pele-shape-rect" data-id="link" transform="translate(346.54,421.25)"><rect x="-79.36" y="-24" width="158.72" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">key link, as today</text></g><g class="pele-node pele-shape-rect" data-id="saved" transform="translate(232.07,517.25)"><rect x="-88.7" y="-24" width="177.41" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">keys saved, unseen</text></g><g class="pele-node pele-shape-rect" data-id="works" transform="translate(232.07,613.25)"><rect x="-112.71" y="-24" width="225.42" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">each tool shows one result</text></g><g class="pele-node pele-shape-rect" data-id="app" transform="translate(232.07,709.25)"><rect x="-68.69" y="-24" width="137.38" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">your first app?</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The assistant uses your own Chrome, where you are already signed in.</b> It asks first. You turn on one Chrome setting once, and Chrome asks you to allow it. The assistant works only in new tabs it opens. You watch it go to each tool's key page and make the narrowest key that only reads. If you are signed out of a tool, you sign in yourself in that tab. It never asks for a password. When your Chrome is on another computer, or you say no, the private key link works as it does today.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">You seem to use Stripe, Notion and Figma.</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">I can make their keys in your own Chrome,</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">in new tabs, while you watch. Each key</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">only reads.</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">Turn this on once: in Chrome, open</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">chrome://inspect/#remote-debugging and</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">switch it on. Chrome then asks &quot;Allow?&quot;</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">[ Use my Chrome ]  [ Send me the key link ]</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Keys go to your app, and the chat never sees them.</b> The assistant takes each new key from the page and sends it straight to your live app. The chat shows only its last four characters. While a key is on the screen, the assistant's view of the page hides it, and it takes no picture.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">✓ Stripe   key saved, ends in …4f2a</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">✓ Notion   key saved, ends in …91c0</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">✓ Figma    key saved, ends in …7d13</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A new tool works at once, with no publish.</b> The assistant works out each tool from its own developer pages. It writes how to reach the tool, and which requests only read, into your app. No code changes and no checks run, so the tool works a few seconds later. It also writes a notes page, so the next chat does not work the tool out again. The app holds each new tool to the same safety rules as before, and refuses one that breaks them. No ready-made tool list ships.</div></div><div class="table"><table class="tbl"><thead><tr><th></th><th>Today</th><th>After</th></tr></thead><tbody><tr data-note="item-4-row-1" tabindex="0"><td>A tool the app does not know</td><td>a change, its checks, then <i>publish it?</i></td><td>ready in seconds</td></tr><tr data-note="item-4-row-2" tabindex="0"><td>Who makes the key</td><td>you, from steps on a link</td><td>the assistant, in your Chrome</td></tr><tr data-note="item-4-row-3" tabindex="0"><td>Where the key passes</td><td>your copy and paste</td><td>page to app, unseen</td></tr></tbody></table></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Each new tool shows in Access, and you give teammates their levels there.</b> The Services list shows each tool you connected in a chat, and the requests that tool counts as reads. A teammate gets a tool only when you give them a level for it, so you see what <i>Read</i> lets them do before you give it. A sketch, not a picture: the plan step changes no code, so no prototype runs yet.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic screen" data-note="item-5-picture-1" tabindex="0"><div class="sk" inert><div class="card col gap">
  <div class="row gap"><h3>Services</h3></div>
  <div class="row gap"><b>Stripe</b><span class="grow muted">Payments and refunds</span><span>Saved</span></div>
  <div class="muted">Added in a chat · reads: GET anything, POST /v1/search</div>
  <div class="sep"></div>
  <div class="row gap"><b>Notion</b><span class="grow muted">Docs and project notes</span><span>Saved</span></div>
  <div class="muted">Added in a chat · reads: GET anything, POST /v1/search</div>
</div></div></div></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Your first app comes next, in the same chat.</b> When your tools work, the assistant offers a first app built on them, such as <i>this week's charges from Stripe</i>. You no longer open the site to copy the <i>Make it yours</i> request. The box stays on the site for anyone who skipped. Your sign-in on the live site during setup now counts as the check that you can sign in.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">Your tools</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">  ✓ Stripe   works: 3 charges today</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">  ✓ Notion   works: 12 pages</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">  – Gmail    not connected yet: it needs a</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">             sign-in the app can't keep yet</span>
<span class="ln" data-note="item-6-line-6" tabindex="0">Want a first app on these? For example,</span>
<span class="ln" data-note="item-6-line-7" tabindex="0">this week's charges and who paid.</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> tools that offer only a sign-in that renews, such as Gmail and Google Calendar, stay <i>not connected yet</i>. Teammates' computers still send the owner a message and make no key. The assistant's own browser, and saved passwords, are not used for keys. No ready-made tool list ships.</p>

</section>
<section id="needs" aria-labelledby="needs-h"><h2 id="needs-h">What the build needs</h2>
<ol class="needs">
<li class="need card" id="need-1" data-need="none"><p><b>Nothing.</b> The last check, on a computer where your Chrome and the assistant run together, comes after the build.</p></li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-04</p>Asked whether connecting tools comes first after install → chose connecting first; everything else comes after.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-04</p>Asked whether the browser could help connect → chose using the person's own open browser, with agent-browser as the tool, so they need not sign in.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-04</p>Asked whether to ship ready-made common tools → chose no: the assistant works out each tool and helps connect it.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-04</p>Asked how keys reach Cloudflare → chose straight from the page to the app, safely, with no copy and paste.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-04</p>Asked whether to try the browser on a real Chrome first or plan now → chose plan now and test during the build.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-04</p>Asked, earlier the same day, for steps only and no browser sign-in when connecting → this plan replaces that choice for the person's own Chrome, because they are already signed in and type no password.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: a tool added in a chat lives in the app's data, not code, because a code change needs checks and a publish for every tool.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: the owner gives no extra approval for a tool; giving a teammate a level in Access, where its reads show, is the approval, because the owner already holds every key and an extra click slows the first run.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: when an app is first built on a tool added in a chat, that change moves the tool into code, because an app lists its keys in code and the checks then review it.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: the assistant makes the narrowest key that only reads, and a key that can change things only when the person asks, because Read covers the first look-ups.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: the assistant reads and acts only in tabs it opened, and leaves the person's other tabs alone, because they can hold mail and banks.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: the owner's sign-in on the live site during setup counts as the human login check, because it is a real email login on the live app.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: the <i>Make it yours</i> box stays on the site as a fallback, because a person who skips connecting still needs a way to start.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: a teammate's computer keeps today's message-to-the-owner path, because it can not store a key.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: each request's key list rides on its bindings and is passed to every key helper, not held in request-wide state, because the app's Worker code has no Node types for that.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: a tool saved with no <code>levels</code> offers Read alone, because Read covers the first look-ups.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: saving or removing a tool off the live app is refused (<code>live_only</code>), and no seed rows hold a tool, because a preview runs branch code and must hold no tool.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the check on this server used the Chromium at <code>chromium-1248</code>, because <code>chromium-1243</code> was not there.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: <code>take-key</code> with no ref takes the page's one key and refuses when it finds none or several, because a guess could save the wrong value.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: <code>fill</code> refuses password and sign-in-code boxes, because the person types no password for the assistant.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: <code>take-key</code> saves to the primary <code>app/.dev.vars</code> first, so a failed live save leaves the key on this computer and says so.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: only a signed-in person's request reads the tool list, and only for Access, discovery, the services list and <code>/api/direct/</code>, because a machine is refused before anything is read and no other route uses a tool.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-05</p>Asked when to test it on Matthew's own Chrome → chose after publish, together, including signing in when signed out; a camoufox backup and any sign-in fixes go to a new workspace.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: a code key that is not saved takes the key link under its declared name, and <code>take-key</code> saves only a new tool's <code>TOOL_&lt;ID&gt;</code>, because the services list holds no secret names and the key link already routes declared names.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: the key link takes an undeclared <code>TOOL_&lt;ID&gt;</code> with the same shape <code>put-tool</code> takes (a letter after <code>TOOL_</code>), so both paths accept one set of names.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: a tool save drops its levels when its address, look-ups, MCP reads or offered levels change, and keeps them for a new title, purpose, guide or header, because only the first set changes what a level allows.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: a key page is one whose address, title or a heading names API, developer, integration, key, token or secret, and only there are long hex runs and UUIDs hidden, because ids of that shape are common on other pages.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: a tool added in a chat whose key never came goes to the person's Chrome first, then the key link, because the key link is only the fallback; a code key that is not saved goes to the key link.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-05</p>Assumed: archived for 48.4.0 after CI passed and the preview held no tools and refused a tool save as live only.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom<span class="note-it"> · tap a line or picture to note it</span></p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" data-actions="[{&quot;name&quot;:&quot;build&quot;,&quot;label&quot;:&quot;Build it&quot;,&quot;done&quot;:&quot;Asked the chat to build.&quot;},{&quot;name&quot;:&quot;publish&quot;,&quot;label&quot;:&quot;Build and publish&quot;,&quot;done&quot;:&quot;Asked the chat to build and publish.&quot;,&quot;confirm&quot;:{&quot;say&quot;:&quot;Goes live, can't be undone.&quot;,&quot;yes&quot;:&quot;Yes, publish&quot;,&quot;ask&quot;:&quot;Build and publish? This goes live and can't be undone.&quot;}}]" hidden>
    <div id="ready-confirm" role="group" hidden><p></p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span></span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  // A preview page shows a finished build: its words name the preview. A review page of other work names its cards.
  const PREVIEW = document.body.getAttribute('data-kind') === 'preview', NAME = PREVIEW ? CHANGE.replace(/-preview$/, '') : CHANGE;
  const REVIEW = document.body.getAttribute('data-kind') === 'review', NOUN = REVIEW ? 'Card' : 'Change', PAGE = REVIEW ? 'page' : 'plan';
  if (PREVIEW) {
    document.title = 'Preview · ' + NAME;
    document.querySelector('.eyebrow').textContent = NAME;
    document.querySelector('h1').textContent = 'Built: look, then publish?';
    document.querySelector('.hint .lead').textContent = 'Tap a picture to see it full screen, then tap it to note it.';
    document.querySelector('.hint .tail').textContent = '';
  }
  if (REVIEW) document.querySelector('.hint .lead').textContent = 'Tap OK or Change on each card, or select words to note them.';
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {}, ok: {}, answers: {}, said: {}, files: {} };
  // A note on words keeps its quote; a note on a picture spot keeps the picture, the spot in percent, and its name.
  const EXTRA = { quote: 'string', k: 'number', x: 'number', y: 'number', on: 'string' };
  const ok = function (r, id) {
    return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id)
      && Object.keys(EXTRA).every(function (f) { return r[f] === undefined || typeof r[f] === EXTRA[f]; });
  };
  function extraOf(rec) {
    const x = {};
    Object.keys(EXTRA).forEach(function (f) { if (rec && rec[f] !== undefined) x[f] = rec[f]; });
    return x;
  }
  const QID = /^(?:item|need)-\d+-(?:q|live)-\d+$/;
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  function load(text) {
    try {
      const saved = JSON.parse(text || 'null');
      if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
      if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
      if (saved && saved.ok && typeof saved.ok === 'object') {
        data.ok = {};
        Object.keys(saved.ok).forEach(function (id) { if (/^item-\d+$/.test(id) && (saved.ok[id] === true || saved.ok[id] === 'sent')) data.ok[id] = saved.ok[id]; });
      }
      const kept = function (name, fits) {
        if (!saved || !saved[name] || typeof saved[name] !== 'object') return;
        data[name] = {};
        Object.keys(saved[name]).forEach(function (id) { if (QID.test(id) && fits(saved[name][id])) data[name][id] = saved[name][id]; });
      };
      const words = function (v) { return typeof v === 'string' && v.length <= 2000; };
      kept('answers', function (v) { return words(v) || typeof v === 'boolean' || (Array.isArray(v) && v.every(words)); });
      kept('said', function (v) { return typeof v === 'string'; });
      kept('files', function (v) {
        return Array.isArray(v) && v.every(function (f) { return f && /^[0-9a-f]{32}$/.test(f.id) && typeof f.name === 'string' && typeof f.size === 'number' && typeof f.sent === 'boolean'; });
      });
    } catch (e) { /* unreadable notes start empty */ }
  }
  load(store ? store.getItem(KEY) : null);
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?(?:-(words|spot)-\d+)?$/.exec(id) || [];
    if (m[5]) return Object.assign(where(id.replace(/-(words|spot)-\d+$/, '')), m[5] === 'words' ? { kind: 'words' } : {});
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: NOUN + ' #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot.
    // A screen's words sit in many small boxes: join every piece of text with a space.
    // Picture files read as their labels, joined with a dot.
    const row = el.tagName === 'TR', photo = el.classList.contains('photo'), cells = row ? c.querySelectorAll('td') : photo ? c.querySelectorAll('img')
      : el.classList.contains('screen') ? texts(c) : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = Array.prototype.map.call(cells, function (n) { return (photo ? n.alt : n.textContent).replace(/\s+/g, ' ').trim(); }).join(row || photo ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  // A note on words or a spot sits on its base target: words are found again by their quote, a spot by the base's label.
  function find(id, rec) {
    const m = /^(.*)-(words|spot)-\d+$/.exec(id), el = document.querySelector('[data-note="' + (m ? m[1] : id) + '"]');
    if (!el) return null;
    if (m && m[2] === 'words') return textOf(el).indexOf(rec.quote) >= 0 ? el : null;
    if (m && !el.querySelectorAll('.shot')[rec.k]) return null;
    return labelOf(el) === rec.label ? el : null;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .add'), function (n) { n.parentNode.removeChild(n); });
    return c.textContent.replace(/\s+/g, ' ');
  }
  // A new note on words or a spot takes the next free number on its target.
  function nextId(base, kind) {
    const pre = base + '-' + kind + '-';
    let k = 1;
    data.notes.map(function (n) { return n.id; }).concat(Object.keys(data.drafts)).forEach(function (id) {
      if (id.indexOf(pre) === 0) k = Math.max(k, +id.slice(pre.length) + 1);
    });
    return pre + k;
  }
  // The notes list groups notes by Why, each card, and Decisions.
  function groupOf(id) {
    const m = /^(why|item|decision)-(\d+)/.exec(id) || [];
    return m[1] === 'why' ? [0, 'Why'] : m[1] === 'item' ? [+m[2], NOUN + ' ' + m[2]] : [1e6, 'Decisions'];
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }))
      .map(function (id, i) { return [groupOf(id)[0], i, id]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .map(function (x) { return x[2]; });
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    let group = null;
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec);
      if (groupOf(id)[1] !== group) {
        group = groupOf(id)[1];
        const head = document.createElement('li');
        head.className = 'group'; head.textContent = group;
        $('note-list').appendChild(head);
      }
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        if (rec.x !== undefined) {
          pin.className += ' spot'; pin.style.left = rec.x + '%'; pin.style.top = rec.y + '%';
          el.querySelectorAll('.shot')[rec.k].appendChild(pin);
        } else slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      const id = el.getAttribute('data-note');
      if (el.closest('.art') || el.querySelector('.pin[data-open="' + id + '"]')) return;
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    all('.verdict', function (v) {
      const id = v.querySelector('[data-ok]').getAttribute('data-ok'), state = data.ok[id], n = id.slice(5);
      v.querySelector('.tag').hidden = !state;
      v.querySelector('.tag').textContent = state === 'sent' ? 'OK · Sent' : 'OK';
      v.querySelector('[data-ok]').textContent = state ? 'Undo' : 'OK';
      v.querySelector('[data-ok]').setAttribute('aria-label', (state ? 'Undo OK on ' : 'OK ') + NOUN.toLowerCase() + ' ' + n);
      v.querySelector('[data-open]').hidden = !!state;
    });
    const answers = replies();
    Object.keys(data.answers).forEach(function (id) {
      const q = document.querySelector('[data-q="' + id + '"], [data-live="' + id + '"]');
      if (!q || q.getAttribute('data-kind') === 'tick') return;
      if (!$('note-list').querySelector('.group.answers')) $('note-list').insertAdjacentHTML('beforeend', '<li class="group answers">Answers</li>');
      const line = q.hasAttribute('data-live') ? asker(id) + ' answer' : asker(id) + ', "' + q.getAttribute('data-label') + '"', v = data.answers[id];
      const sent = !answers.some(function (a) { return a.id === id; });
      $('note-list').insertAdjacentHTML('beforeend', '<li class="entry"><span class="where">' + esc(line) + (sent ? '<span class="tag">Sent</span>' : '') + '</span>'
        + esc(Array.isArray(v) ? v.join(', ') : v) + '</li>');
    });
    if (ids.length || $('note-list').querySelector('.answers')) { const none = $('note-list').querySelector('li.muted'); if (none) none.remove(); }
    fill(); drawFiles();
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, chipExtra = null, tap = null;
  // True once the inbox opens this page closed, or a tap on it reaches the chat: it takes no note.
  let readOnly = false;
  const pointers = {};
  // `extra` makes the chip start a new note on selected words or a picture spot.
  function showChip(el, x, y, keyboard, extra) {
    if (readOnly) return;
    const id = el.getAttribute('data-note');
    chipFor = el; chipExtra = extra || null;
    chip.textContent = extra && extra.quote ? 'Note' : !extra && (noteOf(id) || data.drafts[id]) ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; chipExtra = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false, spotAt(el, t.target, e)); else hideChip();
  });
  // A tap on a picture file in full screen notes that spot of it, kept in percent so it holds at any size.
  function spotAt(el, target, e) {
    if (!el.closest('#viewer') || !el.classList.contains('photo') || target.tagName !== 'IMG') return null;
    const r = target.getBoundingClientRect(), pct = function (v, size) { return Math.max(0, Math.min(100, Math.round(v / Math.max(1, size) * 100))); };
    return { k: Array.prototype.indexOf.call(el.querySelectorAll('img'), target), x: pct(e.clientX - r.left, r.width), y: pct(e.clientY - r.top, r.height), on: target.alt };
  }
  // Selected words in one note target offer a note on just those words.
  let picking = 0;
  document.addEventListener('selectionchange', function () {
    clearTimeout(picking);
    picking = setTimeout(function () {
      const s = window.getSelection ? window.getSelection() : null;
      if (!s || s.isCollapsed || !s.rangeCount || open) return;
      const range = s.getRangeAt(0), at = range.commonAncestorContainer, host = (at.nodeType === 1 ? at : at.parentNode).closest('[data-note]');
      const quote = s.toString().replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!host || !quote || host.closest('.art, #editor, #viewer') || textOf(host).indexOf(quote) < 0) return;
      const r = range.getBoundingClientRect();
      showChip(host, r.left + r.width / 2, r.bottom, false, { quote: quote });
    }, 150);
  });
  chip.addEventListener('click', function () {
    if (!chipFor) return;
    const id = chipFor.getAttribute('data-note'), extra = chipExtra;
    openEditor(extra ? nextId(id, extra.quote ? 'words' : 'spot') : id, chipFor, extra);
  });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id);
    const el = rec ? find(id, rec) : t.closest('[data-note]') || document.querySelector('[data-note="' + id + '"]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) {
        const el = chipFor, words = chipExtra && chipExtra.quote;
        hideChip();
        if (words && window.getSelection) window.getSelection().removeAllRanges();
        el.focus();
      }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el, extra) {
    if (readOnly) return;
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const quote = extra && extra.quote, clip = quote && quote.length > 60 ? quote.slice(0, 59) + '…' : quote;
    const label = draft ? draft.label : note ? note.label : quote ? 'words "' + clip + '"' : labelOf(el);
    open = { id: id, label: label, el: el, extra: extra || extraOf(draft || note) };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = Object.assign({ label: open.label, text: text }, open.extra);
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push(Object.assign({ id: id, label: open.label, text: text }, open.extra));
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length, k = oks().length, a = replies().length;
      copyNotes(function () { toast('Saved and copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump(hash) {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(typeof hash === 'string' ? hash : location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return Object.assign({ id: n.id, label: n.label, text: n.text }, extraOf(n)); }); }
  // An OK not yet in the chat, as its card's id, in card order.
  function oks() {
    return Object.keys(data.ok).filter(function (id) { return data.ok[id] === true; }).sort(function (a, b) { return a.slice(5) - b.slice(5); });
  }
  function acknowledge(notes, okd, ans) {
    ans.forEach(function (a) {
      if (a.said) data.said[a.id] = a.said;
      (data.files[a.id] || []).forEach(function (f) { if (a.files.indexOf(f.id) >= 0) f.sent = true; });
    });
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    okd.forEach(function (id) { if (data.ok[id] === true) data.ok[id] = 'sent'; });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id), spot = n.x === undefined ? '' : ', spot at ' + n.x + '% across and ' + n.y + '% down on "' + n.on + '"';
      return '- ' + w.spot + spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  // What goes to the chat: each OK on its own line, then the notes.
  function lines(notes, okd, ans) {
    return okd.map(function (id) { return NOUN + ' #' + id.slice(5) + ': OK'; }).concat(ans.map(function (a) { return a.line; }), bullets(notes)).join('\n');
  }
  function notesText() {
    const header = REVIEW ? document.body.getAttribute('data-header')
      : PREVIEW ? 'Notes on the preview of ' + NAME + ' from its review page. Don\'t publish yet.'
      : 'Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.';
    return header + '\n' + lines(unsent(), oks(), replies());
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  function plural2(n, k, a) {
    const parts = n || !(k || a) ? [plural(n)] : [];
    if (k) parts.push(k + (k === 1 ? ' OK' : ' OKs'));
    if (a) parts.push(a + (a === 1 ? ' answer' : ' answers'));
    return parts.join(' and ');
  }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length || oks().length || replies().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    if (hosted) return hostedAsk(path, body);
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), okd = oks(), ans = replies(), n = notes.length, k = okd.length, a = ans.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural2(n, k, a) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const body = { text: lines(notes, okd, ans) };
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('send', live, body);
      const changed = 'The ' + PAGE + ' changed. Reload to read it first.';
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (r.status === 409) { const why = ((await r.json()) || {}).gone ? GONE : changed; says(why); toast(why); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes, okd, ans);
      says('Sent ' + plural2(n, k, a) + ' to the chat.');
      toast('Sent ' + plural2(n, k, a) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length, k = oks().length, a = replies().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── OK and Change on each card: an OK is kept with the notes until undone, and goes to the chat with them ──
  all('.items > .item', function (item) {
    const v = document.createElement('div');
    v.className = 'verdict';
    v.innerHTML = '<span class="tag" hidden>OK</span><button type="button" class="btn-ghost" data-ok="' + item.id + '">OK</button>'
      + '<button type="button" class="btn-ghost" data-open="' + item.id + '" aria-label="Change ' + NOUN.toLowerCase() + ' ' + item.id.slice(5) + '">Change</button>';
    item.appendChild(v);
  });
  document.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('[data-ok]') : null;
    if (!b) return;
    const id = b.getAttribute('data-ok');
    if (data.ok[id]) delete data.ok[id]; else data.ok[id] = true;
    persist();
  });
  // A picture file's spot pins sit over the picture itself.
  all('.art.photo img', function (img) {
    const shot = document.createElement('span');
    shot.className = 'shot';
    img.parentNode.insertBefore(shot, img);
    shot.appendChild(img);
  });

  // ── the page's own buttons, from the builder; one that can't be undone asks once more above the footer ──
  let version = null, confirming = null;
  const ACTIONS = JSON.parse($('ready').getAttribute('data-actions') || '[]');
  const actionOf = function (name) { return ACTIONS.filter(function (a) { return a.name === name; })[0] || null; };
  const choice = function (name) { return $('ready').querySelector('[data-ready="' + name + '"]'); };
  ACTIONS.forEach(function (a) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('data-ready', a.name); b.setAttribute('data-label', a.label);
    if (a.confirm) { b.textContent = a.label; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'ready-confirm'); }
    else b.innerHTML = '<span class="spinner" hidden aria-hidden="true"></span><span></span>';
    $('ready').insertBefore(b, $('ready-confirm'));
  });
  function fillConfirm(a) {
    confirming = a;
    $('ready-confirm').querySelector('p').textContent = a.confirm.say;
    $('ready-confirm').setAttribute('aria-label', a.confirm.ask);
    choice('yes').setAttribute('data-label', a.confirm.yes);
  }
  if (ACTIONS.filter(function (a) { return a.confirm; }).length) fillConfirm(ACTIONS.filter(function (a) { return a.confirm; })[0]);
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (focus && wasOpen && !$('ready').hidden && confirming) choice(confirming.name).focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    const gate = drawNeeds();
    all('#ready > [data-ready]', function (b) {
      if (!b.querySelector('.spinner')) b.textContent = gate || b.getAttribute('data-label');
    });
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready'), spinner = b.querySelector('.spinner');
      const active = !!spinner && pending === (step === 'yes' ? confirming && confirming.name : step);
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(active));
      if (spinner) {
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : (b.parentNode === $('ready') && gate) || b.getAttribute('data-label');
      }
    });
    const shown = $('ready').hidden ? 0 : $('ready').querySelectorAll('#ready > button:not([hidden])').length;
    el.style.setProperty('--cols', String(Math.min(3, 1 + shown)));
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Each button shows when the link offers it; the choices stay hidden when it offers none.
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || typeof answer.version !== 'string') return;
    const shown = ACTIONS.filter(function (a) {
      choice(a.name).hidden = names.indexOf(a.name) < 0;
      return names.indexOf(a.name) >= 0;
    });
    if (!shown.length) return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot(), okd = oks(), ans = replies();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length || okd.length || ans.length) body.text = lines(notes, okd, ans);
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? actionOf(name).done
        : r.status === 409 && a.changed === true ? 'The ' + PAGE + ' changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : r.status === 409 && a.gone === true ? GONE : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes, okd, ans);
      // A gone file keeps the buttons, as a 429 does: the person picks it again and taps once more.
      if (line !== GONE) hideActions();
      says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready'), a = actionOf(step), gaps = needsOpen();
    // While the build needs the person, a go button leads to the first thing it needs instead.
    if (a && gaps.length) {
      all('.hit', function (n) { n.classList.remove('hit'); });
      gaps[0].classList.add('hit'); gaps[0].scrollIntoView({ block: 'center' });
      return;
    }
    if (step === 'yes') act(confirming.name);
    else if (step === 'cancel' || a.confirm) {
      says('');
      if (a) fillConfirm(a);
      $('ready-confirm').hidden = step === 'cancel';
      all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', String(b === button)); });
      bar();
      choice(step === 'cancel' ? confirming.name : 'cancel').focus({ preventScroll: true });
    } else act(step);
  });

  // ── answers: a form's inputs and a live card's answer, kept with the notes and sent with them under their card ──
  // `said` holds each answer as the chat last got it, so a changed answer goes again and an unchanged one never does.
  const asker = function (id) { const m = /^(item|need)-(\d+)/.exec(id); return (m[1] === 'item' ? NOUN : 'Need') + ' #' + m[2]; };
  function inputValue(q) {
    const kind = q.getAttribute('data-kind'), boxes = q.querySelectorAll('input:checked');
    if (kind === 'tick') return !!boxes.length;
    if (kind === 'choice') return boxes.length ? boxes[0].value : undefined;
    if (kind === 'choices') return boxes.length ? Array.prototype.map.call(boxes, function (b) { return b.value; }) : undefined;
    const v = q.querySelector('input, textarea').value.slice(0, 2000);
    return v.trim() ? v : undefined;
  }
  function fill() {
    all('.form [data-q]', function (q) {
      const v = data.answers[q.getAttribute('data-q')], kind = q.getAttribute('data-kind');
      if (kind === 'file') return;
      Array.prototype.forEach.call(q.querySelectorAll('input, textarea'), function (el) {
        if (el.type === 'radio' || el.type === 'checkbox') el.checked = kind === 'tick' ? v === true : kind === 'choice' ? v === el.value : Array.isArray(v) && v.indexOf(el.value) >= 0;
        else if (el.value !== (v || '')) el.value = v || '';
      });
    });
  }
  function answered(q) {
    const id = q.getAttribute('data-q'), v = data.answers[id];
    if (q.getAttribute('data-kind') === 'file') return !!(data.files[id] && data.files[id].length);
    return q.getAttribute('data-kind') === 'tick' ? v === true : v !== undefined;
  }
  // Each answer the chat has not got yet, in page order: its id, its line, and the files it names.
  function replies() {
    const out = [];
    all('.form [data-q], .live[data-live]', function (q) {
      const id = q.getAttribute('data-q') || q.getAttribute('data-live'), v = data.answers[id];
      if (q.getAttribute('data-kind') === 'file') {
        const fresh = (data.files[id] || []).filter(function (f) { return !f.sent; });
        if (fresh.length) out.push({ id: id, files: fresh.map(function (f) { return f.id; }),
          line: '- ' + asker(id) + ', "' + q.getAttribute('data-label') + '": ' + fresh.map(function (f) { return f.name; }).join(', ') });
        return;
      }
      if (v === undefined || data.said[id] === JSON.stringify(v)) return;
      const text = v === true ? 'Yes' : v === false ? 'No' : Array.isArray(v) ? v.join(', ') : v.replace(/\s*\n\s*/g, ' ');
      out.push({ id: id, said: JSON.stringify(v), files: [],
        line: '- ' + asker(id) + (q.hasAttribute('data-live') ? ' answer: ' : ', "' + q.getAttribute('data-label') + '": ') + text });
    });
    return out;
  }
  const fileIds = function (ans) { return ans.reduce(function (ids, a) { return ids.concat(a.files); }, []); };
  function typed(e) {
    const q = e.target.closest ? e.target.closest('.form [data-q]') : null;
    if (!q || q.getAttribute('data-kind') === 'file') return;
    const v = inputValue(q), id = q.getAttribute('data-q');
    if (v === undefined) delete data.answers[id]; else data.answers[id] = v;
    persist();
  }
  document.addEventListener('input', typed);
  document.addEventListener('change', typed);

  // ── files: checked here first, then sent at once through the link or the inbox; a send later names them by id ──
  const MB = 1024 * 1024, uploads = {}, waiting = {};
  let refs = 0;
  function upload(file, question) {
    if (hosted) {
      return file.arrayBuffer().then(function (buf) {
        return new Promise(function (resolve) {
          const ref = 'f' + (refs += 1);
          waiting[ref] = resolve;
          port.postMessage({ type: 'inbox:file', ref: ref, name: file.name, question: question, data: buf }, [buf]);
        });
      });
    }
    return fetch('file', { method: 'POST', cache: 'no-store', body: file,
      headers: { 'x-reply-key': live, 'x-file-name': encodeURIComponent(file.name), 'x-file-question': encodeURIComponent(question) } })
      .then(function (r) { return r.json().then(function (a) { return r.ok && a && /^[0-9a-f]{32}$/.test(a.id) ? { id: a.id } : { error: (a && a.error) || 'it was not sent; try again' }; }); })
      .catch(function () { return { error: 'it was not sent; try again' }; });
  }
  // The app deletes a file a day after it came, or with a tap that failed or was cancelled: one this page holds unsent
  // and the app no longer does goes back to its question, to be picked again.
  const GONE = 'A file is no longer held. Pick it again, then send.';
  function keepHeld(held) {
    let gone = 0;
    Object.keys(data.files).forEach(function (id) {
      data.files[id] = data.files[id].filter(function (f) {
        if (f.sent || held.indexOf(f.id) >= 0) return true;
        gone += 1;
        (uploads[id] = uploads[id] || []).push({ name: f.name, size: f.size, state: 'refused', why: 'the app no longer holds it; pick it again' });
        return false;
      });
    });
    if (gone) persist();
  }
  function bytesHeld() {
    return Object.keys(data.files).concat(Object.keys(uploads)).reduce(function (sum, id) {
      return sum + (data.files[id] || []).concat(uploads[id] || []).reduce(function (s, f) { return s + (f.state === 'refused' ? 0 : f.size); }, 0);
    }, 0);
  }
  function refusal(q, file) {
    const id = q.getAttribute('data-q'), ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1];
    const kept = (data.files[id] || []).length + (uploads[id] || []).filter(function (f) { return f.state === 'sending'; }).length;
    if (!live) return 'open this page from the chat\'s link to send files';
    if (!ext || q.getAttribute('data-types').split(',').indexOf(ext.toLowerCase()) < 0) return 'this question does not take this type of file';
    if (file.size > 25 * MB) return 'too big: 25 MB at most';
    if (kept >= +q.getAttribute('data-count')) return 'this question takes ' + q.getAttribute('data-count') + ' at most';
    if (bytesHeld() + file.size > 100 * MB) return 'the files for this page pass 100 MB';
    return '';
  }
  function send(q, entry) {
    const id = q.getAttribute('data-q');
    entry.state = 'sending'; entry.why = ''; render();
    upload(entry.file, asker(id) + ', "' + q.getAttribute('data-label') + '"').then(function (a) {
      if (a.id) {
        uploads[id] = uploads[id].filter(function (f) { return f !== entry; });
        (data.files[id] = data.files[id] || []).push({ id: a.id, name: entry.file.name, size: entry.file.size, sent: false });
        persist();
      } else { entry.state = 'refused'; entry.why = String(a.error); entry.retry = true; render(); }
    });
  }
  function pick(q, list) {
    const id = q.getAttribute('data-q');
    Array.prototype.forEach.call(list, function (file) {
      const why = refusal(q, file), entry = { file: file, name: file.name, size: file.size, state: why ? 'refused' : 'sending', why: why };
      (uploads[id] = uploads[id] || []).push(entry);
      if (!why) send(q, entry);
    });
    render();
  }
  const sizeText = function (n) { return n < MB ? Math.max(1, Math.ceil(n / 1024)) + ' KB' : (n / MB).toFixed(1) + ' MB'; };
  function drawFiles() {
    all('.form [data-kind="file"]', function (q) {
      const id = q.getAttribute('data-q'), list = q.querySelector('.files');
      list.innerHTML = (data.files[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + ' <span class="tag">Sent</span><button type="button" class="btn-ghost" data-file="' + i + '">Remove</button></li>';
      }).concat((uploads[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + (f.state === 'sending' ? ' <span class="muted">Sending…</span>'
          : ' <span class="why">Refused: ' + esc(f.why) + '</span>' + (f.retry ? '<button type="button" class="btn-ghost" data-retry="' + i + '">Retry</button>' : '')
            + '<button type="button" class="btn-ghost" data-drop="' + i + '">Remove</button>') + '</li>';
      })).join('');
    });
  }
  all('.form [data-kind="file"]', function (q) {
    const drop = q.querySelector('.drop'), input = drop.querySelector('input');
    input.addEventListener('change', function () { pick(q, input.files); input.value = ''; });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); pick(q, e.dataTransfer.files); });
    q.querySelector('.files').addEventListener('click', function (e) {
      const b = e.target.closest('button'), id = q.getAttribute('data-q');
      if (!b) return;
      if (b.hasAttribute('data-file')) { data.files[id].splice(+b.getAttribute('data-file'), 1); persist(); return; }
      const entry = uploads[id][+(b.getAttribute('data-retry') || b.getAttribute('data-drop'))];
      if (b.hasAttribute('data-retry')) send(q, entry);
      else { uploads[id] = uploads[id].filter(function (f) { return f !== entry; }); render(); }
    });
  });

  // ── what the build needs: an item that needs you counts until each of its questions has an answer ──
  function needsOpen() {
    return Array.prototype.filter.call(document.querySelectorAll('.need[data-need="needs"]'), function (n) {
      const qs = n.querySelectorAll('[data-q]');
      return !qs.length || Array.prototype.some.call(qs, function (q) { return !answered(q); });
    });
  }
  function drawNeeds() {
    const gaps = needsOpen();
    all('.need[data-need="needs"]', function (n) {
      const done = gaps.indexOf(n) < 0, tag = n.querySelector('.tag-outline, .tag');
      tag.className = done ? 'tag' : 'tag-outline';
      tag.textContent = done ? 'Answered' : 'Needs you';
    });
    return gaps.length ? gaps.length + (gaps.length === 1 ? ' thing needs you' : ' things need you') : '';
  }

  // ── live cards: the chat's own page in a sealed frame, talking to this page only through the port it is handed ──
  // A frame loads once; a second load means its page went somewhere else, so it starts again from its own copy.
  const cards = [];
  function mount(c) {
    if (c.port) c.port.close();
    c.port = null;
    const f = document.createElement('iframe');
    let loads = 0;
    f.setAttribute('sandbox', 'allow-scripts'); f.title = c.title; f.setAttribute('srcdoc', c.doc);
    f.addEventListener('load', function () {
      loads += 1;
      if (loads === 1) {
        const ch = new MessageChannel();
        c.port = ch.port1;
        ch.port1.onmessage = function (e) { heardCard(c, e.data); };
        f.contentWindow.postMessage({ type: 'review:hello' }, '*', [ch.port2]);
        return;
      }
      c.resets += 1;
      c.said.hidden = false;
      c.said.textContent = 'This card tried to leave the page.' + (c.resets > 2 ? ' Reload the page to try it again.' : '');
      if (c.resets > 2) { f.remove(); c.port.close(); c.port = null; } else mount(c);
    });
    c.stage.replaceChildren(f);
    c.frame = f;
    fitCard(c);
  }
  function heardCard(c, m) {
    if (!m || m.type !== 'review:answer' || typeof m.text !== 'string') return;
    const text = m.text.slice(0, 2000);
    if (text.trim()) data.answers[c.id] = text; else delete data.answers[c.id];
    persist();
  }
  // Phone and Computer draw the page at that width, scaled to the card; full screen shows it at true size.
  function fitCard(c) {
    if (!c.frame) return;
    const full = c.box.classList.contains('full'), k = full ? 1 : Math.min(1, c.stage.clientWidth / c.width);
    c.frame.style.width = c.width + 'px';
    c.frame.style.height = full ? '100%' : c.height + 'px';
    c.frame.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    c.stage.style.height = full ? '' : Math.ceil(c.height * k) + 'px';
  }
  function full(c, on) {
    c.box.classList.toggle('full', on);
    document.body.classList.toggle('viewing', on);
    c.tools.querySelector('[data-full]').textContent = on ? 'Close' : 'Full screen';
    fitCard(c);
    if (!on) bar();
  }
  all('.live[data-live]', function (box) {
    const old = box.querySelector('iframe'), tools = document.createElement('div'), said = document.createElement('p');
    tools.className = 'live-tools';
    tools.innerHTML = '<button type="button" class="btn-ghost" data-width="390" aria-pressed="true">Phone</button>'
      + '<button type="button" class="btn-ghost" data-width="1280" aria-pressed="false">Computer</button><button type="button" class="btn-ghost" data-full>Full screen</button>';
    said.className = 'muted live-said'; said.setAttribute('role', 'status'); said.hidden = true;
    const c = { box: box, id: box.getAttribute('data-live'), height: +box.getAttribute('data-height') || 640, width: 390, doc: old.getAttribute('srcdoc'),
      title: old.title, stage: box.querySelector('.live-box'), tools: tools, said: said, port: null, frame: null, resets: 0 };
    box.insertBefore(tools, c.stage); box.appendChild(said);
    tools.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-full')) { full(c, !box.classList.contains('full')); return; }
      c.width = +b.getAttribute('data-width');
      all('[data-live="' + c.id + '"] [data-width]', function (w) { w.setAttribute('aria-pressed', String(w === b)); });
      fitCard(c);
    });
    cards.push(c);
    mount(c);
    // A stage first laid out at no width, as in an Inbox frame still opening, fits again once it gets its width.
    if (window.ResizeObserver) new ResizeObserver(function () { if (c.stage.clientWidth !== c.seen) { c.seen = c.stage.clientWidth; fitCard(c); } }).observe(c.stage);
  });
  window.addEventListener('load', function () { cards.forEach(fitCard); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cards.forEach(function (c) { if (c.box.classList.contains('full')) full(c, false); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    cards.forEach(fitCard);
    if (open) place();
    bar();
  });
  // ── hosted: in the live app's inbox, a sealed frame that reaches the inbox only through the port its first greeting carries ──
  let hosted = null, port = null;
  const CODES = { sent: 200, changed: 409, done: 409, gone: 409, soon: 429, closed: 410, expired: 410 };
  function post(message) { port.postMessage(message); }
  // The inbox answers a tap only once the chat has it, or once it is refused, cancelled or failed.
  function hostedAsk(path, body) {
    return new Promise(function (resolve) {
      hosted.reply = function (state) {
        const status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        const answer = status === 200 ? { sent: true } : state === 'changed' || state === 'done' || state === 'gone' ? { [state]: true } : { sent: false };
        resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(answer); } });
      };
      const tap = { type: 'inbox:tap', action: path === 'send' ? 'send' : body.action, text: body.text || '' };
      if (body.files) tap.files = body.files;
      post(tap);
    });
  }
  // The inbox's switch owns the look: this frame can't remember a choice, so its own switch goes. Unknown looks change nothing.
  function look(theme) { if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark'); }
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:theme') look(m.theme);
    else if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) {
      load(m.value);
      if (hosted.held) keepHeld(hosted.held);
      hosted.held = null; render();
    } else if (hosted.reply && m.type === 'inbox:result') {
      if (Array.isArray(m.files)) keepHeld(m.files);
      const reply = hosted.reply; hosted.reply = null; reply(m.state);
      // A tap that reached the chat closes the page in the inbox, so it reads as answered now, as its Archive shows it.
      if (m.state === 'sent') closePage();
    } else if (m.type === 'inbox:file-result' && waiting[m.ref]) {
      const done = waiting[m.ref];
      delete waiting[m.ref];
      done(typeof m.id === 'string' && /^[0-9a-f]{32}$/.test(m.id) ? { id: m.id } : { error: typeof m.error === 'string' ? m.error : 'it was not sent; try again' });
    }
  }
  // Back and the workspace sit first in the page, so they scroll away with its words; the inbox's own bar stays put.
  function backRow(workspace) {
    const row = document.createElement('div'), back = document.createElement('button');
    row.className = 'back'; back.type = 'button'; back.className = 'btn-ghost'; back.textContent = 'Back';
    back.addEventListener('click', function () { post({ type: 'inbox:back' }); });
    row.appendChild(back);
    if (typeof workspace === 'string' && workspace) {
      const where = document.createElement('span');
      where.className = 'muted'; where.textContent = workspace; row.appendChild(where);
    }
    document.querySelector('main > header').prepend(row);
  }
  // A closed or answered page in the inbox is read-only: no button, no note, no answer or file.
  function closePage() {
    readOnly = true; document.body.classList.add('read-only');
    all('.form input, .form textarea', function (el) { el.disabled = true; });
    render();
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    // The files the app still holds for this page, checked once its notes arrive.
    hosted = { reply: null, held: Array.isArray(m.files) ? m.files : null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
    document.querySelectorAll('.theme-toggle').forEach(function (button) { button.remove(); });
    look(m.theme);
    // Notes live with the inbox page: this frame has no storage of its own.
    store = { setItem: function (key, value) { post({ type: 'inbox:notes-set', key: key, value: value }); } };
    post({ type: 'inbox:notes-get', key: KEY });
    backRow(m.workspace);
    if (m.readOnly === true) { closePage(); return; }
    setLive('inbox'); offer(m); render();
  });
  // In a frame, a link opens its own tab and a # link scrolls in place: the frame never leaves this page.
  // A srcdoc page resolves #why against the inbox's address, so following it would load the inbox here.
  document.addEventListener('click', function (e) {
    const a = window.parent !== window && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
    e.preventDefault();
    if (href.charAt(1) === '/') { jump(href); return; }
    let el = null;
    try { el = document.getElementById(decodeURIComponent(href.slice(1))); } catch (err) { /* a bad escape names nothing */ }
    if (el) el.scrollIntoView({ block: 'start' });
  }, true);
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
