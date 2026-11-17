## MODIFIED Requirements

### Requirement: Every workspace reads one current copy

Each computer SHALL keep one shared copy of the knowledge repository. Each chat workspace SHALL have its own folder of it at `knowledge/`, made from the newest published version, so that one chat's unsaved edits are never seen by another chat or in its way. Making or removing a chat's folder SHALL never change or delete the shared copy. A workspace that still links to the shared copy SHALL get its own folder at its next chat start, with no page lost. When a chat starts, its folder SHALL send its own held saves and move to the newest saved version in the background, without delaying the chat, with its unsaved edits merged on top. When an unsaved edit and a newer published edit change the same lines, the page SHALL hold the published version with the chat's version beside it, and the chat start SHALL name the page. When the sign-in has run out or the app can't be reached, chats SHALL read the last copy, and nothing SHALL open a browser or wait for one.

#### Scenario: A teammate saved overnight

- **WHEN** a teammate saved a page last night and the person starts a chat this morning
- **THEN** by the end of the chat's start, the chat's folder shows that page

#### Scenario: The sign-in ran out

- **WHEN** a chat starts after the company sign-in has expired
- **THEN** the chat reads the last copy, and the sign-in link is shown as it is today

#### Scenario: Two chats edit one page

- **WHEN** chat A edits a page and does not save it, and chat B then saves the same page
- **THEN** chat B's save goes live, and chat A still sees its own edit, not chat B's draft

#### Scenario: An older workspace with a link

- **WHEN** a chat starts in a workspace whose `knowledge/` is a link to the shared copy
- **THEN** the link is replaced with the workspace's own folder, and the shared copy keeps every file and save it held

### Requirement: Two writers never lose a save

When two saves change the same lines of a page, the later save SHALL NOT overwrite the earlier one: the later save SHALL publish its other pages, keep the published version of the clashing page with its own version beside it, and name the page, and the assistant SHALL save one page that keeps both. Saves to different lines or pages SHALL both go live with no extra step. Unsaved edits on any page, in this chat's folder or another's, SHALL NOT stop a save from publishing, and a save SHALL never publish another chat's unsaved edits.

#### Scenario: Same lines, two people

- **WHEN** Bryan and Matthew each change the same paragraph of `knowledge/ops/shipping.md` within a minute
- **THEN** the second save publishes its other pages, names the page, the assistant writes the paragraph from both versions, and the saved page keeps both changes

#### Scenario: The newest version changed a page with an unsaved edit

- **WHEN** a chat saves one page, and the newest published version changed another page that has an unsaved edit in that chat's folder
- **THEN** the saved page goes live, and the unsaved edit stays unsaved on top of the newest version of its page

## ADDED Requirements

### Requirement: Edits left behind are finished, never blocking

`/close` SHALL stop and name a chat's unsaved company pages before it removes the chat's folder, unless the person asked to throw the work away, when it SHALL drop them. Removing a folder SHALL never drop a held save: it stays on the computer until it is sent. The daily tidy SHALL send held saves from every chat's branch on the computer before its first map, and SHALL remove its own folder when its run ends.

#### Scenario: Closing a chat with an unsaved page

- **WHEN** a person runs `/close` in a chat with one unsaved company page
- **THEN** the close stops and names the page; once it is saved, the close removes the chat's folder

#### Scenario: A chat that ended without /close

- **WHEN** the daily tidy runs and a chat whose workspace is gone holds a save the app never received
- **THEN** the save goes live, and that chat's branch is removed
