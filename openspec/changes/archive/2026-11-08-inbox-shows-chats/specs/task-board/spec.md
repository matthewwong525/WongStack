## REMOVED Requirements

### Requirement: The board keeps each person's tasks by week

**Reason**: The week board is deleted; the inbox lists the person's chats instead.
**Migration**: An undone task becomes a reminder (a one-time schedule) when the person asks; the rest is deleted.

### Requirement: A skill adds a task one time by its key

**Reason**: No skill writes tasks; a chat's row comes from the chat itself.
**Migration**: See `inbox`: *The inbox opens on the person's chats*.

### Requirement: An update keeps the board's tasks

**Reason**: The board's tables are dropped. An install whose own code uses a table of the same name keeps it.
**Migration**: The update lists the undone tasks before the drop.

### Requirement: An agent cleans up the board when the owner asks

**Reason**: There is no board to clean up.
**Migration**: None.
