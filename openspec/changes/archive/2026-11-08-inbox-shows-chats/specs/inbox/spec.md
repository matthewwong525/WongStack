## ADDED Requirements

### Requirement: The inbox opens on the person's chats

The inbox SHALL open on a list of the signed-in person's open chats, one row each, with the chat's name, its current step and its folder, and only that person's chats. A chat with a review page waiting on the person SHALL sit on top under *Needs you*, and a tap SHALL open that page. A waiting review page whose chat the app does not know SHALL also show under *Needs you*, as its own row. A row SHALL leave the list when its chat closes, and SHALL show the step the chat is on now, not the step it had when it opened. The inbox SHALL show no days, dates, tasks or backlog. A plan item SHALL still open from its own link.

#### Scenario: Opening the inbox

- **WHEN** Jo has three open chats, one of them waiting on Jo's review of its plan
- **THEN** Jo sees that chat under *Needs you* with its step and folder, the other two under it, and no days or tasks, and a tap on the first opens its plan

#### Scenario: A chat moves to the next step

- **WHEN** a chat Jo sees under *Plan* moves to *Apply*
- **THEN** its row shows *Apply* the next time the inbox reads the list, and no second row appears

### Requirement: The person closes a chat from its row

A chat's row SHALL offer *Close chat*. It SHALL send that chat `/close` once the person has been quiet in it for 15 minutes, and SHALL never close a chat the person did not pick.

#### Scenario: Close a finished chat

- **WHEN** Jo taps *Close chat* on a chat Jo last wrote in an hour ago
- **THEN** that chat gets `/close` once, and its row leaves the list when the chat has closed

### Requirement: The inbox keeps past review pages in an Archive

Below the chats, the inbox SHALL show every signed-in person an Archive of their own answered or closed review pages, newest first, whether or not they use the daily. A search SHALL find pages by their title, waiting or archived. The Archive SHALL show no other person's pages, and no question, approval, private link or hidden item.

#### Scenario: Looking back at a past plan

- **WHEN** Jo, who never set up the daily, opens the inbox and searches *profit*
- **THEN** Jo sees each version of the profit plan they reviewed, newest first, and no one else's pages

#### Scenario: A page that ran out of time

- **WHEN** a review page's 24 hours pass with no answer
- **THEN** its chat leaves *Needs you*, and the page shows in the Archive with no answer

### Requirement: The inbox's Schedules button lists the person's schedules

The inbox SHALL have a *Schedules* button in its top bar that opens the signed-in person's own schedules, and only theirs. Each SHALL show what it does, when it runs next, and how its last run went, and SHALL offer Pause, Resume, Run now, and Cancel for a run that waits. A schedule SHALL open to its ten newest runs and its instructions, which the view SHALL show and never change. A schedule that waits for the person's OK SHALL say so and name the computer. A schedule that runs on another host SHALL show as running there, with no buttons. Making or changing a schedule SHALL stay in a chat.

#### Scenario: A teammate

- **WHEN** Kim, a teammate, opens the Inbox and taps *Schedules*
- **THEN** Kim sees Kim's own schedules, and none of the owner's

#### Scenario: A schedule that needs an OK

- **WHEN** a schedule was changed in a chat on another computer
- **THEN** Schedules shows it as waiting for Jo's OK on that computer, offers no Run now, and has no button that approves it

## MODIFIED Requirements

### Requirement: A plan fills the screen

A plan opened in the inbox SHALL fill the screen below the app's bar, edge to edge and down to the bottom, with no border or corners of its own, and the page around it SHALL NOT scroll. The plan's own bar SHALL sit on the screen's bottom edge, and its notes and full-screen drawings SHALL work as on the page opened on its own. The app's bar SHALL stay at the top while the person reads, never hiding or sliding back, and the plan SHALL keep its size as they scroll. *Back* and the plan's workspace SHALL sit at the top of the plan's own page and scroll away with it. A plan whose page has no *Back* of its own SHALL show *Back* pinned above it.

#### Scenario: Opening a plan

- **WHEN** the person opens a plan from the inbox on a phone or a wide screen
- **THEN** the plan spans the window's full width and reaches its bottom, its *Send notes* bar sits on the bottom edge, and only the plan scrolls

#### Scenario: A tap waiting

- **WHEN** a plan shows the line about a sent tap above it
- **THEN** the plan still reaches the bottom of the screen without the page scrolling

#### Scenario: Reading down a plan

- **WHEN** the person scrolls down a plan on a phone, then scrolls back up partway
- **THEN** the app's bar stays at the top the whole time, *Back* and the workspace scroll up and away with the plan's words, and the plan never moves or changes size on its own

#### Scenario: Back at the top

- **WHEN** the person scrolls a plan back to its top and taps *Back*
- **THEN** *Back* and the workspace show above the plan's title, and the tap opens the chat list

## REMOVED Requirements

### Requirement: The inbox opens on the person's week

**Reason**: The week board is deleted; the inbox opens on the person's chats.
**Migration**: See *The inbox opens on the person's chats*.

### Requirement: The inbox lists the person's review pages

**Reason**: Waiting pages show on their chat's row; answered ones move to the Archive below the chats.
**Migration**: See *The inbox opens on the person's chats* and *The inbox keeps past review pages in an Archive*.

### Requirement: The inbox lists the person's schedules

**Reason**: Schedules move behind one top-bar button, and its teammate scenario named the board.
**Migration**: See *The inbox's Schedules button lists the person's schedules*.
