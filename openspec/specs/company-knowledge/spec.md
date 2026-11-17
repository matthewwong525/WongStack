# company-knowledge Specification

## Purpose
Company knowledge (people, business, customers, how we work, why) lives in its own repository in the install's Cloudflare account, which every holder of Project code reads and writes through the app, and where a save goes live at once.

## Requirements

### Requirement: Each install has one knowledge repository in its Cloudflare account

Every new install SHALL get one knowledge repository in its own Cloudflare account, on the GitHub route and on the Cloudflare route alike, holding no page until the first fact is saved. The code repository SHALL keep only the pages WongStack ships; an install's own pages SHALL go in the knowledge repository, which holds what code can't say: people, business, customers, how the team works, and why.

#### Scenario: A new GitHub install

- **WHEN** setup finishes a new install on the GitHub route
- **THEN** the install has a knowledge repository in its Cloudflare account with no pages, and `wiki/` holds only shipped pages

#### Scenario: A fact about a customer

- **WHEN** a chat learns that a customer wants invoices on the first of the month
- **THEN** the fact goes on a page in `knowledge/`, not in `wiki/`

### Requirement: Project code means read and write on company knowledge

Every person who holds Project code on the Access page SHALL be able to read the knowledge repository and save to it through the app, with the same company sign-in they use for code, and with no other tick, key or account. The app SHALL check the sign-in and Project code on every call. A person without Project code, and a service token on the live app, SHALL be refused. A push SHALL only move the published branch forward from its current tip; a delete, a tag, another branch or several branches at once SHALL be refused. No credential SHALL reach the computer.

#### Scenario: A teammate saves a page

- **WHEN** a teammate who holds Project code saves a change to `knowledge/business.md`
- **THEN** the save is accepted, and every other teammate's next read has it

#### Scenario: Project code is taken away

- **WHEN** a person whose Project code was removed tries to read or save knowledge
- **THEN** the app refuses with ask-your-admin guidance, and nothing changes in the repository

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

### Requirement: A save goes live at once after a link check

A save SHALL publish the named pages to the knowledge repository at once, with no pull request, no CI and no question, after a link check on the computer that applies the wiki's link, hub, length and title rules to `knowledge/`. A save SHALL take only Markdown pages and pictures, and only the paths it names. It SHALL report the pages saved and how to undo the save. When the app can't be reached, the save SHALL stay on the computer, be reported as not live yet, and go live with the next save or update.

#### Scenario: Remember this

- **WHEN** the person says "remember that Ana wants pull requests under 300 lines"
- **THEN** Ana's page in `knowledge/people/` has the line, it is live for the team, and the reply names the page and the undo

#### Scenario: A broken link

- **WHEN** a save adds a page that links to a page that does not exist
- **THEN** nothing is published, and the reply names the page and the link to fix

### Requirement: Two writers never lose a save

When two saves change the same lines of a page, the later save SHALL NOT overwrite the earlier one: the later save SHALL publish its other pages, keep the published version of the clashing page with its own version beside it, and name the page, and the assistant SHALL save one page that keeps both. Saves to different lines or pages SHALL both go live with no extra step. Unsaved edits on any page, in this chat's folder or another's, SHALL NOT stop a save from publishing, and a save SHALL never publish another chat's unsaved edits.

#### Scenario: Same lines, two people

- **WHEN** Bryan and Matthew each change the same paragraph of `knowledge/ops/shipping.md` within a minute
- **THEN** the second save publishes its other pages, names the page, the assistant writes the paragraph from both versions, and the saved page keeps both changes

#### Scenario: The newest version changed a page with an unsaved edit

- **WHEN** a chat saves one page, and the newest published version changed another page that has an unsaved edit in that chat's folder
- **THEN** the saved page goes live, and the unsaved edit stays unsaved on top of the newest version of its page

### Requirement: Every save can be undone and history survives

Each save SHALL be one entry in the knowledge repository's history that a single undo reverses, live at once like any save. If the published history is ever rewritten, the next update on any computer that holds the older history SHALL say so and SHALL be able to put it back. The live app SHALL log who saved each entry.

#### Scenario: Undo a save

- **WHEN** the person says "undo that save" after a wrong fact was saved
- **THEN** the page is back as it was, live for everyone, and the history still shows both entries

#### Scenario: History rewritten

- **WHEN** someone forces an older history onto the knowledge repository by hand
- **THEN** the next update on a computer with the newer history reports it and offers to put it back

### Requirement: Installs without a knowledge copy keep today's wiki

An install with no knowledge copy SHALL keep writing its own pages to `wiki/` through pull requests, exactly as before this release, until it takes the update that moves its knowledge.

#### Scenario: An older install updates

- **WHEN** an install created before this release takes it and then learns a repeatable fact
- **THEN** the fact goes in `wiki/` through a pull request, as it did before

### Requirement: Edits left behind are finished, never blocking

`/close` SHALL stop and name a chat's unsaved company pages before it removes the chat's folder, unless the person asked to throw the work away, when it SHALL drop them. Removing a folder SHALL never drop a held save: it stays on the computer until it is sent. The daily tidy SHALL send held saves from every chat's branch on the computer before its first map, and SHALL remove its own folder when its run ends.

#### Scenario: Closing a chat with an unsaved page

- **WHEN** a person runs `/close` in a chat with one unsaved company page
- **THEN** the close stops and names the page; once it is saved, the close removes the chat's folder

#### Scenario: A chat that ended without /close

- **WHEN** the daily tidy runs and a chat whose workspace is gone holds a save the app never received
- **THEN** the save goes live, and that chat's branch is removed
