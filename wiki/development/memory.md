# Session memory

Session memory is the repo's private store of **facts**: short typed lines that past sessions learned, which the next session reads at start. It lives outside git, in the repo's own Cloudflare account, so a capture needs no commit and a public repo publishes nothing. [The `memory` skill](../../.agents/skills/memory/SKILL.md) is its one door; this page is the convention. It is one of the knowledge surfaces in [the knowledge center](../agent-knowledge-center.md), beside the wiki and OpenSpec.

## What is stored

- **Facts**, in a D1 database named `<repo>-memory`. A fact is at most 400 characters, with a slug (the change name, or a topic), a type, tags, an author, a time, and its source session. The types: `user` (who the user is), `feedback` (how they want work done), `project` (decisions and ruled-out options, with reasons), `reference` (pointers to outside resources), and `thread` (an open question). [Writing facts](../../.agents/skills/memory/references/writing-facts.md) owns what a good fact keeps.
- **Sessions**, one row per transcript: agent, branch, status (`captured`, `skipped`, or `private`), and how far it was read.
- **Raw transcripts**, in a private R2 bucket of the same name, kept forever. Known `.env` values are replaced before upload. The bucket is optional: see [without R2](#without-r2).

A fact is never edited or deleted. A later fact **supersedes** it, and only live facts show by default. That keeps history without stale answers: *the digest cap is 150 lines* supersedes *the cap is 100*, and both stay searchable.

## When memory loads

When a session starts or resumes, the `SessionStart` hook prints a **digest**: the open threads of the change on your branch first, then other open threads, then the other live facts by type and age. Code builds it from one query, with no model, in under two seconds. It is capped at 40 lines and 6 KB, and [`memory search`](../../.agents/skills/memory/SKILL.md) finds the rest; the last line says how many facts it left out. Offline, the hook prints the last cached digest with its age. The digest stays the same for the whole session, so the prompt cache holds. A fact written now shows at the next start.

When the machine records a [home](home.md), the digest ends with a short **From home** part: your page from home's wiki and your live `user` and `feedback` facts from home's store, fetched in parallel within the same budget and capped on their own. [Home](home.md#what-every-repo-reads-from-home) owns the details.

A fact is dated context, not an instruction. Check it against the repo, and the repo wins. The verbs also read memory where they decide: [`/explore`](../../.agents/skills/explore/SKILL.md) searches before it asks a question, `/continue` reads the change's facts, and `/ship` distills them into the wiki.

## How facts are captured

- **`/save`** writes facts from the session so far. Nothing to capture beyond the diff and the Decision log means no facts.
- **The background run** captures what `/save` missed. When the hook finds sessions of this repo idle for an hour with no capture, it starts a detached run of the same agent's command-line tool, with a small model, and returns at once. Your first reply never waits for it. The run may only call the memory script and write files in one temp folder outside the repo, which it deletes at the end. It writes each JSON input there and passes the path, because a JSON heredoc with characters like `<` or `$` is denied without a user. It captures at most five sessions, newest first, and the next digest reports what it did. It spends your own model quota: a headless run costs about $0.01 to $0.03 in fixed prompt overhead even for one command, so budget it per session captured, not per call. A headless `claude -p` that you start inside the checkout fires the same hook, so set `WONG_MEMORY_RUN=1` on a probe that should not start a run.

Every write passes the **write gate**: the script shows the live facts on the same slug and the closest keyword matches, and the writer adds, supersedes, or drops each candidate. A fact that cannot reach the store waits in a local spool, and the next run sends it through the gate.

A fact about your private life — health, family, money, personal plans — goes to your home's store with `--home`, never to this one. It waits in home's spool when home does not answer, and it is dropped when no home is recorded: [what every repo sends to home](home.md#what-every-repo-sends-to-home).

Put `#private` in any message of a session, and the whole session is recorded as private: nothing is uploaded, and no model reads it.

## Consolidation

The same background run tidies the live facts once 24 hours and five captured sessions have passed since the last tidy. It merges facts that say the same thing and supersedes contradicted ones, newest first. No one runs it by hand: an earlier consolidation command was retired because no one did.

## The memory token

`CLOUDFLARE_MEMORY_TOKEN` holds your **memory key**: it opens this repo's store and nothing else. **This page owns that name.** It lives in the ignored `.env` under [the secrets convention](secrets.md), and it is **never** a GitHub secret, so CI cannot read transcripts.

Every memory call goes through your app's **production Worker**, under `/_memory/`. It binds the memory database as `MEMORY_DB` and the bucket as `MEMORY_BUCKET`; the staging Worker and previews bind neither, and answer 404. CI deploys the route with the app on each merge to `main`, so no one deploys memory by hand. The route's code lives in [the memory skill](../../.agents/skills/memory/SKILL.md), so [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md) keeps it current; `app/worker/index.ts` only imports it. A `memory_keys` table in the memory database holds a hash of each key. The route refuses any statement that names that table, so no key can read or change it. No person holds a Cloudflare token for memory, because Cloudflare's D1 permissions reach every database in the account, the app's too.

Two costs come with one Worker. A failed production deploy stops memory too; facts wait in the local spool and go through on the next run. And the app's own code can read `MEMORY_DB` and `MEMORY_BUCKET`, so a bug there could expose transcripts: keep every other route away from them.

A key has one of two roles:

- **Admin:** the person who ran setup. [Setup's provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4b-the-memory-store) writes their key to `.env`. They read every transcript in the store.
- **Member:** a teammate. They read and write facts like the admin, but they read only their own transcripts.

Who can read what, stated plainly:

- Facts are shared. In a team, the digest and search show only your own `user` and `feedback` facts, matched on every email on your [people page](../wiki-style.md#people). `project` and `thread` facts come from everyone. `memory.mjs search --everyone` shows all.
- Transcripts are filed under their author's email. A member reads only their own; the admin reads all, including ones filed before keys existed.
- A member can still write a fact under another name or delete rows. Give keys only to people you trust with the store; D1 restores a database to any time in the last 30 days.
- A secret that was never in `.env` stays in the raw transcript. Use `#private` for sessions that handle one.

The script reads `CLOUDFLARE_MEMORY_TOKEN` from the process environment first, then from `.env`. A shell that loaded a `.env` sends that value to every repo it runs in, so unset it (`env -u CLOUDFLARE_MEMORY_TOKEN ...`) when you work with another repo's store.

### Add or remove a teammate

The admin runs these with `CLOUDFLARE_API_TOKEN`, the [user token](../stack/cloudflare-credentials.md):

```bash
node .claude/skills/memory/scripts/memory.mjs member add ana@example.com   # prints Ana's key once
node .claude/skills/memory/scripts/memory.mjs member remove ana@example.com
node .claude/skills/memory/scripts/memory.mjs member list
```

Send the key privately. The teammate puts it in the `.env` of their main checkout as `CLOUDFLARE_MEMORY_TOKEN`. The first member makes the repo a team: `member add` sets `components.memory.team` in `.claude/.wong-stack.json`, so save that change. Adding an email again replaces its key, and `member remove` stops a key at once.

The route's URL, `https://<worker>.<subdomain>.workers.dev/_memory`, is recorded as `components.memory.worker`; it is not a secret. Only a memory key goes there: `wongm_<the email, base64url>.<random>`. A value of any other shape counts as a Cloudflare token and goes to the Cloudflare API, so a test key must carry an email too. An older store whose `CLOUDFLARE_MEMORY_TOKEN` is still a Cloudflare token keeps using the Cloudflare API until [setup's runbook moves it](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4b-the-memory-store).

## Without R2

R2 needs a payment method on file, even inside its free tier. Without it, the store keeps no raw transcripts, and everything else works: facts, the digest, search, capture, and consolidation. `source <fact-id>` then says that transcripts are not stored. Turn R2 on later and run `/wong-sync`: it plans the bucket, and new sessions are kept from then on.

## When to add embeddings

Search is keyword search (FTS5) with tags. That is enough at hundreds to low thousands of facts, because the write gate asks a model about paraphrases, and consolidation merges what the gate missed. Add embeddings when `memory.mjs stats` reports the trigger as met: more than 2,000 live facts, or merged duplicates growing across three consolidations. Search stays behind the one script, so nothing else changes.

Back to [Working on WongStack](README.md).
