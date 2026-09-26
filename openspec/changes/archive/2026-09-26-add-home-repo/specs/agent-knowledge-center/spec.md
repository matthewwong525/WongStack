## MODIFIED Requirements

### Requirement: Knowledge capture happens during the work

WongStack SHALL explain that knowledge capture happens through the work, not only as a separate documentation chore. Plans, decision logs, archived changes, and session facts SHALL be presented as the mechanisms that let each project leave more useful context for the next person or agent. Sessions without `/save` SHALL be presented as captured by the background run that the session start begins, and the digest SHALL be presented as how the next session starts with that context. The wiki SHALL be presented as long-term memory for repeatable knowledge, written when a session learns it. `/ship` SHALL be presented as the catch-up that moves a change's remaining repeatable facts into the wiki, with its wiki edits reviewed in the ship pull request.

#### Scenario: Reader understands why capture pays off

- **WHEN** a reader reviews the README or philosophy page
- **THEN** they see, in plain terms, that the process is written down, agents run it, what happens is captured, and future work starts with more context
- **AND** they see that repeatable knowledge reaches the wiki when it is learned, and that `/ship` catches what a session missed
