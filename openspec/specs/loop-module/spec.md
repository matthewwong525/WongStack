# loop-module Specification

## Purpose
TBD - created by archiving change loop-module. Update Purpose after archive.

## Requirements

### Requirement: A project adds the build loop from one pasted message

A project with no WongStack SHALL be able to add `/explore`, `/plan`, `/apply`, `/save`, `/ship`, `/verify`, `/continue`, and `/close` by pasting one message into any AI tool. The message names the module's setup guide by its GitHub address. Setup copies the module's skill folders in as real folders, fills each missing part, asks before each step that costs money or makes something public, ends with the module's check, and asks before any push. In a WongStack project, setup SHALL stop and change nothing.

#### Scenario: A project with no OpenSpec adds the loop

- **WHEN** a person pastes the install message in a project with no WongStack and no OpenSpec
- **THEN** the project gets all eight commands under their own names, OpenSpec is installed after a yes, and a sample plan page opens

#### Scenario: A WongStack project pastes the message

- **WHEN** the install message runs in a WongStack project
- **THEN** setup stops and changes no file

### Requirement: Each step does its job with every slot empty

The module SHALL reach outside its folders only through named slots that the project fills, and SHALL import no file outside its folders. With a slot empty, only that slot's part turns off. A plan is still written and its review page still builds, a build still runs the project's tests, and a save still commits.

#### Scenario: A plan in a project with nothing else

- **WHEN** `/plan` runs in a project that has the module and OpenSpec, and no profile
- **THEN** the plan is written, its review page opens as a file on this computer, and the chat says to reply there with OK or notes

#### Scenario: The loop in WongStack

- **WHEN** any of the eight commands runs in a WongStack project
- **THEN** chat names, the other-work check, the private review link and its buttons, company git, Cloudflare previews, the staging walk, and release numbers work as before the move

### Requirement: A project saves and publishes with or without GitHub

`/save` SHALL open or update a pull request and wait for its checks when the project is on GitHub, and SHALL make a commit on the change's branch when it is not. `/ship` SHALL merge only when the gate passes: the checks pass, or the project has no checks and the person asked to ship. With no GitHub, `/ship` SHALL merge into the main branch locally after the project's tests pass. It SHALL never push without a yes.

#### Scenario: A project on GitHub with no checks

- **WHEN** a person ships a change in a project on GitHub with no checks set up
- **THEN** the pull request is merged, because asking to ship is the approval

#### Scenario: A project with no remote

- **WHEN** a person saves and then ships a change in a project with no remote
- **THEN** the change is committed on its branch, merged into the main branch after the tests pass, and nothing is pushed

### Requirement: An update keeps the project's edits

A project with only the loop SHALL update by pasting the module's update message. The update SHALL keep the project's own edits to the module's folders and never touch its profile. When an edit and the update change the same lines, it SHALL change nothing and name each file. A WongStack project SHALL get the module with each WongStack update.

#### Scenario: An edited project updates

- **WHEN** a project that edited `/plan`'s steps pastes the update message, and the update touches other lines
- **THEN** the new version is in and the project's edit is still there

#### Scenario: An edit clashes

- **WHEN** the update and a project edit change the same lines
- **THEN** no file changes and each clashing file is named
