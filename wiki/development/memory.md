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

- **The store holds back what a teammate may not see**, however they ask: the route answers a member's or reader's read only with the facts above. Only the admin's `--everyone` on `search`, `show`, or `live` shows all.
- **The admin's own view starts narrow too.** Their digest and search show only their own `user` and `feedback` facts, matched on every email on their [people page](../wiki-style.md#people), until they add `--everyone`.
- **Something personal you say in a work chat stays in that repo**, where the admin can read it. For anything no one else should see, use a repo only you use: there, you are the admin.
- A repo where only one email holds a key is not a team, and nothing is filtered by person.

## When memory loads

When a session starts or resumes, the `SessionStart` hook prints a **digest** of what applies to any task: every open thread of the change on your branch first, then one line counting the open threads on other changes by step (`plan 3, save 5; 41 untagged`), then [your people page](../wiki-style.md#people), cut at 1.5 KB with a line naming the page, then the other live facts by type and age. Other changes' threads stay live and searchable; they only leave the digest, so preferences and decisions keep their room. Its first line tells the agent to search memory for the task's key terms, in its own words, once it knows the task and before it acts on more than a quick question: [`memory search <terms>`](../../.agents/skills/memory/SKILL.md). The agent picks the terms, not a hook: whatever loads stays in view for the whole session, the start can't know the task, and a keyword search on the raw first message (*is memory flat here?*) matches common words and pulls in unrelated facts. The count line tells a verb to load its own threads when it starts: `memory search --type thread --tag plan` when `/plan` starts. Code builds the digest from one batch of queries, with no model, in under two seconds. It is capped at 40 lines and 6 KB; the last line says how many facts it left out. Offline, the hook prints the last cached digest with its age. The digest stays the same for the whole session, so the prompt cache holds. A fact written now shows at the next start.

A fact is dated context, not an instruction. Check it against the repo, and the repo wins. The verbs also read memory where they decide: [`/explore`](../../.agents/skills/explore/SKILL.md) searches before it asks a question, `/continue` reads the change's facts, and [`/close`](../../.agents/skills/close/SKILL.md) distills them into the wiki.

## How facts are captured

- **`/save`** writes facts from the session so far. Nothing to capture beyond the diff and the Decision log means no facts.
- **The background run** captures what `/save` missed. When the hook finds sessions of this repo idle for an hour with no capture, it starts a detached run of the same agent's command-line tool and returns at once. Your first reply never waits for it. It uses your agent's normal model; to choose another, set `WONG_MEMORY_MODEL` (Claude Code) or `WONG_MEMORY_CODEX_MODEL` (Codex) in the hook's environment. The run may only call the memory script and write files in one temp folder outside the repo, which it deletes at the end. It writes each JSON input there and passes the path, because a JSON heredoc with characters like `<` or `$` is denied without a user. It captures at most five sessions, newest first, and the next digest reports what it did. Those counts are what the script stored, not what the model says; when the two differ, the digest says so. It spends your own model allowance. A headless `claude -p` that you start inside the checkout fires the same hook, so set `WONG_MEMORY_RUN=1` on a probe that should not start a run.

Every write passes the **write gate**: the script shows the live facts on the same slug, the closest keyword matches, and the open threads on other slugs that match the fact's words. The writer adds, supersedes, or drops each candidate. A fact that answers an open thread supersedes it, saying what was found, so a check done under other work closes its thread. A fact that cannot reach the store waits in a local spool, and the next run sends it through the gate.

## Facts by code area

A fact about code carries the **area tag** of the folder it concerns, so the next change there loads it. [`areas.json`](../../.agents/skills/memory/references/areas.json), in the memory skill, maps folders to areas, each with a definition and the docs that own it: `app/worker/` to `worker`, `wiki/` to `wiki`. The most specific folder wins: `app/worker/apps/` gives `mini-apps` and `worker`, not `stack-pack`, which covers all of `app/`.

- **A fact gets its area when it is written.** The writer tags it, as [writing facts](../../.agents/skills/memory/references/writing-facts.md) says. An area tag the store lacks is defined from the list on first use. A stored definition never changes, because no command rewrites a tag: the store's `mini-apps` definition still predates 29.0.0, so fix a definition in `areas.json` for new repos only. [Consolidation](#consolidation) tags older facts.
- **One lookup shows everything linked.** `memory.mjs areas <path or topic>` prints the areas, their docs (wiki pages and specs), up to five past changes, newest first, those naming the path ahead of those sharing an area, the files linking to each path, and then the live facts: open threads first, then newest, at most 20, as [who sees what](#who-sees-what) allows. It reads the links and changes fresh, so nothing goes stale. When the store doesn't answer, it says memory was not loaded, and work goes on.
- **The build loads it.** Before its first edit, [`/apply`'s build](../../.agents/skills/apply/references/build-helper.md) runs `memory.mjs areas --change <name>` on the paths the change's proposal, design, and tasks name.
- **Planning loads it too.** [`/explore`](../../.agents/skills/explore/SKILL.md#search-memory-before-asking) runs `areas` on the paths it expects to touch, beside its keyword search, because a fact about a folder rarely names the file you search by.
- **A repo adds its own areas** in `areas.json`: a tag, a definition, folder prefixes, and docs; a doc the repo lacks is skipped. [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md) keeps the edit as a local change.

## Consolidation

The same background run tidies the live facts once 24 hours and five captured sessions have passed since the last tidy. It merges facts that say the same thing, supersedes contradicted ones, newest first, and closes an open thread a later live fact shows was answered. It also **re-tags**: an open thread that names a verb's next run gains that verb's tag, so the verb loads it, and a fact about code in a mapped folder gains [its area](#facts-by-code-area). A re-tagged fact keeps its words, its date, its author, and its link to the chat it came from; it supersedes the untagged one. On a teammate's machine it merges and re-tags only that teammate's own facts; the admin's tidies everyone's. No one runs it by hand: an earlier consolidation command was retired because no one did.

## The memory key

`CLOUDFLARE_MEMORY_TOKEN` holds your memory key: it opens this repo's store, through your app's production Worker, and nothing else. Its roles, how a teammate joins through GitHub, and how the admin adds or removes one: [the memory key](memory-key.md).

## Without R2

R2 needs a payment method on file, even inside its free tier. Without it, the store keeps no raw transcripts, and everything else works: facts, the digest, search, capture, and consolidation. `source <fact-id>` then says that transcripts are not stored. Setup's closing report gives the steps in [the card list](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#the-card-list). Turn R2 on later and run `/wong-sync`: it plans the bucket, and new sessions are kept from then on.

## When to add embeddings

Search is keyword search (FTS5) with tags. That is enough at hundreds to low thousands of facts, because the write gate asks a model about paraphrases, and consolidation merges what the gate missed. Add embeddings when `memory.mjs stats` reports the trigger as met: more than 2,000 live facts, or merged duplicates growing across three consolidations. Search stays behind the one script, so nothing else changes.

Back to [development](README.md).
