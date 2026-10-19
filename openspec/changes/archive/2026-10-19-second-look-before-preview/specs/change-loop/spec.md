## ADDED Requirements

### Requirement: One rule decides fix or ask

When an agent meets a problem while building, saving or checking a change, it SHALL fix the problem alone when the plan already settles what is right, and SHALL bring it to the person when fixing it needs a decision the plan does not make. A problem SHALL be brought to the person when the fix goes outside the plan (a change people see that the plan doesn't name, added scope, a new dependency, or unrelated code), would weaken a check, can't be undone or touches keys, logins, access, data loss or money, still fails after two fixes, or is a finding the builder disputes after one exchange. `/apply`, `/save` and `/verify` SHALL follow this one rule from one owning page.

#### Scenario: A failing test in the change's own files

- **WHEN** a check fails and the fix lies in files the change already touches, inside the plan
- **THEN** the agent fixes it and lists the fix in its report, without asking

#### Scenario: A fix would loosen a check

- **WHEN** the only fix an agent finds for a failure is to switch a check off or weaken it
- **THEN** the agent asks the person, with its recommended answer, before making that edit
