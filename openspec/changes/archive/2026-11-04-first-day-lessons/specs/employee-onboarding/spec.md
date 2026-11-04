## MODIFIED Requirements

### Requirement: Setup ends with memory and project updates working

Setup SHALL leave the person's copy with memory, plain git and the project's own company tools working through the same sign-in, with no option to pass. Its final report SHALL say in plain words who is signed in, which apps work, and that memory and updates work. When this run put the project on the computer for the first time, the report SHALL then name the first lesson as the person's next step: open a new chat in the project's folder and ask for Lesson 1. Any other run that finishes SHALL say that nothing else is needed. The report SHALL name the lesson, or say *nothing else is needed*, only after the copy's own tools find the saved sign-in. When setup reused a sign-in this computer already held, the report SHALL say so and name its email. The report SHALL NOT tell the assistant to run a further command, and SHALL NOT mention an environment file or a key.

#### Scenario: A teammate finishes setup

- **WHEN** a teammate with Project code finishes setup in an empty folder
- **THEN** the report says memory loads in their next chat, a new worktree starts from the newest version, and their next step is to open a new chat in the project's folder and ask for Lesson 1

#### Scenario: An update or an apps-only connection

- **WHEN** setup updates a copy already on the computer, or connects a person's apps with no project
- **THEN** the report names no lesson and says nothing else is needed

#### Scenario: The project's tools right after setup

- **WHEN** setup has downloaded the project and the person runs the project's own status, list or call command in it with no extra option
- **THEN** the command uses the sign-in setup saved

#### Scenario: A computer already signed in

- **WHEN** setup runs on a computer that already holds a valid sign-in to the business
- **THEN** no sign-in link is shown, and the report says it used this computer's existing sign-in and names its email
