## Context

Git shares history and repository metadata across linked worktrees, but ignored files belong to each checkout. WongStack currently says real values live in the repo-root `.env`; from a linked worktree that phrase resolves to a disposable checkout. `/wong-cloudflare` creates and updates that copy, while `/walk` reads the active checkout's copy. A credential can therefore exist, rotate, or disappear independently in every worktree.

The committed `.env.example` has the opposite lifecycle: its blank declarations and sourcing comments are branch content and must be edited in the active change. Treating both files as though they have the same location conflates machine-local state with versioned repository state.

## Goals / Non-Goals

**Goals:**

- Give each local repository one durable canonical copy of real dotenv values, located in its primary worktree.
- Make secret-writing and secret-consuming WongStack workflows resolve the same canonical file from normal and linked worktrees.
- Keep committed example files values-blank and update them only when the variable contract changes.
- Preserve stack-neutral wording and support repositories whose equivalent files are not named `.env` and `.env.example`.
- Handle existing duplicate files without printing values or silently discarding credentials.

**Non-Goals:**

- Synchronizing secrets across clones or machines.
- Encrypting or committing secret values.
- Replacing GitHub, Cloudflare, or other deployed secret stores.
- Automatically merging arbitrary dotenv files or deciding which conflicting value is newer.
- Making application frameworks load a file from outside their active checkout without an explicit ignored link or equivalent stack configuration.

## Decisions

### The primary worktree is the durable local store

Resolve the current checkout with `git rev-parse --show-toplevel`, the absolute per-worktree git directory with `git rev-parse --path-format=absolute --git-dir`, and the absolute common directory with `git rev-parse --path-format=absolute --git-common-dir`. When the two git directories differ, the checkout is linked and the primary worktree is the parent of the common `.git` directory; otherwise the current top level is already primary. Workflows SHALL stop before accepting or writing a value if that location cannot be resolved safely.

This uses Git's own worktree metadata rather than assumptions about directory names such as `.paseo/worktrees`. The alternative—using the active checkout—preserves the current loss mode. A home-directory credential store would survive worktrees but would lose the repository boundary and complicate multi-repo use.

### Live values and committed declarations intentionally resolve to different checkouts

Real values go to the primary worktree's ignored `.env` or stack equivalent. A new variable's blank declaration and sourcing comment go to the active branch's `.env.example` or equivalent, because that change must be reviewed and shipped. Rotating an existing value does not touch the example unless its name, purpose, or acquisition instructions changed. A real value never appears in an example, command output, diff, plan, or note.

This keeps the current names-only convention intact. Writing the real value into `.env.example` was rejected because it commits the credential to permanent history; rewriting a blank line on every rotation was rejected because it creates meaningless diffs without documenting a contract change.

### Safety is checked at the location that will hold the value

Before creating or updating the durable file, the workflow verifies that Git ignores that path from the primary worktree. The committed wildcard-and-negation pair remains the shared rule. If the active branch has introduced the rule but the primary checkout has not received it yet, the workflow may install the same pair in the repository-common `info/exclude` as immediate local protection; the committed `.gitignore` change remains required. If ignore protection still cannot be proven, the workflow stops before requesting or writing a credential.

The durable file is initialized from the active branch's example when absent, because that branch may introduce a variable not yet present on the primary branch. Existing content is edited narrowly by variable name and never replaced wholesale.

### Existing duplicates are preserved until reconciled

If a linked worktree already contains a regular `.env`, workflows do not delete it, overwrite it, or bulk-copy it into the primary file. A newly supplied or rotated variable is written to the durable file and subsequent WongStack consumers prefer that file. The workflow reports that a second local copy exists and advises reconciling it without displaying either value.

