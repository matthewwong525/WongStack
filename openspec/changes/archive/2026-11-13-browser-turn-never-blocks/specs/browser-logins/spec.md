## ADDED Requirements

### Requirement: An updated browser starts by itself

A running personal browser whose own code changed after it started SHALL stop by itself once no task has a tab open or opening in it and no turn is open, so the next browser command starts the new code. It SHALL never stop while a task uses it.

#### Scenario: Idle after an update

- **WHEN** a fix to the browser lands and the last task's tab closes
- **THEN** the browser stops, and the next task's browser command starts the fixed one

#### Scenario: A task still uses the browser

- **WHEN** the browser's code changed while a task has its tab open
- **THEN** the browser keeps running, with that task's page and logins

## MODIFIED Requirements

### Requirement: Browsing tasks share the personal browser

Two browsing tasks, or a task and a scheduled run, SHALL each use their own tab in one window of the one personal browser and the same sign-ins, without waiting on each other and without one closing the other's tabs. A new task SHALL NOT open a second window. Preview checks SHALL NOT use the personal browser or its sign-ins.

While the person's turn is open in another task's tab, a task SHALL read, click, type, choose and resize in its own tab at once: no step SHALL wait for the turn to end, and no step SHALL be refused because of it. When a step shows that task's tab, the turn's tab the person was on SHALL come back to the front right after the step, and a task's request to show its own tab SHALL leave the person's tab in front. With no turn open, every step SHALL work as before.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run starts while a chat is browsing
- **THEN** both carry on, each in its own tab of the same window, and neither reports the browser busy

#### Scenario: Another chat browses during the person's turn

- **WHEN** a chat reads, types, and resizes its own tab while the person signs in on another chat's tab
- **THEN** each step runs at once in the chat's own tab, and the person's tab is the one shown after each

#### Scenario: Another chat clicks a button during the person's turn

- **WHEN** a chat clicks a button or a link in its own tab while the person signs in on another chat's tab
- **THEN** the button or link acts at once, the chat hears it is done, and the person's tab stays the one shown

#### Scenario: Another chat clicks a mouse-only target during the person's turn

- **WHEN** a chat clicks an element that reacts to no key while the person's turn is open in another chat's tab
- **THEN** the click runs at once, the chat's next step on that tab is not refused, and the person's tab is the one shown

#### Scenario: A preview check

- **WHEN** `/verify` walks a preview
- **THEN** it uses its own temporary browser with none of the person's sign-ins

### Requirement: Local proxy upgrades preserve running browsing tasks

An update that changes the proxy default, or a change to the proxy setting, SHALL preserve existing saved logins and SHALL NOT stop a personal browser that a task is using, close another task's tabs, or interrupt private input. The next stop and new start SHALL apply the setting, and stopping a browser that started with the proxy SHALL stop its local forwarding listener too.

#### Scenario: Another task is using the existing browser

- **WHEN** updated browsing code encounters a personal browser already running without the managed local proxy
- **THEN** the task can keep its pages and logins and the new default takes effect at the next browser start

#### Scenario: Stopping the browser

- **WHEN** the person stops a personal browser that started with the local proxy
- **THEN** its forwarding listener closes and its saved logins remain available for the next start
