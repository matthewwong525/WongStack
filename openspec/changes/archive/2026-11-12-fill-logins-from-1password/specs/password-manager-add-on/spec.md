## MODIFIED Requirements

### Requirement: The person's choice of add-on, after their yes

The agent SHALL add an add-on only from Firefox's add-on site, and SHALL add any add-on there that the person says yes to, a password manager or any other. Before it adds one, it SHALL name the add-on, its maker, the maker's website and its daily users in the chat, SHALL warn when Mozilla does not feature it and fewer than 10,000 people use it each day, and SHALL wait for the person's yes, except for the default 1Password add, which needs no yes (*1Password comes with the browser*). It SHALL check the downloaded file against the fingerprint the add-on site gives. Adding one SHALL keep the add-ons the agent added before. For an add-on the browser already ships, the agent SHALL say that it is built in, before it asks, and SHALL add nothing.

#### Scenario: The person's password manager is added

- **WHEN** the person names 1Password and says yes to "1Password – Password Manager" by 1Password
- **THEN** the browser has that add-on from its next start, and its button shows in the browser's toolbar in the live view

#### Scenario: A little-used add-on gets a warning, then the person decides

- **WHEN** the add-on the person names is not featured and fewer than 10,000 people use it each day
- **THEN** the agent says so before asking, and adds it only if the person still says yes

#### Scenario: A file that does not match is refused

- **WHEN** the downloaded file does not match the fingerprint the add-on site gives
- **THEN** nothing is added, and the agent tells the person why

#### Scenario: A second add-on joins the first

- **WHEN** the agent added 1Password, and the person then says yes to Dark Reader
- **THEN** from the next start the browser has both, and 1Password keeps its sign-in

#### Scenario: An add-on the browser ships is not added

- **WHEN** the person asks for uBlock Origin, which the browser already ships
- **THEN** the agent says it is built into the browser, downloads nothing, and adds nothing

### Requirement: The person adds an add-on themselves

The agent SHALL NOT ask the person which password manager they use or offer to add one. The person SHALL be able to add any add-on from Firefox's add-on site in the browser themselves, and it SHALL stay from start to start, but it is not promised to work: the help SHALL tell the person to ask the agent to add an add-on instead. The agent SHALL NOT click, type in, read, or unlock any add-on's own button, pages, menus, or frames, whether the person or the agent added it, except the one approved pick from an unlocked password manager.

#### Scenario: A new browser install

- **WHEN** the first errand that needs the browser installs it
- **THEN** the agent asks nothing about a password manager, adds 1Password by the default rule, and goes on with the errand

#### Scenario: An add-on the person added

- **WHEN** the agent reads a page where an add-on the person added shows its own frame
- **THEN** the reading holds no part of that frame, and a click aimed at it is refused

## REMOVED Requirements

### Requirement: The agent never uses the password manager

**Reason**: The person asked that the agent sign in with their unlocked 1Password, after a yes that names the login and the steps after sign-in.

**Migration**: Replaced by *The agent picks a login from an unlocked password manager only after a yes*, which keeps the hidden readings, the refused clicks outside one pick, and the never-unlock rule, with the advice changed to an 8-hour auto-lock.

## ADDED Requirements

### Requirement: The agent picks a login from an unlocked password manager only after a yes

The agent SHALL NOT unlock a password manager add-on. When a site needs a login and the add-on is already unlocked and offers a login for the page's site, the agent SHALL ask the person in the chat, every time, naming the login, the site, and each step it will take once signed in, and SHALL pick that one login from the add-on's fill list only after a yes. It SHALL then take only the named steps; a step outside them SHALL first get a new yes, and an outward action its own yes. When the task ends, it SHALL say which named steps it did. Apart from the names of the logins offered for that site and that one pick, the agent SHALL NOT click, type in, or read the add-on's own button, menus, or fill lists: its page readings SHALL leave out the add-on's parts and show a filled password box only as filled, and any other click or typing step aimed at the add-on SHALL be refused, as SHALL a key that could pick from its fill list while that list shows. When the add-on is locked or offers no login, the person SHALL sign in in a sign-in turn, as before. When a password manager is added, the agent SHALL tell the person to set its auto-lock to 8 hours; after the default 1Password add, it SHALL say so in its first sign-in turn for 1Password. It SHALL NOT give that advice for another add-on.

#### Scenario: Unlocked, with a login for the site

- **WHEN** a task needs Canva, and the person's unlocked 1Password offers "Canva (work)" for it
- **THEN** the agent asks to sign in with "Canva (work)" and names the steps after it, picks it only after a yes, does only those steps, and reports them

#### Scenario: Locked

- **WHEN** a site needs a login and 1Password is locked
- **THEN** the agent does not unlock it, opens the sign-in page, and sends the person a sign-in turn; the first one for the default 1Password says to set its auto-lock to 8 hours

#### Scenario: A fill list is on the page

- **WHEN** the agent reads a login page while the password manager shows its fill list there
- **THEN** the reading holds no part of that list but the offered login names asked for, and a click aimed at it outside an approved pick is refused

#### Scenario: No vault advice for another add-on

- **WHEN** the agent adds Dark Reader after the person's yes
- **THEN** it says nothing about an auto-lock

### Requirement: 1Password comes with the browser

A new install of the agent's browser SHALL add the 1Password add-on, by the same source and file checks as an add the person asks for, with no question. A browser installed before this change SHALL get it once, at its next start. 1Password SHALL NOT be added when the person removed it before, said no to a password manager in an older version, or when another password manager is already added. An install SHALL NOT stop a running browser for the add: its next start adds it. A failed download SHALL NOT stop the browser from starting, SHALL cost a start little time, and SHALL be tried again at a start a day or more later.

#### Scenario: A new install

- **WHEN** the first errand that needs the browser installs it
- **THEN** the browser starts with 1Password in its toolbar, and the agent asks nothing about it

#### Scenario: Removed stays removed

- **WHEN** the person said *remove my password manager* and the browser starts again
- **THEN** 1Password is not added back
