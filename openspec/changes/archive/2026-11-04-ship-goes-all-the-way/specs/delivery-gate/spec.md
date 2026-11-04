## MODIFIED Requirements

### Requirement: The walkthrough is evidence, not a gate

`/ship` SHALL run `/verify` before the merge and report its verdict (`staging-walkthrough`). A walk that cannot run, or a missing `verify` skill, SHALL NOT block the merge and SHALL NOT be installed. A walk `FAILURE` SHALL get one fix through `/apply` and one more checkpoint and walk; only a `FAILURE` after that fix, or a fix the safe-pick rule does not allow, SHALL stop and ask the person to fix it or merge anyway, and a merge anyway SHALL be recorded in the report. Kept checks the walk wrote SHALL be saved once, and `/ship` SHALL merge that commit only when its gate passes.

#### Scenario: The walk fails

- **WHEN** the ship-time walk returns `FAILURE` after its own fix attempts
- **THEN** `/ship` fixes the failure once, saves, and walks again before merging

#### Scenario: The walk still fails after the fix

- **WHEN** the second walk also returns `FAILURE`
- **THEN** `/ship` stops before merging and asks whether to fix more or merge anyway

#### Scenario: The walk kept a check

- **WHEN** the ship-time walk wrote or replaced a kept check and its verdict is not `FAILURE`
- **THEN** `/ship` saves once more and the merged change carries the kept check

### Requirement: Ship checkpoints once through save

After archiving, `/ship` SHALL invoke ordinary `/save` once, plus one more after a failed walk's one fix, so the commit CI tests is the commit `/ship` merges; `/save` SHALL use the archive as the change record and SHALL NOT author a new active change. That one fix SHALL be built through `/apply` against the archived change, with no new plan and no new change, and its choices SHALL go in the archived proposal's Decision log. The walkthrough SHALL reuse that exact checkpoint without another save or rerun of unchanged settled checks. Uncommitted work on the default branch SHALL move to a new branch through that same save, not an earlier one, and SHALL NOT be reported as nothing to ship. A repair that changes source SHALL receive fresh exact-revision checks before publication; this SHALL NOT authorize bypassing or reinterpreting a failed or unreadable gate.

#### Scenario: A one-go ship

- **WHEN** `/ship <intent>` runs from plan to merge without a repair
- **THEN** only the save after the archive runs, CI runs once before the walk, and the walk uses that saved revision without a second checkpoint

#### Scenario: Publish from the default branch

- **WHEN** `/ship` runs on the default branch with a finished, uncommitted change
- **THEN** it archives in place, saves once to a new branch, and CI runs once before the merge

#### Scenario: The walk's one fix

- **WHEN** the ship-time walk returns `FAILURE` after the change is archived
- **THEN** `/ship` gives `/apply` the archive path and the failing scenarios, `/apply` fixes that archived change with no new change, and the second `/save` uses the same change and archive

### Requirement: Ship archives only the selected change

`/ship` SHALL keep the change name separate from the branch name and archive only the selected change. An active change the default branch already has SHALL NOT stop it. When the branch itself adds another active change, `/ship` SHALL keep that change on its own pushed branch and remove it from the shipping branch before the archive, unless the person asked to ship both.

#### Scenario: Two changes on one branch

- **WHEN** the branch diff adds two active change folders and the person asked to ship one
- **THEN** `/ship` moves the other to its own pushed branch, names it in the report, and ships only the selected one

#### Scenario: Other plans already on the default branch

- **WHEN** the default branch already holds other active change folders the branch does not change
- **THEN** `/ship` goes on without a question

### Requirement: A failed check is diagnosed before it is fixed

On a failed gate, `/save` SHALL list every failing check with the cause its log supports before the first fix, and SHALL fix the failures the change caused in one push. A failure the change did not cause SHALL be re-run once and, if still failing, reported without a code edit; inside `/ship` it SHALL instead get one fix in the same change when the fix keeps every check as strong. The attempt cap SHALL stay as it is.

#### Scenario: Two checks fail for different reasons

- **WHEN** a push fails a test and a link check
- **THEN** `/save` names both causes first and pushes one fix covering both

#### Scenario: A failure the change didn't cause

- **WHEN** the only failing check fails in code the change never touched, during a plain `/save`
- **THEN** `/save` re-runs it once, and if it fails again stops with the error and the checks link, editing nothing

#### Scenario: A failure the change didn't cause, inside ship

- **WHEN** inside `/ship` an old test fails again after its re-run, for a cause outside the change, and a fix keeps it as strong
- **THEN** `/ship` fixes that test once in the same change and lists the fix in its report
