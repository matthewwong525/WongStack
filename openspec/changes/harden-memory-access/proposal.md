# Close the first memory security gaps

**Status:** in-progress
**Branch:** explore-worker-memory-security
**Open questions:** none

## Why

A security review of session memory found that the checks inside the memory route hold, but four gaps sit around them. A branch can redirect your memory key and GitHub token to someone else. Mini-app code can reach the memory store past its wall. Saved transcripts keep tokens that weren't in this repo's `.env`. And read-only access to a private repo is enough to write facts that load into everyone's sessions. You want the first three closed, every teammate limited to their own notes, and read-only collaborators kept in memory without reaching anyone else.

## What Changes

- **Your key only goes to the address on your main checkout.** Today, memory reads its address from the branch you have open, so a branch that changes one line gets your key at start-up. Now the address comes from your main checkout, the one that holds `.env`. A branch that names a different address is ignored, and the start-up notes say so.
  ```text
  Before
  branch's address ──▶ key sent there

  After
  main checkout's address ──▶ key
  branch's address differs
     └─▶ ignored, with a warning
  ```
- **Mini apps lose the side door to memory.** A mini app was only handed the app database, but it could still import the Worker's full settings and reach memory directly. That import is now switched off for the whole app, in this repo and for new installs. The wiki stops promising a wall it can't keep: a mini app shares the Worker with memory, so review its code before you publish.
- **Transcripts hide token-shaped text before upload.** Today only this repo's `.env` values are blanked. Now anything shaped like a GitHub, `sk-`, AWS, JWT, Bearer, or memory key is blanked too, in the stored transcript and in what the capture reads.
- **Only you can replace your notes.** Today any teammate can replace anyone's note with a credited one of their own. Now a teammate replaces only notes they wrote; the admin can still replace any. The automatic tidy-up on a teammate's machine merges only their own notes.
- **Read-only collaborators keep memory, but their notes stay theirs.** On a private repo, someone you gave read access still joins on their own. What they write shows only in their own start-up notes and searches, never a teammate's. A public repo still needs push access to join, so nobody on the web gets in. The server marks their notes when they are saved, so they can't undo it. You run a one-time memory update after this ships; until then, read-only people can't join.
  ```text
  Can push?   Joins?   Teammates see
              notes?
  ─────────   ──────   ─────────────
  yes         yes      yes
  read only   yes      no, only them
  ```

Non-goals: showing full author emails in the digest, tying admin to a GitHub account instead of an email, expiry for the admin and `member add` keys, and caps on keys or transcript size.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: *No credential value reaches memory* also blanks token shapes in transcripts; *Memory is reached through the production Worker with a memory key* takes the Worker address from the primary checkout only; *A person with GitHub access joins memory* gives a private repo's read-only person a reader key; new *A read-only teammate's facts stay their own*; *A team keeps personal facts personal* hides readers' facts from everyone else; *Teammates cannot change or hide each other's facts* limits every member's supersede to its own facts.
- `mini-apps`: *A mini app reaches only the app database* — the Worker also turns off importing its bindings, and the promise is scoped to what the runtime enforces.
- `stack-pack`: *A created wrangler config deploys* — the fragment's compatibility settings turn off importable bindings.

## Impact

- `.agents/skills/memory/scripts/lib/store.mjs` (`loadConfig`): reads `components.memory.worker` from the primary checkout; `session-start.mjs` digest notes a differing branch address.
- `.agents/skills/memory/scripts/lib/scan.mjs`: `redact` also replaces `TOKEN_PATTERNS` matches; a memory-key pattern joins the list. `memory.mjs` strip already calls `redact` for the upload and the model's text.
- `.agents/skills/memory/migrations/0004_readers.sql` (new): `memory_keys.reader` and `facts.shared`.
- `.agents/skills/memory/worker/memory-worker.mjs`: `join` makes a reader key for pull-without-push on a private repo; `findGrant` reads `reader`; `query` rewrites a reader's fact insert to `shared = 0` and limits every non-admin supersede to the key's own facts; the save and tidy reports name a fact left live. `lib/digest.mjs` `personalFilter` hides other people's unshared facts; `lib/members.mjs` `member list` shows readers.
- `app/wrangler.jsonc` and the `wrangler.jsonc` fragment in `.agents/skills/wong-sync/references/stack-pack-fragments.md`: `disallow_importable_env`; `app/worker-configuration.d.ts` regenerated.
- `mini-apps/router.mjs` comment, `wiki/stack/mini-apps.md`, `wiki/development/memory.md`.
- Tests: `scripts/tests/memory-worker.test.mjs`, `memory-capture.test.mjs`, `memory-store.test.mjs`, `wrangler-config.test.mjs`.
- `CHANGELOG.md` `## Next (minor)` entry; installed repos add the flag to their own `app/wrangler.jsonc`, planned by `/wong-sync`.

