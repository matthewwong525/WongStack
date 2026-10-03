# Session memory

Session memory is the repo's private store of **facts**: short typed lines that past sessions learned, which the next session reads at start. It lives outside git, in the repo's own Cloudflare account, so a capture needs no commit and a public repo publishes nothing. [The `memory` skill](../../.agents/skills/memory/SKILL.md) is its one door; this page is the convention. It is one of the knowledge surfaces in [the knowledge center](../agent-knowledge-center.md), beside the wiki and OpenSpec.

## What is stored

- **Facts**, in a D1 database named `<repo>-memory`. A fact is at most 400 characters, with a slug (the change name, or a topic), a type, tags, an author, a time, and its source session. The types: `user` (who the user is), `feedback` (how they want work done), `project` (decisions and ruled-out options, with reasons), `reference` (pointers to outside resources), and `thread` (an open question). [Writing facts](../../.agents/skills/memory/references/writing-facts.md) owns what a good fact keeps.
- **Sessions**, one row per transcript: agent, branch, status (`captured` or `skipped`), and how far it was read. A session an earlier version marked `private` keeps that status: nothing of it is uploaded or read.
- **Raw transcripts**, in a private R2 bucket of the same name, kept forever. Before upload, and before capture reads one, known `.env` values and token-shaped strings (GitHub, `sk-`, AWS, JWT, Bearer, and memory keys) are replaced with a placeholder. A transcript over 50 MB is not kept: its session's facts are still captured, and `source` says why. The bucket is optional: see [without R2](#without-r2).

A fact is never edited or deleted. A later fact **supersedes** it, and only live facts show by default. That keeps history without stale answers: *the digest cap is 150 lines* supersedes *the cap is 100*, and both stay searchable.

## Who sees what

Each repo's memory is its own: nothing goes to another repo, and nothing loads from one. Inside a repo there are two levels, the team or only you, and the admin sees both ([roles](memory-key.md)):

| What | You | Teammates | Admin |
|---|---|---|---|
| Decisions, open questions, and links (`project`, `thread`, `reference`) | yes | yes | yes |
| Facts about you: likes, habits, your life (`user`, `feedback`) | yes | no | yes |
| A reader's facts, of any type | the reader | no | yes |
| Your chats (transcripts) | yes | no | yes |

- **The store holds back what a teammate may not see**, however they ask: the route answers a member's or reader's read only with the facts above. Only the admin's `--everyone` on `search`, `brief`, `show`, or `live` shows all.
- **The admin's own view starts narrow too.** Their digest and search show only their own `user` and `feedback` facts, matched on every email on their [people page](../wiki-style.md#people), until they add `--everyone`.
- **Something personal you say in a work chat stays in that repo**, where the admin can read it. For anything no one else should see, use a repo only you use: there, you are the admin.
- A repo where only one email holds a key is not a team, and nothing is filtered by person.

## When memory loads

