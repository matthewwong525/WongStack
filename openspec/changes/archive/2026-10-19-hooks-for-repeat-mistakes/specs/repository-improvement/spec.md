## MODIFIED Requirements

### Requirement: A check before an instruction

When the selected problem is a mistake a deterministic check could catch, the planned improvement SHALL be a check that fails, placed among the project's existing checks, not an added written instruction. When the mistake happens in the chat, where no check on files can see it, and a script can spot it as it happens, the plan MAY instead be a hook that names the fix and lets the assistant continue on its next attempt. A written rule SHALL be reserved for a judgment call no check or hook could make, and `/improve-code` SHALL leave that rule to a normal request.

#### Scenario: A mechanical mistake

- **WHEN** a note shows the assistant twice linked a page that does not exist, and the project runs a link check
- **THEN** the plan extends that check, and adds no instruction telling the assistant to check links

#### Scenario: A mistake only the chat shows

- **WHEN** notes show the assistant twice ended a step in a way a script could spot from what it was about to do, and no file records it
- **THEN** the plan may add a hook that says what to do instead, rather than another written instruction

#### Scenario: A judgment call

- **WHEN** a note shows the person twice turned down a menu of drafts and asked for one ready draft
- **THEN** `/improve-code` builds nothing for it and its report names the note as one for a normal request
