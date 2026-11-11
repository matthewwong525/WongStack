# Memory becomes a plugin with one small store interface, WongStack runs on it, and it learns your topics

**Status:** ready-to-ship
**Branch:** modular-memory-plugin
**Open questions:** none

## Why

WongStack's memory works, but its brain is welded to one database: the computer writes the database queries itself, and the server reads each query to guess what it may show. That is hard to keep safe, and it means Relay Everything's "replaceable memory" would need a second memory system. Splitting it into a plugin, a small store interface, and WongStack's own extras gives one memory brain any repo or agent can install, with the database swappable later. Relay Everything also just worked out **topics**, a better way for a chat to know what you work on; this change brings them in, built on the new plugin.

## What Changes

- **Memory is one plugin, in three layers.** The memory brain (facts, the save check, the start-of-chat summary, search, capture, the before-edit warnings) becomes a plugin that installs into Claude Code and Codex with its own hooks. It never knows which database is under it. It talks to a store through a short list of named requests. WongStack's own parts (roles from the Access page, its code areas, people pages, `/improve-code`) plug in on top and stay in WongStack.
  ```svg
  <svg viewBox="0 0 600 250" font-size="14">
    <rect x="10" y="10" width="580" height="60" rx="8" fill="card" stroke="line"/>
    <text x="300" y="36" text-anchor="middle">WongStack's extras</text>
    <text x="300" y="56" text-anchor="middle" fill="muted">roles · code areas · people pages · /improve-code</text>
    <rect x="10" y="90" width="580" height="60" rx="8" fill="card" stroke="fg"/>
    <text x="300" y="116" text-anchor="middle">Memory plugin (Claude Code, Codex)</text>
    <text x="300" y="136" text-anchor="middle" fill="muted">facts · capture · summary · search · topics · tidy</text>
    <rect x="10" y="170" width="280" height="70" rx="8" fill="card" stroke="line"/>
    <text x="150" y="198" text-anchor="middle">WongStack's store</text>
    <text x="150" y="220" text-anchor="middle" fill="muted">today's database, same data</text>
    <rect x="310" y="170" width="280" height="70" rx="8" fill="none" stroke="subtle" stroke-dasharray="6 4"/>
    <text x="450" y="198" text-anchor="middle" fill="subtle">Later, not built now:</text>
    <text x="450" y="220" text-anchor="middle" fill="subtle">Relay space · a local file</text>
  </svg>
  ```
  No real picture: this is a map of the parts, not a screen.

- **The server decides who sees what, by its own rules.** Today your computer sends the server a database query and the server checks it. Now your computer asks by name ("search for *deploy*", "save these facts") and the server writes the query itself, with your role's limits built in. Nothing a computer sends can widen what it sees. Who sees what stays exactly as it is today.
  ```mermaid
  sequenceDiagram
    participant C as Your computer
    participant S as Memory server
    C->>S: search "deploy" (as Ana)
    S->>S: Ana is a member: shared facts + her own
    S-->>C: only the facts Ana may see
  ```

- **Your memory stays as it is.** Same database, same facts, same history: nothing is copied, rewritten, or lost. The start-of-chat summary keeps its limits, the before-edit warning keeps its timing, a fact saved offline still waits on your computer, chats are still cleaned of keys before upload, and a fact is still never edited, only replaced.

- **Updating is one sync.** ClaymooApp, WongOS, and Relay Everything get it with their next WongStack update. Claude Code loads the plugin from the repo with nothing to install. For Codex, the update installs the plugin on each computer once. A branch that has not taken the update yet shows its last saved summary and keeps new facts waiting on the computer until it does.
  ```text
  /wong-sync ─▶ server takes named requests
             ─▶ Claude Code: plugin loads from repo
             ─▶ Codex: plugin installed once
  old branch ─▶ last summary; facts wait, none lost
  ```

- **Any repo adds memory by pasting one message.** You paste a short message into any AI tool: it names memory's setup guide on GitHub. The AI copies the memory folder into your repo. It then finds what memory needs and fills each gap: it connects to a memory server that already exists, or adds the server part to your own app, or, with no app, offers WongStack's Cloudflare setup. It asks before each step that costs money or makes something public. A check that comes with memory proves the server answers and keeps each role to what it may see. Then the AI saves the work in your repo and asks before it sends it anywhere. Until memory is set up, a new chat asks you once if you want to set it up now. It never starts setup without your yes. In a WongStack install, setup stops: memory already comes with each update.
  ```text
  You paste:
    "Add WongStack's memory to this project.
     Follow the setup guide at <link>"
  AI ─▶ copies the memory folder in
     ─▶ uses or builds a server (asks first)
     ─▶ runs memory's check
     ─▶ saves it; asks before sending it
  Not set up yet? A new chat asks you once.
  ```

