## MODIFIED Requirements

### Requirement: Browsing tasks share the personal browser

Two browsing tasks, or a task and a scheduled run, SHALL each use their own tab in one window of the one personal browser and the same sign-ins, without waiting on each other and without one closing the other's tabs. A new task SHALL NOT open a second window. While the person's turn is open in one task's tab, no other task SHALL switch the window to another tab. Preview checks SHALL NOT use the personal browser or its sign-ins.

While the person's turn is open in another task's tab, a task's click SHALL act in its own tab without showing it: on a target the keyboard can reach and press (a link, a button, a form's send button, a tick box, a choice, a page section's summary, or an element the page marks as a button, link, tab, menu item, tick box, switch, or choice), it SHALL press that target's key at once and report done, and the person's tab SHALL stay shown. Any other target SHALL wait until the turn ends, then be clicked: the task SHALL learn at once that the click waits and SHALL be able to learn when it ran and how; no other step on that task's tab SHALL run before it. With no turn open, a click SHALL work as before.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run starts while a chat is browsing
- **THEN** both carry on, each in its own tab of the same window, and neither reports the browser busy

#### Scenario: Another chat browses during the person's turn

- **WHEN** a chat browses while the person signs in on another chat's tab
- **THEN** the second chat works in its own tab, and the person's tab stays the one shown

#### Scenario: Another chat clicks a button during the person's turn

- **WHEN** a chat clicks a button or a link in its own tab while the person signs in on another chat's tab
- **THEN** the button or link acts at once, the chat hears it is done, and the person's tab stays the one shown

#### Scenario: Another chat clicks a mouse-only target during the person's turn

- **WHEN** a chat clicks an element that reacts to no key while the person's turn is open in another chat's tab
- **THEN** the chat hears at once that the click waits, its other steps on that tab are refused until the click runs, the click runs when the person's turn ends, and the chat can learn that it ran

#### Scenario: A preview check

- **WHEN** `/verify` walks a preview
- **THEN** it uses its own temporary browser with none of the person's sign-ins
