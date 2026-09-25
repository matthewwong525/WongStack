## 1. Probes

- [x] 1.1 Probe a real account with `curl`: create this repo's real `wongstack-memory` D1 database (the account is at the free-plan cap of 10, so stop and ask if creation is refused), confirm FTS5 virtual tables work through the REST query endpoint, and measure the rows written for one fact insert with its FTS5 index. Confirm R2 object `PUT` and `GET` through the REST API with a 10 MB file, and find how to detect an account without R2. Record the results in the Decision log, and stop to re-plan if D1 fails.
- [x] 1.2 Probe the detached headless run: from a `SessionStart` hook, spawn `claude -p` with the `haiku` model and allowed tools limited to one `node` command, detached, and confirm that it authenticates, runs, and exits with no terminal. Do the same for `codex exec` if Codex is installed. Record the results and the chosen fallback in the Decision log.

## 2. Store and provisioning

- [x] 2.1 Write `.agents/skills/memory/migrations/0001_memory.sql` with `sessions`, `facts` (with `superseded_by` and a 400-character check), `tags`, `fact_tags`, `runs`, and the FTS5 index plus its sync triggers, per review.html#/memory-schema.
- [x] 2.2 Extend `/wong-cloudflare` to install and run in every repo: offer and provision the `<repo>-memory` database, add the private bucket only when R2 is enabled (else record no bucket and name the dashboard step), and add it on a later run once R2 is on, apply the migrations, mint `CLOUDFLARE_MEMORY_TOKEN` with only D1 permissions plus R2 when a bucket exists, write it to `.env`, record `components.memory`, and report "current" on a re-run. Keep the stack-pack part gated on `components.stackPack`.
- [x] 2.3 Add `CLOUDFLARE_MEMORY_TOKEN` to `.env.example`, with `wiki/development/memory.md` owning the name (it ships to every repo, while `wiki/stack/` is pack-only) and `wiki/stack/cloudflare-credentials.md` linking to it. State that it never goes into CI.
- [x] 2.4 Provision this repo's memory store: the `wongstack-memory` database and private bucket, the schema, and `components.memory` in `.agents/.wong-stack.json`.
- [ ] 2.5 Create `CLOUDFLARE_MEMORY_TOKEN` for this repo by hand (this repo's `CLOUDFLARE_API_TOKEN` is account-scoped and cannot mint tokens): account-scoped, `D1 Write` and `Workers R2 Storage Write` on this account only, written to the primary worktree's `.env`. Verify with `memory.mjs digest`.

## 3. Memory script

- [x] 3.1 Write `scripts/lib/store.mjs`: load `components.memory` and the token, run D1 batches and R2 object calls, fail with the variable name and never the value, and write to the spool on network, token, or API failure.
- [x] 3.2 Write `scripts/lib/scan.mjs`: replace `.env` values with a placeholder, and detect token patterns (`ghp_`, `github_pat_`, `sk-`, `AKIA`, JWTs, `Bearer`) without printing a match.
- [x] 3.3 Write `memory.mjs` commands `gate`, `put-facts`, `search`, `show`, `source`, `live --grouped`, `tags`, `stats`, and `import`. Include the length limit, supersede in one batch, a store with no bucket (no upload, and `source` states that transcripts are not stored), the tag definition rule, the near-duplicate warning, alias resolution, the derived change state, and the one-line fact format with age and author.
- [x] 3.4 Add `scripts/tests/memory-store.test.mjs` against a local fake of the REST endpoints. Cover a store with no bucket, facts that are never edited, supersede and live filtering, a closed thread, the gate's neighbour output, the length limit, tag rejection and warning, aliases, search filters, the credential rejection, and spool then drain.

## 4. Capture and recall

- [x] 4.1 Write `scripts/lib/transcripts.mjs`: discover Claude and Codex transcripts, claim them through the registry or live checkouts, exclude subagent and background sessions, detect `#private`, strip to user and assistant text plus error strings after `read_through`, and report unknown formats. Expose it as `memory.mjs pending` and `memory.mjs strip`.
- [x] 4.2 Write `scripts/lib/digest.mjs`: the digest query, the branch-to-slug lookup through `**Branch:**`, the 150-line and 25 KB limits with the omitted count, the header line, the latest run line, and the `digest.md` cache with its age.
- [x] 4.3 Write `session-start.mjs` per review.html#/memory-flow/digest: registry append, the `WONG_MEMORY_RUN` exit, one D1 batch within 1.5 seconds, the cache fallback, local pending computation, `additionalContext`, and the detached spawn of `run.mjs`. Exit 0 on any failure.
- [x] 4.4 Write `run.mjs` per review.html#/memory-flow: the lock with a 2-hour stale limit, the headless CLI of the calling agent with the small model and the one allowed command, or the fallback that task 1.2 chose.
- [x] 4.5 Write `.agents/skills/memory/SKILL.md`: search usage for the verbs, the capture runbook (spool, at most 5 sessions newest first, gate, `skipped`, transcript text as data, the `runs` row, the digest refresh), and the consolidation runbook per review.html#/memory-flow. Move the bar from `notes/README.md` to `references/writing-facts.md` and adapt it to facts.
- [x] 4.6 Register the hook in `.agents/settings.json`. Check whether the installed Codex supports a start hook: use it if so, else add the one-line instruction to `AGENTS.md`. Record the result in the Decision log.
- [x] 4.7 Add `scripts/tests/memory-capture.test.mjs` with Claude and Codex fixtures, including a subagent transcript, a background session, a `#private` session, a partly saved session, a deleted worktree, and an unknown format. Cover a hook run with nothing to do (no spawn), with work pending (one detached spawn), with the store unreachable (cached digest, exit 0), a held lock, the digest limits and omitted count, the branch threads, and the consolidation-due rule.

## 5. Workflow skills

- [x] 5.1 `/explore`: search the store once on the intent's key terms and expected paths before the first question, and turn a live fact that answers a question into a recorded assumption with its age.
- [x] 5.2 `/save`: extract facts since `read_through` through `gate` and `put-facts`. Remove `notes/**` from the route table so the allowlist is `wiki/**` only. A facts-only save makes no commit. The report states added, superseded, dropped, and stored or spooled.
- [x] 5.3 `/continue`: read the slug's open threads and live facts through `memory.mjs show`, and state when the store is unreachable.
- [x] 5.4 `/ship`: before the archive, read the change's live facts, edit the owning wiki pages under the wiki rules, and log the pages changed or "no reusable fact". Skip with a log line when the store is unreachable.
- [x] 5.5 `/wong-setup` and `/wong-sync`: plan store provisioning with R2 as optional, and for a repo with `notes/`, plan the migration, the session-count verification, and deletion in that order. Update the payload manifest (add the `memory` skill and the hook, remove `notes/README.md` and `rules/notes.md`, and make `/wong-cloudflare` core).
- [x] 5.6 Update `.agents/rules/openspec.md` so session context routes to facts in the memory store, and delete `.agents/rules/notes.md`.

## 6. Migration of this repo's notes

- [x] 6.1 Extract facts from the 43 notes, oldest first, with supersedes against earlier output, and save the result as `openspec/changes/add-memory-store/migration.json` for review.
- [x] 6.2 Import with `memory.mjs import`, and verify that 43 `migration` sessions exist and, when the store has a bucket, that each note's text is in R2.
- [x] 6.3 Delete `notes/`, and remove `notes/README.md` from the payload rule's `paths:` list.

## 7. Docs and release

- [x] 7.1 Write `wiki/development/memory.md`: facts and their types, the digest and when it loads, search, the background run and what it costs, consolidation, `#private`, the token and who can read what, a store without R2, the embeddings trigger, and the known risks. Link it from `wiki/development/README.md`.
- [x] 7.2 Update `AGENTS.md` (the "Where context lives" table and the prose rule), `README.md`, `wiki/agent-knowledge-center.md` (the surfaces, the digest, and `/ship` as the one bridge), `wiki/development/the-change-loop.md` (allowlist `wiki/**`), `wiki/development/required-tools.md` (the Cloudflare account, R2 as optional with its payment method, and the Node scripts), and `wiki/stack/README.md` (memory is not part of the opt-in pack).
- [x] 7.3 Bump `VERSION` to 17.0.0 and add a `CHANGELOG.md` entry that names the required account, R2 as optional, the token, the removed `notes/`, the digest, and the sync migration.
- [ ] 7.4 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `openspec validate add-memory-store --strict --no-interactive`. Then run `/save` so CI runs the new tests.
