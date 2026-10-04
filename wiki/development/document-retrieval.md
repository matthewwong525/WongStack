# Recall facts and original documents

Recall finds permitted session facts and original passages in the current checkout's wiki and OpenSpec. It is part of [session memory](memory.md), alongside direct fact search and path-area lookup; the [development hub](README.md) links the wider workflow.

## Use evidence before substantial work

From the repository root, ask a task question, then read the cited original before acting:

```bash
node .claude/skills/memory/scripts/memory.mjs recall "How do we publish a finished change?"
node .claude/skills/memory/scripts/memory.mjs documents "How do we publish a finished change?" --mode keyword --json
```

`documents` reads local files without a memory credential. `recall` also selects up to eight live facts through the existing permission-checked client. Failed or denied fact access leaves documents usable; company login never adds fact access. Neither command reads transcripts or sends facts to the document backend. The installed [company helper](../stack/company-api.md#memory-keeps-its-own-access) describes `memory.documents` and `memory.recall` without company login.

Both formats return original evidence, source status, mode, backend, coverage, omissions and references within **6,144 UTF-8 bytes**, including metadata. Recall reserves room for both sources, reclaims unused space and preserves whole fact bodies. Documents reserve a useful passage per source role before expanding excerpts; empty or heading-only excerpts are omitted. Passages end at line boundaries; truncated excerpts say to read the original. A selected entry omitted for space is counted; this is not a count of every possible match. JSON is version 1. Fact filters are `--tag`, `--type`, `--slug`, `--since`, `--until`; document `--change` does not silently change those filters. `--limit 1..5` limits documents. Unsupported filters, query field injection and invalid input fail before backend access.

## Choose the source scope

| Scope | Eligible evidence |
| --- | --- |
| `current` (default) | Wiki guidance and current recorded requirements |
| `history` | Current evidence plus archived changes |
| `active` | Current evidence plus proposed changes |
| `all` | All four collections |

`--change <slug>` narrows change documents while retaining current guidance. Every excerpt carries its path-derived role: `wiki`, `specs`, `active` (proposed), or `archive` (historical). Mixed searches interleave current sources before proposed/history sources. Similarity never makes a historical proposal current guidance.

The allowlist is `wiki/**/*.md` except `wiki/people/**`, `openspec/specs/**/*.md`, and changes' `proposal.md`, `design.md`, `tasks.md` and `specs/**/spec.md`. Eligible unsaved/new files are included; Git ignore rules exclude untracked ignored files. Review pages, evidence/log/transcript/cache files, credentials, code, agent instructions, private facts and symlinks are excluded. Lookup never follows a source outside the real checkout. A scan is bounded to four seconds, 2 MiB per source and 32 MiB total; omitted or racing sources make coverage partial. Split oversized guidance into linked pages.

## Optional meaning-based search

Keyword fallback works immediately using Node's built-in modules. Preparing [QMD](https://github.com/tobi/qmd) adds local meaning-based ranking. This is an explicit host operation using npm and Node 22 or later, not an app dependency or automatic hook install:

```bash
node .claude/skills/memory/scripts/memory.mjs documents-setup --cpu
node .claude/skills/memory/scripts/memory.mjs documents-status
node .claude/skills/memory/scripts/memory.mjs documents-refresh
node .claude/skills/memory/scripts/memory.mjs documents "How do we publish a finished change?" --mode semantic --json
```

Setup installs pinned `@tobilu/qmd@2.8.3` from the shipped lockfile into the OS user's private data folder. It prepares the embedding GGUF, indexes this checkout and checks an actual semantic query before recording readiness. It needs network access, native platform support and approximately a gigabyte of initial runtime/model space; index copies and optional reranking add space. `--cpu` forces CPU; otherwise the pinned runtime chooses available native acceleration. CPU cold startup can exhaust lookup's deadline, in which case fallback is explicit. Linux is the live acceptance target; unsupported Windows native setup keeps portable Node retrieval.

`auto` uses fixed lexical and vector fields without model query expansion or reranking. `keyword` launches no semantic models. `semantic` uses vector ranking alone. `deep` explicitly adds reranking and needs this additional preparation:

```bash
node .claude/skills/memory/scripts/memory.mjs documents-setup --deep --cpu
node .claude/skills/memory/scripts/memory.mjs documents "Why do we require review before publishing?" --scope history --mode deep --json
```

Setup fetches only the requested embedding/reranking models; it never prepares a query-expansion model. Runtime, models and derived snapshots stay outside the repository and never enter payload installation. Ordinary reads check prepared local model paths and never install or download. Missing models, unsupported natives, malformed output and timeouts return `backend: lexical-fallback` with a reason. Requested semantic/deep modes retain an unavailable or partial mode state; an available no-match lookup reports `empty`. Independent sources can be `ok`, `empty`, `partial`, `unavailable` or `denied`. Partial useful recall exits successfully; invalid input exits 2, and no usable source exits 1.

## Freshness and maintenance

Indexes are keyed by repository identity and the real worktree path. Linked checkouts share runtime/models but have separate manifests, snapshot generations, databases and refresh locks. Added, changed, moved and deleted documents trigger one detached refresh using prepared dependencies; changed files also get live keyword search immediately. Refresh processes changed content and removes old paths, with a five-minute ceiling and failure backoff.

Complete generations publish atomically. Concurrent or interrupted refresh retains the last valid generation; abandoned locks can be recovered. Obsolete generations are pruned after a five-minute reader grace period, retaining current and previous. Every returned candidate reopens its original and verifies hash, line range and text. **A verified passage does not establish complete semantic coverage**: a stale index can provide valid evidence while missing newly changed sources. Status and packets show that distinction.

Lookup has a twenty-second total deadline, including fact access and source validation. Startup digest and first-edit hooks remain model-free; the agent chooses recall once it knows its task. Keep [area lookup](memory.md#facts-by-code-area) for path-specific warnings.

Rollback is explicit and reversible: use `--mode keyword` while resolving native/model failures; stop a running refresh PID shown in its local lock before removing that checkout's derived state directory reported by `documents-status`. Restore prior payload commands/guidance through the normal change loop if needed. Shared runtime/models and the private fact store need no change. Do not delete another worktree's state.

## Acceptance and performance evidence

The source repository's dedicated QMD workflow runs the shipped setup and query commands on a CPU host. Its reviewed fixture measures exact/current sources, paraphrases, historical scope, obsolete conflicts, absent answers, changed-file refresh, cold/warm times and output bytes. The ordinary memory and payload suites require no QMD/model downloads; Windows checks portable fallback. Model-free protocol tests do not establish semantic quality. Keep actual run links and measured resource limitations in the change's evidence, rather than treating setup success as proof of better answers.
