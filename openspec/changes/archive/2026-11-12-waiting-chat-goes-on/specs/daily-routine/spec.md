# daily-routine

## MODIFIED Requirements

### Requirement: Watched chats stay in line with each other

The daily SHALL work toward one goal for the person's watched chats in one project, in any app that runs Claude Code or Codex, with or without Paseo: no two do the same work or work against each other, each gets as far as the context across all of them allows, a chat waiting on another chat's work, or on the person's answer in another chat, hears when that wait is over and, when it waited in the middle of a command the person typed, is told to go on with that command, and the person's recent choices weigh most. It SHALL read new messages a few minutes after a watched chat has them, and SHALL send notes to the chats that news affects, judging what to say, to whom, and when. A chat in Paseo SHALL get each note through Paseo at once: after its current step when it works, or as a new turn when it is idle. Any other chat, and a chat whose note Paseo fails to send, SHALL get it at its next stop or with the person's next message, and the note is never lost or sent twice. A note never stops a step in the middle. These limits SHALL hold whatever it judges: a risky step waits for the person; no chat closes without the person's pick; an agent's words never count as the person's approval, though a command the person typed is their approval for that command's own steps and no other; a note counts toward the 5 own actions in a row; and each note writes one journal line. This job SHALL be one of the person's schedules, which they can pause, run now or change like any other; turning check-ins off SHALL stop it too.

#### Scenario: A choice in one chat changes another chat's work

- **WHEN** Jo says "use Stripe, not PayPal" in chat A at 10:00, and chat B is building a PayPal checkout
- **THEN** chat B gets a note naming chat A and the Stripe choice, keeps the work it did, and the journal has one line for it

#### Scenario: A blocker is gone

- **WHEN** chat B stopped to wait for chat A's sign-in change to go live, and chat A's change goes live while Jo is away
- **THEN** chat B gets a note that the change is live, from chat A, and goes on with its work

#### Scenario: Two chats on the same work

- **WHEN** chats A and B both start adding the same export button
- **THEN** only one chat goes on with the button, the other is told which chat has it, and neither stops a step in the middle

#### Scenario: Urgent news for an idle chat in Paseo

- **WHEN** chat B waits idle in Paseo, and chat A drops the export button chat B is about to rebuild
- **THEN** chat B wakes with a note naming chat A, without Jo writing to it, and the journal has one line for it

#### Scenario: A chat outside Paseo

- **WHEN** Jo works in chat A in Paseo and in chat B in a plain terminal, and chat B is building the export button chat A already has
- **THEN** chat B gets the note at its next stop, or with Jo's next message if it is idle, and the journal has one line for it

#### Scenario: A wait ends in the middle of a typed command

- **WHEN** Jo types `/ship` in chat B, chat B stops to wait for chat A's change to be merged, and chat A's change is merged while Jo is away
- **THEN** chat B gets a note that names chat A and the merge and tells it to go on with Jo's `/ship`, and chat B goes on and publishes without Jo writing to it

#### Scenario: A typed command allows only its own steps

- **WHEN** chat B goes on with Jo's `/ship` after a wait, and a step outside `/ship`, such as merging another chat's work, would help
- **THEN** chat B does not take that step, and it waits for Jo

#### Scenario: A wait with no typed command

- **WHEN** chat B waits for chat A's answer while it explores, with no command Jo typed in progress, and chat A answers
- **THEN** chat B gets a note with the answer only, and the note does not tell it to go on with a command
