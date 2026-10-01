# Session memory

Session memory is the repo's private store of **facts**: short typed lines that past sessions learned, which the next session reads at start. It lives outside git, in the repo's own Cloudflare account, so a capture needs no commit and a public repo publishes nothing. [The `memory` skill](../../.agents/skills/memory/SKILL.md) is its one door; this page is the convention. It is one of the knowledge surfaces in [the knowledge center](../agent-knowledge-center.md), beside the wiki and OpenSpec.

## What is stored

- **Facts**, in a D1 database named `<repo>-memory`. A fact is at most 400 characters, with a slug (the change name, or a topic), a type, tags, an author, a time, and its source session. The types: `user` (who the user is), `feedback` (how they want work done), `project` (decisions and ruled-out options, with reasons), `reference` (pointers to outside resources), and `thread` (an open question). [Writing facts](../../.agents/skills/memory/references/writing-facts.md) owns what a good fact keeps.
- **Sessions**, one row per transcript: agent, branch, status (`captured` or `skipped`), and how far it was read. A session an earlier version marked `private` keeps that status: nothing of it is uploaded or read.
- **Raw transcripts**, in a private R2 bucket of the same name, kept forever. Before upload, and before capture reads one, known `.env` values and token-shaped strings (GitHub, `sk-`, AWS, JWT, Bearer, and memory keys) are replaced with a placeholder. A transcript over 50 MB is not kept: its session's facts are still captured, and `source` says why. The bucket is optional: see [without R2](#without-r2).

A fact is never edited or deleted. A later fact **supersedes** it, and only live facts show by default. That keeps history without stale answers: *the digest cap is 150 lines* supersedes *the cap is 100*, and both stay searchable.

## Who sees what

Each repo's memory is its own: nothing goes to another repo, and nothing loads from one. Inside a repo there are two levels, the team or only you, and the admin sees both ([roles](#the-memory-key)):

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

