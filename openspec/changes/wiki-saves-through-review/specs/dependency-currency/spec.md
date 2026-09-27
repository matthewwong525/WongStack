## MODIFIED Requirements

### Requirement: The verb is scoped to this repo and stays out of the payload

The skill SHALL be **meta-repo-only**. It SHALL NOT appear in the payload manifest, so `/wong-sync` — which copies only manifest files — SHALL never deliver it to a target repo. Its own text SHALL state this scope and the mechanism that enforces it, so a later reader does not "fix" the missing manifest entry.

Because the skill is not payload, adding or editing it SHALL NOT by itself require a `VERSION` bump or a `CHANGELOG.md` entry. This exemption applies to the skill's own files only, and never to a payload file the skill's *runs* touch.

The skill SHALL be free to reference payload doctrine that other files own — the gate, the release rules, the manifest — by link rather than by restating it.

#### Scenario: A target repo syncs

- **WHEN** `/wong-sync` runs in a repo that has WongStack installed
- **THEN** `.claude/skills/update-dependencies/` is not among the files it proposes to copy
- **AND** the target repo gains no `/update-dependencies` verb

#### Scenario: The skill's own text is edited

- **WHEN** a change edits only files under `.claude/skills/update-dependencies/`
- **THEN** no `VERSION` bump and no `CHANGELOG.md` entry are required for that edit
- **AND** the change still takes the full gate, like every save

#### Scenario: A reader wonders why the manifest omits it

- **WHEN** someone reads the skill and looks for its manifest entry
- **THEN** the skill's own text explains that the omission is deliberate and is what scopes the verb to this repo
