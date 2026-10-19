## ADDED Requirements

### Requirement: A second agent reviews the finished build

When the build's tasks are done and before the preview, or before returning to `/ship`, `/apply` SHALL have a fresh agent, which did not build the change, read the change's diff against its plan. The reviewer SHALL report bugs, missing or weak tests, and work the plan did not ask for. Each finding SHALL be routed by the change loop's fix-or-ask rule: a fixable finding goes back to a builder, and one that needs a decision is asked of the person with a recommended answer. Fix rounds SHALL stop after two, and what remains is brought to the person. The report SHALL list what the review found and what was fixed.

#### Scenario: The reviewer finds a weak test

- **WHEN** the reviewer finds that a new test passes whether or not the feature works, and the builder agrees
- **THEN** a builder strengthens the test before the preview, and the report lists the fix without asking the person

#### Scenario: The reviewer finds work outside the plan

- **WHEN** the reviewer finds that the build changed a screen the plan never mentioned
- **THEN** `/apply` asks the person one plain question with a recommended answer before the preview, and changes nothing until they answer
