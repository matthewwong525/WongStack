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
