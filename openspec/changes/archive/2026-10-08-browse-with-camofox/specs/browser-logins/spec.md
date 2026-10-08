# Spec Delta

## ADDED Requirements

### Requirement: Logins persist in the personal browser

Once a site accepts the person's login in the personal browser, that login SHALL be saved to the person's home folder at once, outside any repo, and SHALL survive a restart of the browser or the computer, for every repo on the machine. A login SHALL NOT be lost because the browser stopped before the task ended.

#### Scenario: A later visit after a restart

- **WHEN** the person logged in to a site yesterday and the computer restarted overnight
- **THEN** today's task opens the site already logged in

#### Scenario: The browser stops mid-task

- **WHEN** the browser stops right after a login was accepted
- **THEN** the next task still finds that login

### Requirement: Browsing tasks share the personal browser

Two browsing tasks, or a task and a scheduled run, SHALL each use their own pages in the one personal browser and the same saved logins, without waiting on each other and without one closing the other's pages. Preview checks SHALL NOT use the personal browser or its logins.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run starts while a chat is browsing
- **THEN** both carry on, each in its own pages, and neither reports the browser busy

#### Scenario: A preview check

- **WHEN** `/verify` walks a preview
- **THEN** it uses its own temporary browser with none of the person's logins

### Requirement: A site that refuses the browser ends with steps for the person

When a site shows a check the personal browser does not clear, or refuses it, the agent SHALL say so in one line, SHALL stop browsing that site, and SHALL give the person its link and numbered steps to finish on their own device. It SHALL NOT try a second browser, SHALL NOT route its traffic through a hired or borrowed network address, SHALL NOT use a check-solving service, and SHALL NOT solve a check that asks whether a person is present.

#### Scenario: A store behind a check

- **WHEN** a DoorDash store stays on a "Verify you are human" page
- **THEN** the agent sends no private link and gives the store's link and the steps for the person's phone

#### Scenario: The person asks the agent to solve the puzzle

- **WHEN** the person asks the agent to solve a picture puzzle for them
- **THEN** the agent declines and gives the steps to do it on their own device

### Requirement: The personal browser reports nothing to its makers

The agent SHALL run the personal browser with its usage and failure reporting switched off, every time it starts it, and the browser SHALL listen only on the computer it runs on.

#### Scenario: A page fails to load

- **WHEN** a site hangs or crashes a page during a task
- **THEN** no report naming the site, even in hashed form, leaves the computer

### Requirement: An update leaves earlier saved logins untouched

An update that moves personal browsing to a new browser SHALL NOT delete, read, or copy the passwords and sessions the earlier browser held. The first task that meets a login on each site SHALL treat it as a site with no saved login.

#### Scenario: A first errand after the update

- **WHEN** a task opens a site the person had saved a login for before the update
- **THEN** the agent asks whether they are ready and sends the password link with the site filled in, and the earlier store is unchanged

## MODIFIED Requirements

### Requirement: The person does each login once

The agent SHALL log in with a login the person saved, then reuse the session. It SHALL NOT ask for a password in the chat, and SHALL NOT read, show, or write a password. Saved passwords SHALL live in one file in the person's home folder, outside any repo and readable only by their user, which only the password link writes and only the program that types a login reads. The agent SHALL learn only the names of saved logins and whether a login was accepted.

#### Scenario: A later visit

- **WHEN** a later task opens a site the person logged in to
- **THEN** no login step is needed

#### Scenario: A password offered in the chat

- **WHEN** the person starts typing a password into the chat
- **THEN** the agent does not use or save it, and offers the password link instead

### Requirement: A step that needs the person goes to the chat or a private form

When a browsing step needs something only the person can give, the agent SHALL get it without showing or handing over its browser. An ordinary form answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes. A sensitive value (payment card details, a backup or recovery code, or another lasting secret the page asks for) SHALL go through the private form. A password SHALL follow the password link requirements, a one-time code the login-code requirement, and an API key or token step the own-browser requirement. A step only the person can do on the page (a picture puzzle, a passkey or device check) SHALL NOT be attempted by the agent: the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address. The agent SHALL NOT offer a live view of its browser or remote control of it, including when the person asks to take over.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a private form for the card details only

#### Scenario: A picture puzzle

- **WHEN** a site shows a picture puzzle
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device

## REMOVED Requirements

### Requirement: One persistent profile keeps logins

**Reason**: The personal browser no longer uses a Chrome profile set in agent-browser's config.
**Migration**: "Logins persist in the personal browser" carries the promise. An existing `profile` setting is left as it is; `/verify` ignores it as before.

### Requirement: Personal browsing runs one task at a time

**Reason**: The one-at-a-time limit came from Chrome's profile lock, which the personal browser does not have.
**Migration**: "Browsing tasks share the personal browser" replaces it and keeps preview checks apart.

### Requirement: Personal browsing follows the installed tool's guide

**Reason**: Personal browsing runs through WongStack's own script, documented in the browsing guide, not agent-browser's served guide.
**Migration**: None for personal browsing. `/verify` keeps its own guide requirement in `staging-walkthrough`.

### Requirement: A site that blocks the agent's browser moves to the cloud browser

**Reason**: The person dropped Cloudflare's browser; one browser that more sites accept replaces the fallback.
**Migration**: "A site that refuses the browser ends with steps for the person". A task that named a cloud browser session opens the site in the personal browser.

### Requirement: A site's login carries over between the browsers

**Reason**: There is one browser, so no login moves.
**Migration**: None.

### Requirement: The agent never disguises its browser

**Reason**: The person removed the rule on 2026-10-07; the personal browser presents itself as an ordinary browser.
**Migration**: The limits that remain (no hired network address, no check-solving service, no solving a human check) sit in "A site that refuses the browser ends with steps for the person".

### Requirement: One setting picks the first browser

**Reason**: There is one browser to pick.
**Migration**: A saved *cloud first* setting is ignored.

### Requirement: A cloud browser session ends with its task

**Reason**: No cloud browser session exists.
**Migration**: None.
