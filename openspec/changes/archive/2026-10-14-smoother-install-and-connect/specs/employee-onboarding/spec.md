## MODIFIED Requirements

### Requirement: Setup ends with memory and project updates working

Setup SHALL leave the person's copy with memory, plain git and the project's own company tools working through the same sign-in, with no option to pass. Its final report SHALL say in plain words who is signed in, which apps work, that memory and updates work, and that nothing else is needed, and SHALL say *nothing else is needed* only after the copy's own tools find the saved sign-in. When setup reused a sign-in this computer already held, the report SHALL say so and name its email. The report SHALL NOT tell the assistant to run a further command, and SHALL NOT mention an environment file or a key.

#### Scenario: A teammate finishes setup

- **WHEN** a teammate with Project code finishes setup in an empty folder
- **THEN** the report says they are done, memory loads in their next chat, and a new worktree starts from the newest version

#### Scenario: The project's tools right after setup

- **WHEN** setup has downloaded the project and the person runs the project's own status, list or call command in it with no extra option
- **THEN** the command uses the sign-in setup saved

#### Scenario: A computer already signed in

- **WHEN** setup runs on a computer that already holds a valid sign-in to the business
- **THEN** no sign-in link is shown, and the report says it used this computer's existing sign-in and names its email