Where application tooling requires `.env` inside the linked checkout, the supported end state is an ignored symlink to the primary file (or the stack's equivalent configuration). Creating that link requires the existing local file to be absent or explicitly reconciled first. This avoids guessing conflict precedence while still providing a one-copy model for tools with conventional lookup paths.

### Producers and consumers share the resolver contract

`/wong-cloudflare` resolves the durable path before creating, reading, or updating `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. `/walk` first honors an already exported credential, then resolves the primary worktree file rather than assuming `$ACTIVE_ROOT/.env`. The `.claude/` and `.agents/` copies remain byte-identical.

The resolver behavior is documented in the canonical secrets page and summarized in the generic `WONG-STACK` block so agents performing other secret updates follow the same split: durable live value, active-branch blank declaration.

### `/save` is the universal preservation and redaction checkpoint

Secret-aware workflows still write a needed credential immediately, because provisioning or a walkthrough may need it before the next checkpoint. `/save` provides the universal fallback: because it is the only skill authorized to read the conversation, it identifies credentials that the user explicitly supplied or rotated with a known variable name during the session, ensures the current value is in the durable primary-worktree file, and adds a blank active-branch example declaration only when the variable contract is new or its guidance changed.

`/save` does not pattern-scrape arbitrary strings or guess that an opaque value is a credential. It acts only on explicit secret context and never copies a value into the OpenSpec change, Decision log, session note, commit message, PR body, or output. The note may retain the non-secret fact that `SERVICE_TOKEN` was rotated and where it is obtained, but never the value. Before staging, `/save` checks tracked example/config and handoff files for the values it handled and stops if one appears.

This checkpoint was chosen over `/ship` as the owner because partial work and abandoned branches may never ship, while `/save` is already the durable conversation boundary. A hook was rejected as the owner because Git hooks do not observe ignored-file writes and agent hooks are platform-specific and bypassable; leak scanning may still be defense-in-depth inside `/save`.

### `/ship` delegates its checkpoint to `/save` after archiving

`/ship` retains the responsibilities unique to shipping: verify that the current branch is shippable and the default branch is not red, invoke `openspec-archive-change`, merge through the API, and delete the remote branch worktree-safely. After the archive move, it invokes `/save` with an explicit shipping context carrying the branch/change name. In that context `/save` treats the archived change as the handoff record rather than interpreting the missing active change as a reason to create a replacement; it performs secret preservation/redaction, note capture, commit, push, PR creation/update, and CI wait/auto-fix once.

`/ship` consumes `/save`'s gate result: `SUCCESS` or `NONE` permits merge, while `UNKNOWN`, `TIMEOUT`, or an ordinary save failure stops shipping. It does not repeat PR or check-waiting logic. Archiving before the delegated checkpoint ensures the archive move is inside the exact commit and CI result that will merge. Having `/ship` call ordinary `/save` before archiving was rejected because the archive would create a second ungated commit; calling it both before and after was rejected as redundant.

## Risks / Trade-offs

- **[A primary checkout may not exist as an ordinary working tree]** → Stop before accepting a value and explain that the repo needs a resolvable primary worktree; do not fall back to a disposable checkout.
- **[The primary branch may not yet ignore `.env`]** → Verify at the destination and use the repository-common exclude as immediate defense while retaining the committed `.gitignore` task.
- **[Old worktree copies can continue to drift]** → Prefer the durable file in WongStack consumers, report duplicates without values, and require explicit reconciliation before replacing one with a link.
- **[Frameworks normally search only the active checkout]** → Document the ignored-symlink/configuration option; do not impose it on stacks that already have their own secret loader.
- **[Resolving a path can accidentally expose machine layout in durable prose]** → Commands may use absolute paths locally, but plans, notes, logs, and user-facing summaries refer to “the primary worktree” and never persist the path or any value.
- **[`/save` could mistake an opaque string for a credential]** → Act only on an explicitly named secret addition or rotation; never heuristic-scan the conversation for token-shaped strings.
- **[Shipping context could look like a missing active change]** → Pass the archived change name explicitly and forbid `/save`'s fallback change-authoring path in that context.

## Migration Plan

1. Ship the clarified convention, resolver behavior, `/save` checkpoint, and `/ship` delegation in the payload.
2. On the first secret write or save from a linked worktree, create or narrowly update the primary file after proving it is ignored.
3. If another worktree-local file exists, leave it in place and report the reconciliation action; do not automatically migrate unknown keys.
4. Existing normal single-worktree repositories continue using the same root file and require no migration.
5. Existing `/ship` callers need no new command syntax; the shipping-context invocation is internal to the runbook.
6. Rollback restores active-checkout lookup and the prior ship steps; it does not delete the durable file or any preserved duplicate.

## Open Questions

None. The value/declaration split, primary-worktree destination, duplicate preservation, and consumer precedence are defined for implementation.
