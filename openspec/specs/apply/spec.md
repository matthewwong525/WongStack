# apply Specification

## Purpose

What `/apply` promises: it finds or makes the right plan, builds it in a fresh helper, and ends a finished change with a preview from the agent host and a publish question, never with a save.

## Requirements

### Requirement: Apply builds the work the person means

`/apply` SHALL build the change the person means: one they named, then one the conversation established, then one changed or recorded on the current branch. It SHALL NOT let an unrelated active change override new work, SHALL plan first when no ready change exists, and SHALL ask when the work is unclear.

#### Scenario: Unrelated active change

- **WHEN** the conversation has just explored new work and another, unrelated change is active
- **THEN** `/apply` plans and builds the new work, not the other change

#### Scenario: Nothing can be resolved

- **WHEN** there is no clear intent and no single applicable change
- **THEN** `/apply` asks which work to build and plans or builds nothing

### Requirement: Planning and building stay separate

When `/apply` plans first, it SHALL build exactly the change that planning produced and SHALL build nothing when planning pauses or is blocked. A standalone `/plan` SHALL stop before building.

#### Scenario: Planning is blocked

- **WHEN** `/plan`, invoked by `/apply`, stops on a blocker
- **THEN** `/apply` reports the blocker and builds nothing

### Requirement: A fresh helper builds the tasks

Where the host can start one, a fresh helper agent SHALL work the change's implementation and test-authoring tasks, and it SHALL NOT ask the person, run git, save, execute tests, or upload a preview. It SHALL return on a question, a blocker, or completion of the whole implementation; final verification SHALL follow implementation. The parent SHALL handle a question or blocker and start a new helper for the rest when appropriate. A host with no helper SHALL build inline with the same verification timing.

#### Scenario: An ambiguous task

- **WHEN** the helper cannot finish a task without the person's decision
- **THEN** it returns the question, the parent asks the person, and a new helper works the remaining tasks

#### Scenario: No helper available

- **WHEN** the host cannot start a helper agent
- **THEN** `/apply` works the tasks inline with the same outcome and defers tests until implementation is complete

### Requirement: A finished change ends with a host preview

When every task is done, `/apply` SHALL upload a preview of the app from the agent host under the change's name and ask whether to publish, with changing it more or saving as the other choices, and *See the preview* when a preview was uploaded. It SHALL NOT invoke `/save` or take any git, pull-request, or CI action on completion. When the app is untouched or the upload cannot run, it SHALL say so in one line and still ask.

#### Scenario: The last task completes

- **WHEN** `/apply` finishes the final task of a change that touched the app
- **THEN** it reports the preview link and asks whether to publish, offering *See the preview*, with nothing saved

#### Scenario: No credential

- **WHEN** the repo has no Cloudflare credential
- **THEN** `/apply` says in one line that no preview was uploaded and why, and still asks whether to publish

### Requirement: Further edits update the same preview

After the preview, each further change the person asks for SHALL be built and uploaded again under the same preview, with no save and no CI wait.

#### Scenario: A different color

- **WHEN** the person asks for a different color after seeing the preview
- **THEN** `/apply` makes the edit and refreshes the same preview link

### Requirement: Inside ship, apply returns

When `/ship` invoked `/apply`, a finished build SHALL return to `/ship` with no upload and no `/save`, because `/ship`'s own checkpoint serves the run.

#### Scenario: Ship pulled apply in

- **WHEN** `/ship` invoked `/apply` and the final task completes
- **THEN** `/apply` returns to `/ship` without uploading or saving

### Requirement: Apply never saves to stop

`/apply` MUST NOT invoke `/save` as a way of stopping. When it pauses, fails, or ends with tasks pending, it SHALL report the remaining work and that `/save` can checkpoint it; the person SHALL be able to run `/save` at any point.

#### Scenario: A blocker mid-list

- **WHEN** `/apply` stops on a blocker with tasks pending
- **THEN** it does not save, and reports the remaining work and the `/save` option

### Requirement: The publish question lists loosened checks

Before asking to publish, `/apply` SHALL fix each check the change switched off without a reason, by restoring it or recording a `Check:` reason in the Decision log, without asking. Its report SHALL list each loosened check in one plain line above the publish question; a change with none SHALL show no list.

#### Scenario: A skipped test

- **WHEN** a finished change skipped one test with no recorded reason
- **THEN** `/apply` restores it or records why, and the report lists it before *publish it?*

### Requirement: The build loads facts for the code it touches

Before its first edit, the build SHALL load the live memory facts for the areas the change's named files fall in, and treat them as dated context the repo overrides. A helper and an inline build SHALL do this alike. An unreachable store SHALL NOT stop the build.

#### Scenario: A Worker change

- **WHEN** `/apply` builds a change whose tasks edit `app/worker/index.ts`, and memory holds a Worker routing warning tagged `worker`
- **THEN** the build sees that warning before it edits the file

#### Scenario: Memory is down

- **WHEN** the store cannot be reached as the build starts
- **THEN** the build notes memory was not loaded and works the tasks

### Requirement: A mid-build answer is recorded before the build resumes

When a build helper stops with a question and the person answers, `/apply` SHALL record the answer in the change's Decision log as an `Asked` line before it starts the next helper.

#### Scenario: The helper asks and the person answers

- **WHEN** a helper returns a question, the person picks an option, and tasks remain
- **THEN** the proposal's Decision log holds a dated `Asked` line with the question and the answer before the next helper starts

### Requirement: The publish question names what can't be undone

A proposal whose change deletes or reshapes stored data, sends a message, or removes a key SHALL say so in one plain line, and `/apply`'s report SHALL repeat that line above the publish question. A change that can simply be reversed SHALL show no such line.

#### Scenario: A change that drops a column

- **WHEN** a finished change removes a stored column
- **THEN** the report above *publish it?* says in one plain line that the removed data can't be brought back

#### Scenario: A wording change

- **WHEN** a finished change only edits text
- **THEN** the report carries no can't-be-undone line

### Requirement: Complete implementation precedes automatic verification

Plans and builds SHALL prepare the whole agreed implementation and its tests before automatically executing tests, remote check waits or walkthroughs. They SHALL NOT introduce per-task verification checkpoints or approval stops. Source completion SHALL NOT be reported as a passing test result. Existing intermediate test gates SHALL be deferred to the final verification phase without dropping their acceptance obligations. Explicitly requested early saves or checks SHALL retain their reach; a substantive unavailable prerequisite SHALL be reported as a blocker rather than treated as passed.

#### Scenario: A plan has several test gates between source tasks

- **WHEN** a build's task list names checks after separate implementation parts and the person has not requested early checks
- **THEN** the complete implementation and test authoring finish before those checks run together in the final verification phase, with no new approval stops

#### Scenario: Final verification fails

- **WHEN** final verification reveals a real defect in the completed implementation
- **THEN** the defect is repaired and affected checks are repeated under the existing repair limits, with all final required checks preserved
