## MODIFIED Requirements

### Requirement: A fresh helper builds the tasks

Where the host can start one, a fresh helper agent SHALL work the change's implementation and test-authoring tasks, and it SHALL NOT ask the person, run git, save, execute tests, or upload a preview. It SHALL return on a question, a blocker, or completion of the whole implementation; final verification SHALL follow implementation. The parent SHALL handle a question or blocker and start a new helper for the rest when appropriate. A host with no helper SHALL build inline with the same verification timing.

#### Scenario: An ambiguous task

- **WHEN** the helper cannot finish a task without the person's decision
- **THEN** it returns the question, the parent asks the person, and a new helper works the remaining tasks

#### Scenario: No helper available

- **WHEN** the host cannot start a helper agent
- **THEN** `/apply` works the tasks inline with the same outcome and defers tests until implementation is complete

## REMOVED Requirements

### Requirement: A task that needs the gate is done through save

**Reason:** Automatic mid-list test gates repeat whole-branch checks before the complete implementation exists.

**Migration:** Preserve every required check and acceptance claim, collect test execution into the final verification phase, and retain an explicitly requested early checkpoint's authorized reach.

## ADDED Requirements

### Requirement: Complete implementation precedes automatic verification

Plans and builds SHALL prepare the whole agreed implementation and its tests before automatically executing tests, remote check waits or walkthroughs. They SHALL NOT introduce per-task verification checkpoints or approval stops. Source completion SHALL NOT be reported as a passing test result. Existing intermediate test gates SHALL be deferred to the final verification phase without dropping their acceptance obligations. Explicitly requested early saves or checks SHALL retain their reach; a substantive unavailable prerequisite SHALL be reported as a blocker rather than treated as passed.

#### Scenario: A plan has several test gates between source tasks

- **WHEN** a build's task list names checks after separate implementation parts and the person has not requested early checks
- **THEN** the complete implementation and test authoring finish before those checks run together in the final verification phase, with no new approval stops

#### Scenario: Final verification fails

- **WHEN** final verification reveals a real defect in the completed implementation
- **THEN** the defect is repaired and affected checks are repeated under the existing repair limits, with all final required checks preserved
