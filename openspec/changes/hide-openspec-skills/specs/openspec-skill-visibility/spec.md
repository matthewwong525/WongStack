## Purpose

The OpenSpec CLI generates six `openspec-*` skills into every repo, and WongStack fronts each one with a verb that owns behavior the generated skill lacks. This capability keeps the generated skills out of the user's command menu while leaving them invocable by those fronting verbs, and keeps that state true across every regeneration of the generated layer.

## ADDED Requirements

### Requirement: The generated OpenSpec skills are hidden from the user's command menu

Every `.claude/skills/openspec-*/SKILL.md` SHALL carry `user-invocable: false` in its frontmatter, so the skill does not appear in the `/` menu and cannot be invoked by the user directly.

The skills SHALL remain invocable by the model through the Skill tool. `disable-model-invocation` SHALL NOT be used on any generated skill, because it blocks the Skill tool and would sever the handoffs the WongStack verbs depend on.

The frontmatter `description` and the body of a generated skill SHALL NOT be modified. The visibility key is the only permitted edit.

#### Scenario: A user opens the command menu

- **WHEN** a user types `/` in a repo carrying the WongStack payload
- **THEN** no `openspec-*` skill is offered
- **AND** the fronting verbs `/explore`, `/plan`, `/apply`, and `/ship` are offered

#### Scenario: A fronting verb hands off

- **WHEN** `/explore` invokes `openspec-explore`, `/plan` invokes `openspec-propose`, `/apply` invokes `openspec-apply-change`, or `/ship` invokes `openspec-archive-change`
- **THEN** the Skill tool invokes the hidden skill successfully
- **AND** the resulting behavior is unchanged from before it was hidden

#### Scenario: The generated content is untouched

- **WHEN** the visibility key is applied to a generated skill
- **THEN** the only difference from the CLI's generated output is the added frontmatter key
- **AND** the description and body are byte-identical to what the CLI produced

### Requirement: A script applies the visibility key and is safe to re-run

The payload SHALL ship an executable script that adds `user-invocable: false` to the frontmatter of every `.claude/skills/openspec-*/SKILL.md` in the repository it runs in.

The script SHALL be idempotent: running it when the key is already present SHALL leave the file unchanged and SHALL NOT fail. It SHALL discover the generated skills by pattern rather than from a hard-coded list, so a CLI release that adds or renames a generated skill is covered without editing the script. It SHALL report which files it changed and which it left alone. It SHALL exit non-zero only when it cannot do its job — an unreadable file or frontmatter it cannot parse — and SHALL NOT fail when it finds no generated skills.

The script SHALL reference repository files by repo-relative path so it works from a target repo's own `.claude/skills/`.

#### Scenario: First run after generation

- **WHEN** the script runs against six freshly generated skills with no visibility key
- **THEN** all six gain `user-invocable: false`
- **AND** the script reports six files changed

#### Scenario: Re-run with the key already present

- **WHEN** the script runs again immediately
- **THEN** no file changes
- **AND** the script reports six files already patched and exits zero

#### Scenario: The CLI adds a seventh generated skill

- **WHEN** a CLI release generates a new `openspec-*` skill
- **THEN** the next run patches it without any edit to the script

#### Scenario: No generated skills present

- **WHEN** the script runs in a repo where `openspec init` has not been run
- **THEN** it reports that it found none and exits zero

### Requirement: Every skill that regenerates the layer re-applies the patch

`openspec init` and `openspec update` rewrite the generated skills from CLI templates, discarding the visibility key. Every WongStack skill that runs either command SHALL run the patch script afterwards, in the same pass, so the layer is never left visible.

This SHALL apply to `/wong-setup` after it runs `openspec init` in a target, and to `/update-dependencies` after its regeneration stage. Each SHALL report the patch result as part of its own output.

`/wong-sync` proposes and never implements, so it SHALL NOT run the script during an ordinary run. It SHALL instead add running the script as a **task in the change it proposes**, so the patch is applied through the normal review-then-`/apply` path like every other payload task. On the fresh-install path — the one run that does copy — it SHALL run the script directly, because there is no plan to carry the task.

#### Scenario: A fresh install

- **WHEN** `/wong-setup` runs `openspec init` in a target repo
- **THEN** it runs the patch script before it finishes
- **AND** the user's first `/` menu in that repo shows no `openspec-*` skill

#### Scenario: A dependency update regenerates the layer

- **WHEN** `/update-dependencies` runs `openspec update`
- **THEN** it runs the patch script in the same pass
- **AND** its report states how many generated skills were re-patched

#### Scenario: An existing target syncs

- **WHEN** `/wong-sync` brings a target up to date on an ordinary run
- **THEN** the change it proposes carries a task to run the patch script
- **AND** the script itself does not run during the sync, because the sync writes no payload file

#### Scenario: A target is installed from a seed manifest

- **WHEN** `/wong-sync` runs the fresh-install path, which copies every payload file
- **THEN** it runs the patch script directly as part of that install
- **AND** reports the result, because no plan exists to carry the task

#### Scenario: Regeneration happens outside a WongStack skill

- **WHEN** a user runs `openspec update` by hand
- **THEN** the generated skills reappear in the menu until a skill that owns the patch runs again
- **AND** this is accepted: no hook, check mode, or CI job guards against it