## Decision log

- **2026-09-27** — Asked which review findings to fix → chose the key following the branch, the mini-app wall, and transcript scrubbing.
- **2026-09-27** — Asked how to fix the mini-app gap → chose turn off importable env and correct the wiki, not a separate memory Worker.
- **2026-09-27** — Asked who may join memory on a private repo → chose push access only.
- **2026-09-27** — Asked at review whether read-only people could still join but only affect their own memory → chose yes, replacing push-only: a reader key whose facts only its owner sees and which supersedes only its own facts.
- **2026-09-27** — Asked at review whether every teammate, not only readers, should replace only their own notes → chose yes; the admin keeps replacing any.
- **2026-09-27** — Asked how read-only collaborators on a public repo get in → chose keep push only; the user will not run `member add`, so the plan points no one at it.
- **2026-09-27** — Asked whether readers' notes stay hidden now that no one can replace a teammate's → chose keep them hidden.
- **2026-09-27** — Assumed: memory adds no way for a reader to share a note, because the user said knowledge meant for teammates goes in the wiki, which is how this repo shares.
- **2026-09-27** — Assumed: a teammate's supersede of someone else's fact leaves it live and the script names it, rather than refusing the whole save, because the new fact is still worth keeping.
- **2026-09-27** — Assumed: the reader rule ships in this change even though finding #4 was not ticked, because the join-rule answers asked for it; full author emails and admin by GitHub id stay out.
- **2026-09-27** — Assumed: one change for all four fixes, because they all touch memory and ship as one release.
- **2026-09-27** — Assumed: only the Worker address comes from the primary checkout, and the store ids stay with this checkout, because the address alone decides where a key or GitHub token is sent; the ids reach the fixed Cloudflare API or are ignored by the Worker, and a store an update adds on a branch keeps working before it merges.
- **2026-09-27** — Assumed: when Git cannot confirm the primary checkout, memory keeps reading this checkout's record, because that layout has no other checkout to trust and reads already fall back that way.
- **2026-09-27** — Assumed: a differing branch address earns one line in the start-up notes, because a silent ignore would hide an attempt.
- **2026-09-27** — Assumed: a memory-key shape (`wongm_…`) joins the token patterns, because another repo's key is exactly what a transcript can leak, and facts benefit from the same check.
- **2026-09-27** — Assumed: the reader mark lives in new columns (`memory_keys.reader`, `facts.shared`) rather than a third role, because the role's check constraint cannot change without rebuilding the keys table.
- **2026-09-27** — Assumed: teammates' clients hide readers' facts through the one team filter, and the Worker forces the mark on write, because member reads are free SQL the Worker cannot filter, and teammates' own scripts are the ones that load the digest.
- **2026-09-27** — Assumed: live and show take the team filter too, because the tidy reads live and would otherwise restate a reader's note as shared.
- **2026-09-27** — Assumed: the admin and `--everyone` searches still show readers' facts, because the admin reads everything today.
- **2026-09-27** — Assumed: readers may still add tags and run records, because their own fact tags need tags to exist and a run line carries no fact; both are listed as leftovers.
- **2026-09-27** — Assumed: `member add` keeps making full member keys, because the admin chose that person on purpose.
- **2026-09-27** — Assumed: a read-only person's current member key keeps sharing until its next renewal makes it a reader key, and their earlier facts stay shared, because facts are never edited.
- **2026-09-27** — Assumed: a minor release, because no route is removed and every current member keeps memory.
- **2026-09-27** — Assumed: the post-deploy check (migrate, then a read-only account joins as a reader) becomes a memory thread instead of a task, because `/ship` archives before production deploys.
- **2026-09-27** — Built inside `/ship`: the memory address comes from the primary checkout, `disallow_importable_env` is set, transcripts lose token shapes, every member supersedes only its own facts, and a private repo's read-only person joins as a reader whose facts only they see (digest, search, show, live, and the write gate). Local memory suites, link, retired-name and config checks, and strict validation pass; CI (task 5.3) is next.
