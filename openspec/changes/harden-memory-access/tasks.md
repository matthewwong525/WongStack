# Tasks

## 1. Memory address from the primary checkout

- [x] 1.1 In `.agents/skills/memory/scripts/lib/store.mjs`, make `loadConfig` take `worker` from the primary checkout's `.claude/.wong-stack.json` when `ctx.primaryRoot` is set and differs from `ctx.root`, never falling back to this checkout's address, and return `branchWorker` when this checkout names a different one; with no primary, keep this checkout's record. Verify: a new test in `scripts/tests/memory-worker.test.mjs` with a linked worktree whose record names another address shows the digest's request and a join reach only the primary's Worker
- [x] 1.2 In `.agents/skills/memory/scripts/session-start.mjs`, print one line when `branchWorker` is set, saying the branch's address was ignored. Verify: the same test asserts the line, and a worktree with a matching address prints none
- [x] 1.3 Update the store comment at the top of `store.mjs` and the *The memory key* section of `wiki/development/memory.md`: the address comes from the main checkout, like `.env`. Verify: `node scripts/check-payload-links.mjs` passes

## 2. Mini apps cannot import bindings

- [x] 2.1 Add `"disallow_importable_env"` to `compatibility_flags` in `app/wrangler.jsonc` and in the `wrangler.jsonc` fragment in `.agents/skills/wong-sync/references/stack-pack-fragments.md`. Verify: a new test in `scripts/tests/wrangler-config.test.mjs` asserts both carry it
- [x] 2.2 Regenerate `app/worker-configuration.d.ts` with `npm run cf-typegen` in `app/`. Verify: its header lists the flag, and CI's app tests pass at 5.3
- [x] 2.3 Rewrite the handler comment in `mini-apps/router.mjs`, the *Data is shared on purpose* bullet in `wiki/stack/mini-apps.md`, and the *Two costs come with one Worker* paragraph in `wiki/development/memory.md`: a handler gets only `DB`, the flag closes the import, and a handler still shares the Worker with memory, so review its code before it publishes. Verify: no page still says a mini app "can not read anyone's sessions"

## 3. Transcripts lose token shapes

- [x] 3.1 In `.agents/skills/memory/scripts/lib/scan.mjs`, add a memory-key pattern to `TOKEN_PATTERNS` and make `redact` also replace every pattern match with `[redacted:token]`, keeping the word `Bearer`. Verify: the helpers test in `scripts/tests/memory-store.test.mjs` covers each pattern, a JSONL line staying valid JSON, and `findCredential` rejecting a memory key
- [x] 3.2 Extend the strip test in `scripts/tests/memory-capture.test.mjs`: a transcript holding a GitHub token and another repo's memory key, neither in `.env`, uploads and prints only placeholders
- [x] 3.3 In `wiki/development/memory.md`, change *Known `.env` values are replaced before upload* and *A secret that was never in `.env` stays in the raw transcript* to say token-shaped strings are replaced too, and a secret with no known shape still needs `#private`

## 4. Own notes only, and reader keys

- [x] 4.1 Add `.agents/skills/memory/migrations/0004_readers.sql` with `memory_keys.reader` and `facts.shared`. Verify: `memory.mjs migrate` in the test harness applies it once and a second run does nothing
- [x] 4.2 In `.agents/skills/memory/worker/memory-worker.mjs`, make `join` give a reader key for pull without push on a private repo, refuse it with `not_migrated` on an unmigrated store, keep push for public repos, and read `reader` in `findGrant`. Verify: in `scripts/tests/memory-worker.test.mjs`, `tok-ana` gets a reader key, `tok-dev` a member key, the owner an admin key, the public reader and the fork are still refused, and an unmigrated store refuses only the reader
- [x] 4.3 Add `MEMBER_WRITES` to `statements.mjs`: in `query`, every non-admin supersede gains the own-author condition, and a reader's fact insert sets `shared = 0`. Verify: a member's and a reader's supersede of a teammate's fact leaves it live, the admin's supersedes it, and a reader's saved fact has `shared = 0` even when it asks otherwise
- [x] 4.4 In `memory.mjs`'s write gate, report each asked-for supersede the store left live, with its author. Verify: a test save by Ana superseding Bo's fact prints that it was left because Bo wrote it
- [x] 4.5 In `lib/digest.mjs`, make `personalFilter` hide other people's unshared facts when the store has the reader schema, and use the clause in the write gate's candidate queries in `memory.mjs`. Verify: a reader's `thread` shows in its own digest and search, not a teammate's, and shows with `--everyone`; an unmigrated store's queries are unchanged
- [x] 4.6 Show `reader` in `member list` (`lib/members.mjs`) and in `memory.mjs join`'s message. Verify: the member-list test lists a reader key
- [x] 4.7 Update `wiki/development/memory.md`: *Joining through GitHub* (push makes a member, read access on a private repo makes a reader whose facts only they see, a public repo needs push, the admin runs `migrate` once), the *Member* role line (supersedes only their own facts), and the tidy paragraph (a teammate's tidy merges only their own facts); update the tidy step in `.agents/skills/memory/SKILL.md` the same way. Verify: `node scripts/check-payload-links.mjs` passes
- [x] 4.8 In `memory.mjs`, give `live` and `show <slug>` the team filter, lifted by `--everyone`. Verify: in `scripts/tests/memory-worker.test.mjs`, a reader's fact is absent from a teammate's `live` and `show`, and present with `--everyone` and for the reader

## 5. Release and checks

- [x] 5.1 Add a `## Next (minor) — Memory keys stay home, and read-only teammates keep their notes to themselves` entry at the top of `CHANGELOG.md`, with an *Updating* note: add `disallow_importable_env` to your own `app/wrangler.jsonc` (`/wong-sync` plans it), run `memory.mjs migrate` once, and read-only teammates renew as readers
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, `openspec validate harden-memory-access --strict --no-interactive`, and the touched suites with `TMPDIR=/var/tmp node --test scripts/tests/memory-*.test.mjs scripts/tests/wrangler-config.test.mjs`
- [ ] 5.3 `/save`, and confirm CI passes on this branch
