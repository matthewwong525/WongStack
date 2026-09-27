## ADDED Requirements

### Requirement: Apply works the tasks in a fresh helper agent

Once the selected change is apply-ready, `/apply` SHALL work its pending tasks in a fresh helper agent rather than in the conversation that invoked it, when the host can start one. The parent SHALL pass the helper only the exact change name and the path of the helper's brief; the helper SHALL read the change's artifacts from disk. The helper SHALL implement tasks in order, mark each completed checkbox, and return a short report: the tasks it completed, the files it changed, and why it stopped. The helper SHALL NOT ask the person, run any git, pull-request, or CI action, invoke `/save`, upload a preview, delete caches, or run global installers.

The helper SHALL stop and return when a task is ambiguous, a blocker appears, or the next task needs the gate. The parent SHALL then ask the person, report the blocker, or invoke `/save` for the gate task, as `apply-completion-handoff` defines, and SHALL start a new helper for the tasks that remain. The parent SHALL keep plan resolution, the completion preview, the loosened-checks step, and the report. A follow-up edit after the preview SHALL run in the parent unless it adds tasks to the change, which a new helper works. A host that can not start a helper agent, or an `/apply` already running inside one, SHALL work the tasks inline.

#### Scenario: A change is built through a helper

- **WHEN** `/apply` selects an apply-ready change with pending tasks on a host that can start helper agents
- **THEN** a fresh helper agent works the tasks and returns a short report
- **AND** the parent uploads the preview and asks whether to publish

#### Scenario: The helper meets an ambiguous task

- **WHEN** the helper can not implement a task without a decision from the person
- **THEN** it stops and returns the question to the parent without asking
- **AND** the parent asks the person and starts a new helper for the remaining tasks after the answer

#### Scenario: The next task needs the gate

- **WHEN** the helper reaches a task whose done state needs CI, a CI preview, or pushed browser evidence
- **THEN** it returns without running `/save`
- **AND** the parent invokes `/save` for that task, marks it on success, and starts a new helper for the remaining tasks

#### Scenario: The host has no helper agents

- **WHEN** `/apply` runs on a host that can not start a helper agent
- **THEN** it works the tasks inline, as before

#### Scenario: A small tweak after the preview

- **WHEN** the person asks for a different color after the preview
- **THEN** the parent makes the edit itself and uploads again under the same alias
