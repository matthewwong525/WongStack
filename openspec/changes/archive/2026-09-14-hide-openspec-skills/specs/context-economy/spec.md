## MODIFIED Requirements

### Requirement: WongStack-authored skill descriptions are triggers, not manuals

The frontmatter `description` of a WongStack-authored skill SHALL state what the skill does and when to invoke it, in at most 600 characters; the how belongs in the skill body, which loads only on invocation.

Generated skills (`openspec-*`) and vendored skills (`agent-browser`) are exempt from the budget, and their `description` and body SHALL stay pristine — they are rewritten from upstream templates, so an edit to either is discarded on the next regeneration.

Pristine is scoped to the `description` and the body. A generated skill's frontmatter MAY carry a visibility key applied by the payload's patch script, per `openspec-skill-visibility`. No other frontmatter edit is permitted, and `agent-browser` takes none — it already ships its visibility setting from upstream.

#### Scenario: A description is trimmed

- **WHEN** a WongStack-authored skill's description exceeds the budget
- **THEN** it is rewritten to its purpose and its invocation triggers
- **AND** every behavior detail it dropped remains stated in the skill body

#### Scenario: A generated skill is left alone

- **WHEN** descriptions are trimmed
- **THEN** no `openspec-*` or `agent-browser` description or body changes

#### Scenario: A generated skill is hidden from the menu

- **WHEN** the patch script adds the visibility key to an `openspec-*` skill
- **THEN** that is permitted despite the pristine rule
- **AND** the skill's description and body are unchanged
