## Purpose

Provide compact checkpoint evidence and stable pull-request records without transferring workflow judgment or delivery actions away from the owning skills.

## ADDED Requirements

### Requirement: Checkpoint evidence is complete and read-only

Checkpoint tooling SHALL report structured branch, comparison-base, changed-path, and change-candidate evidence for the selected root and ref. It SHALL preserve candidate ambiguity, distinguish local work from a remote tree, report failed inspection explicitly, and make no Git or remote-service mutation. Existing line-oriented candidate calls SHALL remain compatible.

#### Scenario: Local work carries several changes

- **WHEN** staged, unstaged, or untracked work and the branch diff identify several active changes
- **THEN** all candidates are reported with their source evidence
- **AND** tooling does not select one by branch name or silently truncate the set

#### Scenario: Remote inspection excludes local work

- **WHEN** the caller inspects a fetched remote ref
- **THEN** candidates and recorded-branch evidence come from that ref
- **AND** unrelated local work is excluded

#### Scenario: Inspection cannot complete

- **WHEN** a required root, ref, comparison base, or Git operation cannot be read
- **THEN** tooling returns an explicit error rather than a successful empty result
- **AND** repository files and refs remain unchanged

#### Scenario: Existing caller uses line output

- **WHEN** a caller uses the existing active or archive invocation with a valid ref
- **THEN** it receives the same sorted candidate-name format

### Requirement: PR body assembly preserves the selected handoff

Checkpoint tooling SHALL assemble a PR body from an agent-authored summary, selected change Status and task checklist, and explicit link metadata. It SHALL preserve checklist content and newlines, omit absent optional sections, encode link paths, and distinguish active and archived handoffs. It SHALL write only the requested output file and SHALL NOT publish the body. Invalid required inputs SHALL leave prior output intact and return an error.

#### Scenario: Active change has a review and preview

- **WHEN** the selected active change has a review file and a discovered preview URL
- **THEN** the body contains its current Status, supplied summary, exact task checklist, review and preview links, and its continue command

#### Scenario: Archived change has no preview

- **WHEN** the selected handoff is an archive and no preview was found
- **THEN** the body links the archive, omits the preview section, and offers no continue command

#### Scenario: Required input is missing

- **WHEN** the selected proposal, checklist, summary input, or required link metadata is invalid
- **THEN** rendering fails without replacing a previous body or publishing anything

#### Scenario: Input contains unusual path characters

- **WHEN** the branch or change path contains spaces or URL-significant characters
- **THEN** links address the intended files and input text is never executed as a command
