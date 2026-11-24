## ADDED Requirements

### Requirement: A plain page carries files to download

A chat SHALL be able to put up to 5 files, each up to 25 MB, with a plain page in its person's inbox. A page made with no folder of its own SHALL list each file's name and size; a page from the agent's own folder SHALL show its own HTML, with the bar's Download. Putting the page again with the same id SHALL replace its files, and the old files SHALL no longer download. A file SHALL always download, never open or run inside the app. A file whose name claims a kind the app knows SHALL start with that kind's bytes, or the app SHALL refuse it.

#### Scenario: The printed link downloads the file

- **WHEN** a chat puts a plain page with the file `q2-sales.xlsx` and the person opens the link the chat printed
- **THEN** the page opens and `q2-sales.xlsx` downloads without another tap, and it downloads again each time that link opens

#### Scenario: A replaced page drops its old file

- **WHEN** a chat puts the same page id again with `q2-sales-v2.xlsx` only
- **THEN** the page lists and downloads `q2-sales-v2.xlsx`, and `q2-sales.xlsx` no longer downloads

### Requirement: A file page shows a Download button and downloads on open only from its link

A plain page that carries files SHALL show a Download action outside the page's sealed frame. Opening the page from the inbox list or the Archive SHALL NOT start a download by itself. Only the person whose inbox holds the page, or a signed-in teammate with an open team link, SHALL get its files; a service token SHALL get none.

#### Scenario: Opened from the Archive

- **WHEN** the person opens a file page from the Archive
- **THEN** nothing downloads until they tap Download

#### Scenario: Someone else asks for the file

- **WHEN** another signed-in person asks for the file of a page that has no open team link
- **THEN** the app refuses and sends no bytes

### Requirement: A team link downloads its page's files

A team link to a plain page that carries files SHALL download those files when a signed-in teammate opens it, and SHALL show the same Download action. A stopped team link SHALL download nothing.

#### Scenario: A teammate opens the team link

- **WHEN** a signed-in teammate opens an open team link to a file page
- **THEN** the page opens and its files download

#### Scenario: The link was stopped

- **WHEN** a teammate opens a team link the maker stopped
- **THEN** the page says it is no longer shared and no file downloads
