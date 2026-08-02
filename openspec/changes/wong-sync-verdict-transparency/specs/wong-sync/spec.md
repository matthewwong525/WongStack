## MODIFIED Requirements

### Requirement: Never overwrite an existing file

`/wong-sync` SHALL NOT modify or replace any file in the target repo that it did not itself generate. Its entire write scope SHALL be: payload files that were absent, the `WONG-STACK` block where no markers existed, the OpenSpec change folder the analysis proposes, `.claude/.wong-stack.json`, and `.claude/wong-sync-verdicts.md`. This guarantee replaces every conflict-resolution mechanism the skill previously carried — there SHALL be no three-way view, no keep-local / take-upstream prompt, no batch approval of overwrites, and no rename-on-collision option, because no overwrite of authored content is ever attempted.

The last two paths are **generated files the skill solely owns**, and SHALL be rewritten on every run. The carve-out SHALL be scoped by authorship rather than kept as a list of exceptions: the skill may rewrite a file it generates, and SHALL NOT rewrite any file a human or another tool authored. `.claude/wong-sync-verdicts.md` SHALL carry a generated-file header saying so, and the run SHALL read its ticked checkboxes before regenerating it so that the one supported user edit is not lost.

#### Scenario: Locally customized skill is safe

- **WHEN** a repo has heavily edited its copy of a payload skill and upstream has also changed it
- **THEN** the file is left byte-identical and the difference is handled by the capability analysis

#### Scenario: No prompts about clobbering

- **WHEN** any `/wong-sync` run completes
- **THEN** the user was never asked to choose between a local and an upstream version of a file

#### Scenario: Generated files are regenerated

- **WHEN** a second run produces new verdicts
- **THEN** `.claude/wong-sync-verdicts.md` is rewritten in place, having first been read for ticked checkboxes
- **AND** no file outside the skill's generated set is modified
