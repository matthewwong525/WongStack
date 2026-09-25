## MODIFIED Requirements

### Requirement: The philosophy maps knowledge surfaces to repo files

The knowledge-center documentation SHALL name the durable surfaces WongStack uses: agent instructions, the progressive-disclosure wiki, active OpenSpec changes, archived changes, skills, and the memory store that holds session facts and raw transcripts outside the repository. It SHALL explain what each surface owns without duplicating operational details owned by deeper docs.

#### Scenario: Reader understands where knowledge lives

- **WHEN** a reader reviews the philosophy page
- **THEN** they can identify where reusable process, active plans, shipped records, session context, and repeatable agent actions live

#### Scenario: Details remain linked

- **WHEN** the philosophy page names a deeper process such as the change loop, wiki structure, or the memory store
- **THEN** it links to the owning page instead of restating the full procedure

### Requirement: Knowledge capture happens during the work

WongStack SHALL explain that knowledge capture happens through the work, not only as a separate documentation chore. Plans, decision logs, archived changes, and session facts SHALL be presented as the mechanisms that let each project leave more useful context for the next person or agent. Sessions without `/save` SHALL be presented as captured by the background run that the session start begins, and the digest SHALL be presented as how the next session starts with that context. `/ship` SHALL be presented as the one automatic bridge from a change's facts into the wiki, and its wiki edits SHALL be reviewed in the ship pull request.

#### Scenario: Reader understands why capture pays off

- **WHEN** a reader reviews the README or philosophy page
- **THEN** they see, in plain terms, that the process is written down, agents run it, what happens is captured, and future work starts with more context
- **AND** `/ship` is named as the only automatic path from facts into the wiki
