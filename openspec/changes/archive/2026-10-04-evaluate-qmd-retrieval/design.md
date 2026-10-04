# Design

## Context

See [proposal.md](proposal.md) for the intended outcome. Existing fact search is FTS5 with tags and enforced ownership. `areas` finds owning docs and related archives through explicit mappings and paths. The missing behavior is a shipped entry point that retrieves both session evidence and relevant original Markdown.

Research inspected [QMD](https://github.com/tobi/qmd) at revision `26b703c5daa8037df089a8104cbf7eeab4e51874`, reporting package 2.8.3 and Node >=22. Verify that pinned CLI contract during implementation. QMD supplies collection-scoped lexical/vector search, structured hybrid queries and optional reranking. Semantic ranking needs local models; no live acceptance has run yet.

## Goals / Non-Goals

**Goals:** Deliver document search and combined recall, keep evidence fresh and bounded, make it discoverable to agents, and verify the installed payload.

**Non-Goals:** Follow the proposal. No new HTTP endpoint, generated summaries, private-memory export or whole-repo indexing.

## Decisions

### 1. Extend the existing interface

Implement Node modules under `.agents/skills/memory/scripts/lib/documents/` for corpus, index lifecycle, QMD adapter, fallback and packet rendering. Add these commands to the memory CLI:

| Command | Behavior |
| --- | --- |
| `recall <question>` | Permitted live facts plus document passages |
| `documents <question>` | Document passages only |
| `documents-setup` | Install pinned host dependency, prepare models and index |
| `documents-refresh` | Reconcile files and refresh enabled embeddings |
| `documents-status` | Readiness, index age, version and refresh state |

Reads accept `--scope current|history|active|all`, `--mode auto|keyword|semantic|deep`, `--change <slug>`, `--limit` (1–5 documents), and `--json`. Reject invalid scopes, slugs and queries (maximum 4,000 characters) before launching subprocesses. Fact filters on recall are a documented subset of existing filters (tag/type/slug/date), separately recorded from document scope; exclude superseded facts and automatic admin-wide expansion.

Use existing `readFacts` and original fact metadata, avoiding a second search/brief rendering of the same facts. Document-only commands route before opening the remote store. Return per-source `ok|empty|partial|unavailable|denied` states; failed fact authorization cannot suppress local documents or reveal hidden facts. Partial overall recall exits 0 with explicit state; invalid input exits 2 and no usable backend exits 1.

Keep direct fact reads and pre-edit loading intact. Change the digest's task-search instruction to recall, while digest generation remains free of QMD/model calls. A new hosted service would add hosting and authorization work to a local-file problem.

### 2. Index a defined corpus with explicit source roles

Use four disjoint collections:

| Collection | Included paths | Meaning |
| --- | --- | --- |
| wiki | `wiki/**/*.md`, excluding `wiki/people/**` | Reusable guidance |
| specs | `openspec/specs/**/*.md` | Recorded requirements |
| active | Active changes' proposal/design/tasks/delta specs | Proposed work |
| archive | Archived changes' proposal/design/tasks/delta specs | Historical evidence |

Include eligible unsaved/new Markdown within these paths so work in progress is discoverable; respect ignore rules and reject symlinks/external real paths. Exclude review pages, logs, evidence dumps, agent instructions, code, credentials, caches, transcripts and private store data. Scope derives from paths, not document claims or ranking scores.

`current` searches wiki/specs; `history` adds archive; `active` adds proposed changes; `all` includes all four. `--change` narrows change documents independently of fact filters. Query requested collections independently with bounded candidates so the archive cannot consume a global candidate pool. Deduplicate path/range hits and interleave current wiki/spec evidence before proposed/history results in mixed scopes. Configure fixed collection context descriptions.

Retrieval points the agent to evidence; it still reads owning docs and checks historical claims against current guidance/code. Keep the existing wiki hub and one-owner convention.

### 3. Manage freshness outside version control

Resolve managed state through the existing OS-user state convention, keyed by repository identity plus real current-worktree path. Fact credentials still use the primary checkout; dependency/model caches may be shared across that OS user, but manifests, indexes and refresh locks are worktree-specific.

Maintain a manifest of relative paths, content hashes, source roles, generation and embedding readiness. On lookup, scan the allowlisted corpus for added/deleted/moved or changed files. Index copied snapshots in a managed corpus directory. Publish complete generations atomically; serialize refresh with bounded waiting and recover abandoned-run state.

If the corpus changed, return fresh lexical evidence for changed/new files and verify unchanged indexed candidates. Mark semantic coverage partial and start one detached refresh using prepared dependencies; reads never install packages or download models. Refresh only changed content/vectors, remove moved/deleted sources and retain the last valid generation on failure. Cap background refresh at five minutes and use backoff or explicit refresh after failure. Avoid repeated work for unchanged content.

Map each candidate through the manifest to an allowlisted original file, re-read it and compare hashes before returning text. Withhold stale or vanished candidates. Include role, relative path, heading, line range, source hash and freshness. Stale semantic ranking cannot imply complete recall. Keep credentials and private facts out of the manifest, snapshots and QMD subprocess environment.

### 4. Provide explicit host setup and fallback

Ship a values-free runtime descriptor pinning `@tobilu/qmd@2.8.3`, integrity and model identities, with reproducible installation metadata. `documents-setup` uses npm to install into a private prefix outside the checkout, verifies native/runtime capability, prepares the embedding model/index and checks a real query. Record readiness only after success. Document setup downloads, CPU/GPU behavior and disk use; do not change app packages or globally replace tools.

Ordinary core commands remain Node-only. Linux is the first live semantic acceptance target; unsupported platforms/native capabilities expose clear readiness and portable lexical fallback. Existing installs get working fallback immediately and can prepare semantics through the explicit command. The implementation acceptance environment must prepare QMD and prove semantic retrieval before publication.

Default `auto` uses structured lexical+vector queries without autonomous query expansion or reranking when embeddings are ready. Keyword mode uses no models; `semantic` is vector-only; `deep` explicitly opts into reranking, with its model prepared by setup's deep option. Verify pinned-version support. Construct typed query fields as argument data and reject field injection or shell evaluation. Run only the managed executable/config; never adopt arbitrary global/project QMD config, update hooks or external collection paths.

Missing, unhealthy, stale, malformed or timed-out QMD falls back to an in-process Node lexical matcher over the same corpus, with the same scopes and source checks. Report `backend: lexical-fallback` and the reason. An explicitly requested semantic/deep mode that falls back retains a visible unavailable-mode state. A successful no-match query is not a failure.

QMD processes receive an allowlist of runtime/cache environment variables, without memory or provider secrets. Installation is an explicit operation; local refresh only maintains derived data.

### 5. Produce one bounded original-evidence packet

Recall returns at most eight whole fact entries and five document excerpts within a shared 6,144-byte UTF-8 packet, including metadata/status/footer. Reserve roughly half for each source when both have evidence; reclaim unused space. Document-only reads use the whole budget. State omissions of selected entries without claiming to count every possible match.

Use heading/line boundaries, retain useful qualifications and mark excerpt truncation. No generated conclusions or transcript reads. JSON v1 preserves source status, filters/scope, backend/mode, omissions and evidence metadata under the same byte budget. Agents can read cited originals when excerpts are insufficient.

Enforce a 20-second total recall deadline with time reserved for source verification/fallback. Bound fact reads within that deadline and cancel slow semantic work. Hooks never wait for retrieval models.

### 6. Make the feature part of agent workflows

Describe `memory.documents` and `memory.recall` as installed-client reads in `operations.mjs`, with validated inputs, bounded output schemas, effects, revision and truthful authentication: local checkout for documents, existing memory credential only for facts. Declare local cache effects/readiness. The company helper already imports that registry; no HTTP endpoint is added. Setup/refresh remain explicit local commands, not employee business actions.

Adapt the operation dispatcher so document reads do not require a memory credential and recall cannot widen fact permissions. Keep its existing 30-second timeout above the recall deadline, and return the structured packet without another independent truncation.

Replace relevant retrieval guidance in `memory/SKILL.md`, `explore/SKILL.md`, `AGENTS.md`'s generic block and the digest instruction with task-directed recall. Keep path-area lookup for warnings. Do not add automatic searches to every message or model calls to hooks. Put the repeatable runbook in `wiki/development/document-retrieval.md`, linked from the memory convention/development hub; clarify optional npm/QMD setup in required-tools guidance. Preserve instruction budgets by replacing and compressing relevant text.

### 7. Verify actual shipped behavior

Focused tests cover eligibility and unsaved docs, scope/role labels, worktree isolation, incremental and concurrent refresh, stale/moved/deleted sources, output bounds, source failures, safe arguments and credential isolation. Existing fact and permission regressions remain required.

Create a small source-reviewed acceptance set covering exact wording, paraphrases, historical rationale, obsolete/current conflicts and absent answers. Run the shipped commands, using the existing synthetic fact store rather than production credentials for combined recall. Compare keyword and auto on the same corpus; record deep mode costs separately if enabled. Measure setup/indexing, one-file refresh, cold/warm timing, per-case evidence and packet bytes. Mocks establish protocol behavior only.

Add a dedicated path-triggered remote `qmd-retrieval.yml` workflow with pinned actions, read-only permissions, isolated CPU setup, bounded execution and safe report artifacts; normal payload tests need no models. Use `/save` for remote checks and acceptance.

Done means working commands and agent discovery/guidance, a real semantic paraphrase hit missed by keyword lookup, preserved critical exact/current evidence, correct historical scope, no hidden/private source exposure, successful post-edit refresh, usable fallback and bounded packets. Fix implementation failures; comparison is validation rather than a decision whether to implement later.

## Risks / Trade-offs

- Native/model support and cold CPU latency vary → explicit setup, capability status, deadlines and portable fallback.
- Old records may sound authoritative → current-only default, explicit history and source-role labels.
- Refresh can lag or crash → atomic generations, source validation and fresh fallback with partial status.
- Dependency/model changes may alter ranking → pinned installation metadata and reviewed updates.
- Extra retrieval can fill context → a shared budget, original excerpts and no duplicate reads.

## Migration Plan

Release as a minor payload addition. Verify all modules/descriptor within the memory skill ship through its existing folder inventory; add manifest entries for new wiki pages and any runtime metadata outside that folder. Update the manifest description, changelog and context checks; leave `VERSION` to `/ship`.

Normal sync delivers the commands and guidance. Without prepared QMD, lookup returns keyword fallback with setup guidance. Preparing the host enables meaning-based retrieval. Rollback stops derived refresh workers and restores previous commands/guidance; it does not change the fact store.

The offline page is [review.html](review.html). No new screen needs a UX section.

## Open Questions

None blocking implementation. Host-specific performance is measured and documented during delivery.
