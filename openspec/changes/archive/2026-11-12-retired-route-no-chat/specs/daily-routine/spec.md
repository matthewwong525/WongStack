## MODIFIED Requirements

### Requirement: Two failures in a row open one Needs-you chat

When the daily's helper fails the same way two times in a row, at starting the person's morning, at one of their jobs, or at reaching Paseo, it SHALL open one new chat named `Needs you: <what broke>`. Its first message SHALL say what failed, the reason, and the steps to fix it; when the person's daily guide gives its own fix, the chat SHALL follow that. The helper SHALL open at most one such chat for each kind of problem each local day, and a success SHALL start the count again. The watch SHALL not watch that chat and no check-in SHALL judge its stops, so it waits for the person. When Paseo can not open the chat, the journal SHALL say so with the reason. A `retired` answer from the server SHALL not count as a failure: the journal SHALL say once a local day that this computer runs older code and updates itself, and no chat SHALL open.

#### Scenario: The morning fails all day

- **WHEN** Jo's morning add-on fails at 08:00, at 08:01 and at each pass after
- **THEN** the journal has one line at 08:00, one chat *Needs you: your morning start* opens at 08:01 with the steps to fix it, and no second chat opens that day

#### Scenario: Paseo can not open the chat

- **WHEN** the morning fails two times in a row and Paseo refuses to open a chat
- **THEN** the journal says the chat did not open, with Paseo's reason, and the helper goes on

#### Scenario: The server retired a part before the computer updated

- **WHEN** the server answers `404: retired` at each pass, because Jo's computer still runs code from before the part was retired
- **THEN** the journal has one line that day saying the computer runs older code and updates itself, no *Needs you* chat opens, and a real failure later still counts
