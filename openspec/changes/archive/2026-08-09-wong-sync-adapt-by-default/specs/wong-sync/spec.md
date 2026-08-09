# wong-sync — delta

## MODIFIED Requirements

### Requirement: Never overwrite an existing file

`/wong-sync` SHALL NOT modify or replace any file in the target repo that a human or another tool authored. Its entire write scope SHALL be: payload files that were absent, **payload files that are provably unmodified (byte-identical to a historical upstream version of that path, per the update-if-untouched rule)**, the `WONG-STACK` block where no markers existed, the OpenSpec change folder the analysis proposes, `.claude/.wong-stack.json`, and `.claude/wong-sync-verdicts.md`. This guarantee replaces every conflict-resolution mechanism the skill previously carried — there SHALL be no three-way view, no keep-local / take-upstream prompt, no batch approval of overwrites, and no rename-on-collision option, because no overwrite of authored content is ever attempted.

The carve-out SHALL be scoped by **authorship**, not kept as a list of exceptions: the skill may rewrite what it (or the installer, or an upstream release) generated, and SHALL NOT rewrite any file a human or another tool authored. A provably unmodified payload file carries no local authorship — every byte of it came from an upstream release — so updating it clobbers nobody's work. Any file whose content matches no historical upstream version SHALL keep the absolute guarantee and be handed to the capability analysis.

The two generated files the skill solely owns — `.claude/.wong-stack.json` and `.claude/wong-sync-verdicts.md` — SHALL be rewritten on every run. `.claude/wong-sync-verdicts.md` SHALL carry a generated-file header saying so, and the run SHALL read its ticked checkboxes before regenerating it so that the one supported user edit is not lost.

#### Scenario: Locally customized skill is safe

- **WHEN** a repo has heavily edited its copy of a payload skill and upstream has also changed it
- **THEN** the file is left byte-identical and the difference is handled by the capability analysis

#### Scenario: Any local edit defeats the carve-out

- **WHEN** a payload file differs by even one byte from every historical upstream version of its path
- **THEN** it is never updated in place, regardless of how small the difference is

#### Scenario: No prompts about clobbering

- **WHEN** any `/wong-sync` run completes
- **THEN** the user was never asked to choose between a local and an upstream version of a file

#### Scenario: Generated files are regenerated

- **WHEN** a second run produces new verdicts
- **THEN** `.claude/wong-sync-verdicts.md` is rewritten in place, having first been read for ticked checkboxes
- **AND** no file outside the skill's generated set is modified

### Requirement: Absent payload files are copied directly

For each file in the payload manifest, `/wong-sync` SHALL act per file on three cases: **absent** → copy it in verbatim; **present and provably unmodified but stale** → update it to upstream's current version per the update-if-untouched rule; **present otherwise** → leave it byte-identical and hand it to the capability analysis. The threshold is per file, not per repo: a fresh install is simply the case where every manifest file is absent, and SHALL NOT be a distinct mode.

For `CLAUDE.md`, the unit is the `WONG-STACK` block rather than the file: absent markers (or an absent file) SHALL cause the block to be inserted with its markers, creating the file if needed and leaving all other content byte-identical; present markers SHALL send the block to the analysis and SHALL NOT be rewritten in place. The block SHALL be excluded from update-if-untouched.

#### Scenario: New upstream skill arrives

- **WHEN** upstream ships a payload skill the target does not have
- **THEN** it is copied in directly, with no analysis needed to decide

#### Scenario: Edited file is never copied over

- **WHEN** a payload file exists locally and differs from every historical upstream version of its path
- **THEN** it is not copied or updated, and is handed to the capability analysis

#### Scenario: Fresh install falls out of the general rule

- **WHEN** `/wong-sync` runs in a repo where no payload file exists yet
- **THEN** every manifest file is copied in as the install, with no separate fresh-mode branch

#### Scenario: CLAUDE.md with the user's own content and no markers

- **WHEN** the target's `CLAUDE.md` has content but no `WONG-STACK` markers
- **THEN** the block is inserted with its markers and everything outside them is byte-identical

## ADDED Requirements

### Requirement: Provably unmodified payload files are updated directly

For a payload file that exists locally, `/wong-sync` SHALL determine whether it is **provably unmodified**: its git blob hash equals the blob hash of some version of that path in the clone's default-branch history. History SHALL be looked up under the upstream path (using the manifest's skills mapping where a skill was installed under a different local name) and the write SHALL happen at the local path.

- Local blob equals the current upstream blob → the file is current; nothing is written.
- Local blob equals a historical upstream blob but not the current one → the file is provably unmodified and stale; the skill SHALL replace it with upstream's current version directly, as a working-tree edit awaiting `/save`, with no proposal round trip.
- Local blob matches no historical upstream blob → the file SHALL NOT be touched and SHALL be handed to the capability analysis.

The `WONG-STACK` block of `CLAUDE.md` SHALL be excluded from this rule. Opt-in categories (stack pack, app scaffold) participate only when their manifest gates already place them in the file list — this rule SHALL NOT widen what is in scope.

Every file updated this way SHALL be reported under an **Updated** list, one line per file naming the version span, distinct from the **Copied** list, so each direct write is visible at review.

#### Scenario: Stale unmodified skill updates without a round trip

- **WHEN** a repo's copy of a payload skill is byte-identical to the version an earlier release shipped and upstream has since changed it
- **THEN** the sync replaces it with the current upstream version as an uncommitted working-tree edit
- **AND** the file appears in the report's Updated list with its version span

#### Scenario: Deliberately pinned-but-unedited file is updated visibly

- **WHEN** a repo kept an old upstream version of a payload file without editing it
- **THEN** the file is updated like any provably unmodified stale file, the update is named in the Updated list, and the `/save` review is where a wrong update is caught and reverted

#### Scenario: Renamed skill is proven against its upstream path

- **WHEN** a payload skill was installed under a different local name recorded in `components.skills` and its content is byte-identical to a historical upstream version
- **THEN** the proof runs against the upstream path's history and the update is written to the local path

#### Scenario: Current files are untouched

- **WHEN** a local payload file already equals upstream's current version
- **THEN** nothing is written and nothing is reported for it beyond its ordinary verdict
