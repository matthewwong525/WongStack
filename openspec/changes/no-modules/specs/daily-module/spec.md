## MODIFIED Requirements

### Requirement: Daily works in a repo with no app

In an install with no company app, `/schedule` SHALL save each schedule as a Paseo schedule after the person's OK, when Paseo is on the computer, and SHALL say plainly what it can not do there, such as a check script or a deny list. With neither, `/schedule` SHALL say it needs an app or Paseo, save nothing, and, for a script, give the line the person can add to the computer's own timer, without editing a timer itself. *Keep my chats in line* SHALL then run from Daily's worker on its own pass, with the same limits, and SHALL be pausable by asking. Check-ins, the journal, the morning and pass add-ons, the person's own jobs, and the Needs-you chats SHALL work with no app.

#### Scenario: A weekly schedule with Paseo and no app

- **WHEN** Jo, in an install with no app and with Paseo, asks for a weekly sales summary and says OK
- **THEN** a Paseo schedule opens a chat with those instructions each week, and the chat says the computer and Paseo must stay on

#### Scenario: No app and no Paseo

- **WHEN** Jo asks for a weekly report in an install with no app and no Paseo
- **THEN** no schedule is saved, and the chat says what Daily needs to keep one

## REMOVED Requirements

### Requirement: A repo plugs into Daily through named slots

**Reason**: Daily has no profile; it calls WongStack's schedule store, person, and chat names directly, and checks for the app itself.
**Migration**: None; schedules and chats work as before.

### Requirement: Setup installs Daily from one pasted message

**Reason**: WongStack ships as one stack; no part is added, set up, or updated alone.
**Migration**: Use WongStack whole; `/wong-sync` updates every part together.

### Requirement: A chat start asks once before Daily is set up

**Reason**: WongStack ships as one stack; no part is added, set up, or updated alone.
**Migration**: Use WongStack whole; `/wong-sync` updates every part together.

### Requirement: An update keeps the repo's edits to Daily

**Reason**: WongStack ships as one stack; no part is added, set up, or updated alone.
**Migration**: Use WongStack whole; `/wong-sync` updates every part together.

### Requirement: Daily installs as one module whose hooks the project runs

**Reason**: Replaced by payload-layout's "WongStack ships as one stack", which owns the hook list for every part.
**Migration**: None.
