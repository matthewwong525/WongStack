# Spec Delta

## Purpose

Lets a person add their own password manager's browser add-on to the agent's shared browser, so they can fill logins from it through the live view, while the agent itself never uses it.

## ADDED Requirements

### Requirement: The person's choice of add-on, after their yes

The agent SHALL add a password manager add-on only from Firefox's add-on site, and SHALL add any add-on there that the person says yes to. Before it adds one, it SHALL name the add-on, its maker, the maker's website and its daily users in the chat, SHALL warn when Mozilla does not feature it and fewer than 10,000 people use it each day, and SHALL wait for the person's yes. It SHALL check the downloaded file against the fingerprint the add-on site gives, and SHALL keep at most one password manager add-on in the browser.

#### Scenario: The person's password manager is added

- **WHEN** the person names 1Password and says yes to "1Password – Password Manager" by 1Password
- **THEN** the browser has that add-on from its next start, and its button shows in the browser's toolbar in the live view

#### Scenario: A little-used add-on gets a warning, then the person decides

- **WHEN** the add-on the person names is not featured and fewer than 10,000 people use it each day
- **THEN** the agent says so before asking, and adds it only if the person still says yes

#### Scenario: A file that does not match is refused

- **WHEN** the downloaded file does not match the fingerprint the add-on site gives
- **THEN** nothing is added, and the agent tells the person why

### Requirement: Asked once, when the browser is installed

When the agent installs its browser on a computer, it SHALL ask once which password manager the person uses, and offer to add it. A no SHALL be remembered on this computer, and the agent SHALL NOT offer it again; adding one later SHALL happen only when the person asks. A computer that installed its browser before this change SHALL get the same one question at its next errand that uses the browser. The question SHALL count as asked only when the agent asks it in a chat with the person; a run with no person SHALL NOT ask it or use it up.

#### Scenario: The browser install offers it

- **WHEN** the first errand that needs the browser installs it
- **THEN** after the install the agent asks which password manager the person uses, before it goes on with the errand

#### Scenario: A run with no person leaves the question

- **WHEN** a scheduled errand with no person uses the browser before the question was asked
- **THEN** the agent asks nothing and records nothing, and the question waits for the next errand in a chat with the person

#### Scenario: A no is kept

- **WHEN** the person answered *None* when the browser was installed
- **THEN** the agent never offers a password manager again, and adds one only when the person asks

### Requirement: The add-on stays from start to start

The added add-on SHALL load at every browser start, with its own storage kept, so the person signs in to their password manager account in it once, not at each browser start. It SHALL stay up to date with the add-on site; a failed update SHALL keep the version that works.

#### Scenario: Still signed in after a restart

- **WHEN** the person signed in to their password manager in the live view and the browser restarts
- **THEN** the next live view shows the add-on signed in, asking at most for an unlock

### Requirement: The agent never uses the password manager

The agent SHALL NOT click, type in, or read the password manager add-on's own button, menus, or fill lists, and SHALL NOT unlock it. Its page readings SHALL leave out the add-on's own parts, and a click or a typing step aimed at one SHALL be refused. The agent SHALL tell the person, when it adds the add-on, to keep in it only the logins the agent needs and to set a short auto-lock.

#### Scenario: A fill list is on the page

- **WHEN** the agent reads a login page while the password manager shows its fill list there
- **THEN** the reading holds no part of that list, and a click aimed at it is refused

### Requirement: Remove or swap it on request

When the person asks, the agent SHALL remove the add-on from the browser together with its stored data, so no sign-in to the password manager stays behind, or SHALL swap it for another password manager by the same checks.

#### Scenario: Removed

- **WHEN** the person says *remove my password manager*
- **THEN** from the next browser start the add-on and its sign-in are gone, and the agent does not offer one again until asked
