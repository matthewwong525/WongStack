# team-shared-pages Specification

## Purpose
Lets a chat put a plain HTML page in its person's Inbox, and lets the maker share any Inbox page with signed-in teammates through a link, and stop it.

## Requirements

### Requirement: An agent can put a plain page in a person's inbox
A chat SHALL be able to put a plain HTML page in its person's Inbox, with a title. A plain page SHALL show no review bar and take no taps, and it SHALL stay in the person's Archive, marked as a page. The same chat and id SHALL replace the page with a new version. A plain page SHALL be kept within the Inbox's size limit for a review page.

#### Scenario: A plain page arrives
- **WHEN** a chat puts a plain page titled "Kit sales, November" in the person's Inbox
- **THEN** the person can open it from the link the chat prints, it shows no OK, Note or Send, and its Archive row says it is a page

#### Scenario: A page loads from the web
- **WHEN** the page names a script, style, picture or font at a web address
- **THEN** the agent's check refuses it and names the address, and nothing goes to the Inbox

### Requirement: A shared page is sealed
Every plain page, and every page opened through a team link, SHALL run in a sealed frame. Its own script SHALL run, but it SHALL NOT load anything from the network, reach the app's data or the viewer's sign-in, or change the page around it. A link inside it SHALL open in a new tab.

#### Scenario: The page tries to reach the network
- **WHEN** a shared page's script tries to fetch a web address or an app address
- **THEN** the browser blocks the request, and the viewer's sign-in and data stay out of the page's reach

### Requirement: The maker can share any inbox page with the team
The person whose Inbox holds a page, plain or review, SHALL be able to share it with one action, which gives a link under the app's own address. Only that person SHALL be able to share or stop sharing it. Sharing a page that is already shared SHALL give the same link.

#### Scenario: Share and copy
- **WHEN** the person taps *Share with team* on a page in their Inbox
- **THEN** the page shows that it is shared, with its link and a way to copy it, and its Archive row says *Shared*

#### Scenario: Someone else tries to share it
- **WHEN** another signed-in person asks the app to share or stop sharing a page that is not in their own Inbox
- **THEN** the app refuses and changes nothing

### Requirement: A signed-in teammate can open a shared link
A shared link SHALL open for any person signed in who may open the Inbox, and for no one else. It SHALL show the page's newest version, its title, and who shared it. A shared review page SHALL open read-only: no tap and no note from a teammate SHALL ever reach the maker's chat. A machine credential SHALL NOT open a shared page.

#### Scenario: A teammate opens the link
- **WHEN** a signed-in teammate opens a shared link
- **THEN** they see the page's newest version, its title and who shared it, and the page offers no buttons that send anything

#### Scenario: A machine key
- **WHEN** a machine credential, or a person who may not open the Inbox, asks for the link
- **THEN** the page does not open

### Requirement: The maker can stop sharing
The maker SHALL be able to stop sharing a page at once. A stopped link SHALL say the page is no longer shared, and SHALL never work again. Sharing the page again SHALL give a new link.

#### Scenario: Stop, then share again
- **WHEN** the maker taps *Stop sharing* and later shares the same page again
- **THEN** the old link says the page is no longer shared, and the new link opens the page

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