- **Every repo holds memory as a plain folder, and updates touch only what it has.** WongStack keeps each module, such as memory, in its own folder, side by side. Each repo that gets memory, a full WongStack install or memory alone, gets a plain copy of that folder, so a branch runs its own copy. There is no plugin shop and nothing to install in Claude Code. Codex still needs one command on each computer, and a chat tells you the command when it is missing or old. Your repo's own parts, such as the file that connects memory to your server, stay outside the folder, so an update can replace the folder safely. A WongStack install updates memory with WongStack's update. A repo with memory alone updates by pasting another message: your own edits in the folder stay, and the update stops and tells you when an edit and the new version change the same line.
  ```text
  WongStack (the source)
    memory folder, access folder (next)
  Each repo
    memory folder      a plain copy
    its own parts      kept outside it
  Update ─▶ only the module folders it has
         ─▶ keeps your own edits
  ```

- **A guide page shows how to build a module.** One wiki page holds the rules every module follows: one folder, its hooks inside it, a paste-in setup message, a chat start that asks first, setup that asks before it costs money, no list of what to install, and one test that installs the module alone into an empty repo. Memory is its worked example. The access module, next, follows the same page.
  ```text
  How to build a module
    one folder, hooks inside
    paste-in setup, asks first
    reaches out only through one slot
    example: memory
  ```

- **Memory runs itself; `/save` and `/close` no longer touch it.** Memory already saves each chat's facts and open to-dos by itself. Now it starts that when a chat ends, not only at the next chat's start, and it keeps the chat's record (cleaned of keys) at that moment too. So `/save` and `/close` drop their memory steps: `/save` saves your work, and `/close` updates the wiki from the chat itself and closes. The wiki tidy moves into the plugin, so any repo with memory can tidy its pages from its facts.
  ```text
  /save      ─▶ saves your work only
  /close     ─▶ wiki from the chat, closes
  chat ends  ─▶ memory keeps the record,
                writes facts and to-dos
  tidy       ─▶ inside the memory plugin
  ```

- **A fact links back to where it came from.** Each fact carries links to its sources. In WongStack that is the chat it came from, as today. Later, Relay Everything's facts can link to a note, a chat message, or a day, with no change to how the plugin asks. Health, places, and notes stay in Relay Everything's own plugin; when you pull a topic there, that plugin adds the notes and chats with its tag beside memory's facts.
  ```text
  Fact     Battery stays 40 mAh.  #battery
  Sources  WongStack: session:claude:7f3a
           Relay:     relay:note/91c2
  Topic pull in Relay:
    page · facts (memory) · notes, chats (Relay plugin)
  ```

- **Every page is a topic, not only code.** Each company knowledge page is a topic, named by its place: `people/ada`, `ads`, `customers/acme`. A fact about Ada carries `people/ada`, as a fact about the Worker carries `worker`. A topic's one-line summary is its page's first sentence, so no second copy goes stale.
  ```text
  Topic          Its page
  people/ada     knowledge/people/ada.md
  ads            knowledge/ads.md
  worker         wiki/stack/core-stack.md
  ```

- **A chat starts with your topics.** The summary at chat start opens with your company topics, one line each, and one line of code topics, so the AI knows what it can look into before you ask.
  ```text
  ## Topics
  people   Who is who, with their emails
  ads      How we run ads, and what works
  Code: worker, memory, plan, wiki, …
  ```

- **Your words bring in the topic they name.** Before the AI reads your message, your computer looks for topic names in it: a fast word match, no search, no network. A clear match adds that topic's summary; a near match only its name; at most three, each once per chat.
  ```text
  You: what did Ada say about the ads?
  (added) Topic people/ada: Ada runs our
          ads and wants weekly numbers.
          Topic ads: How we run ads.
  ```

