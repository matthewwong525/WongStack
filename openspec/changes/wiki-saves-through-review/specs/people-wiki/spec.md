## MODIFIED Requirements

### Requirement: The agent writes what it learns

In every repo, when a request teaches something repeatable, the agent SHALL write it to the wiki during that request. This SHALL include "read this and remember it" requests and answers worth keeping. It SHALL cite a source by URL or path and SHALL NOT store a copy of the source in git. The wiki edit SHALL be saved like any other file edit, through a pull request that `/ship` merges. During a change, the edit SHALL ride in the change's pull request. The block's rule about editing `wiki/` mid-task SHALL say to write repeatable knowledge when it is learned, and to keep a change's specifics in its proposal.

#### Scenario: Read this and remember it

- **WHEN** the person pastes an article URL and says "remember this"
- **THEN** the agent writes the repeatable points to the page that owns the topic, with the URL, and saves it to a pull request for review

#### Scenario: A one-off answer

- **WHEN** the person asks for today's weather
- **THEN** no wiki page changes
