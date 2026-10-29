## ADDED Requirements

### Requirement: The inbox opens on the person's week

The inbox mini app SHALL open on the signed-in person's week board, where they tick, move, drag, delete and add tasks. A plan item SHALL still open from its own link.

#### Scenario: Opening the inbox

- **WHEN** Jo opens the inbox
- **THEN** Jo sees this week's days with their tasks, and the backlog

#### Scenario: A plan's link

- **WHEN** Jo opens a plan's link from a chat
- **THEN** the plan opens in the inbox as before

## REMOVED Requirements

### Requirement: The inbox lists what waits on the signed-in person

**Reason**: A question or approval now waits in its own chat; the daily's helpers add no items, so the list has nothing to hold.

**Migration**: Open the chat to answer it. The week board is the inbox's home.

### Requirement: A decision takes a choice or the person's own words

**Reason**: Decision cards were items of the removed list.

**Migration**: Answer in the agent's own chat.

### Requirement: Links in a decision open

**Reason**: Decision cards were items of the removed list.

**Migration**: Links in the agent's chat open as usual.

### Requirement: A morning plan card takes Go or Not today

**Reason**: The daily no longer plans its morning agents first.

**Migration**: Each routine starts at once in its own chat.

### Requirement: A working agent shows where it stands

**Reason**: Agent cards were part of the removed list.

**Migration**: Each chat has a to-do on the week board; ask the Daily chat *what's going on?*.

### Requirement: A decision's choices fit a phone

**Reason**: Decision cards were items of the removed list.

**Migration**: None needed.

### Requirement: An item opened by its own link shows its card

**Reason**: The daily no longer sends questions or approvals as items; an item opened by its link is a plan.

**Migration**: A plan's link opens the plan, as before.
