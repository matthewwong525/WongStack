## MODIFIED Requirements

### Requirement: An agent can put a plain page in a person's inbox
A chat SHALL be able to put a plain HTML page in its person's Inbox, with a title. A plain page SHALL show no review bar and take no taps, and it SHALL stay in the person's *Artifacts*, marked as a page. The same chat and id SHALL replace the page with a new version. A plain page SHALL be kept within the Inbox's size limit for a review page.

#### Scenario: A plain page arrives
- **WHEN** a chat puts a plain page titled "Kit sales, November" in the person's Inbox
- **THEN** the person can open it from the link the chat prints, it shows no OK, Note or Send, and its *Artifacts* row says it is a page

#### Scenario: A page loads from the web
- **WHEN** the page names a script, style, picture or font at a web address
- **THEN** the agent's check refuses it and names the address, and nothing goes to the Inbox

### Requirement: The maker can share any inbox page with the team
The person whose Inbox holds a page, plain or review, SHALL be able to share it with one action, which gives a link under the app's own address. Only that person SHALL be able to share or stop sharing it. Sharing a page that is already shared SHALL give the same link.

#### Scenario: Share and copy
- **WHEN** the person taps *Share with team* on a page in their Inbox
- **THEN** the page shows that it is shared, with its link and a way to copy it, and its *Artifacts* row says *Shared*

#### Scenario: Someone else tries to share it
- **WHEN** another signed-in person asks the app to share or stop sharing a page that is not in their own Inbox
- **THEN** the app refuses and changes nothing

### Requirement: A file page shows a Download button and downloads on open only from its link

A plain page that carries files SHALL show a Download action outside the page's sealed frame. Opening the page from the inbox list or *Artifacts* SHALL NOT start a download by itself. Only the person whose inbox holds the page, or a signed-in teammate with an open team link, SHALL get its files; a service token SHALL get none.

#### Scenario: Opened from the Archive

- **WHEN** the person opens a file page from *Artifacts*
- **THEN** nothing downloads until they tap Download

#### Scenario: Someone else asks for the file

- **WHEN** another signed-in person asks for the file of a page that has no open team link
- **THEN** the app refuses and sends no bytes
