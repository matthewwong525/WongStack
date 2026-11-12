# Recall facts and original documents

Recall finds permitted session facts and original passages in the current checkout's wiki and OpenSpec. It is part of [session memory](memory.md), alongside direct fact search and path-area lookup; the [development hub](README.md) links the wider workflow.

## Use evidence before substantial work

From the repository root, ask a task question, then read the cited original before acting:

```bash
node .claude/skills/memory/scripts/memory.mjs recall "How do we publish a finished change?"
node .claude/skills/memory/scripts/memory.mjs documents "How do we publish a finished change?" --json
```

`documents` reads local files without a sign-in and without setup: it needs only the Node version the repo names, on Linux, macOS and Windows. `recall` also selects up to eight live facts through the existing permission-checked client. Failed or denied fact access leaves documents usable. Neither command reads transcripts, and no fact goes into document search. The installed [company helper](../stack/company-api.md#memory-uses-the-same-sign-in) describes `memory.documents` and `memory.recall` without company login.

**Search is by the words of the question.** A question finds a page when it shares words with the page, so use the words the page would use. Meaning-based search was removed: `--mode semantic` and `--mode deep` stop with exit 2 and say so, and `--mode keyword` and `--mode auto` change nothing.

Both formats return original evidence, source status, omissions and references within **6,144 UTF-8 bytes**, including metadata. Recall reserves room for both sources, reclaims unused space and preserves whole fact bodies. Documents reserve a useful passage per source role before expanding excerpts; empty or heading-only excerpts are omitted. Passages end at line boundaries; truncated excerpts say to read the original. A selected entry omitted for space is counted; this is not a count of every possible match. JSON is version 2. Fact filters are `--tag`, `--type`, `--slug`, `--since`, `--until`; document `--change` does not silently change those filters. `--limit 1..5` limits documents. Unsupported filters, query field injection and invalid input fail before any read.

Each source reports its own state: `ok`, `empty`, `partial`, `unavailable` or `denied`. A question with no match reports `empty`, not a failure. A partial answer that is still useful exits 0; invalid input exits 2; no usable source exits 1.

## Files behind the facts

Recall ends with up to eight files and docs that its facts are about, each with the facts that led to it. It is a place to start, not a full list: open the files, then decide.

```text
Files (from the facts above; a place to start, not a full list):
- .agents/plugins/memory/scripts/lib/pull.mjs (#1798)
- wiki/development/memory.md (#1798, #597)
```

- **Three sources.** The files each fact's change touched, by changed lines, ten at most a change. A path the fact names in its words, ranked higher. For a fact with neither, its topic's docs and code folders.
- **Read fresh, stored nowhere.** A shipped change's files come from the commit that published it, read from git history on each call. A file that moved since shows at its new path; a deleted file drops. An active change gives the paths its plan names. With no history, the archived plan's paths stand in.
- **Inside the limits.** The list takes at most 600 of the 6,144 bytes and 1.5 seconds, and never pushes out a fact or a passage. JSON adds `files` and `sources.files`; a slow history read shows as `files: unavailable`.
- **One fact or change.** `memory.mjs pull #<id>` and `pull <change>` list the same kind of files; `--more files` shows them all.

## Choose the source scope

| Scope | Eligible evidence |
| --- | --- |
| `current` (default) | Wiki guidance and current recorded requirements |
| `history` | Current evidence plus archived changes |
| `active` | Current evidence plus proposed changes |
| `all` | All four collections |

`--change <slug>` narrows change documents while retaining current guidance. Every excerpt carries its path-derived role: `wiki`, `specs`, `active` (proposed), or `archive` (historical). Mixed searches interleave current sources before proposed/history sources. A word match never makes a historical proposal current guidance.

The allowlist is `wiki/**/*.md` except `wiki/people/**`, the [company knowledge](../stack/company-knowledge.md) copy's tracked `knowledge/**/*.md` except `people/**` and `*.mine.md`, `openspec/specs/**/*.md`, and changes' `proposal.md`, `design.md`, `tasks.md` and `specs/**/spec.md`. Eligible unsaved/new files are included; Git ignore rules exclude untracked ignored files. Review pages, evidence/log/transcript/cache files, credentials, code, agent instructions, private facts and symlinks are excluded. Lookup never follows a source outside the real checkout. A scan is bounded to four seconds, 2 MiB per source and 32 MiB total; an omitted source, or one that changes during the lookup, makes the answer partial, with the reason on the status line. Split oversized guidance into linked pages.

## Freshness and maintenance

Search keeps no index and no state. Each lookup lists the eligible files, reads them, ranks their sections by the question's words, and then reopens each original to verify its hash, line range and text. A page you changed one second ago returns its new text; a moved or deleted page drops out. Text that changes after it was ranked is withheld, and the lookup scans once more and reports `partial`.

Nothing is installed or downloaded, and nothing is written outside the checkout, so there is nothing to refresh, repair or roll back.

Lookup has a twenty-second total deadline, including fact access and source validation. A scan or a ranking that runs out of time returns the verified passages it has, marked `partial` with a reason. Startup digest and first-edit hooks run no document search; the agent chooses recall once it knows its task. Keep [area lookup](memory.md#facts-by-code-area) for path-specific warnings.

## Acceptance and performance evidence

The ordinary test suite covers search with its own temporary pages: scopes, roles, exclusions, changed sources, the byte limit and the deadline. One search of this repo takes about half a second. The source repository also runs a small Windows check, `document-search`, when the memory files change: Windows paths differ, and no other check runs there. It proves that a new checkout with only Node returns original passages and creates no folder outside the checkout.
