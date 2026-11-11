# Design

## Context

Memory today is `.agents/skills/memory/`: 4,236 lines of scripts and Worker (`scripts/`, `scripts/lib/`, `worker/`), D1 migrations, and hooks wired into `.agents/settings.json` (Claude Code) and `.agents/hooks.json` (Codex). The client builds every SQL statement: `lib/digest.mjs` (the digest batch), `lib/read-facts.mjs` (search and brief), `memory.mjs` (gate, put-facts, retag, upkeep, show, live, stats, tags, sessions, runs), `before-edit.mjs`. `lib/store.mjs` sends them as a Cloudflare-shaped D1 batch or R2 object call. The Worker (`worker/memory-worker.mjs`) runs them on its bindings after `worker/statements.mjs` guesses whether each one is safe: it matches write shapes, rewrites supersedes, and wraps every non-admin read in shadow CTEs (`shadowRead`, `readRefusal`, `LEGACY_FTS_HITS`). That guard is the most fragile code in memory, and it exists only because the client sends SQL.

Two facts shape the packaging:

- **Claude Code loads a project skill folder as a plugin.** With Claude Code 2.1.310, a `.claude/skills/<name>/` folder holding `.claude-plugin/plugin.json` loads as `<name>@skills-dir` from the checkout itself, hooks included (`hooks/hooks.json`), once the workspace is trusted. Nothing is copied, so a branch runs its own code. Checked in a scratch repo: `claude plugin list` reported it, skipped only for trust.
- **Codex 0.159 has plugins** (`codex plugin marketplace add <path>`, `codex plugin add <plugin>@<marketplace>`), reads a repo marketplace at `.agents/plugins/marketplace.json` or `.claude-plugin/marketplace.json`, manifests at `.codex-plugin/plugin.json`, and plugin hooks (`plugin.json#hooks`). An installed plugin is materialized (copied) and its hooks need trust.

The topics design comes from the `topics-in-memory` draft (greasy-cheetah), approved by Matthew and folded in here; its decisions are restated where they land.

## Goals / Non-Goals

