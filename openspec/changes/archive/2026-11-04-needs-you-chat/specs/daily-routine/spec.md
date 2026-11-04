## MODIFIED Requirements

### Requirement: What the background did is kept in a journal

What the daily's helper and the check-ins do SHALL go to a private journal on that computer, outside git, kept 14 days, one line for each thing: a check-in, a background run's start and end, a routine started, a closed chat, a source it could not read. The helper SHALL send no other chat a message about it. When the person's board can not be read, the journal SHALL say so one time for each run of failures, not one time each minute.

#### Scenario: The board can not be read

- **WHEN** the helper can not read the board one time, and the next read works
- **THEN** the journal has one line saying so, and no chat opens or gets a message about it

## ADDED Requirements

### Requirement: A problem that needs the person opens one chat

When the daily's helper fails the same way two times in a row, at reading the person's board, at starting their morning, at one of their jobs, or at reaching Paseo, it SHALL open one new chat named `Needs you: <what broke>`. Its first message SHALL say what failed, the reason, and the steps to fix it; when the person's daily guide gives its own fix, the chat SHALL follow that. The helper SHALL open at most one such chat for each kind of problem each local day, and a success SHALL start the count again. The watch SHALL not watch that chat and no check-in SHALL judge its stops, so it waits for the person. When Paseo can not open the chat, the journal SHALL say so with the reason.

#### Scenario: The board stays unread

- **WHEN** the board's sign-in ends at 14:00 and the helper can not read the board at 14:00, 14:01 and all afternoon
- **THEN** the journal has one line at 14:00, one chat *Needs you: the week board* opens at 14:01 with the sign-in steps, and no second chat opens that day

#### Scenario: Paseo can not open the chat

- **WHEN** the morning fails two times in a row and Paseo refuses to open a chat
- **THEN** the journal says the chat did not open, with Paseo's reason, and the helper goes on
