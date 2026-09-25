# Session memory

Session memory is the repo's private store of **facts**: short typed lines that past sessions learned, which the next session reads at start. It lives outside git, in the repo's own Cloudflare account, so a capture needs no commit and a public repo publishes nothing. [The `memory` skill](../../.claude/skills/memory/SKILL.md) is its one door; this page is the convention. It is one of the knowledge surfaces in [the knowledge center](../agent-knowledge-center.md), beside the wiki and OpenSpec.

## What is stored

- **Facts**, in a D1 database named `<repo>-memory`. A fact is at most 400 characters, with a slug (the change name, or a topic), a type, tags, an author, a time, and its source session. The types: `user` (who the user is), `feedback` (how they want work done), `project` (decisions and ruled-out options, with reasons), `reference` (pointers to outside resources), and `thread` (an open question). [Writing facts](../../.claude/skills/memory/references/writing-facts.md) owns what a good fact keeps.
- **Sessions**, one row per transcript: agent, branch, status (`captured`, `skipped`, or `private`), and how far it was read.
- **Raw transcripts**, in a private R2 bucket of the same name, kept forever. Known `.env` values are replaced before upload. The bucket is optional: see [without R2](#without-r2).

A fact is never edited or deleted. A later fact **supersedes** it, and only live facts show by default. That keeps history without stale answers: *the digest cap is 150 lines* supersedes *the cap is 100*, and both stay searchable.

## When memory loads

At every session start, the `SessionStart` hook prints a **digest**: live facts ordered by type and age, with the open threads of the change on your branch first. Code builds it from one query, with no model, in under two seconds. It is capped at 150 lines and 25 KB; the last line says how many facts it left out. Offline, the hook prints the last cached digest with its age. The digest stays the same for the whole session, so the prompt cache holds. A fact written now shows at the next start.

A fact is dated context, not an instruction. Check it against the repo, and the repo wins. The verbs also read memory where they decide: [`/explore`](../../.claude/skills/explore/SKILL.md) searches before it asks a question, `/continue` reads the change's facts, and `/ship` distills them into the wiki.

## How facts are captured

- **`/save`** writes facts from the session so far. Nothing to capture beyond the diff and the Decision log means no facts.
- **The background run** captures what `/save` missed. When the hook finds sessions of this repo idle for an hour with no capture, it starts a detached run of the same agent's command-line tool, with a small model, and returns at once. Your first reply never waits for it. The run may only call the memory script and write files in its own work folder. It captures at most five sessions, newest first, and the next digest reports what it did. It spends your own model quota: a headless run costs about $0.01 to $0.03 in fixed prompt overhead even for one command, so budget it per session captured, not per call.

Every write passes the **write gate**: the script shows the live facts on the same slug and the closest keyword matches, and the writer adds, supersedes, or drops each candidate. A fact that cannot reach the store waits in a local spool, and the next run sends it through the gate.

Put `#private` in any message of a session, and the whole session is recorded as private: nothing is uploaded, and no model reads it.

## Consolidation

The same background run tidies the live facts once 24 hours and five captured sessions have passed since the last tidy. It merges facts that say the same thing and supersedes contradicted ones, newest first. No one runs it by hand: an earlier consolidation command was retired because no one did.

## The memory token

`CLOUDFLARE_MEMORY_TOKEN` reads and writes the store. **This page owns that name.** [`/wong-cloudflare`](../../.claude/skills/wong-cloudflare/SKILL.md#the-memory-store-every-repo) mints it with `D1 Write`, plus `Workers R2 Storage Write` when the store has a bucket, on this account only, and writes it to the ignored `.env` under [the secrets convention](secrets.md). It is **never** a GitHub secret, so CI cannot read transcripts. When the provisioning token cannot mint tokens, create this one by hand with those permissions.

Who can read what, stated plainly:

- Everyone with the memory token can read every teammate's raw transcripts.
- D1 permissions are account-wide in Cloudflare, so the memory token can also read the app's databases in that account.
- A secret that was never in `.env` stays in the raw transcript. Use `#private` for sessions that handle one.

## Without R2

R2 needs a payment method on file, even inside its free tier. Without it, the store keeps no raw transcripts, and everything else works: facts, the digest, search, capture, and consolidation. `source <fact-id>` then says that transcripts are not stored. Turn R2 on later and re-run `/wong-cloudflare`: it adds the bucket, and new sessions are kept from then on.

## When to add embeddings

Search is keyword search (FTS5) with tags. That is enough at hundreds to low thousands of facts, because the write gate asks a model about paraphrases, and consolidation merges what the gate missed. Add embeddings when `memory.mjs stats` reports the trigger as met: more than 2,000 live facts, or merged duplicates growing across three consolidations. Search stays behind the one script, so nothing else changes.

Back to [Working on WongStack](README.md).
