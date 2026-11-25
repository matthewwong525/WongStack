## MODIFIED Requirements

### Requirement: An agent can put a plain page in a person's inbox
A chat SHALL be able to put a plain HTML page in its person's Inbox, with a title. A plain page SHALL show no review bar and take no taps, and it SHALL stay in the person's *Artifacts*, marked as a page. The same chat and id SHALL replace the page with a new version. A plain page SHALL be kept within the Inbox's size limit for a page.

#### Scenario: A plain page arrives
- **WHEN** a chat puts a plain page titled "Kit sales, November" in the person's Inbox
- **THEN** the person can open it from the link the chat prints, it shows no OK, Note or Send, and its *Artifacts* row says it is a page

#### Scenario: A page loads from the web
- **WHEN** the page names a script, style, picture or font at a web address
- **THEN** the agent's check refuses it and names the address, and nothing goes to the Inbox

## ADDED Requirements

### Requirement: A shared page shows its media

A team link to a page that carries pictures or videos SHALL show them to a signed-in teammate as they show to the maker. A stopped team link SHALL show no media.

#### Scenario: A shared review page
- **WHEN** Matthew shares a review page with pictures and Carol opens the link
- **THEN** Carol sees each picture, read-only, with no buttons

#### Scenario: A stopped link
- **WHEN** Matthew stops sharing the page and Carol reloads
- **THEN** the link says the page is no longer shared, and no picture loads
