## Purpose

Let the agent use the person's own web accounts through agent-browser, with a login done once by the person and reused after, and keep personal logins out of preview checks.

## ADDED Requirements

### Requirement: The first login sets one persistent browser profile

The first time a task needs a login and `~/.agent-browser/config.json` sets no `profile`, the agent SHALL set `"profile"` there to an absolute folder path, so every agent-browser call on the machine keeps cookies and site data across restarts. It SHALL keep every other key in the file, and SHALL NOT change a `profile` that is already set. Setup SHALL NOT write this file.

#### Scenario: No config yet

- **WHEN** a task needs a login on a machine with no `~/.agent-browser/config.json`
- **THEN** the file exists with a `profile` path, and the folder exists

#### Scenario: An existing config

- **WHEN** the config file already has other keys and no `profile`
- **THEN** the agent adds `profile` and keeps the other keys

### Requirement: The person does each login once

When a site needs a login, the agent SHALL hand the browser to the person once, for example through agent-browser's `stream enable` or `dashboard start`, and SHALL continue after the person says the login is done. Later tasks SHALL reuse the saved session. The agent SHALL NOT ask for a password in chat or store one in a file.

#### Scenario: First time on a site

- **WHEN** a task opens a mail site that shows a login form
- **THEN** the agent gives the person a way to log in in that browser, waits, and continues the task

#### Scenario: Later visits

- **WHEN** a later task opens the same site
- **THEN** the agent uses the saved session with no login step

### Requirement: Personal browsing runs one task at a time

Because Chrome lets only one browser use a profile at a time, the rules SHALL tell the agent that personal browsing tasks and scheduled runs must not use the profile at the same moment. A task that finds the profile in use SHALL wait or report it, and SHALL NOT delete the profile's lock.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run needs the browser while another task uses the profile
- **THEN** the run reports that the browser is busy and does not remove the lock
