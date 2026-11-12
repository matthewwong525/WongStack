## MODIFIED Requirements

### Requirement: An invoked verb serves work that changes no repo file

When the person invokes `/explore`, `/plan`, or `/apply` for work that changes no repo file, the verb SHALL run in its non-code form and SHALL NOT create an OpenSpec change, branch, commit, or review page. The work, not a setting, SHALL decide the form. `/ship` SHALL act only on repo changes.

#### Scenario: Plan an errand

- **WHEN** the person invokes `/plan` to compare suppliers and email the chosen one
- **THEN** the agent writes a numbered to-do in the conversation that marks the sending step as outward

#### Scenario: Ship an errand

- **WHEN** the person invokes `/ship` after an errand
- **THEN** `/ship` says the work finishes in `/apply` and makes no git change

### Requirement: Picking up work new to this computer is reviewed first

Before `/apply` switches the working tree to a saved branch, it SHALL list the branch's commits that no local branch and not the published default branch already hold. When there are any, it SHALL switch nothing and run nothing from the branch. Instead it SHALL show the files those commits change, code before plans and wiki pages, and ask the person. A commit's author SHALL NOT count as evidence that the work is the person's own. On a yes, it SHALL switch only to the exact commit shown, and SHALL show the new part and ask again when the branch moved since. After a switch that needed a review, it SHALL recap and ask before building, and SHALL NOT build or run the local checks in the same turn, even when the `/apply` call carried an instruction.

#### Scenario: A teammate's branch edits a library every hook imports

- **WHEN** the owner runs `/apply` on a teammate's saved change whose only change appends code to `.agents/skills/memory/scripts/lib/cli.mjs`
- **THEN** the working tree stays on its current branch, the reply lists that file as code and asks whether to switch, and running every hook command from `.agents/settings.json` and `.agents/hooks.json` leaves no trace of the branch's code

#### Scenario: The owner's own branch picks up as before

- **WHEN** `/apply` names a change whose branch's commits all sit on a local branch or the published default branch
- **THEN** it switches with no ask and goes on to build

#### Scenario: A faked author email is still asked about

- **WHEN** a branch new to this computer carries commits whose author email is the owner's
- **THEN** `/apply` still lists its files and asks before switching

#### Scenario: The branch moves after the review

- **WHEN** the person says yes to the commit they were shown, and the branch has a newer commit by the time the switch runs
- **THEN** nothing switches, and the reply shows the newer commits and asks again

#### Scenario: A reviewed switch stops before building

- **WHEN** the person says yes and the switch lands on the reviewed commit
- **THEN** the reply recaps the change and asks whether to build it, and no install, test, or build has run

#### Scenario: A teammate's branch named like the main one is still asked about

- **WHEN** the remote publishes `master` and a teammate saves a branch named `main`
- **THEN** `/apply` on a change saved on `main`, or on a branch built on it, lists `main`'s commits and files and asks before switching

#### Scenario: The yes says what switching runs

- **WHEN** `/apply` asks whether to switch to work new to this computer
- **THEN** the switch option says the change's code then runs on this computer, with the person's keys

### Requirement: A chat's name changes only when a step starts or a command is typed

A chat SHALL NOT get a step word in its name until a step starts its work or the person types a skill command. A chat whose messages start no step and type no command, such as a question or an errand, SHALL keep the name it has. A typed `/explore`, `/plan`, or `/improve-code` SHALL show its step at once; a typed `/apply` or `/ship` SHALL wait for the step that starts. Any other typed command of a repo skill SHALL show the skill's name in capitals at once. A command that a step runs for the person SHALL NOT change the name. A name the host gave the chat before its first step name, copied from a message or not, SHALL give way to the task words a step gives. A name the person gives the chat after it has a step name SHALL keep its words, where the host lets the chat read its name; only the step word changes.

#### Scenario: A question starts no step

- **WHEN** a chat's first message is a question with no command, and the chat answers it without starting a step
- **THEN** the chat's name has no step word

#### Scenario: A typed command names the chat at once

- **WHEN** the person types `/verify the invoice page` in a chat
- **THEN** the chat's name becomes `VERIFY: The invoice page` before the reply, in Paseo and in Claude Code without Paseo

#### Scenario: A plan's title replaces a copied name

- **WHEN** Paseo names a chat with the first characters of its first message, and the chat then plans a change titled `Fix the invoice total`
- **THEN** the chat's name becomes `PLAN: Fix the invoice total`

#### Scenario: A name the person gave stays

- **WHEN** a Paseo chat named `PLAN: Fix the invoice total` is renamed by the person to `Invoice fixes`, and the build then starts
- **THEN** the chat's name becomes `APPLY: Invoice fixes`

## REMOVED Requirements

### Requirement: Non-code progress is kept as a thread
**Reason**: The loop no longer reads or writes memory. Memory's own spec already makes its plugin the one writer of a chat's facts, open threads included, and its start-of-chat note lists them.
**Migration**: Say *pick up <the errand>* in a new chat; memory, when installed, brings the thread. The *Ship an errand* scenario moves to "An invoked verb serves work that changes no repo file".
