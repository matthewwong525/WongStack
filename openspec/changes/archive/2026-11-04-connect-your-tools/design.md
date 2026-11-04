# Design: connect your tools after install

## Context

See [proposal.md](proposal.md) for why. What exists, checked on 2026-11-04:

- `/wong-setup` ends on [Step 5's closing report](../../../.agents/skills/wong-setup/references/cloudflare.md#step-5--the-closing-report), which ends on the URL and the next step: open the site and paste the *Make it yours* request (`app/src/pages/home/Tutorial.tsx`). That paste is also the human login check. Setup signs the owner in to their app once, so `company-api.mjs` works on the owner's computer.
- [`company-api.mjs services --all --json`](../../../wiki/stack/service-catalogue.md#list-the-services-you-can-use) gives each key in [the key registry](../../../app/worker/keys.ts): name, purpose, saved or not, the caller's level, its notes page. A tool in no row is one the app doesn't know.
- Adding a tool = a registry entry with `forward`, `docs`, `lookups` ([use a key directly](../../../wiki/stack/company-api.md#use-a-key-directly)) and the secret's declaration in `app/.dev.vars.example`; then [the key link](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link) saves the value, `HANDOVER_APP_KEYS` names it, and `npm run secrets:push` sends it to the app with the Cloudflare token ([a saved key shows in Access](../../../wiki/stack/api-keys.md#a-saved-key-shows-in-access)). A key [renewed through a sign-in](../../../wiki/stack/company-api.md#use-a-key-directly), such as Google's, can't be set up this way.
- The Cloudflare token is only in the owner's computer's `.env`. A teammate's computer has none, and the app refuses Access changes from an assistant.
- `measure-context.mjs`: start-up 2,181 of 2,200 words (19 left); instructions 26,862 of 27,148 words (about 280 left). The unpublished `first-day-lessons` plan also asks for about 12 start-up words.

## Goals / Non-Goals

**Goals:** right after install, the owner connects their tools in the same chat; one key link and one *publish it?* for every new tool; the same helper for one tool later; a teammate gets a clear message.

**Non-goals:** browser sign-in or password links (steps only for now); a status script; changing Access; a plan page for adding a tool; teammates' setup report.

## Decisions

### 1. Setup goes on to `connect` after its closing report

Step 5 of `cloudflare.md` gets one line: after the report, and before the *Make it yours* next step, follow the `connect` skill in the target (its `SKILL.md` and wiki page are on disk after install, even if this chat started elsewhere). A *skip* ends it at once. Then end on the URL and the *Make it yours* step, as today. An evaluation run, or an install that failed, does not connect.

- The paste stays the human check; it only moves after connecting.
- *Alternative:* connect inside *Make it yours*. Rejected by Matthew's choice; it would also change the starter site's message.

### 2. `connect` is one short skill; the steps are a wiki page

`.agents/skills/connect/SKILL.md`, model-invoked so *connect my tools*, *connect my Figma* and *connect Figma for Ana* find it. Description about 10 words, for example *Connect a person's work tools to their assistant, step by step.* It reads [`wiki/stack/connect-your-tools.md`](../../../wiki/stack/connect-your-tools.md) and follows it. Its rules: plain words; never a key or password in the chat; key website steps in the person's own browser ([token steps](../../../wiki/development/secrets.md#api-token-website-steps)); no browser or password link while connecting; never change Access.

- **Start-up budget.** 10 words here plus about 12 for `lesson` exceed 19. If the check fails, cut an equal number of words in this change from `update-dependencies`' description (meta-only, so installs lose nothing), for example *Update this repo's toolchain and app dependencies; checks the OpenSpec CLI contract; only when asked.*

### 3. Sort each tool

The helper asks which tools the person uses (all on the first run, one when named), runs `services --all --json` once, and matches each tool by name or id, asking once when two rows could match. It decides *can store* by the Cloudflare token in the primary worktree's `.env`.

| `services` says | Can store (owner) | Can't store (teammate) |
|---|---|---|
| Saved, caller has a level | Ready: one look-up | Ready: one look-up |
| In the registry, not saved | Key link, `secrets:push` (no code change) | Message: *save the key* |
| Saved, caller has no level | — (the owner holds every key) | Message: *give me a level on Access* |
| No row | Decision 4 | Message: *connect <tool> for <name>* |
| No row, no API at all (a website only) | Not connected yet | Not connected yet |

A look-up is a read action, or a `GET` from the notes page or the guide, run through `company-api.mjs`; none known → just *ready*. Whether a tool has a public API comes from its own developer pages.

### 4. New tools: work out how, then one key link, one change, one yes

Most tools are new to the app, so working out how to add one is the helper's main step. For each *No row* tool, it reads the tool's own developer pages (plain pages, never a signed-in browser) and picks the first way that fits:

| The tool offers | The app gets | Example |
|---|---|---|
| A fixed API key or personal access token | A [key used directly](../../../wiki/stack/company-api.md#use-a-key-directly): `forward`, `docs`, `lookups` | Stripe restricted key, Figma personal token |
| A remote MCP server that takes a fixed key | [An MCP server through the app](../../../wiki/stack/company-api.md#use-an-mcp-server-through-the-app): `forward.mcp`, with `reads` checked by hand | a server with a bearer key |
| Only a sign-in (OAuth) that renews | Nothing yet: *not connected yet: it needs a sign-in, which the app can't keep yet* | Google mail and calendar |

A service with a key you can limit gets the narrowest read-only key that fits the person's job. What it found (the auth kind, the key page, the scopes, one look-up) goes on the tool's [notes page](../../../wiki/stack/service-catalogue.md#notes-on-each-key-based-service), `wiki/services/<id>.md`, in the same change, so a later chat or install reads it instead of working it out again. When an install's notes page for the tool already exists, the helper starts from it.

Then, for every tool that fits the first two rows together:

1. The owner's naming of the tools is the go. Record one change through the OpenSpec CLI contract (`openspec new change`, the artifacts by `openspec instructions`, validate), not through `/plan`, so no review page or exit-round question comes first.
2. Write the registry entries (`forward`, `docs`, `lookups` only from routes the guide documents as read-only, or `mcp`), the declarations in `app/.dev.vars.example`, and the notes pages.
3. Open one key link for all of them, with a guide entry each (`url`, `steps`, a harmless `check`), and wait.
4. `/save` it; CI is the gate.
5. Ask *publish it?* once, naming the tools. On yes, `/ship`. Then `npm run secrets:push` and each tool's look-up on the live app. On no, the keys stay in `.env` and the change stays saved; the list says *waiting for publish*.

Previews read only `app/.dev.vars.staging`, so a look-up runs on the live app after publish, as [secrets](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link) says.

- *Alternative:* a plan page per tool. Rejected by Matthew's choice: a registry entry is small, and the first day must be quick.

### 5. A teammate's message; the owner's *for <name>*

On a computer that can't store, waiting tools get one message naming the owner (from the company knowledge's people pages when it can, else *the owner*), asking them to say *connect <tool> for <name>*. On the owner's side, *for <name>* runs decision 3 for that tool, then ends with: *Give Ana Read on Figma in Access: <Access link>.* The assistant never changes Access.

### 6. The ending

The list: ✓ works, … waiting, – not connected yet. After install, the next words are setup's *Make it yours* step (decision 1). Later, the list alone.

### 7. Docs

New `wiki/stack/connect-your-tools.md`, *Connect your tools*: the three groups in plain words, the owner's one-yes path, the teammate's message, and *not connected yet*. Links: [the stack hub](../../../wiki/stack/README.md) beside the services list; [getting started](../../../wiki/stack/getting-started.md) beside *Give it a key*; [API keys](../../../wiki/stack/api-keys.md#a-saved-key-shows-in-access); [the services list](../../../wiki/stack/service-catalogue.md#list-the-services-you-can-use).

## Risks / Trade-offs

- **Start-up budget** → decision 2 names the cut.
- **A tool's pages are unclear or wrong** → the key link's `check` tests the key once on save, and each look-up after publish shows it works; a failure is named in the list, not hidden.
- **A wrong `lookups` entry lets Read change things** → only routes the guide documents as read-only, and the app's registry tests run in CI before the yes.
- **The owner says no to publish** → keys stay on the computer only; the list says what waits, and *connect my tools* later picks it up.
- **Steps only leaves websites unconnected** → normal browsing in later tasks is unchanged; a later change can add browser sign-in here.
- **Setup's chat started outside the target** → decision 1 reads the skill and page from the target's paths.

## Migration Plan

Installs get it with `/wong-sync`. An owner who installed before types *connect my tools*. Removing the skill and Step 5's line restores today's behavior.
