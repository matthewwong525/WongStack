# wong-sync-pull-only

**Status:** ready-to-ship
**Open questions:** none

## Why

`/wong-sync` currently ends every run by curating your local drift and asking what to send upstream. Most of the time people just want the update — they ran a sync to *pull*, and the contribute leg is a prompt they decline. Making a rarely-wanted step mandatory on a frequently-run command is backwards: the default should be the common case, and contributing should be something you ask for when you actually mean it.

Nothing is lost. The contribution machinery — curation bar, fork-aware PR, release ritual — stays exactly as it is; it just stops running unprompted. Discovery moves to a documented page, which is where "how do I send this upstream?" belongs anyway.

**Non-goals:** the contribute *capability* is not removed, weakened, or changed in behavior — only in how it's triggered. No change to the pull leg, the three-way diff, fresh mode, or the stack pack.

## What Changes

- **`/wong-sync` becomes pull-only by default.** A bare `/wong-sync` refreshes the clone, classifies, pulls upstream updates into the working tree, rewrites the manifest, and reports. It no longer curates local drift or asks about contributing.
- **`/wong-sync contribute` runs the contribute leg**, on request. The full existing flow: classify local-only drift as candidates, one-line generality rationale each, opt-in per file, then branch + release ritual + fork-aware PR in the clone. Invoked this way it still pulls first (the ordering rule that makes drift self-cancel is behavior, not a prompt).
- **A contributing page in the wiki** — how to send a payload improvement upstream, what the generality bar is ("does this belong in every WongStack repo?"), and the `/wong-sync contribute` command. Added to the payload manifest's synced docs so target repos actually get it — the page is the discovery path that replaces the prompt.
- **Reword the round-trip framing** everywhere it implies contributing happens automatically: `wong-sync`'s skill `description` + opener + step diagram, the `WONG-STACK` block in `CLAUDE.md`, `wiki/development/README.md`, `README.md`'s skill table, and `wong-setup`'s installed-repo hand-off line.
- `CHANGELOG.md` entry + `VERSION` bump (minor — behavior change to a skill's default, additive doc).

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `wong-sync`: the round trip becomes pull-by-default; the contribute leg runs only on explicit `/wong-sync contribute`; the manifest's synced docs gain the contributing page.

<!-- `install-onboarding` and `wiki-root` need prose rewording only (a hand-off line, a wiki link) — no requirement changes, so no delta specs. -->

## Non-goals

The contribution machinery is unchanged in behavior: same curation bar, same opt-in-per-file default, same fork-aware PR and release ritual. Only its trigger moves from automatic to explicit.

## Impact

- **Skills:** `.claude/skills/wong-sync/SKILL.md` (description, opener, diagram, Step 4/5 gating, Step 7 report), `.claude/skills/wong-setup/SKILL.md` (one hand-off line).
- **Docs:** new contributing page at the wiki root; `wiki/development/README.md` link; `wiki/development/required-tools.md` (the `gh` row cites "the `/wong-sync` contribution leg" — reword to stay accurate); `README.md` skill table.
- **`CLAUDE.md`:** the `WONG-STACK` block's `/wong-sync` bullet + the "What this is" round-trip sentence.
- **Manifest:** `payload-manifest.md` gains the contributing page in the synced docs list.
- **Root payload:** `CHANGELOG.md` + `VERSION`.
- **No change** to the pull leg, three-way classification, fresh mode, manifest schema, or the stack pack.

## Decision log

- **2026-07-27** — All 15 tasks implemented; v6.7.0 cut. `wong-sync`'s `SKILL.md` gained an **Input contract** section stating the two invocations and that `contribute` still pulls first (no contribute-only mode); Steps 4 and 5 are headed `— contribute only` with an explicit gate line each, and Step 3 now ends a bare run outright. The Step 2 table's `unchanged upstream / changed local` row was renamed from **contribution candidate** to **local-only change** — the classification still runs (Step 3 needs it to know a file isn't a clean update), it's just silent on a bare run. Step 7 split into bare and `contribute` reports; the bare report closes with one non-prompting line naming `/wong-sync contribute`, and explicitly **does not name which local files drifted** — listing them would turn the line back into the prompt this change removes. Two hard rules added ("Pull-only unless asked", "`contribute` still pulls first"). New `wiki/contributing.md` written and added to the manifest's synced-docs list, linked from `wiki/README.md` (prose + section list) and `wiki/development/README.md`. Reworded `AGENTS.md` (both surfaces), `README.md`'s skill table, `wiki/development/README.md`, `required-tools.md`'s `gh` row, and `wong-setup`'s installed-repo hand-off.
- **2026-07-27** — Two discoveries during implementation, neither changing the plan. (1) **`CLAUDE.md` is a symlink to `AGENTS.md`** in this repo, and `.claude/skills/` resolves to `.agents/skills/` — the task list names the `CLAUDE.md`/`.claude/` paths, but edits must be written to the real targets. (2) `contributing.md` ships to target repos, whose wiki root may be `docs/` rather than `wiki/` and which never receive `wiki/development/` — so the page **must not link into `development/`**. A drafted link to `required-tools.md` was cut for this reason, and Step 7's closing line names `contributing.md` at the wiki root in plain text rather than as a relative link. Ruled out: making the page's `gh` note a link, since there is no synced page to point at.
