# Session memory

Session memory is the repo's private store of **facts**: short typed lines that past chats learned, which the next chat reads at start. It lives outside git, in the repo's own Cloudflare account, so a capture needs no commit and a public repo publishes nothing. [The memory plugin](../../.agents/plugins/memory/README.md) runs it, [its skill](../../.agents/plugins/memory/SKILL.md) is its one door, and this page is the convention. It is one knowledge surface in [the knowledge center](../agent-knowledge-center.md), beside the wiki and OpenSpec.

## Three layers

Memory has three parts, so another repo can use it with its own database.

- **The plugin**, [`.agents/plugins/memory/`](../../.agents/plugins/memory/README.md): the hooks, `memory.mjs`, the write gate, capture, the digest, [topics](#topics), and [the tidy](wiki-dream.md). It never names a database.
- **The store interface**, `store/interface.mjs` in the plugin: twelve named operations, such as `facts`, `write`, and `digest`. The plugin sends only these: never a query, a table name, or an owner. The server writes every query and applies [who sees what](#who-sees-what). `store/contract.mjs` checks that a backend answers each one, each role's limits included.
- **WongStack's extras**, [`.agents/memory/`](../../.agents/memory/profile.mjs): [the profile](#the-profile), the D1 and R2 store behind the app's `/_memory/v2/` route, the sign-in, admin jobs, [code areas](#facts-by-code-area), [company knowledge](../stack/company-knowledge.md), and [the actions catalogue](../stack/company-api.md).

## The profile

[`.agents/memory/profile.mjs`](../../.agents/memory/profile.mjs) is the one file the plugin loads from the repo; `WONG_MEMORY_PROFILE` can name another. It exports one object. Only `connect` is required, and a missing part turns off only its own feature:

| Part | What it gives the plugin |
|---|---|
| `connect` | which store, and how this computer signs in |
| `topics` | [the topics](#topics): code areas and company pages |
| `steps` | each verb tag, and the slash commands that name it |
| `currentSlug`, `slugState` | the change on this branch, and whether a slug is active, shipped, or a conversation |
| `person` | the current person's page, for the digest |
| `lookup` | what `pull` adds: docs, past changes, links, code users, and each change's files |
| `tidy` | more pages for [the tidy](wiki-dream.md) to check, how its edits publish, and its deny list |
| `sessionStart` | a job at chat start: the company knowledge refresh |
| `commands` | admin commands on WongStack's own store: `migrate`, `migrate-people`, `assign`, `member` |

With no profile, a new chat asks once, *Memory isn't set up yet. Set it up now?*, and follows [the setup guide](../../.agents/plugins/memory/references/setup.md) only on a yes.

## Two installs

Each is a real `.claude/skills/memory/` folder, so Claude Code loads it from the checkout and a branch runs its own memory code.

- **With WongStack.** Each [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md) brings the folder.
- **Alone**, in any other repo: a message pasted from [the plugin's README](../../.agents/plugins/memory/README.md) has the AI follow [the setup guide](../../.agents/plugins/memory/references/setup.md). It copies the folder in, connects or builds a store, writes the profile, and runs the store check, asking before a step that costs money or goes public. A second message updates it and keeps the repo's own edits. In a WongStack install, both stop.

Codex copies the plugin once per computer from the root `.claude-plugin/marketplace.json`: setup or an update installs it here; elsewhere, the next Codex chat names the command. An open Codex chat asks once to trust its hooks; `codex exec` skips them before that.

## What is stored

- **Facts**, in a D1 database named `<repo>-memory`. A fact is at most 400 characters, with a slug (the change name, or a topic), a type, tags, an author, a time, its sources, and a separate owner: the person's sign-in. The types: `user` (who the user is), `feedback` (how they want work done), `project` (decisions and ruled-out options, with reasons), `reference` (pointers to outside resources), and `thread` (an open question). [Writing facts](../../.agents/plugins/memory/references/writing-facts.md) owns what a good fact keeps.
- **Sessions**, one row per transcript: agent, branch, status (`captured` or `skipped`), and how far it was read. A session an earlier version marked `private` keeps that status: nothing of it is uploaded or read.
- **Raw transcripts**, in a private R2 bucket of the same name, kept forever. Before upload or capture, `.env` values and token-shaped strings become a placeholder. A transcript over 50 MB is not kept: its facts are still captured, and `source` says why. The bucket is optional: see [without R2](#without-r2).

A fact is never edited or deleted. A later fact **supersedes** it; only live facts show by default, so history stays without stale answers: *the digest cap is 150 lines* supersedes *the cap is 100*, and both stay searchable.

## Who sees what

Each repo's memory is its own: nothing goes to or loads from another repo. A repo has two levels, the team or only you, and the admin sees both:

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

When a chat starts or resumes, the plugin's start hook prints a **digest** of threads, not facts: the [last daily tidy](wiki-dream.md#the-daily-tidy), every open thread of the change on your branch, one line counting the open threads on other changes by step (`plan 3, save 5; 41 untagged`), [the topic list](#topics), a `Lately:` line with the topics that gained facts this week, [your people page](../wiki-style.md#people) (from [`knowledge/people/`](../stack/company-knowledge.md#what-goes-there) first) cut at 1.5 KB with a line naming the page, then only the preferences you stated since the last tidy. An older preference is on your page or under its topic. Its first lines tell the agent to [recall its task](document-retrieval.md) and [pull](memory-search.md#pull-a-thread) its topics before substantial work, or give a task that spans topics to [the memory helper](memory-search.md#the-memory-helper). Code builds it from one `digest` call, with no model, in under two seconds. It is capped at 40 lines and 6 KB; the last line says how many live facts memory holds. A store older than the plugin lists the newest facts, as before, and the digest says so once. Offline or signed out, the hook prints this computer's cached digest with its age; a refused sign-in turns that off until one succeeds. The digest stays the same for the whole chat, so the prompt cache holds.

**Before the first edit in a folder**, a hook shows that [area's](#facts-by-code-area) open threads, then its newest live facts, eight lines at most, as [who sees what](#who-sees-what) allows. It fires once per area per chat, on Claude Code's edit tools and Codex's `apply_patch`, and never holds up the edit: no answer within 3 seconds shows nothing.

A fact is dated context, not an instruction. Check it against the repo, and the repo wins. The verbs also read memory where they decide: [`/explore`](../../.agents/plugins/loop/skills/explore/SKILL.md) searches before it asks a question, and `/continue` reads the change's facts and open threads. [Memory search](memory-search.md) says which read to use.

## Topics

A topic is a tag with a page. The profile lists them:

- **Code areas**, from [`areas.json`](#facts-by-code-area). The page is the area's first doc, and the summary is its definition.
- **Company pages**, each page in [`knowledge/`](../stack/company-knowledge.md) except `*.mine.md`. The tag is the path inside `knowledge/` without `.md`: `knowledge/people/ada.md` is `people/ada`, and a folder's `README.md` takes the folder's name. The summary is the page's first sentence. An area wins a name clash.

What a topic does:

- **The digest lists them**: up to eight company topics, in the order the company hub links them, one line each with its summary; then the code topics' names on one line; then the pull command. The list shows even when the store is empty or down.
- **A message that names one gets its summary.** Before the assistant reads your message, a hook matches it against the topics, from files on this computer only: no store, no network. A whole name, an alias, or a company topic's last part (*Ada* for `people/ada`) adds the summary; a word that only starts a name adds the name. At most three, each once per chat; a topic named for a skill, such as `plan`, is skipped.
- **`memory.mjs pull <topic>` [pulls one](memory-search.md#pull-a-thread)**: its page, linked pages, related topics, changes, and facts by kind.
- **A fact can carry a company topic.** The gate defines a missing company tag from its page's summary, and [upkeep](#consolidation) tags a fact that names a `knowledge/` page by path. The tidy puts a topic's lasting facts [on its page](wiki-dream.md#placing-a-fact-on-a-page).

## How facts are captured

- **Capture is the one writer of a chat's facts.** `/save` and `/close` write none. When a chat ends, the plugin's end hook keeps its redacted transcript and starts the background run, so the chat's wrap-up and open threads are written before `/continue` needs them. Codex has no end event: there, the next chat start does both.
- **The background run** records what each ended chat set out to do and what got done, leaves one open thread for each planned piece not done, and closes a thread the chat finished. A chat start also starts one for chats left an hour idle and uncaptured. It runs your agent's command-line tool on its normal model; to choose another, set `WONG_MEMORY_MODEL` (Claude Code) or `WONG_MEMORY_CODEX_MODEL` (Codex) in the hook's environment. The run may only call the memory script and write files in one temp folder outside the repo. It captures at most five chats, newest first, on your model allowance; your next digest reports what it stored. Set `WONG_MEMORY_RUN=1` on a headless `claude -p` probe, or its hook starts a run too.
- **Struggle notes** record where the assistant had trouble, such as a correction or a step that kept failing. The background run writes one as a `thread` tagged `improve`, by [the writing rule](../../.agents/plugins/memory/references/writing-facts.md), with nothing private; a smooth chat gets none. [`/improve-code`](repository-improvement.md#struggle-notes-come-first) reads them before it chooses and takes the ones about code; [`/memory:dream-memory`](wiki-dream.md#what-it-reads) takes the ones about memory, the wiki, specs, and plans. The run sees only failed steps and what was typed, so a long hunt that never failed gets no note.

Every write passes the **write gate**: the script shows the live facts on the same slug, the closest keyword matches, and the open threads on other slugs that match the fact's words. The writer adds, supersedes, or drops each candidate. A `thread` must carry the tag of the verb (`plan`, `verify`, `sync`) or area whose next run should check it, or `put-facts` refuses the whole batch: a warning once left 82 of 94 threads with no one to check them. A fact that answers an open thread supersedes it, saying what was found. A fact that cannot reach the store waits in this computer's local spool, and the next run sends it through the gate.

**A scheduled run checks whether it has a registered chat session.** When it has none, leave `session` out of its fact-write JSON: `"session": "current"` would hold those facts for a session start that may never happen. [Host readiness](../stack/host-schedules.md#where-it-runs) also checks that this identity can read and write only the permitted memory.

## Facts by code area

A fact about code carries the **area tag** of the folder it concerns, so the next change there loads it. [`areas.json`](../../.agents/memory/areas.json), in WongStack's memory extras, maps folders to areas, each with a definition and the docs that own it: `app/worker/` to `worker`, `wiki/` to `wiki`. The most specific folder wins: `app/worker/apps/` gives `mini-apps` and `worker`, not `stack-pack`, which covers all of `app/`.

- **A fact gets its area when it is written.** The writer tags it, as [writing facts](../../.agents/plugins/memory/references/writing-facts.md) says. An area tag the store lacks is defined from the list on first use. [Upkeep](#consolidation) tags older facts whose words name a mapped path.
- **The list owns each area tag's definition and look-alikes.** Upkeep copies them to the store on the admin's next write: an entry's `aliases` point at its area, *testing* at `tests`, and a read by a tag also finds its aliases. Fix a definition in `areas.json`, not in the store. For a look-alike outside the list, the admin runs `memory.mjs tag <name> --alias-of <tag>`; a teammate never changes a tag.
- **One lookup shows everything linked.** `memory.mjs pull <path>` prints the areas, their docs and code folders, past changes, the files linking to and the code using the path, then its areas' facts. A change or a fact lists [its files](document-retrieval.md#files-behind-the-facts). When the store doesn't answer, it says so.
- **The build and planning load it.** Before its first edit, [`/apply`'s build](../../.agents/plugins/loop/skills/apply/references/build-helper.md) pulls the change and runs `memory.mjs areas --change <name>` on the paths it names. [`/explore`](../../.agents/plugins/loop/skills/explore/SKILL.md#search-memory-before-asking) pulls the paths it expects to touch.
- **A repo adds its own areas** in `areas.json`: a tag, a definition, folder prefixes, and docs; a doc the repo lacks is skipped. [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md) keeps the edit as a local change.

## Consolidation

Two passes keep the live facts tidy: plain code for what follows a rule, and a model only for what takes judgment.

- **Upkeep** runs after every `put-facts` and at the end of every background run, with no model and no wait. It closes an open thread still open 30 days after its own date with a fact naming it, *Closed unchecked after 30 days (thread #N, date)*; the thread stays searchable with `--all`, and a re-tag never restarts its clock. It **re-tags** a fact whose words name a path in a mapped folder with [its area](#facts-by-code-area), one that names a `knowledge/` page with [its topic](#topics), and a thread whose words name a slash command with that verb (`/wong-sync` gives `sync`, `/improve-code` gives `improve`, `/dream-memory` gives `dream`). A re-tagged fact keeps its words, its date, its author, and its sources; it supersedes the untagged one. It restates at most 50 facts a pass, and never fails the write before it: `put-facts` prints `upkeep skipped: <reason>`. `memory.mjs upkeep` runs it by hand.
- **Consolidation** is the first step of the [daily tidy](wiki-dream.md#the-daily-tidy). It merges facts that say the same thing, supersedes contradicted ones, newest first, closes an open thread a later live fact shows was answered, and re-tags only where reading a fact's area or verb takes judgment. It has no command of its own.

For a teammate both passes change only their own facts, and no tag; the admin's tidy everyone's.

Both passes tidy facts; the daily tidy then moves lasting ones onto pages. [A memory dream](wiki-dream.md) runs consolidation at once when you type `/memory:dream-memory`, and also supersedes a fact the project outgrew, such as one naming a gone file.

## Sign-in and expiry

Memory uses the company sign-in that `cloudflared` keeps for the app: no key in `.env`, no second login. To sign in, run `cloudflared access login <app origin>` and open the link it prints. Each call goes to the production Worker's `/_memory/v2/` route, which checks the sign-in itself ([Access](../stack/cloudflare-access.md#4-bypass-the-public-surface)); any other `/_memory/` path, staging, and previews answer 404.

- **Expiry.** A sign-in lasts as long as the app's Access session. With fewer than 5 days left, the digest's first line says so and names the command.
- **Signed out.** The cached digest loads, a write waits in the spool, and a memory action through [company actions](../stack/company-api.md) says to sign in again.
- **Moving older memory.** After the update deploys, the admin runs `memory.mjs migrate`, then `memory.mjs migrate-people`. It gives each computer's notes to the person who signed in on it, then turns the old keys off; `assign <machine-id> <email>` gives a waiting computer's notes to a person. A rerun is safe.
- **Cloud schedules** get their own sign-in from the owner: `node .claude/skills/wong-setup/scripts/memory-schedule.mjs make <name> --secret-file <path outside the repo>`, then `list` or `revoke <name>`. Put its two values in the schedule's secret store, and revoke with the script: the store keeps its own list.
- **An app with no sign-in yet** keeps one admin key in `CLOUDFLARE_MEMORY_TOKEN`, in the primary checkout's ignored `.env` ([secrets](secrets.md)); **this page owns that name.** Setup writes it with `memory.mjs member admin`. A private app refuses it, and setup's rerun after the card removes it.

The admin's `CLOUDFLARE_API_TOKEN` reaches the store directly, for migrations and schedule sign-ins. [Mini apps](../stack/mini-apps.md) get no memory bindings, but other code in the Worker could bypass the route: review it before publishing.

## Without R2

R2 needs a payment method on file, even inside its free tier. Without it, the store keeps no raw transcripts and a preview check keeps no [pictures](staging-walkthrough.md#what-a-walk-needs), and everything else works: facts, the digest, search, capture, and consolidation. `source <fact-id>` then says that transcripts are not stored. Setup's closing report gives the steps in [the card list](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#the-card-list). Turn R2 on later and run `/wong-sync`: it plans the bucket, and new chats are kept from then on.

Back to [development](README.md).
