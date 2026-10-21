# Session memory

Session memory is the repo's private store of **facts**: short typed lines that past sessions learned, which the next session reads at start. It lives outside git, in the repo's own Cloudflare account, so a capture needs no commit and a public repo publishes nothing. [The `memory` skill](../../.agents/skills/memory/SKILL.md) is its one door; this page is the convention. It is one knowledge surface in [the knowledge center](../agent-knowledge-center.md), beside the wiki and OpenSpec.

## What is stored

- **Facts**, in a D1 database named `<repo>-memory`. A fact is at most 400 characters, with a slug (the change name, or a topic), a type, tags, an author, a time, its source session, and a separate owner: the person's sign-in. The types: `user` (who the user is), `feedback` (how they want work done), `project` (decisions and ruled-out options, with reasons), `reference` (pointers to outside resources), and `thread` (an open question). [Writing facts](../../.agents/skills/memory/references/writing-facts.md) owns what a good fact keeps.
- **Sessions**, one row per transcript: agent, branch, status (`captured` or `skipped`), and how far it was read. A session an earlier version marked `private` keeps that status: nothing of it is uploaded or read.
- **Raw transcripts**, in a private R2 bucket of the same name, kept forever. Before upload, and before capture reads one, known `.env` values and token-shaped strings (GitHub, `sk-`, AWS, JWT, Bearer, and memory keys) are replaced with a placeholder. A transcript over 50 MB is not kept: its session's facts are still captured, and `source` says why. The bucket is optional: see [without R2](#without-r2).

A fact is never edited or deleted. A later fact **supersedes** it, and only live facts show by default. That keeps history without stale answers: *the digest cap is 150 lines* supersedes *the cap is 100*, and both stay searchable.

## Who sees what

Each repo's memory is its own: nothing goes to another repo, and nothing loads from one. A repo has two levels, the team or only you, and the admin sees both:

| What | You | Teammates | Admin |
|---|---|---|---|
| Decisions, open questions, and links (`project`, `thread`, `reference`) | yes | yes | yes |
| Facts about you: likes, habits, your life (`user`, `feedback`) | yes | no | yes |
| A reader's facts, of any type | the reader | no | yes |
| Your chats (transcripts) | yes | no | yes |