**Goals:**
- One core memory plugin, the same for any repo, that never names a database.
- One small store interface of named operations; the server writes every query and enforces [who sees what](../../../wiki/development/memory.md#who-sees-what) unchanged.
- WongStack's D1 + R2 backend answers it from the same tables with no data migration.
- WongStack's extras plug in through one seam; WongStack's own memory runs through the plugin.
- Topics: company pages as topics, the digest's topic list, the message hook, the topic pull, pages filled from facts.
- Fewer lines for the split than today.

**Non-Goals:** health, places, notes, or *around a moment* in the memory plugin (they stay in Relay Everything's own plugin); building the Relay Everything (Durable Object) or local-file backend; an adapter or registry for backends; changing the schema, the role table, the digest limits, or the gate; a memory search per message; embeddings.

## Decisions

### 1. Three layers, by folder

The WongStack source and an install differ in one place: where the module folder sits.

```text
WongStack source (this repo)
.agents/plugins/              every module, side by side; nothing else
  memory/                     this plan
  access/                     the next plan
.agents/skills/memory ──▶ ../plugins/memory   a link, in the source only
.claude-plugin/marketplace.json   Codex's list: memory at ./.agents/skills/memory

Every install (a full WongStack install, or memory alone)
.agents/skills/memory/        a real folder (.claude/skills/memory/ in that layout)
.agents/memory/profile.mjs    the repo's own part (a full install: all of .agents/memory/)
.claude-plugin/marketplace.json   Codex's list, the same entry (§5)
                              no .agents/plugins/, no link

.agents/plugins/memory/       the plugin (core): any repo, any backend
  .claude-plugin/plugin.json  Claude Code: loads from the skills folder as memory@skills-dir
  .codex-plugin/plugin.json   Codex: installed once per computer from the root list
  hooks/claude.json           SessionStart, UserPromptSubmit, PreToolUse, SessionEnd
  hooks/codex.json            the same, Codex names (no end event: see §5)
  skills/dream-memory/        the tidy: SKILL.md, scripts/dream.mjs (moved)
  SKILL.md  README.md          README: the paste-in install and update messages, needs
  references/writing-facts.md  references/setup.md   setup and update (§8)
  store/interface.mjs         the operations, the HTTP client, serve()
  store/contract.mjs          the check any backend runs (§8)
  scripts/memory.mjs          the CLI: gate, put-facts, search, brief, recall…
  scripts/session-start.mjs  before-edit.mjs  topic-match.mjs  run.mjs
  scripts/lib/                digest, search, gate, upkeep, topics, spool,
                              transcripts (redaction), extract, documents/,
                              cli, primary-root, machine-id
.agents/memory/               WongStack's extras: not in the plugin
  profile.mjs                 the one seam the core loads
  areas.json                  code areas (from references/)
  lookup.mjs  links.mjs  callers.mjs   the `areas` extras
  knowledge.mjs  operations.mjs        company knowledge, actions catalogue
  d1/store.mjs                the operations as D1 + R2 calls (Worker side)
  d1/connect.mjs              the sign-in: company, schedule, admin key
  d1/admin.mjs                migrate, people, keys (Cloudflare API)
  d1/migrations/
```

- **Every module lives in `.agents/plugins/<name>/` in the source**, so memory and access sit side by side, not spread over the repo. [Adding a module](../../../wiki/maintaining/adding-a-module.md) owns the module rules; memory is its example.
- **In the source, the skill folder is a link to the module.** `.agents/skills/memory` points to `../plugins/memory`, so Claude Code loads it from the checkout as `memory@skills-dir`, with no install, and a branch runs its own code.
- **In every install, the skill folder is a real folder.** The payload maps the source path `.agents/plugins/memory/` to the install path `.agents/skills/memory/` (§8), and setup copies the folder to the same place in a repo with memory alone. Claude Code loads it as `memory@skills-dir` from the checkout, as in the source. The 63 files that run `.claude/skills/memory/scripts/memory.mjs` keep that path in both. The installed modules are the module folders in the skills folder: no list of them is kept.
- **The repo's own parts stay outside the module folder:** the profile, the server part, and settings. An update can then replace the folder and lose nothing. A Markdown link names the real path, `.agents/plugins/memory/…`, because GitHub can't follow a link through a symlink ([repo layout](../../../wiki/maintaining/repo-layout.md)).
- **Generic helpers stay in the plugin.** `lib/cli.mjs`, `lib/primary-root.mjs`, and `lib/machine-id.mjs` are used by the core; the 58 WongStack scripts that import them keep doing so. Only code the core never calls leaves.
- **WongStack-only code leaves the plugin** for `.agents/memory/`: the D1 backend, the sign-in, admin jobs, `areas.json`, the `areas` extras (`links.mjs`, `callers.mjs`, past changes), `knowledge.mjs`, and `operations.mjs`. A repo with memory alone gets no WongStack database code, and the module imports no file outside its own folder: a test installs it alone into an empty repo (§8).
- **Removed:** `worker/statements.mjs` and `worker/memory-worker.mjs` (replaced by `serve` and `d1/store.mjs`), the client SQL in every file above, and the memory hook entries in `.agents/settings.json` and `.agents/hooks.json`.

### 2. The store interface

One file, `store/interface.mjs`, owns the interface, its wire format, and both ends of the wire. Every method is async and takes one plain JSON argument, so the same object works in-process (a later local-file backend) or over HTTP (today's D1 store, a later Durable Object).

```js
// The memory store: every call the plugin makes. A backend answers each one and decides what the caller may
// see; the plugin never filters for privacy. No operation edits or deletes a fact.

/** A fact as every read returns it.
 * @typedef {{ id: number, slug: string, type: 'user'|'feedback'|'project'|'reference'|'thread', body: string,
 *   author: string|null, created_at: string, session_id: string|null, superseded_by: number|null,
 *   owner_subject: string|null, shared: 0|1, sources: string[], tags?: string[] }} Fact */

/** One read. Every field is optional; the backend adds the caller's visibility to each.
 * @typedef {{ terms?: string, ids?: number[], slug?: string, notSlug?: string, type?: string, notType?: string,
 *   tags?: string[],            // any of these, or a tag aliased to one
 *   since?: string, until?: string, author?: string, branch?: string, change?: string,
 *   all?: boolean,              // superseded facts too
 *   everyone?: boolean,         // admin only: every person's personal facts; ignored for anyone else
 *   order?: 'rank'|'newest'|'threads-first', limit?: number, withTags?: boolean }} FactQuery */

/** One fact to write. The backend sets the author, owner, sharing, and time from the caller, never from here.
 * @typedef {{ type: string, body: string, tags?: string[], supersedes?: number[], sources?: string[] }  // a new fact
 *   | { restate: number, tags: string[] }    // the same fact with added tags: words, date, author, session kept
 *   | { close: number, body: string }         // close a stale thread: its tags, owner, and sharing kept
 * } FactWrite */

export const OPERATIONS = {
  caller: 'who is calling → { role: admin|member|reader|team, subject, email }',
  facts: 'FactQuery[] → Fact[][], one round trip for many reads',
  digest: '{ slug, stepTags, limit } → { facts, live, threads, steps, run, consolidation }',
  write: '{ session?, source, slug?, newTags?, facts: FactWrite[] } → { ids, superseded: [{ asked, marked }], left: [{ id, author }] }',
  tags: '→ [{ name, definition, alias_of, uses }]',
  defineTag: '{ name, definition, aliasOf } → {}, admin only',
  session: '{ id } → session row or null',
  putSession: '{ id, agent, branch, cwd, startedAt, endedAt, status, reason, readThrough, rawBytes } → {}',
  transcript: '{ factId } → bytes, or { missing: why }',
  putTranscript: '{ sessionId, agent } + bytes → {}',
  putRun: '{ kind, host, startedAt, status, reason, counts } → {}',
  stats: '→ { types, totals, consolidations }',
};

// The client: POST <url>/v2/<operation> with JSON; transcripts go as bytes. `headers()` is the repo's sign-in.
export function httpStore({ url, headers, timeoutMs = 15000, signal }) { /* one fetch per call */ }

// The server: route a request to a backend's method, add the caller's role header, map errors to status codes.
export async function serve(request, { prefix, caller, store }) { /* unknown operation → 404 */ }
```

That is 12 operations, each one today's call by name:

| Today's call site | Operation |
|---|---|
| digest batch (`lib/digest.mjs`), `due`, `finish-run`'s refresh | `digest` |
| search, brief, show, live, areas, before-edit, gate neighbours, retag and upkeep reads | `facts` |
| put-facts, retag, upkeep's closing facts and re-tags | `write` |
| tags, gate's tag list | `tags` |
| `tag --definition` / `--alias-of`, upkeep's area sync | `defineTag` |
| session ledger read and upsert (capture, `keep-transcript`, `pending`) | `session`, `putSession` |
| `source <id>`, transcript upload | `transcript`, `putTranscript` |
| `finish-run` | `putRun` |
| `stats` | `stats` |
| role for the digest's "see everyone's" line | `caller` (also on every response's role header) |

Why this shape:

- **`facts` takes a list.** The gate asks three reads per candidate, and the before-edit hook has 3 seconds; one round trip keeps today's latency without a general batch.
- **`digest` is its own operation.** The start-of-chat summary must stay one round trip within 2 seconds, and its counts (threads by step tag, the consolidation clock) are aggregates no fact read returns. The plugin still formats it; the backend returns rows.
- **`write` names what may change.** `restate` and `close` let upkeep and retag keep a fact's origin without the client sending an author or owner, which the old guard had to police. A member's supersede of a teammate's fact leaves it live and comes back in `left`, as today. `write` is atomic.
- **Admin store jobs are not operations.** Migrations, moving machine notes to people, keys, and schedule sign-ins act on D1's own tables through the Cloudflare API; they stay in `d1/admin.mjs`.
- **A fact's `sources` are links, not ids.** Each is a string with a scheme: `session:<agent>:<id>` in WongStack, `relay:note/<id>` or `relay:chat/<id>#<n>` in a later Relay Everything store. The plugin prints them and passes them to `transcript`; it never reads what they point to. This is the one field added for a later backend, because changing a read's shape later would change every caller.
- **No operation takes SQL, a table name, or an owner.** That is the whole security model: the backend writes every query from the caller it verified.

### 3. The D1 + R2 backend

`d1/store.mjs` exports `d1Store(db, bucket, caller)` → an object with the operations above. It holds every SQL statement memory runs, moved from the client: the digest's six statements, `facts`' builder (today's `readFacts` filters, `tagClause`, `ftsQuery`'s `MATCH`), `write`'s inserts and supersedes (today's `WRITES`), sessions, runs, tags, stats.

- **Visibility is one function, used by every read:** `visible(caller, everyone)` returns today's rule as a `WHERE` fragment on `f`: shared non-personal facts plus the caller's own; the admin's default view narrowed the same way; `everyone` widens only the admin's; a schedule (`team`) owns nothing; an old admin key's own view is the unassigned rows. Sessions and transcripts: the caller's own, or all for the admin. Runs: the caller's own, by `IS`.
- **Writes stamp from the caller:** owner subject and email, a reader's fact unshared, a member's supersede limited to its own facts, the time clamped to now, a run under its sender. A session row belongs to its signed-in person; a private session stays private.
- **The Worker route:** `app/worker/index.ts` sends `/_memory/v2/*` to `serve(request, { caller: await memoryCallerOf(...), store: d1Store(env.MEMORY_DB, env.MEMORY_BUCKET, caller) })`. `memoryCallerOf` is today's `callerOf` (old admin key, schedule sign-in, company sign-in), moved into `d1/connect.mjs` beside the client half. Any other `/_memory/` path answers 404, which an old client already treats as "not deployed yet": it prints the cached digest and spools writes.
- **Sources come from today's column.** A read returns `sources: ['session:' + session_id]`, or `[]` when it has none. A write takes a source only when it names the write's own session, and otherwise refuses it, since a fact's session is today the only thing that may point to a transcript.
- **Same tables, no migration.** Every operation reads and writes today's `facts`, `fact_tags`, `tags`, `sessions`, `runs`, and R2 keys.

### 4. The one seam: the profile

The core loads `<repo>/.agents/memory/profile.mjs` (or `WONG_MEMORY_PROFILE`). It exports one object; every hook but `connect` is optional, and a missing one turns its feature off.

```js
// .agents/memory/profile.mjs: WongStack's side of the memory plugin.
export default {
  connect: ctx => Store | { url, headers },  // required: which store, and how this computer signs in
  topics: ctx => [{ tag, kind: 'code'|'company', page, summary, aliases, paths }],
  steps: { plan: ['/plan'], sync: ['/wong-sync'], improve: ['/improve-code'], dream: ['/dream-memory'], … },
  currentSlug: ctx => 'slug' | null,    // the change whose proposal names this branch
  slugState: ctx => slug => 'active'|'shipped'|'conversation',
  person: ctx => ({ path, text }) | null,
  lookup: (ctx, paths) => lines,        // `areas` extras: docs, past changes, links, code users
  tidy: { pages: ctx => [{ path, kind }], publish: 'text' },  // more pages to check, how edits publish
  sessionStart: ctx => void,            // the company-knowledge refresh
};
```

- **`connect`** is `d1/connect.mjs`: the Worker URL from the primary checkout's `.claude/.wong-stack.json`, and `headers()` from a schedule's sign-in, the `cloudflared` company sign-in, or the old admin key (today's `memoryAccess`), with `$HOME/.local/bin` on `PATH` for `cloudflared`. With no profile, the core says memory has no store and the chat goes on. A repo with memory alone gives only `{ url, headers }`, and the core makes the `httpStore`, so its profile imports nothing from the module folder, which an update replaces.
- **`topics`** returns code areas from `areas.json` (with `paths`, so before-edit and upkeep's path tags come from the same list) and company pages from `knowledge/`. The core owns what a topic does; the profile only lists them.
- **`steps`** maps verb tags to the slash commands that name them: the gate's "a thread names who checks it", the digest's step line, and upkeep's slash-command re-tag read it.
- **`tidy`** gives the plugin's `/dream-memory` WongStack's own pages to check (specs, plans, `shipped` pages) and how its edits publish (a `knowledge/` save, else `/ship`). With no `tidy`, it checks the topic pages and leaves its edits on a branch. `dream.mjs` reads pages from `topics` and `tidy.pages`, not from `lib/links.mjs`.
- `/save` and `/close` call no memory command. `/improve-code` and struggle notes keep calling the CLI as today; they need no seam.
- **`lookup` takes paths or a topic.** That is where another plugin adds its own records to a pull. Relay Everything's profile, later, adds the notes and chats tagged with the topic, and its own plugin keeps health, places, notes, and *around a moment*. The memory plugin never reads them.

### 5. The plugin's hooks

`hooks/claude.json` (Claude Code, `${CLAUDE_PLUGIN_ROOT}`) and `hooks/codex.json` (Codex, its plugin root) hold `SessionStart` (startup and resume: `session-start.mjs`), `UserPromptSubmit` (`topic-match.mjs`), and `PreToolUse` (edit tools, `before-edit.mjs`) with today's timeouts (5, 3, 3 seconds), and `SessionEnd` (`session-end.mjs`, 5 seconds): it keeps the chat's redacted transcript (today's `keep-transcript current`) and starts the detached background run, so the chat's facts and threads are written before `/continue` needs them. Codex has no end event: there the next session start does both, as today. `.agents/rules/payload.md`'s "never `${CLAUDE_PLUGIN_ROOT}`" rule gains one exception: a plugin's own hook files.

- **Hooks travel inside the module folder**, never in the repo's shared settings files, so a copy of the folder brings them.
- **Claude Code** loads it from the checkout's skills folder: the link in the source, the real folder in every install. Trust is the existing per-folder trust; the build checks that a fresh Paseo worktree and a headless `claude -p` both load it. Nothing is installed, and there is no Claude Code shop install.
- **Codex** needs the plugin installed once per computer. The list it reads is the root `.claude-plugin/marketplace.json`, the same file in the source and every install, with one entry, `memory`, at `./.agents/skills/memory`; `.agents/plugins/marketplace.json` is removed, so an install has no plugins folder. `/wong-sync`, `/wong-setup`, and setup in a repo with memory alone run `codex plugin marketplace add <primary checkout>` and `codex plugin add memory@<list name>` when Codex is present (option A). Because Codex copies the plugin, its hooks run the copy (`PLUGIN_ROOT`), which loads the repo's profile by path.
- **Chat start names the one command.** When the installed copy is older than the repo's folder, the copy's own `session-start.mjs` says so, reading the list's name from the root file. When the plugin is missing, no plugin hook runs: in a WongStack install the stack's own Codex start hook in `.agents/hooks.json` names the command, and in a repo with memory alone setup adds one line naming it to the repo's `AGENTS.md`, which Codex reads, making the file when there is none.
- **Option B, only if A fails in the build:** setup writes memory's hooks into the repo's own Codex hooks file, pointing into the skill folder. It breaks "hooks travel inside the module", so the build tries A first and records why if it falls back.
- **Installs.** WongStack's installs (ClaymooApp, WongOS, Relay Everything, each new `/wong-setup`) get the module folder with each update; 63 skill files run `memory.mjs` by its repo path, so the skills and memory always ship at one version. Any other repo copies it in from a paste-in message (§8). The access module joins the same layout in its own plan.

**Checked in the build (2026-11-10, Claude Code 2.1.310, Codex 0.159.2):**

- **Claude Code, from the checkout:** a probe in a Paseo worktree of the trusted `/root/WongStack` loaded as `<name>@skills-dir`, also through `.agents/skills/<name> → ../plugins/<name>` under the `.claude → .agents` link. `SessionStart`, `UserPromptSubmit`, `PreToolUse`, and `SessionEnd` ran in an interactive chat, a headless `claude -p`, and an agent started by `paseo run`. `${CLAUDE_PLUGIN_ROOT}` is the unresolved path, `<checkout>/.claude/skills/<name>`. A worktree takes its trust from its main checkout.
- **Untrusted folder:** in a repo never trusted, `claude -p` skips the plugin with no message, but still runs `.claude/settings.json` hooks. So memory hooks in the plugin stop in a headless chat in a never-trusted checkout, where settings hooks ran before.
- **`SessionEnd`:** `/exit` sends `reason: "prompt_input_exit"`; a killed process (tmux closed) and `paseo archive` of an agent both send `reason: "other"`, with `session_id` and `transcript_path`.
- **Skill names:** a plugin's `skills/<name>/` is `/<plugin>:<name>` both from the checkout and from the shop (`/memory:dream-memory`). From the checkout, the plugin's root `SKILL.md` also loads as the project skill `/<plugin>`; from the shop it does not.
- **Codex:** `codex plugin marketplace add <path>` and `codex plugin add probe@<shop>` copy the plugin to `$CODEX_HOME/plugins/cache/<shop>/<plugin>/<version>/`. Its hooks (`plugin.json#hooks` → `./hooks/codex.json`) run only after trust: the TUI's first start asks *Hooks need review*; `codex exec` skips untrusted hooks with no message. Hooks get `PLUGIN_ROOT` and `CLAUDE_PLUGIN_ROOT` (both the copy) and `PLUGIN_DATA`; `SessionStart` runs on the first prompt.
- **Codex in an install repo (task 9.1, 2026-11-11, Codex 0.159.2):** option A works. In a plain repo with a real `.agents/skills/memory/` folder, no `.agents/plugins/`, and a root `.claude-plugin/marketplace.json` named `wongstack` with `memory` at `./.agents/skills/memory`, the two commands copied the plugin to `$CODEX_HOME/plugins/cache/wongstack/memory/<version>/`. The TUI asked *Hooks need review* once; after trust, `SessionStart` ran on the first prompt with `PLUGIN_ROOT` at the copy and the repo as its folder, and loaded the repo's `.agents/memory/profile.mjs`. The same entry through the source's `.agents/skills/memory → ../plugins/memory` link installs too: Codex copies the files through it. Option B is not built.
- **`/wong-sync` and `/wong-setup` do not carry a folder link.** The preflight drops a link to a folder ([payload manifest](../../../.agents/skills/wong-sync/references/payload-manifest.md): "Folder, chained or broken links are no unit"), and `install.mjs` copies only regular files. An install would lose `.agents/skills/memory/` and never get the link. Task 1.6 taught them the one link; task 9.2 replaces it with the path mapping (§8), so no install gets a link.

### 6. Topics on the new seam

Carried over from the `topics-in-memory` draft:

- **`lib/topics.mjs`** (core): `summaryOf(text)` (first sentence after frontmatter and title, links reduced to words, cut at 120 characters on a word), `topicLines(topics, hubOrder)` (at most 8 company lines `<tag>  <summary>`, then `Code: <names>`, then the pull command, held to 1 KB), and `matchTopics(message, topics, { skip })` (clear: the whole name, an alias, or a company tag's last part, as whole words, any case, `/` and `-` read as spaces; near: a message word of 4+ letters that starts a name's word; at most 3, clear first; skill-named topics and those already shown are skipped).
- **The profile's `topics`** lists each area (page: its first existing doc; summary: its definition) and each `knowledge/**/*.md` except `*.mine.md` (tag: its path inside `knowledge/` without `.md`; `x/README.md` → `x`; the root README → none). An area wins a name clash. `knowledge/README.md`'s link order sets the company lines.
- **The digest** puts the topic lines after the step line and before `## You`. They count as content, so an empty store still prints a digest; with the store down and no cache, `session-start.mjs` prints the topic lines alone.
- **`topic-match.mjs`** reads `prompt` and `session_id`, matches, records shown tags in `statePath(ctx, 'shown-topics', <session>.json)`, and prints `additionalContext`. No store, no network; any failure prints nothing and exits 0.
- **The pull:** `memory.mjs areas <topic>` accepts a company tag: summary, page, the pages it links to and that link to it (one step), then `facts({ tags: [tag] })`.
- **Writes:** the gate defines a missing company tag from its page's summary, as `withAreaTags` does for an area. Upkeep re-tags a fact whose words name a `knowledge/…md` path. A thread still needs a verb or area tag.
- **Pages from facts:** the rule goes once in `wiki/development/wiki-dream.md#placing-a-fact-on-a-page`, which `/close`, `/dream-memory`, and the small tidy follow; the small tidy may add a topic by `retag`. `writing-facts.md` gains one clause: tag the company page a fact is about.

### 7. Fewer lines

The split is measured once, at the end of the build, with `wc -l`: plugin plus `.agents/memory/`, without `lib/topics.mjs`, `topic-match.mjs`, `lib/documents/`, `skills/dream-memory/` (moved, not memory today), and tests. The store's `store/contract.mjs` counts as a test: it is a `node:test` suite. Today's comparable count is 4,236 (the same files, `lib/documents/` excluded). Where it goes: `statements.mjs` (162) and `memory-worker.mjs` (141) go; their caller checks (about 50 lines) move to `d1/connect.mjs`. The client's SQL (about 250 lines) moves into `d1/store.mjs` as plainer SQL with no shadowing. `lib/store.mjs` (287) keeps only context, state, and the spool (about 120); the HTTP client and `serve` add about 90. The build is not done until the split is below 4,236; the report gives both numbers.

### 8. Install by prompt, setup, and updates

**A repo that wants memory alone** starts from one paste-in message, which the plugin's `README.md` leads with and which works in any AI tool:

> Add WongStack's memory to this project. Follow the setup guide at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/memory/references/setup.md

`references/setup.md` works when the AI reads it from that address in a repo with nothing installed. It says in plain words what memory needs: Node 20 or newer, a profile, and a store that passes the check. It keeps no dependency list and writes no installed-modules file: the AI looks at the repo and fills each gap. The guide does this:

1. **In a full WongStack install it stops**: memory already comes with each update. It changes nothing.
2. **Copies the module folder in** from GitHub, as a real folder, to `.claude/skills/memory/`. Claude Code then loads it from the checkout with no install; it loads a plugin from no other folder, so `.agents/skills/memory/` is right only where `.claude` links to `.agents`, as in WongStack (found in task 9.14).
3. **Looks at what the repo has**: an app with a server, a database, a memory server it can already reach.
4. **Fills each gap by the smallest path**: connect to an existing server (the profile's `connect` gets its address and sign-in); or add the server part to the repo's own app: one route that calls `serve()` from the folder's `store/interface.mjs` (a copy only when the app's build can not reach outside its own folder), with a store object answering the twelve operations in the app's own database, applying [who sees what](../../../wiki/development/memory.md#who-sees-what) as its starting rule; or, with no app, delete the copy and, in an empty repo with no commits, offer [`/wong-setup`](../../../.agents/skills/wong-setup/SKILL.md)'s Cloudflare setup, which brings memory and makes the database (task 9.14: it installs only into an empty folder). On a memory server, the check is a chat start that shows the digest; the server's own repo runs `checkStore`.
5. **Writes the repo's own parts**, outside the folder: the profile, from the repo's own docs and folders (`connect`, then `topics`; optional parts stay out until the repo needs them), and the server part.
6. **Codex**, when present: adds the `memory` entry to the root `.claude-plugin/marketplace.json` (the repo's own list when it has one), runs the two commands of §5, and adds the one `AGENTS.md` line that names them for other computers.
7. **Runs the check:** `store/contract.mjs` exports `checkStore(makeStore)`, one `node:test` suite: each operation, supersede without edit, sources, and each row of the role table. Memory is not ready until it passes. WongStack's `scripts/tests/memory-interface.test.mjs` runs the same suite against the stand-in and `d1Store`, so there is one suite, not two.
8. **Commits** the folder and the repo's own parts, and asks before any push.

It asks before each step that costs money or makes something public: a new database, a deploy, a public route.

**Chat start asks first.** With no profile, `session-start.mjs` adds one short line that has the AI ask the person, "Memory isn't set up yet. Set it up now?", once per chat (a resume of the same chat stays quiet). On a yes the AI follows the setup guide; it never starts setup on its own. The plugin asks for no install settings.

**Updates touch only the module folders a repo has.**

- **A full WongStack install** updates through `/wong-sync`. The payload maps `.agents/plugins/memory/` to `.agents/skills/memory/`, so the sync's preflight, copy, and merge read and write the install path, and the install gets a real folder. The payload still refuses every other folder link. A shipped Markdown link into `.agents/plugins/<name>/` is written at the install path, on the old and new copies alike, so the merge sees no change; `check-payload-links.mjs` resolves such a link at the mapped path.
- **A repo with memory alone** updates through the guide's Update section, reached by a second paste-in message ("Update WongStack's memory in this project. Follow the update steps at …/setup.md#update"). It reads the folder's `.claude-plugin/plugin.json` version, takes the module's files at a WongStack commit with that version as the merge base, and the newest from `main` as theirs. It three-way merges each file (`git merge-file`), adds new files, and removes a file the new version dropped unless the repo edited it. Any conflict stops the update before it writes a file and names each file. It then runs the check, commits, and asks before any push. In a full WongStack install it stops and points at `/wong-sync`.
- **The version is the base.** Each change to a module folder raises the version in both of its `plugin.json` files; a payload check fails when the folder differs from `main` and the version does not, or when the two versions differ. So every commit with one version holds the same folder, and the base is exact.

**One test installs each module alone.** `scripts/tests/module-install.test.mjs` copies each `.agents/plugins/<name>/` into an empty repo as a real folder, writes a minimal profile on the stand-in store, and runs a session start and the module's check. It fails when the module imports a file outside its folder.

**The access slot.** The profile's `connect` returns `{ url, headers() }`. The access plugin's plan replaces WongStack's sign-in inside `d1/connect.mjs` with its own; the memory plugin does not change. Memory works without access.

**Checked in the build (1.4), before the shop was dropped:** in a plain repo, `claude plugin marketplace add <shop> --scope project` and `claude plugin install probe@<shop> --scope project` wrote only the repo's `.claude/settings.json`, and a second person who trusted the repo got the plugin. A copy in the repo gives the same reach through git, so this change no longer uses it. Codex option A installed from an install's real folder and through the source's link (§5, task 9.1).

## Risks / Trade-offs

- [An untrusted folder skips skills-dir plugins, so a new worktree could start with no memory hooks] → the build checks a fresh Paseo worktree and `claude -p`; if either skips it, the build stops and returns to Matthew: the fallback keeps the three hook lines in settings, pointing into the plugin folder.
- [Codex copies the plugin, so a branch's memory edits don't reach Codex until reinstalled] → `session-start.mjs` names the reinstall command when versions differ; tests run the checkout's code directly.
- [`/wong-sync` and `/wong-setup` skip a link to a folder (found in the build, 1.3)] → Matthew first chose a managed link (1.6), then a real folder in every install: the payload maps `.agents/plugins/memory/` to `.agents/skills/memory/` (9.2), and any folder link is still refused.
- [A shipped page links `.agents/plugins/memory/…`, a path no install has] → the sync writes such a link at the install path, and `check-payload-links.mjs` resolves it there (9.3).
- [Paseo archives a workspace without a `SessionEnd`, so its transcript waits] → the transcript file stays on the computer and the next session start's run keeps it; the build checks what an archive fires.
- [A second copy of memory runs each hook twice] → no shop install exists to add one, and the setup guide stops in a WongStack install; the old `memory@wongstack` warning goes (9.5).
- [A repo with memory alone edits a file in its folder, and an update overwrites it] → the update three-way merges each file from the folder's version and stops on a conflict before it writes anything.
- [A module changes without a version raise, so the update's base is wrong and new lines read as local edits] → a payload check fails on it (9.10).
- [Codex has no memory on a computer where the plugin is missing, and no plugin hook runs to say so] → the stack's own Codex start hook in a WongStack install, and one `AGENTS.md` line in a repo with memory alone, name the command; option B is the fallback if option A fails (9.1).
- [The module imports a WongStack file, so it breaks in a repo with memory alone] → the module install test runs it alone in an empty repo (9.11).
- [Setup starts unasked, or costs money unasked] → chat start only asks, once per chat; setup asks before each step that costs money or makes something public, and asks before any push.
- [A backend built by setup leaks a personal fact] → the check runs every role-table row before the setup reports done; the server, not the plugin, still decides.
- [Codex plugin hooks may not expose a root variable] → confirmed first in the build; the fallback runs the copy's scripts by its install path.
- [A clean switch pauses memory on branches not yet updated] → they print the cached digest and spool writes; the spool sends them through the gate after updating. Nothing is lost.
- [Two copies of the visibility rule during the move] → the old guard is deleted in the same change; the shared operation tests run the same role-table cases the old ones did.
- [Moving files breaks links in installs' own pages] → `scripts/retired-names.json` lists each moved path; `check-payload-links.mjs` and `memory.mjs areas` find the rest.
- [Skill text grows] → `measure-context.mjs --check`; the cut comes from `memory/SKILL.md` and `wiki/development/memory.md`'s now-gone SQL details.

## Migration Plan

For each install (WongStack, ClaymooApp, WongOS, Relay Everything), on its next `/wong-sync`. Nothing is done by hand:

1. The sync brings memory as a real folder at `.agents/skills/memory/`, where memory already is today, with its plugin manifests and hooks inside; `.agents/memory/`, the moved files, the root Codex list, and settings without the memory hooks. No `.agents/plugins/` folder and no link. No database migration.
2. The merge deploys production; the Worker serves `/_memory/v2/` and nothing else under `/_memory/`.
3. Claude Code loads `memory@skills-dir` on the next chat (or `/reload-plugins`). The sync installs the Codex plugin on the computer it runs on; each other computer gets the command from its next session start.
4. The next session start sends any spooled facts through the gate.
5. The sync's check: `memory.mjs stats` before and after give the same fact, session, and transcript counts.

Rollback: revert the release. The data was never touched.

## Open Questions

None.
