# password-manager-add-on Specification

## Purpose
Lets a person add their own password manager's browser add-on to the agent's shared browser, so they can fill logins from it through the live view, while the agent itself never uses it.

## Requirements

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

### Requirement: The add-on stays from start to start

The added add-on SHALL load at every browser start, with its own storage kept, so the person signs in to their password manager account in it once, not at each browser start. It SHALL stay up to date with the add-on site; a failed update SHALL keep the version that works.

#### Scenario: Still signed in after a restart

- **WHEN** the person signed in to their password manager in the live view and the browser restarts
- **THEN** the next live view shows the add-on signed in, asking at most for an unlock

### Requirement: Remove or swap it on request

When the person asks, the agent SHALL remove the add-on they name from the browser together with its stored data, so no sign-in to it stays behind, and SHALL leave the other added add-ons in place. It SHALL swap a password manager for another by the same checks when asked.

#### Scenario: Removed

- **WHEN** the person says *remove my password manager*
- **THEN** from the next browser start the add-on and its sign-in are gone, and the agent does not offer one again until asked

### Requirement: The person adds an add-on themselves

The agent SHALL NOT ask the person which password manager they use or offer to add one. The person SHALL be able to add any add-on from Firefox's add-on site in the browser themselves, and it SHALL stay from start to start, but it is not promised to work: the help SHALL tell the person to ask the agent to add an add-on instead. The agent SHALL NOT click, type in, read, or unlock any add-on's own button, pages, menus, or frames, whether the person or the agent added it, except the one approved pick from an unlocked password manager.

#### Scenario: A new browser install

- **WHEN** the first errand that needs the browser installs it
- **THEN** the agent asks nothing about a password manager, adds 1Password by the default rule, and goes on with the errand

#### Scenario: An add-on the person added

- **WHEN** the agent reads a page where an add-on the person added shows its own frame
- **THEN** the reading holds no part of that frame, and a click aimed at it is refused

### Requirement: The agent's add replaces the person's own copy

When the agent adds an add-on that the person already added themselves from Firefox's add-on site, the agent's add SHALL remove the person's copy and its stored data, so only the agent's copy loads from the next start. Other add-ons the person added SHALL stay.

#### Scenario: 1Password added both ways

- **WHEN** the person added 1Password from Firefox's add-on site, then says yes to the agent adding 1Password
- **THEN** from the next start the browser has one 1Password, and its toolbar button opens 1Password's own page

### Requirement: One ask adds a well-known add-on, and its page opens

When the person asks for one add-on by name, and the best match on Firefox's add-on site is the only plausible one and is featured by Mozilla or used by at least 10,000 people each day, and the agent has not added it already, the ask SHALL count as the person's yes: the agent SHALL name the add-on, its maker, the maker's website and its daily users in the chat and add it in the same turn, with no further question. When the words fit more than one add-on, the agent SHALL name the matches and add only the one the person picks. The agent SHALL NOT ask the person to add an add-on themselves from the add-on site. Right after it adds a password manager, the agent SHALL open its own page and show it to the person, so their only step is to sign in.

#### Scenario: Asking for a well-known add-on adds it at once

- **WHEN** the person says "add 1Password", and the best match is featured with more than 10,000 daily users
- **THEN** the agent names its maker, website and daily users, adds it without a further question, and opens 1Password's own page for the person to sign in

#### Scenario: Words that fit more than one add-on

- **WHEN** the person's words fit more than one add-on on the site
- **THEN** the agent names the matches and adds only the one the person picks

#### Scenario: An add-on the agent already added

- **WHEN** the agent added 1Password, and the person says "add 1Password" again
- **THEN** the agent says it is already there and adds nothing, so its sign-in stays

#### Scenario: Never sent to press the button

- **WHEN** the person asks the agent to add an add-on
- **THEN** the agent does not open the add-on site for the person to press *Add to Firefox*

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
