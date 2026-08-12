## Purpose

The planning verbs steer repeatable process improvements toward deterministic code instead of recurring AI-run steps, applying the code-first principle stated on the philosophy page.

## ADDED Requirements

### Requirement: Planning guidance prefers code over AI for repeatable processes

The `/explore` and `/plan` skills SHALL carry guidance that, when the work is a repeatable process improvement, directs the agent to consider a deterministic script or automation before a recurring AI-run step. The guidance SHALL reference the canonical statement of the principle on the philosophy page instead of restating it in full.

#### Scenario: Exploring a repeatable process

- **WHEN** a user runs `/explore` or `/plan` on a process that will run repeatedly
- **THEN** the skill guidance directs the agent to weigh a deterministic script against a recurring AI-run step
- **AND** the guidance links to the philosophy page as the owner of the principle

#### Scenario: Generated skills stay pristine

- **WHEN** the code-first guidance is added
- **THEN** it lives in the WongStack wrapper skills (`.claude/skills/explore/SKILL.md`, `.claude/skills/plan/SKILL.md`)
- **AND** no generated `openspec-*` skill is modified