When a session starts or resumes, the `SessionStart` hook prints a **digest** of what applies to any task: every open thread of the change on your branch first, then one line counting the open threads on other changes by step (`plan 3, save 5; 41 untagged`), then [your people page](../wiki-style.md#people), cut at 1.5 KB with a line naming the page, then the other live facts by type and age. Other changes' threads stay live and searchable; they only leave the digest, so preferences and decisions keep their room. Its first line tells the agent to search memory for the task's key terms, in its own words, once it knows the task and before it acts on more than a quick question: [`memory search <terms>`](../../.agents/skills/memory/SKILL.md). The agent picks the terms, not a hook: whatever loads stays in view for the whole session, the start can't know the task, and a keyword search on the raw first message (*is memory flat here?*) matches common words and pulls in unrelated facts. The count line tells a verb to load its own threads when it starts: `memory search --type thread --tag plan` when `/plan` starts. Code builds the digest from one batch of queries, with no model, in under two seconds. It is capped at 40 lines and 6 KB; the last line says how many facts it left out. Offline, the hook prints the last cached digest with its age. The digest stays the same for the whole session, so the prompt cache holds. A fact written now shows at the next start.

**Before the first edit in a folder**, a `PreToolUse` hook shows that [area's](#facts-by-code-area) open threads, then its newest live facts, eight lines at most, as [who sees what](#who-sees-what) allows. It fires on Claude Code's edit tools and Codex's `apply_patch`, once per area per session, so a plain request gets the folder's warnings without the agent remembering to search. It never holds up the edit: an unmapped file, an area already shown, no key, or a store that doesn't answer within 3 seconds shows nothing. Reading a file loads nothing.

A fact is dated context, not an instruction. Check it against the repo, and the repo wins. The verbs also read memory where they decide: [`/explore`](../../.agents/skills/explore/SKILL.md) searches before it asks a question, `/continue` reads the change's facts, and [`/close`](../../.agents/skills/close/SKILL.md) distills them into the wiki.

## Facts with evidence

`memory.mjs search <terms> --json` returns a version 1 object with `filters` and `facts`. Each fact keeps its `id`, `slug`, `type`, original `body`, `author`, `created_at`, `session_id` (or `null`), `superseded_by`, and checkout-derived `state`. Text and JSON select the same facts, with the same filters, permissions, ordering, and default 30-fact limit. `filters` records the terms, requested filters, limit, and whether personal filtering applied. Neither format reads transcript bytes or exposes storage keys.

`memory.mjs brief <terms>` groups current facts as open threads, feedback, project decisions, user facts, and references. Terms can be omitted with a scope filter: `brief --slug release-window` or `brief --tag memory`. It supports search's filters except `--all`; a topic or filter is required. It uses each fact's original words and adds its date, author, fact ID, source session (or an explicit absence), and `source <id>` follow-up. For example, a synthetic entry reads:

```text
Fact #7 · 2026-10-01T00:00:00Z · author: dev@example.com
Session evidence stays traceable.
Source session: claude:example; follow up: source 7
```

Every brief reads current memory and shows its generation time and scope. It selects at most 20 live facts, then keeps whole entries within 6,144 UTF-8 bytes, including its header and footer. The footer counts entries omitted from that selected set; it cannot count all other matches. Empty successful reads say no matching live facts. Unavailable or denied reads fail visibly. There is no model call, inferred conclusion, saved brief, or cache fallback; startup loading stays unchanged.

A pointer identifies evidence without granting access. A visible team fact may cite a private session; `source <id>` still checks that source's permissions and availability, including [stores without R2](#without-r2).

## How facts are captured

- **`/save`** writes facts from the session so far. Nothing to capture beyond the diff and the Decision log means no facts.
- **The background run** captures what `/save` missed. When the hook finds sessions of this repo idle for an hour with no capture, it starts a detached run of the same agent's command-line tool and returns at once. Your first reply never waits for it. It uses your agent's normal model; to choose another, set `WONG_MEMORY_MODEL` (Claude Code) or `WONG_MEMORY_CODEX_MODEL` (Codex) in the hook's environment. The run may only call the memory script and write files in one temp folder outside the repo, which it deletes at the end. It writes each JSON input there and passes the path, because a JSON heredoc with characters like `<` or `$` is denied without a user. It captures at most five sessions, newest first, and the next digest reports what it did. Those counts are what the script stored, not what the model says; when the two differ, the digest says so. It spends your own model allowance. A headless `claude -p` that you start inside the checkout fires the same hook, so set `WONG_MEMORY_RUN=1` on a probe that should not start a run.

Every write passes the **write gate**: the script shows the live facts on the same slug, the closest keyword matches, and the open threads on other slugs that match the fact's words. The writer adds, supersedes, or drops each candidate. A `thread` must carry the tag of the verb whose next run should check it (`plan`, `verify`, `sync`), or the area tag of the folder whose next change should: the gate names the problem, and `put-facts` refuses the whole batch, because a warning once left 82 of 94 threads with no one to check them. A fact that answers an open thread supersedes it, saying what was found, so a check done under other work closes its thread. A fact that cannot reach the store waits in a local spool, and the next run sends it through the gate.

## Facts by code area

A fact about code carries the **area tag** of the folder it concerns, so the next change there loads it. [`areas.json`](../../.agents/skills/memory/references/areas.json), in the memory skill, maps folders to areas, each with a definition and the docs that own it: `app/worker/` to `worker`, `wiki/` to `wiki`. The most specific folder wins: `app/worker/apps/` gives `mini-apps` and `worker`, not `stack-pack`, which covers all of `app/`.

- **A fact gets its area when it is written.** The writer tags it, as [writing facts](../../.agents/skills/memory/references/writing-facts.md) says. An area tag the store lacks is defined from the list on first use. [Upkeep](#consolidation) tags older facts whose words name a mapped path.
- **The list owns each area tag's definition and look-alikes.** On the admin's next write, upkeep sets the stored definition to the list's, and points each name in an entry's `aliases` at its area: *memory-architecture* at `memory`, *testing* at `tests`. A search, lookup, or thread load by a tag also finds its aliases. Fix a definition in `areas.json`, not in the store. For a look-alike outside the list, the admin runs `memory.mjs tag <name> --alias-of <tag>`, or `--definition <text>`; a teammate's key never changes a tag.
- **One lookup shows everything linked.** `memory.mjs areas <path or topic>` prints the areas, their docs (wiki pages and specs), up to five past changes, newest first, those naming the path ahead of those sharing an area, the files linking to each path, and then the live facts: open threads first, then newest, at most 20, as [who sees what](#who-sees-what) allows. It reads the links and changes fresh, so nothing goes stale. When the store doesn't answer, it says memory was not loaded, and work goes on.
- **The build loads it.** Before its first edit, [`/apply`'s build](../../.agents/skills/apply/references/build-helper.md) runs `memory.mjs areas --change <name>` on the paths the change's proposal, design, and tasks name.
- **Planning loads it too.** [`/explore`](../../.agents/skills/explore/SKILL.md#search-memory-before-asking) runs `areas` on the paths it expects to touch, beside its keyword search, because a fact about a folder rarely names the file you search by.
- **A repo adds its own areas** in `areas.json`: a tag, a definition, folder prefixes, and docs; a doc the repo lacks is skipped. [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md) keeps the edit as a local change.

## Consolidation

Two passes keep the live facts tidy: plain code for what follows a rule, and a model only for what takes judgment.

- **Upkeep** runs after every `put-facts` and at the end of every background run, with no model and no wait. It closes an open thread still open 30 days after its own date with a fact naming it, *Closed unchecked after 30 days (thread #N, date)*; the thread stays searchable with `--all`, and a re-tag never restarts its clock. It **re-tags** a fact whose words name a path in a mapped folder with [its area](#facts-by-code-area), and a thread whose words name a slash command with that verb (`/wong-sync` gives `sync`), so the verb loads it. A re-tagged fact keeps its words, its date, its author, and its link to the chat it came from; it supersedes the untagged one. On the admin's key it also syncs area tags to the list. It restates at most 50 facts a pass and leaves the rest to the next write. It never fails the write before it: `put-facts` prints `upkeep skipped: <reason>`, and the next write tries again. `memory.mjs upkeep` runs it by hand.
- **Consolidation** runs inside the background run, and only once 24 hours *and* five captured sessions have passed since the last one, so it is rare. It merges facts that say the same thing, supersedes contradicted ones, newest first, closes an open thread a later live fact shows was answered, and re-tags only where reading a fact's area or verb takes judgment. No one runs it by hand: an earlier consolidation command was retired because no one did.

On a teammate's machine both passes change only that teammate's own facts, and no tag; the admin's tidy everyone's.

## The memory key

`CLOUDFLARE_MEMORY_TOKEN` holds your memory key: it opens this repo's store, through your app's production Worker, and nothing else. Its roles, how a teammate joins through GitHub, and how the admin adds or removes one: [the memory key](memory-key.md).

## Without R2

R2 needs a payment method on file, even inside its free tier. Without it, the store keeps no raw transcripts and a preview check keeps no [pictures](staging-walkthrough.md#what-a-walk-needs), and everything else works: facts, the digest, search, capture, and consolidation. `source <fact-id>` then says that transcripts are not stored. Setup's closing report gives the steps in [the card list](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#the-card-list). Turn R2 on later and run `/wong-sync`: it plans the bucket, and new sessions are kept from then on.

## When to add embeddings

Search is keyword search (FTS5) with tags. It matches a word's other forms through the porter stemmer, so *previews* finds *preview*, and filler words like *how* and *should* never match on their own. It matches forms, not meanings: *how should previews be checked* misses a fact that says *probe every route on the preview*, so search with the words the fact would use. A shipped set of real-shaped questions, `scripts/tests/fixtures/memory-search-questions.json`, runs in CI, each with the fact it must rank in the top three, so a change can't quietly break search; a question that should have matched and didn't belongs there first. That is enough at hundreds to low thousands of facts, because the write gate asks a model about paraphrases, and consolidation merges what the gate missed. Add embeddings when `memory.mjs stats` reports the trigger as met: more than 2,000 live facts, or merged duplicates growing across three consolidations. Search stays behind the one script, so nothing else changes.

In WongStack's source repo, the [evaluation runner](https://github.com/matthewwong525/WongStack/blob/main/scripts/evaluate-memory-search.mjs), `node scripts/evaluate-memory-search.mjs [--json]`, migrates a temporary synthetic store and queries the ordinary structured CLI. It uses no live store or production credentials and cleans its fixtures after success or failure. It reports target ranks, top-three hits, unexpected results, and totals by category. Original regression misses fail the run; separate diagnostic misses count known limits. Forbidden hidden or replaced results and infrastructure failures always fail. Visibility diagnostics measure the admin's default client scope and explicit `--everyone`; Worker tests separately enforce member and reader permissions. A passing gate with synonym misses demonstrates compatibility, without establishing semantic retrieval or improved accuracy.

Back to [development](README.md).
