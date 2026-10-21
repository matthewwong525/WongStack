## ADDED Requirements

### Requirement: Picking up work new to this computer is reviewed first

Before `/continue` switches the working tree to a saved branch, it SHALL list the branch's commits that no local branch and not the published default branch already hold. When there are any, it SHALL switch nothing and run nothing from the branch. Instead it SHALL show the files those commits change, code before plans and wiki pages, and ask the person. A commit's author SHALL NOT count as evidence that the work is the person's own. On a yes, it SHALL switch only to the exact commit shown, and SHALL show the new part and ask again when the branch moved since. After a switch that needed a review, it SHALL recap and ask before building, and SHALL NOT start `/apply` or the local checks in the same turn, even when the `/continue` call carried an instruction.

#### Scenario: A teammate's branch edits a library every hook imports

- **WHEN** the owner runs `/continue` on a teammate's saved branch whose only change appends code to `.agents/skills/memory/scripts/lib/cli.mjs`
- **THEN** the working tree stays on its current branch, the reply lists that file as code and asks whether to switch, and running every hook command from `.agents/settings.json` and `.agents/hooks.json` leaves no trace of the branch's code

#### Scenario: The owner's own branch picks up as before

- **WHEN** `/continue` names a branch whose commits all sit on a local branch or the published default branch
- **THEN** it switches with no ask and goes on to `/apply` as today

#### Scenario: A faked author email is still asked about

- **WHEN** a branch new to this computer carries commits whose author email is the owner's
- **THEN** `/continue` still lists its files and asks before switching

#### Scenario: The branch moves after the review

- **WHEN** the person says yes to the commit they were shown, and the branch has a newer commit by the time the switch runs
- **THEN** nothing switches, and the reply shows the newer commits and asks again

#### Scenario: A reviewed switch stops before building

- **WHEN** the person says yes and the switch lands on the reviewed commit
- **THEN** the reply recaps the change and asks whether to build it, and no install, test, or `/apply` has run

#### Scenario: A teammate's branch named like the main one is still asked about

- **WHEN** the remote publishes `master` and a teammate saves a branch named `main`
- **THEN** `/continue` on `main`, or on a branch built on it, lists `main`'s commits and files and asks before switching

#### Scenario: The yes says what switching runs

- **WHEN** `/continue` asks whether to switch to work new to this computer
- **THEN** the switch option says the change's code then runs on this computer, with the person's keys
