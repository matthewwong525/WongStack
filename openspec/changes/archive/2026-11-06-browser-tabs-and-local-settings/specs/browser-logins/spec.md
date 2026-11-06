## MODIFIED Requirements

### Requirement: Browsing tasks share the personal browser

Two browsing tasks, or a task and a scheduled run, SHALL each use their own tab in one window of the one personal browser and the same sign-ins, without waiting on each other and without one closing the other's tabs. A new task SHALL NOT open a second window. While the person's turn is open in one task's tab, no other task SHALL switch the window to another tab. Preview checks SHALL NOT use the personal browser or its sign-ins.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run starts while a chat is browsing
- **THEN** both carry on, each in its own tab of the same window, and neither reports the browser busy

#### Scenario: Another chat browses during the person's turn

- **WHEN** a chat browses while the person signs in on another chat's tab
- **THEN** the second chat works in its own tab, and the person's tab stays the one shown

#### Scenario: A preview check

- **WHEN** `/verify` walks a preview
- **THEN** it uses its own temporary browser with none of the person's sign-ins

### Requirement: On a computer with its own screen, the turn happens in the browser's window

On a Mac or Windows computer, and on a Linux computer with a screen and the link setting off, the agent's browser SHALL open in a window on the screen by default, and the person's turn SHALL happen in that window, on the task's own tab: the chat SHALL say what to do and to say *done*, and the turn SHALL end on the finish or on *done*. The person SHALL be able to turn the window off, taking effect at the next browser start, never by restarting a running browser. On a Mac or Windows computer with the window off, a step that needs the person SHALL end with steps to finish in their own browser. On a Mac, the window SHALL stay hidden while the agent works, SHALL come to the front on the task's tab only for the person's turn or when the person asks to see it, and SHALL hide again when the turn ends.

#### Scenario: A sign-in on a Mac

- **WHEN** a task on a Mac with the window on meets a login page
- **THEN** no link is sent, the chat asks the person to sign in in the browser window and say *done*, and the agent carries on once the page shows them signed in

#### Scenario: Hidden while the agent works on a Mac

- **WHEN** the agent fills a form on a Mac and then meets a robot check
- **THEN** the window stays hidden while it fills the form, comes to the front on that tab for the check, and hides again once the person is through

#### Scenario: The window turned off

- **WHEN** the person on a Mac has turned the window off and a site asks them to sign in
- **THEN** the agent sends no link and gives them steps to finish in their own browser

#### Scenario: A Linux computer with a screen

- **WHEN** a task on a Linux computer with a screen and the link setting off meets a login page
- **THEN** the browser shows in a window there, and the turn goes as on a Mac, with no link

### Requirement: Local proxy upgrades preserve running browsing tasks

An update that changes the proxy default, or a change to the proxy setting, SHALL preserve existing saved logins and SHALL NOT automatically stop an already-running personal browser, close another task's tabs, or interrupt private input. The next deliberate stop and new start SHALL apply the setting, and stopping a browser that started with the proxy SHALL stop its local forwarding listener too.

#### Scenario: Another task is using the existing browser

- **WHEN** updated browsing code encounters a personal browser already running without the managed local proxy
- **THEN** the task can keep its pages and logins and the new default takes effect at the next deliberate browser restart

#### Scenario: Stopping the browser

- **WHEN** the person stops a personal browser that started with the local proxy
- **THEN** its forwarding listener closes and its saved logins remain available for the next start

## REMOVED Requirements

### Requirement: Personal browsing starts its own local forwarding proxy

**Reason**: The proxy becomes a setting on each computer, off by default, because most new people do not need it.
**Migration**: A person whose sites need the proxy turns it on; it applies from the browser's next start. See *The local forwarding proxy is a setting on each computer*.

## ADDED Requirements

### Requirement: The local forwarding proxy is a setting on each computer

The personal browser SHALL go straight to sites by default. The person SHALL be able to turn a local forwarding proxy on or off, and the choice SHALL apply from the browser's next start. When on, the proxy SHALL run on the same computer through its existing connection, SHALL need no added install, account, Paseo relay, or WARP connection, SHALL listen only on loopback, SHALL keep no browsing logs, and SHALL tunnel secure traffic without decrypting it; if it cannot start, the browser SHALL report the failure rather than start without it.

#### Scenario: A fresh browser start after installation

- **WHEN** a person starts their first personal browsing task and has never turned the proxy on
- **THEN** the browser starts with no proxy and reaches sites through the computer's own connection

#### Scenario: The proxy is on but cannot start

- **WHEN** the proxy setting is on and the proxy fails during the browser's start
- **THEN** the task receives a startup error and no direct browser starts as a fallback

### Requirement: Browser settings stay on the computer

The window or link setting and the proxy setting SHALL be kept on the computer, outside every repo, so no commit carries them and each computer keeps its own. A setting SHALL apply to every repo on that computer.

#### Scenario: A teammate pulls the repo

- **WHEN** a teammate pulls a repo after the person turned on the link setting and the proxy
- **THEN** the teammate's computer keeps its own settings, and no repo file changed

### Requirement: On Linux, the link setting sends the browser as a live view

A Linux computer SHALL use a live-view link for the person's turn when its link setting is on, or when it has no screen. The link SHALL come by itself for a sign-in, a payment or backup code, a robot check, or a stuck step, and also whenever the person asks for the browser; a link asked for SHALL show the chat's own tab and stay open until the person hands it back or its time limit passes. On a computer that shows a window, asking for the browser SHALL bring the chat's own tab to the front and send no link.

#### Scenario: The person asks for the browser

- **WHEN** the person on a Linux server says *send me the browser* during a task
- **THEN** the agent sends a live-view link to that chat's tab, which stays open until they tap *Hand back*

#### Scenario: Asking on a Mac

- **WHEN** the person on a Mac with the window on asks to see the browser
- **THEN** the chat's tab comes to the front of the browser window and no link is sent