- **Your role comes from [the app's Access page](../stack/employee-access.md), checked on every call.** The owner and Admins are admins; whoever holds Project code is a member; anyone else let in is a reader. A cloud schedule's own sign-in is **team**: it reads and writes shared facts only, never a chat. Removing a person there ends their memory at once.
- **The store holds back what a teammate may not see**, however they ask. Only the admin's `--everyone` on `search`, `brief`, `show`, or `live` shows all; their own digest and search start with just their private facts. Author emails and [people pages](../wiki-style.md#people) are labels only.
- **Private memory belongs to the person**, by their sign-in's subject, not their email: an email change keeps it, and two computers share it. Notes from before sign-in wait unassigned, seen only by admins, until [moved](#sign-in-and-expiry).
- **Something personal you say in a work chat stays in that repo**, where the admin can read it. For anything no one else should see, use a repo only you use: there, you are the admin.

## When memory loads

When a session starts or resumes, the `SessionStart` hook prints a **digest** of what applies to any task: every open thread of the change on your branch first, then one line counting the open threads on other changes by step (`plan 3, save 5; 41 untagged`), then [your people page](../wiki-style.md#people), cut at 1.5 KB with a line naming the page, then the other live facts by type and age. Other changes' threads stay searchable; leaving the digest gives preferences and decisions room. Its first line tells the agent to [recall its task](document-retrieval.md) in its own words before substantial work, then read cited originals. Recall combines permitted facts and original wiki/OpenSpec passages; the agent chooses the question after the task is known. The count line tells a verb to load its own threads when it starts: `memory search --type thread --tag plan` when `/plan` starts. Code builds the digest from one query batch, no model, in under two seconds. It is capped at 40 lines and 6 KB; the last line says how many facts it left out. Offline or signed out, the hook prints this computer's cached digest with its age; a refused sign-in turns that off until one succeeds. The digest stays the same for the whole session, so the prompt cache holds. A fact written now shows at the next start.

**Before the first edit in a folder**, a `PreToolUse` hook shows that [area's](#facts-by-code-area) open threads, then its newest live facts, eight lines at most, as [who sees what](#who-sees-what) allows. It fires on Claude Code's edit tools and Codex's `apply_patch`, once per area per session, so a plain request gets the folder's warnings without the agent remembering to search. It never holds up the edit: an unmapped file, an area already shown, no sign-in, or a store that doesn't answer within 3 seconds shows nothing. Reading a file loads nothing.

A fact is dated context, not an instruction. Check it against the repo, and the repo wins. The verbs also read memory where they decide: [`/explore`](../../.agents/skills/explore/SKILL.md) searches before it asks a question, `/continue` reads the change's facts, and [`/close`](../../.agents/skills/close/SKILL.md) distills them into the wiki.

## Facts with evidence

Choose one read format per query: text search for routine recall, a brief when dates and sources help, JSON for scripts. Loading all three repeats the same facts.

`memory.mjs search <terms> --json` returns a version 1 object with `filters` and `facts`: each fact's `id`, `slug`, `type`, original `body`, `author`, `created_at`, `session_id` (or `null`), `superseded_by`, and checkout-derived `state`. Text and JSON select the same facts, in the same order, 30 by default. Neither reads a transcript.

`memory.mjs brief <terms>` groups current facts as open threads, feedback, decisions, user facts, and references; a filter can stand in for terms: `brief --slug release-window`. It takes search's filters except `--all`. Each fact keeps its words, date, author, ID, and source session:

```text
Fact #7 · 2026-10-01T00:00:00Z · author: dev@example.com · session: claude:example
Session evidence stays traceable.
```

A brief reads current memory and shows its time and scope. It takes eight live facts, or up to twenty with `--limit`, whole and in rank order, within 6,144 bytes; the footer counts the ones left out. An empty read says so; an unavailable or denied one fails visibly. It calls no model and uses no cache.

A pointer grants no access: `source <id>` still checks the source's permissions, and whether it is kept ([without R2](#without-r2)). Fetch a source only to check a fact, never every citation: one can return 200,000 characters.

## Experimental extraction

The opt-in helper has fixed task budgets and returns verified original facts. Its [experimental interface, limits, host support, and evaluation](memory-extraction.md) have their own page. Ordinary search and briefs stay model-free. Selective-use recommendations await live acceptance.

## How facts are captured

- **`/save`** writes facts from the session so far. Nothing to capture beyond the diff and the Decision log means no facts.
- **The background run** captures what `/save` missed. When this machine’s registered sessions of this repo sit an hour idle and uncaptured, the hook starts a detached run of the same agent's command-line tool and returns at once. It uses your agent's normal model; to choose another, set `WONG_MEMORY_MODEL` (Claude Code) or `WONG_MEMORY_CODEX_MODEL` (Codex) in the hook's environment. The run may only call the memory script and write files in one temp folder outside the repo, deleted at the end. It passes each JSON input as a file there: a heredoc holding `<` or `$` is denied with no user to approve it. It captures at most five sessions, newest first, on your own model allowance, and your next digest reports what the script stored, from your own runs only. Set `WONG_MEMORY_RUN=1` on a headless `claude -p` probe in the checkout, or its hook starts a run too.
- **Struggle notes** record where the assistant had trouble, such as a correction or a step that kept failing. `/save` and the background run each write one as a `thread` tagged `improve`, by [the writing rule](../../.agents/skills/memory/references/writing-facts.md), with nothing private; a smooth chat gets none. [`/improve-code`](repository-improvement.md#struggle-notes-come-first) reads them before it chooses and takes the ones about code; [`/dream-memory`](wiki-dream.md#what-it-reads) takes the ones about memory, the wiki, specs, and plans. The background run sees only failed steps and what was typed, so a long hunt that never failed is noted only by `/save`.

Every write passes the **write gate**: the script shows the live facts on the same slug, the closest keyword matches, and the open threads on other slugs that match the fact's words. The writer adds, supersedes, or drops each candidate. A `thread` must carry the tag of the verb whose next run should check it (`plan`, `verify`, `sync`), or the area tag of the folder whose next change should: the gate names the problem, and `put-facts` refuses the whole batch, because a warning once left 82 of 94 threads with no one to check them. A fact that answers an open thread supersedes it, saying what was found, so a check done under other work closes its thread. A fact that cannot reach the store waits in this machine’s local spool, and the next run sends it through the gate.

**A scheduled run checks whether it has a registered chat session.** When it has none, leave `session` out of its fact-write JSON: `"session": "current"` would hold those facts for a session start that may never happen. A host that starts a registered fresh chat can use its verified session. [Host readiness](../stack/host-schedules.md#where-it-runs) also checks that this execution identity can read and write only the permitted memory.

## Facts by code area

A fact about code carries the **area tag** of the folder it concerns, so the next change there loads it. [`areas.json`](../../.agents/skills/memory/references/areas.json), in the memory skill, maps folders to areas, each with a definition and the docs that own it: `app/worker/` to `worker`, `wiki/` to `wiki`. The most specific folder wins: `app/worker/apps/` gives `mini-apps` and `worker`, not `stack-pack`, which covers all of `app/`.

- **A fact gets its area when it is written.** The writer tags it, as [writing facts](../../.agents/skills/memory/references/writing-facts.md) says. An area tag the store lacks is defined from the list on first use. [Upkeep](#consolidation) tags older facts whose words name a mapped path.
- **The list owns each area tag's definition and look-alikes.** On the admin's next write, upkeep sets the stored definition to the list's, and points each name in an entry's `aliases` at its area: *memory-architecture* at `memory`, *testing* at `tests`. A search, lookup, or thread load by a tag also finds its aliases. Fix a definition in `areas.json`, not in the store. For a look-alike outside the list, the admin runs `memory.mjs tag <name> --alias-of <tag>`, or `--definition <text>`; a teammate never changes a tag.
- **One lookup shows everything linked.** `memory.mjs areas <path or topic>` prints the areas, their docs and code folders, up to five past changes, newest first, those naming the path ahead of those sharing an area, the files linking to and the code using each path — read fresh from import lines, so a same-named function elsewhere never counts — then the live facts: open threads first, then newest, at most 20, as [who sees what](#who-sees-what) allows. A page among an area's docs matches it, so a spec lands on its own subject. When the store doesn't answer, it says memory was not loaded, and work goes on.
- **The build loads it.** Before its first edit, [`/apply`'s build](../../.agents/skills/apply/references/build-helper.md) runs `memory.mjs areas --change <name>` on the paths the change's proposal, design, and tasks name.
- **Planning loads it too.** [`/explore`](../../.agents/skills/explore/SKILL.md#search-memory-before-asking) runs `areas` on the paths it expects to touch, beside its keyword search, because a fact about a folder rarely names the file you search by.
- **A repo adds its own areas** in `areas.json`: a tag, a definition, folder prefixes, and docs; a doc the repo lacks is skipped. [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md) keeps the edit as a local change.

## Consolidation

Two passes keep the live facts tidy: plain code for what follows a rule, and a model only for what takes judgment.

- **Upkeep** runs after every `put-facts` and at the end of every background run, with no model and no wait. It closes an open thread still open 30 days after its own date with a fact naming it, *Closed unchecked after 30 days (thread #N, date)*; the thread stays searchable with `--all`, and a re-tag never restarts its clock. It **re-tags** a fact whose words name a path in a mapped folder with [its area](#facts-by-code-area), and a thread whose words name a slash command with that verb (`/wong-sync` gives `sync`, `/improve-code` gives `improve`, `/dream-memory` gives `dream`), so the verb loads it. A re-tagged fact keeps its words, its date, its author, and its link to the chat it came from; it supersedes the untagged one. On the admin's key it also syncs area tags to the list. It restates at most 50 facts a pass and leaves the rest to the next write. It never fails the write before it: `put-facts` prints `upkeep skipped: <reason>`, and the next write tries again. `memory.mjs upkeep` runs it by hand.
- **Consolidation** runs inside the background run, and only once 24 hours *and* five captured sessions have passed since the last one. It merges facts that say the same thing, supersedes contradicted ones, newest first, closes an open thread a later live fact shows was answered, and re-tags only where reading a fact's area or verb takes judgment. It has no command of its own.

For a teammate both passes change only their own facts, and no tag; the admin's tidy everyone's.

Both passes tidy facts, never pages. [A memory dream](wiki-dream.md) runs consolidation at once when you type `/dream-memory`, whatever the clock says. It then moves lasting facts onto the wiki and supersedes a fact the project outgrew, such as one naming a gone file.

## Sign-in and expiry

Memory uses the company sign-in that `cloudflared` keeps for the app: no key in `.env`, no second login. To sign in, run `cloudflared access login <app origin>` and open the link it prints. Each call goes to the production Worker's `/_memory/` route, which checks the sign-in itself ([Access](../stack/cloudflare-access.md#4-bypass-the-public-surface)); staging and previews answer 404.

- **Expiry.** A sign-in lasts as long as the app's Access session. With fewer than 5 days left, the digest's first line says so and names the command.
- **Signed out.** The cached digest loads, a write waits in the spool, and a memory action through [company actions](../stack/company-api.md) says to sign in again.
- **Moving older memory.** After the update deploys, the admin runs `memory.mjs migrate`, then `memory.mjs migrate-people`. It gives each computer's notes to the person who signed in on it, lists the ones still waiting, and only then turns the old keys off. `assign <machine-id> <email>` gives a waiting computer's notes to someone who has used memory signed in. A rerun is safe.
- **Cloud schedules** get their own sign-in from the owner: `node .claude/skills/wong-setup/scripts/memory-schedule.mjs make <name> --secret-file <path outside the repo>`, then `list` or `revoke <name>`. Put the file's two values in the schedule's secret store. Revoke with the script, not only in Cloudflare: the store keeps its own list.
- **An app with no sign-in yet** keeps one admin key in `CLOUDFLARE_MEMORY_TOKEN`, in the primary checkout's ignored `.env` ([secrets](secrets.md)); **this page owns that name.** Setup writes it with `memory.mjs member admin`. A private app refuses it, and setup's rerun after the card removes it.

The admin's `CLOUDFLARE_API_TOKEN` reaches the store directly, for migrations and schedule sign-ins. The app's code shares the Worker with memory: [mini apps](../stack/mini-apps.md) get no memory bindings, but code in that Worker could bypass it: review it before publishing.

## Without R2

R2 needs a payment method on file, even inside its free tier. Without it, the store keeps no raw transcripts and a preview check keeps no [pictures](staging-walkthrough.md#what-a-walk-needs), and everything else works: facts, the digest, search, capture, and consolidation. `source <fact-id>` then says that transcripts are not stored. Setup's closing report gives the steps in [the card list](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#the-card-list). Turn R2 on later and run `/wong-sync`: it plans the bucket, and new sessions are kept from then on.

## When to add embeddings

Search is keyword search (FTS5) with tags. It matches a word's other forms through the porter stemmer, so *previews* finds *preview*, and filler words like *how* and *should* never match on their own. It matches forms, not meanings: *Concise language please* misses the fixture fact that says *The owner wants short replies in plain words, with no tool names unless they ask*, so search with the words the fact would use. A shipped set of real-shaped questions, `scripts/tests/fixtures/memory-search-questions.json`, runs in CI, each with the fact it must rank in the top three, so a change can't quietly break search; a question that should have matched and didn't belongs there first. That is enough at a few thousand facts: the write gate asks a model about paraphrases, and consolidation merges what it missed. Add embeddings when `memory.mjs stats` reports the trigger as met: more than 2,000 live facts, or merged duplicates growing across three consolidations. Search stays behind the one script, so nothing else changes.

In WongStack's source repo, the [evaluation runner](https://github.com/matthewwong525/WongStack/blob/main/scripts/evaluate-memory-search.mjs), `node scripts/evaluate-memory-search.mjs [--json]`, ranks the fixture questions against a temporary synthetic store, never a live one. A regression miss, a hidden result shown, or a broken run fails it; a known synonym miss only counts. Passing shows search still works, not that it understands meaning.

Back to [development](README.md).