- **One step pulls a topic, and pages grow from their facts.** The lookup you already have for code folders now takes any topic: its page, the pages around it, and its newest facts. The daily wiki tidy files facts onto their topic's page, makes a page for a new subject, and keeps each page's first sentence a true summary.
  ```mermaid
  flowchart LR
    C["Chat"] --> F["Fact"]
    F --> T["Tidy"]
    T --> P["Page"]
    P --> S["Next chat"]
  ```

**Not in this change:** the access plugin (sign-in, roles, the sign-in warning), which is the next plan, and which WongStack's memory sign-in then uses; health, places, notes, and *around a moment*, which stay in Relay Everything's own plugin; the Relay Everything store and the one-person local file (the interface fits them; nobody builds them yet), a memory search on each message, meaning-based search, a topic screen in the app, and Relay's shapeable columns and per-person web. **Breaking:** an installed repo's memory server and its computers must update together; a branch that has not updated reads only its last saved summary until it does.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

- `memory-plugin`: the core memory as an installable plugin for Claude Code and Codex: hooks inside it, the store interface it calls, the one repo seam (profile) it loads, how a repo gets it (a plain folder, from WongStack's update or from one pasted message, never a shop), how a repo with memory alone updates it, and the setup that builds a missing store.

### Modified Capabilities

- `memory`: store calls are named operations, and the server writes every query with the caller's visibility (replaces the raw-query checks and the old search fragment); the hooks come from the plugin; topics include company knowledge pages, the digest opens with a topic list, a message that names a topic gets its summary, and the lookup pulls a company topic.
- `workspace-cleanup`: `/close` writes nothing to memory and updates the wiki from its own chat; the wrap-up, threads, and transcript upload move to the memory plugin.
- `change-loop`: an errand's progress thread comes from the chat's capture, not from `/save`.
- `context-economy`: `/save` loses its facts-only procedure.
- `wiki-dream`: the tidy ships in the memory plugin; a dream and the small tidy place facts by their topic, make a page for a new subject and tag its fact, and keep each page's first sentence a current summary.

## Impact

- **Plugin (core):** `.agents/skills/memory/` moves to `.agents/plugins/memory/`, and in this repo only the skill folder becomes a link to it; every install keeps `.agents/skills/memory/` as a real folder; the plugin gains `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `hooks/claude.json`, `hooks/codex.json`, `README.md` (the paste-in install and update messages, and needs), `references/setup.md` (the setup guide, with its Update section), `store/interface.mjs`, `store/contract.mjs` (the check any backend runs), `scripts/topic-match.mjs`, `scripts/lib/topics.mjs`; `memory.mjs`, `lib/digest.mjs`, `lib/read-facts.mjs`, `lib/upkeep.mjs`, `before-edit.mjs`, `session-start.mjs` lose all SQL and call the interface; `lib/store.mjs` shrinks to local state and the spool.
- **WongStack extras (new folder):** `.agents/memory/profile.mjs`, `areas.json` (from `references/`), `d1/store.mjs` (the operations as D1 and R2 calls), `d1/connect.mjs` (company sign-in, schedule sign-in, admin key), `d1/admin.mjs` (migrate, people, keys; from `lib/members.mjs`), `d1/migrations/`, `knowledge.mjs`, `operations.mjs`, `lib/links.mjs`, `lib/callers.mjs`. Removed: `worker/statements.mjs`, `worker/memory-worker.mjs` (replaced by `d1/store.mjs` and the interface's `serve`).
- **App:** `app/worker/index.ts` and `memory-caller.ts` route `/_memory/v2/` to `serve`; the raw-query route is removed.
- **Settings:** memory hooks leave `.agents/settings.json` and `.agents/hooks.json`. Codex's plugin list is the root `.claude-plugin/marketplace.json` alone, its `memory` entry at `./.agents/skills/memory`; `.agents/plugins/marketplace.json` is removed. No Claude Code shop install.
- **Installs:** `payload-files.json` maps `.agents/plugins/memory/` to `.agents/skills/memory/` (replacing the managed link), and the sync writes shipped links into it at that path; `/wong-sync` and `/wong-setup` install the Codex plugin; `scripts/check-payload-links.mjs`, a module-version check, the payload manifest, `scripts/retired-names.json`, `CHANGELOG.md` (major).
- **Skills:** `/dream-memory` moves to `.agents/plugins/memory/skills/dream-memory/`; `/save` loses its facts step and `references/facts-save.md`; `/close` loses its fact, thread, and transcript steps.
- **Docs:** new `wiki/maintaining/adding-a-module.md` (linked from `wiki/maintaining/README.md` and `adding-a-skill.md`), `wiki/maintaining/repo-layout.md`, `wiki/development/memory.md`, `wiki/development/wiki-dream.md`, `wiki/stack/company-knowledge.md`, `.agents/rules/payload.md` (plugin hooks may use the plugin root), `references/writing-facts.md`, `/dream-memory`.
- **Tests:** `scripts/tests/memory-*.test.mjs` move from SQL checks to operation checks; new `memory-interface.test.mjs`, `memory-topics.test.mjs`, a module install test (each module alone in an empty repo), a line-count check.
- **Supersedes** the `topics-in-memory` draft (greasy-cheetah, never saved). The stale `installation-owned-memory-devices` branch (last touched 2026-10-03) conflicts with this layout and was already passed by sign-in ownership.

## Decision log

- **2026-11-10** — Asked how the switch from raw queries to named requests should happen → chose a clean switch: the server takes only named requests once the update is live; a branch not yet updated reads its cached summary and spools writes until it updates.
- **2026-11-10** — Asked how Codex gets the plugin → chose that `/wong-sync` and setup install it on each computer, and the memory hooks leave the repo's Codex settings.
- **2026-11-10** — Asked (in the topics chat) which parts of Relay Everything's memory WongStack should take → chose topics for everything, the topic list at chat start, the topic match on each message, and filling topic pages from facts; folded into this plan at Matthew's request.
- **2026-11-10** — Asked (in the topics chat) where topic pages live → chose both, by kind: company topics in company knowledge, code and process topics in the wiki.
- **2026-11-10** — Asked whether Relay Everything's health, notes, and places belong in the memory plugin or apart, and how the plan should prepare → chose two plugins: they stay in Relay Everything's own plugin; facts get source links now, filled in WongStack from the chat each fact already records, and Relay's plugin adds its notes and chats to a topic pull through the profile.
- **2026-11-10** — Asked how ClaymooApp, WongOS, and Relay Everything get the memory plugin → chose to install from WongStack's plugin shop; refined by the next entry.
- **2026-11-10** — Asked, after finding that 63 WongStack skill files run the memory tool from its repo folder, how WongStack installs get memory → chose with the stack: each WongStack update brings it, so the skills and memory never differ in version; the shop serves any repo that wants memory alone.
- **2026-11-10** — Asked whether plugins get their own repos → chose that Matthew's own plugins live in WongStack, one shop; a plugin can move later with a one-line shop change (`git-subdir` source), and its install name stays.
- **2026-11-10** — Asked where the access plugin is planned → chose its own plan, next; this plan leaves its slot in the profile's `connect`.
- **2026-11-10** — Asked what setup does in a repo with no memory server → chose to build it into the repo's own app, offer WongStack's Cloudflare setup when there is no app, and ask before each step that costs money or makes something public.
- **2026-11-10** — Asked whether setup can install the plugin itself → yes: setup runs `claude plugin marketplace add` and `claude plugin install` with `--scope project` by default, local on request, never user scope, because each repo needs its own profile.
- **2026-11-10** — Matthew asked that `/dream-memory` become part of the memory plugin, and that `/save` and `/close` stop using memory, as old steps → the plugin's capture is the one writer of a chat's facts; it now also starts when a chat ends and keeps the transcript then, which is the one job `/close` did that capture did not.
- **2026-11-10** — Assumed: WongStack scripts keep importing the plugin's small generic helpers (`lib/cli.mjs`, `primary-root.mjs`, `machine-id.mjs`, `parseEnv`, 106 lines), because the helpers ship with the stack and a second copy would go stale; `/save` and `/close` still call no memory command.
- **2026-11-10** — Assumed: the tidy reaches WongStack's own pages to check (specs, plans) and its publish step through one optional profile part, `tidy`, because the plugin must work in a repo with no OpenSpec or company knowledge.
- **2026-11-10** — Assumed: the plugin asks for no install settings (`userConfig`), because the profile the setup writes already holds the store's address and sign-in, and one place is smaller than two.
- **2026-11-10** — Assumed: the backend check ships in the plugin (`store/contract.mjs`) and WongStack's own tests run it, because a new backend needs the same proof WongStack's does, and one suite cannot drift from another.
- **2026-11-10** — Asked whether the plugin should sit inside its skill folder or in a plugins folder → Matthew wanted all plugins in one place, not spread over the repo: each plugin lives in `.agents/plugins/<name>/`, beside the shop list, and access joins it there.
- **2026-11-10** — Asked, after the build found that `/wong-sync` and `/wong-setup` skip a link to a folder, whether to keep the plugins in one folder or leave memory in its skill folder → chose one folder: the update and setup tools learn to make this one named link.
- **2026-11-11** — Asked, after Relay Everything's plan chose to copy memory into its own plugin rather than install it from the shop, which shape this change ships → first chose modular with no plugin, then, after seeing what an install brings and what setup does, chose to ship as built: the plugin, the shop, and the setup guide. Relay copies the plugin folder.
- **2026-11-11** — Asked whether setup can build the server and recommend Cloudflare → it does, but with no app it offers the whole WongStack install; a memory-only Cloudflare server that setup creates is its own next plan.
- **2026-11-10** — Assumed: the memory skill folder becomes a link to `.agents/plugins/memory/`, because Claude Code loads a `.claude/skills/<name>/` folder holding `.claude-plugin/` as `<name>@skills-dir` straight from the checkout (checked with Claude Code 2.1.310), so a branch runs its own memory code and the 63 files that run `memory.mjs` keep their path; the build confirms the link is followed.
- **2026-11-10** — Assumed: WongStack's extras live in a new `.agents/memory/` folder outside the plugin, because a repo that installs the plugin must not get WongStack's database code, and generic helpers the core itself uses (`lib/cli.mjs`, `primary-root.mjs`, `machine-id.mjs`) stay in the plugin, where 58 WongStack scripts already import them.
- **2026-11-10** — Assumed: the interface is one JavaScript object of named operations with one wire format (`POST <url>/v2/<operation>`, JSON), and the core ships both its HTTP client and the `serve` dispatcher, because today's store is remote and a later Durable Object backend can reuse the same wire, while a local-file backend implements the object directly.
- **2026-11-10** — Assumed: the repo plugs in through one profile module the core loads from `.agents/memory/profile.mjs`, because one seam is smaller than separate config files, and `.agents/` is the cross-agent folder, not a WongStack name.
- **2026-11-10** — Assumed: admin store jobs (migrations, moving notes to people, keys, schedule sign-ins) stay outside the interface in WongStack's D1 admin script, because they act on one backend's tables and another backend would do them differently.
- **2026-11-10** — Assumed: no database migration, because the operations read and write today's tables as they are.
- **2026-11-10** — Assumed: one change and one major release, topics built last on the new seam, because topics need the profile seam and splitting would build the seam twice.
- **2026-11-10** — Assumed: "fewer lines" is measured on the split alone: plugin plus extras plus server, without topics, below today's 4,236 lines of memory scripts and Worker, because topics are new behaviour.
- **2026-11-10** — Assumed: the topics decisions logged in the `topics-in-memory` draft carry over unchanged (summary from a page's first sentence, at most 8 company lines and one code line, clear and near match rules, skill names never match, once per chat, upkeep tags by path, the small tidy files pages, threads still need a verb or area tag), because Matthew approved them there; the design restates each where it applies.
- **2026-11-10** — Assumed (build): the server's sign-in code sits in `.agents/memory/d1/store.mjs` beside the statements, because the Worker bundles no Node code and `connect.mjs` reads files.
- **2026-11-10** — Assumed (build): the profile also has `commands` (WongStack's admin jobs, so `memory.mjs migrate` and `member` keep working), `lookup` is `{ named, before, after }`, and topics carry `hub`; a write may carry its `session`, and `dream` is a step tag.
- **2026-11-10** — Assumed (build): `team.json` is gone, because the caller's role comes back on every answer's header; `putSession` takes `host`; the admin's `stats` counts every fact; only a non-owner gets the "only its owner" transcript answer.
- **2026-11-10** — Assumed (build): search words with no word to match filter nothing, so the gate sends such a read with limit 0; the digest cache refresh after a write is its own request.
- **2026-11-10** — Assumed (build): an extract task binds to the store's `identity` (the person's sign-in subject, else the credential), set by WongStack's `connect`, else the git email, so a new key refuses an old task as before.
- **2026-11-10** — Assumed (build): the tag sync covers every topic, code and company; the session end marks the chat ended, so the next capture takes it at once.
- **2026-11-10** — Assumed (build): `profile.sessionStart` returns lines; the `memory@wongstack` warning reads `enabledPlugins` in the repo's and the person's Claude Code settings; the Codex line compares `.codex-plugin/plugin.json` versions, starting at `1.0.0`.
- **2026-11-10** — Assumed (build): every memory path outside `/_memory/v2/` answers 404; a future fact date becomes the store's time for every caller, the admin too.
- **2026-11-10** — Assumed (build): the payload names the link in a `core.links` map; the preflight reports a real folder at the link's place as missing; `/wong-sync` runs the Codex install from the source checkout and `/wong-setup` from the target's own copy.
- **2026-11-10** — Assumed (build): the contract's `makeStore()` returns `{ as(caller) }` over one set of data, as `references/setup.md` shows, and does not test WongStack's rule that a source names only its own session.
- **2026-11-10** — Assumed (build): topic lines run heading, company lines, `Code:` line, pull line, in 1 KB; skill names are `.claude/skills/` entries and the profile's step keys; `/dream` and `/dream-memory` both mean `/memory:dream-memory`.
- **2026-11-10** — Assumed (build): `measure-context.mjs` counts a linked skill folder as the skill it serves, so the memory skill stays in the instruction total.
- **2026-11-10** — Check: `scripts/fixtures/context-baseline.json` drops the `facts-save` route, because `/save` no longer has that route and its file is deleted.
- **2026-11-10** — Check: test cases deleted with the SQL route they tested, each replaced by an operation case: the SQL bypass loops (`readRefusal`, shadow names, `facts_fts` reads, `__mem_`), the raw batch rollback (now: a write refused part-way leaves no row), `LEGACY_FTS_HITS`, `mayTouch` and object paths (a caller names a fact, never a key), the advertised Content-Length 413 (the store checks the real size), the Cloudflare batch shape (now: a body that is not JSON answers 400), `personalFilter` (now the role cases), "the admin reads every run" (now: each digest shows only its own run), `consolidationState` and `WRITES` (now through `digest` and `putRun`), and the team half of the brief count, since no client-side team mode is left.
- **2026-11-10** — Check: `.github/scripts/wiki-links.mjs` imports the wiki check from its new place, `.agents/memory/lib/links.mjs`, because the file moved; the check is unchanged.
- **2026-11-10** — Check: `.github/workflows/qmd-retrieval.yml` watches `.agents/plugins/memory/**` in place of `.agents/skills/memory/**`, because that path is now a link and Git sees no change under it.
- **2026-11-10** — Check: `.github/workflows/payload.yml`, `scripts/payload-checks.mjs`, and `scripts/tests/.c8rc.json` lint and cover `.agents/memory/` and the plugin's `store/` in place of the deleted `worker/` folder, because the store and the WongStack extras moved there; nothing leaves the lint or coverage.
- **2026-11-10** — Check: `scripts/tests/memory-areas.test.mjs` accepts a spec doc an open change adds under `openspec/changes/*/specs/`, because an area must name the change's new spec before `/ship` archives it to `openspec/specs/`.
- **2026-11-10** — Check: `scripts/tests/pickup.test.mjs` expects 19 node hooks in `.agents/settings.json` and `.agents/hooks.json`, not 23, because the four memory hooks moved into the plugin's own hook files; the copy now keeps links as links, so the test no longer writes through a link into this checkout.
- **2026-11-10** — Assumed (build): the plugin's Claude Code hooks start with the same `PATH="$HOME/.local/bin:$PATH"` as the repo's hooks, so a Node in the user folder runs them; `tools-on-path.test.mjs` now counts them, and the Codex file still sets no PATH.
- **2026-11-10** — Assumed (build): `verify-memory-areas.mjs` gives its fixture repo the source's profile through `WONG_MEMORY_PROFILE`, because the areas map now lives in the profile, not the plugin.
- **2026-11-11** — Assumed (build): the §7 line count leaves out `store/contract.mjs`, because it is a `node:test` suite, as the tests are. The split counts 4,219 lines (4,468 with the contract, before the cuts), below 4,236.
- **2026-11-11** — Assumed (build): the setup run in a scratch app (task 8.4) showed that a shop install's profile and app can not import from the plugin's folder, which sits outside the repo and moves with each update. `openStore` now makes the `httpStore` when `connect` gives only `{ url, headers }`, and `references/setup.md` copies `store/interface.mjs` into the app and `store/contract.mjs` beside the check; a test in `memory-interface.test.mjs` covers the new profile shape.
- **2026-11-11** — Asked whether modules need one guide page, and what it owns → chose a new page, `wiki/maintaining/adding-a-module.md`, linked from `wiki/maintaining/README.md` and `adding-a-skill.md`, with memory as its linked example, not copied. It owns the module rules: one folder per module in the source; the repo's own parts outside it; hooks inside it; a README that leads with a paste-in install message; a start-of-chat check that asks first, once per chat; setup that asks before each step that costs money or makes something public and ends with the check; no dependency list and no installed-modules file; reaching outside only through a named slot; installed = the module folders in the skills folder; one test that installs each module alone into an empty repo.
- **2026-11-11** — Asked how an install holds a module → chose a real folder in every install, a full WongStack install or memory alone: only the WongStack source keeps `.agents/plugins/<name>/` and the `.agents/skills/memory → ../plugins/memory` link. The payload maps the source path to the install path, which replaces task 1.6's managed link; every other folder link is still refused.
- **2026-11-11** — Asked how a repo with no WongStack gets memory → chose a paste-in message that names `references/setup.md` by its GitHub address: setup copies the module folder into the repo as a real folder, writes the repo's own parts, fills each gap as before (an existing server, else the server part in the repo's app, else an offer of Cloudflare), runs the check, commits, and asks before any push. In a full WongStack install it still stops.
- **2026-11-11** — Assumed: the plugin shop stops being an install path: no Claude Code shop install, no `memory@wongstack` Claude Code name, and no "never user scope, `--scope project`" steps; only the list Codex needs stays, because a copy in the repo already reaches each teammate through git and gives each branch its own copy, which was all the shop's project scope gave.
- **2026-11-11** — Asked how Codex gets memory in an install repo, which needs a plugin install once per computer → chose to test option A first: a root `.claude-plugin/marketplace.json` entry that points at the skill folder, then `codex plugin marketplace add <checkout>` and `codex plugin add`, with no plugins folder; option B (hooks in the repo's own Codex hooks file) only if A fails, because B puts memory's hooks in the repo's shared settings. Chat start names the one command when the plugin is missing or older. The build records the result in design §5 and §8.
- **2026-11-11** — Assumed: an update touches only the module folders a repo has. A full WongStack install updates through `/wong-sync` with the path mapping. A repo with memory alone updates through an Update section in `references/setup.md`, reached by a paste-in message: it takes the folder's `plugin.json` version as the merge base, three-way merges each file against the newest version from GitHub (`git merge-file`), keeps the repo's local edits, and on a conflict stops and writes nothing; because the update must keep a repo's own edits, the version already sits in the folder, and one pasted message is the same path as the install.
- **2026-11-11** — Asked how memory's missing-store line should read → chose one short line that has the AI ask the person first ("Memory isn't set up yet. Set it up now?"), once per chat, and never start setup on its own.
- **2026-11-11** — Assumed: each change to a module folder raises the version in both of its `plugin.json` files, and a payload check fails when it does not, because the update finds its merge base by that version, and two different copies under one version would make the merge read new lines as local edits.
- **2026-11-11** — Assumed: Codex's list is the root `.claude-plugin/marketplace.json` alone, its `memory` entry at `./.agents/skills/memory`, the same text in the source and every install; `.agents/plugins/marketplace.json` goes, because Codex reads either file and an install must have no plugins folder. In a repo with memory alone, setup adds the entry to the repo's own list when it has one, and the chat-start line reads the list's name.
- **2026-11-11** — Assumed: when the Codex plugin is missing, no plugin hook runs to say so; in a WongStack install the stack's own Codex start hook names the command, and in a repo with memory alone setup adds one line to the repo's `AGENTS.md`, because `AGENTS.md` is the repo's own part and option B is the only other place that runs.
- **2026-11-11** — Assumed: the sync writes each shipped Markdown link into `.agents/plugins/<name>/` at its install path, `.agents/skills/<name>/`, on the old and new copies alike, and `check-payload-links.mjs` resolves it there, because a link that names `.agents/plugins/` breaks in every install, and a link through the source's skill link breaks on GitHub.
- **2026-11-11** — Assumed: an app's server part imports `store/interface.mjs` from the memory folder, now in the repo, and copies it only when the app's build can not reach outside its own folder, because an update then brings the server part's `serve` with the folder; this replaces the copy step of the 2026-11-11 setup-run entry.
- **2026-11-11** — Assumed: the "`memory@wongstack` is enabled" warning goes, because with no Claude Code shop install nothing can run memory's hooks twice.
- **2026-11-11** — Assumed: the module guide is docs and adds no capability, because each promise it states for memory sits in `memory-plugin`; that spec gains "An install updates only the modules it has", which a repo with memory alone relies on to keep its edits.
- **2026-11-11** — Assumed (build): Codex option A works (task 9.1): a root `.claude-plugin/marketplace.json` entry at `./.agents/skills/memory` installs from a real folder and through the source's link, and its hooks run after trust and load the repo's profile. Option B (hooks in the repo's own Codex hooks file) is not built.
- **2026-11-11** — Assumed (build): the stack's Codex start hook (`codex-plugin.mjs --check`) reads only `$CODEX_HOME/config.toml` for a `[plugins."memory@<list name>"]` table, because that is what `codex plugin add` wrote in task 9.1, and a hook must not run Codex.
- **2026-11-11** — Assumed (build): the module version check passes a module that `main` does not have yet, because it has no earlier version to rise from; memory still goes to 1.1.0.
- **2026-11-11** — Assumed (build): the setup guide was cut to fit the skill-text budget: its profile example names only `connect` and `topics` and links the wiki's profile section for the rest, because the guide tells the AI to add the other parts only when the repo needs them.
- **2026-11-11** — Assumed (build): the §7 count leaves out `.agents/memory/topics.mjs` with the other topic files, as the 4,219 count did. After group 9 the split counts 4,226 lines (4,254 with that file) after the review fixes, below 4,236.
- **2026-11-11** — Assumed (ship): the live check (old task 8.5) runs after the merge, not as a task, because the archive needs every task ticked first. `/ship` opens a new Claude Code chat and a Codex chat after the deploy, checks the digest, a before-edit warning, a topic match, a `put-facts`, and that `memory.mjs stats` matches the 8.3 counts, and reports the result.
- **2026-11-11** — Assumed (build): setup in a repo with memory alone copies the folder to `.claude/skills/memory/`, not `.agents/skills/memory/`, because in task 9.14 Claude Code 2.1.322 loaded `memory@skills-dir` from `.claude/skills/` and not from a real `.agents/skills/memory/` in a repo with no `.claude → .agents` link. A WongStack install keeps `.agents/skills/memory/`, which its `.claude` link makes the same folder; Codex's list entry names the folder setup used.
- **2026-11-11** — Assumed (build): in an empty repo with no store, the simplest local answer to the Cloudflare offer is no; the guide now deletes the copied folder and stops, so the repo is unchanged and each chat still asks once.
- **2026-11-11** — Assumed (build): task 9.14's redo found two gaps in the guide. `/wong-setup` installs only into an empty folder with no commits, so the copied memory folder made it refuse; the guide now deletes the copy before the Cloudflare offer, and stops when the repo is not empty. A memory server reached by `connect` has no fresh store for `checkStore`, so there the check is a chat start that shows the digest. The guide asks the person for a server's address, because an empty repo holds none.
- **2026-11-11** — Assumed (build): the task 9.14 app's store is a SQLite port of the stand-in store, signed in by a hashed member key from the ignored `.env`; the guide now links the stand-in as the place to start and says what `serve`'s `prefix` and `store` are, and an update reruns Codex's two commands when Codex is present.
- **2026-11-11** — Archive checkpoint: archived for `/ship`; after `main` came in, the new spec got its Purpose and the setup guide lost four words to stay inside the instruction budget.
- **2026-11-11** — Check: `.agents/verification/journeys/mini-apps/reading-down-a-long-page.json` drops its Inbox half and keeps the Access half, because the Inbox no longer has an *Add task* list since the week board was deleted, so it is shorter than a phone screen and the old step never finds its text; the Access page still proves the top bar stays at the top while the page scrolls.
- **2026-11-11** — Archive checkpoint: the preview check kept two catalogue-search checks and re-recorded the long-page check; the result is on the pull request.