When a session starts or resumes, the `SessionStart` hook prints a **digest** of what applies to any task: every open thread of the change on your branch first, then one line counting the open threads on other changes by step (`plan 3, save 5; 41 untagged`), then [your people page](../wiki-style.md#people), cut at 1.5 KB with a line naming the page, then the other live facts by type and age. Other changes' threads stay live and searchable; they only leave the digest, so preferences and decisions keep their room. Its first line tells the agent to search memory for the task's key terms, in its own words, once it knows the task and before it acts on more than a quick question: [`memory search <terms>`](../../.agents/skills/memory/SKILL.md). The count line tells a verb to load its own threads when it starts: `memory search --type thread --tag plan` when `/plan` starts. Code builds the digest from one batch of queries, with no model, in under two seconds. It is capped at 40 lines and 6 KB; the last line says how many facts it left out. Offline, the hook prints the last cached digest with its age. The digest stays the same for the whole session, so the prompt cache holds. A fact written now shows at the next start.

A fact is dated context, not an instruction. Check it against the repo, and the repo wins. The verbs also read memory where they decide: [`/explore`](../../.agents/skills/explore/SKILL.md) searches before it asks a question, `/continue` reads the change's facts, and [`/close`](../../.agents/skills/close/SKILL.md) distills them into the wiki.

## How facts are captured

- **`/save`** writes facts from the session so far. Nothing to capture beyond the diff and the Decision log means no facts.
- **The background run** captures what `/save` missed. When the hook finds sessions of this repo idle for an hour with no capture, it starts a detached run of the same agent's command-line tool and returns at once. Your first reply never waits for it. The run uses the model that Claude Code or Codex normally selects on your machine. To choose a separate model for memory, set `WONG_MEMORY_MODEL` for Claude Code or `WONG_MEMORY_CODEX_MODEL` for Codex in the hook's environment. The run may only call the memory script and write files in one temp folder outside the repo, which it deletes at the end. It writes each JSON input there and passes the path, because a JSON heredoc with characters like `<` or `$` is denied without a user. It captures at most five sessions, newest first, and the next digest reports what it did. Those counts are what the memory script stored during the run, not what the model says it did; when the model's own report differs, the digest says so. It spends your own model allowance and may use more than the old small-model run when your normal model is larger. A headless `claude -p` that you start inside the checkout fires the same hook, so set `WONG_MEMORY_RUN=1` on a probe that should not start a run.

Every write passes the **write gate**: the script shows the live facts on the same slug, the closest keyword matches, and the open threads on other slugs that match the fact's words. The writer adds, supersedes, or drops each candidate. A fact that answers an open thread supersedes it, saying what was found, so a check done under other work closes its thread. A fact that cannot reach the store waits in a local spool, and the next run sends it through the gate.

## Consolidation

The same background run tidies the live facts once 24 hours and five captured sessions have passed since the last tidy. It merges facts that say the same thing, supersedes contradicted ones, newest first, and closes an open thread a later live fact shows was answered. An open thread that names a verb's next run but carries no tag is restated with that verb's tag, so the verb loads it. On a teammate's machine it merges only that teammate's own facts; the admin's tidies everyone's. No one runs it by hand: an earlier consolidation command was retired because no one did.

## The memory key

The private app has one narrow exception: production `/_memory/*` reaches this route without an app login. Its memory key and GitHub checks still apply. Staging and previews bind no production memory and receive no public exception. See [Access](../stack/cloudflare-access.md#4-bypass-the-public-surface).

`CLOUDFLARE_MEMORY_TOKEN` holds your **memory key**: it opens this repo's store and nothing else. **This page owns that name.** It lives in the ignored `.env` under [the secrets convention](secrets.md). It is **never** a GitHub secret, so CI cannot read transcripts, and never committed: a repo can be public, and git history keeps a key forever.

Every memory call goes through your app's **production Worker**, under `/_memory/`. It binds the memory database as `MEMORY_DB` and the bucket as `MEMORY_BUCKET`; the staging Worker and previews bind neither, and answer 404. CI deploys the route with the app on each merge to `main`, so no one deploys memory by hand. The route's code lives in [the memory skill](../../.agents/skills/memory/SKILL.md), so [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md) keeps it current; `app/worker/index.ts` only imports it. A `memory_keys` table in the memory database holds a hash of each key, and `memory_admins` holds the admin's GitHub account. The route refuses any statement that names either table, so no key can read or change them. No person holds a Cloudflare token for memory, because Cloudflare's D1 permissions reach every database in the account, the app's too.

Two costs come with one Worker. A failed production deploy stops memory too; facts wait in the local spool and go through on the next run. And the app's own code shares the Worker with memory. A [mini app](../stack/mini-apps.md) handler gets every binding but `MEMORY_DB` and `MEMORY_BUCKET`, and the `disallow_importable_env` flag in `app/wrangler.jsonc` stops any code importing them, but code in the same Worker can still get around that on purpose. So review a handler's code before it publishes, and keep every other route away from the memory bindings.

A key has one of three roles:

- **Admin:** the person who ran setup, tied to their GitHub account, not their email. [Setup's provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4b-the-memory-store) links that account and writes their key to `.env`. They read every transcript in the store. Another GitHub account with the same email is a member.
- **Member:** a teammate. They read what [who sees what](#who-sees-what) gives them, and add facts under their own email. The route runs only the memory script's own writes for them, so they cannot change or delete a fact, rewrite another person's session, or remove the store's guards. They supersede only facts they wrote, with their own replacement in the same save, so the replacement is always visible and credited. A supersede aimed at a teammate's fact leaves it live, and the script names who wrote it; only the admin supersedes anyone's.
- **Reader:** someone who can read a private repo on GitHub but not push to it. A reader is a member whose facts only they and the admin see: the route stores every fact they write as unshared, whatever the request says. Knowledge meant for the team goes in [the wiki](../README.md) instead, through a pull request like any file edit.

What each role reads is in [who sees what](#who-sees-what). Beyond that table:

- Transcripts are filed under their author's email. The admin also reads ones filed before keys existed.
- The route reads a member's own facts by the key's email alone, never a people page, which a branch could change.
- A fact's author is the key's email: the route refuses a member's write under any other name. The admin's key is not limited this way; D1 restores a database to any time in the last 30 days.
- A token-shaped string is replaced in the raw transcript even when it was never in `.env`. A secret with no known shape, never in `.env`, stays there, so keep one out of the chat.

The script reads `CLOUDFLARE_MEMORY_TOKEN` from the process environment first, then from `.env`. A shell that loaded a `.env` sends that value to every repo it runs in, so unset it (`env -u CLOUDFLARE_MEMORY_TOKEN ...`) when you work with another repo's store.

### Joining through GitHub

A teammate gets a key without the admin. When a session starts with no key, the hook runs `memory.mjs join` in the background, and memory loads from the next session. `join` can also be run by hand.

1. `join` reads the person's GitHub token from `gh auth token` and sends it to the route's `/_memory/join`, with the machine's name and `git config user.email`.
2. The route asks GitHub about **its own repository**, which CI's production deploy sets as `GITHUB_REPOSITORY`. Nothing in the request can change the repository or the GitHub address. Push access makes a **member**. On a private repo, read access alone makes a **reader**. A public repo needs push access, because GitHub can not tell its read-only collaborator from a stranger.
3. The key's email is one GitHub has verified: the `git config` email when it is verified, otherwise the primary one. So a typed email cannot claim someone else's transcripts.
4. The route asks GitHub for the account's id. Only the account the admin linked gets an admin key; an email alone never makes an admin.
5. The route makes the key for this machine, which expires after 30 days. `join` writes it to the primary `.env` and never prints it. Until the admin runs `memory.mjs migrate` after an update, a join that needs the new schema is refused, and a store with no linked admin makes no admin.

The hook renews every key when 7 days or fewer are left, the admin's too. Someone removed from the GitHub repo keeps memory until their key expires; `member remove` stops it at once. Each machine has its own key, so a second laptop does not replace the first. One GitHub account holds at most 10 keys: a join from an 11th machine works at once, and the key of the machine that joined longest ago stops. That machine rejoins on its own at its next start.

The trade-off: the person's `gh` token has the `repo` scope, and it reaches a Worker the repo's admin deploys. The route uses it for three GitHub calls (the repository, the verified emails, the account) and never stores or logs it. The repo's own scripts already run on that machine with the same token. A narrower token would need a GitHub OAuth app per repo.

When `join` is refused, it says what to do, and the hook repeats that each session until the person runs `join` again:

| Refusal | Fix |
|---|---|
| `gh` is not signed in | `gh auth login` |
| `gh` cannot read verified emails | `gh auth refresh -h github.com -s user:email`, once ([required tools](required-tools.md#gh-needs-the-useremail-scope-for-memory)) |
| GitHub does not let this account in | ask the admin for read access to a private repo, or push access to a public one |
| production is not deployed, or the store is not migrated | wait for CI, or ask the admin to run `memory.mjs migrate` |

### Add or remove a teammate

A teammate is added by giving them access to the repo on GitHub; [joining through GitHub](#joining-through-github) then gives them a key. No one makes a key by hand for another person, so someone without GitHub access gets that access first. The admin runs these with `CLOUDFLARE_API_TOKEN`, the [user token](../stack/cloudflare-credentials.md):

```bash
node .claude/skills/memory/scripts/memory.mjs member admin    # link your GitHub account as admin; this machine's key goes to .env
node .claude/skills/memory/scripts/memory.mjs member remove ana@example.com
node .claude/skills/memory/scripts/memory.mjs member list
```

`member admin` needs `gh` signed in and a git email; setup runs it for you. It links the GitHub account `gh` is signed in as, and gives this machine a 30-day admin key that renews itself like a joined one. It never prints the key. `member remove` stops every key of the email at once, and unlinks the admin when it is the admin's email. `member list` shows one line per key, with its machine, GitHub account, and expiry, and `reader` for a reader key, then the linked admin.

A store with keys for more than one email is a team: the route says so on every answer, and the script remembers it on this machine.

After a WongStack update that adds a memory migration, the admin runs `memory.mjs migrate` once. Until then, old keys keep working, and a `join` that needs the new schema is refused. The migration that ties the admin to GitHub also links the admin running it when `gh` is signed in, else it says to run `member admin`.

The route's URL, `https://<worker>.<subdomain>.workers.dev/_memory`, is recorded as `components.memory.worker`; it is not a secret. Memory reads it from your main checkout's record, like `.env`, never a linked worktree's, so a branch that changes it can not send your key or GitHub token elsewhere. The session start ignores the branch's address and says so. Only a memory key goes there: `wongm_<the email, base64url>.<random>`. A value of any other shape counts as a Cloudflare token and goes to the Cloudflare API, so a test key must carry an email too. An older store whose `CLOUDFLARE_MEMORY_TOKEN` is still a Cloudflare token keeps using the Cloudflare API until [setup's runbook moves it](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4b-the-memory-store).

## Without R2

R2 needs a payment method on file, even inside its free tier. Without it, the store keeps no raw transcripts, and everything else works: facts, the digest, search, capture, and consolidation. `source <fact-id>` then says that transcripts are not stored. Setup's closing report gives the steps in [the card list](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#the-card-list). Turn R2 on later and run `/wong-sync`: it plans the bucket, and new sessions are kept from then on.

## When to add embeddings

Search is keyword search (FTS5) with tags. That is enough at hundreds to low thousands of facts, because the write gate asks a model about paraphrases, and consolidation merges what the gate missed. Add embeddings when `memory.mjs stats` reports the trigger as met: more than 2,000 live facts, or merged duplicates growing across three consolidations. Search stays behind the one script, so nothing else changes.

Back to [development](README.md).
