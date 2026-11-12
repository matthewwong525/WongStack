# access-module Specification

## Purpose
Access as one module any app can add: who signs in, roles and Admin, apps and key levels, and the Access page, reached by the project only through named slots. WongStack uses the same module it ships.

## Requirements

### Requirement: Access installs as one module

Access SHALL ship as one folder, with its own start-of-chat check, that every repo with Access holds as a real folder in its skills folder. The folder SHALL import no file outside itself, and SHALL need no other WongStack module to run. A full WongStack install SHALL get it with each update, and WongStack's own app SHALL use the same folder it ships.

#### Scenario: Access alone in an empty repo

- **WHEN** the module's install test copies the Access folder alone into an empty repo, fills only the required slots with stand-ins, and runs a chat start and Access's check
- **THEN** both pass, and no file in the folder imports a file outside it

#### Scenario: A WongStack install after its update

- **WHEN** a WongStack install takes this release with its update
- **THEN** Access is a real folder in its skills folder, and the owner, Admins, and every person keep the same apps, key levels, and roles, with no step for the owner

### Requirement: A project connects Access in one place

A project SHALL connect Access through one set of named slots that it writes outside the module folder: its sign-in, its store, and its owner are required; its apps, its keys, its sign-in list, its preview checker, and its extra key-only calls are optional. An empty optional slot SHALL turn off only its own part, and the Access page SHALL show only the parts the project has. With no apps slot, every listed person SHALL open the whole app; with no keys slot, no key level SHALL show or be checked.

#### Scenario: Access with only the required slots

- **WHEN** a project fills only its sign-in, store, and owner, and the owner opens Access
- **THEN** the page shows people and roles with no app ticks and no key levels, and a listed person opens the app while a person not listed is refused

#### Scenario: A slot that fails

- **WHEN** the keys slot throws on a request, after key levels have started
- **THEN** a call that needs a key level is refused, never let through, and the refusal names no key's value

### Requirement: Access reaches its data only through a store contract

The module SHALL read and write people, roles, apps, levels, and its change record only through one fixed list of named store operations, and SHALL ship a check that any store must pass, covering each operation and each caller's limits. Access SHALL be reported ready only when that check passes. Data that can not be read once permissions have started SHALL deny business work, never open it.

#### Scenario: A stand-in store

- **WHEN** the module's tests run against its stand-in store and against WongStack's store
- **THEN** the store check passes on both, and the same requests give the same decisions

#### Scenario: An unreadable store

- **WHEN** the store can not be read on a request after permissions have started
- **THEN** the request is refused, and nobody gains an app or a level

### Requirement: The sign-in is the project's, and the app decides the rest

Access SHALL take a caller's identity only from the project's sign-in slot, SHALL refuse a request with no caller unless the project says its app is open to anyone, and SHALL never take a person, a role, or an owner from a request's body or a header the slot did not verify. The module SHALL bring a ready sign-in for Cloudflare's sign-in wall and a sign-in-list part for it. With another sign-in, adding or removing a person SHALL change only Access's own list, and Access SHALL still refuse a signed-in person it does not list once permissions have started.

#### Scenario: The app's own login

- **WHEN** a project's own login fills the sign-in slot, and the owner adds a person
- **THEN** the person is saved in Access, no outside sign-in list changes, and the person's next signed-in request gets the apps Access gives them

#### Scenario: A forged identity

- **WHEN** a request carries an owner's email in a header or body that the sign-in slot did not verify
- **THEN** Access treats the caller as not signed in, and refuses Access's own routes

#### Scenario: Nobody signed in

- **WHEN** the sign-in slot finds no caller, before or after the owner first opens Access, and the project does not say its app is open to anyone
- **THEN** Access refuses the request

### Requirement: Keys and services come with Access

The module SHALL bring the services list, the short view of a service's calls and its record step, sending a key to the app sealed, and adding or removing a tool with no publish, each checked against the caller's key level or Access management as today. These SHALL work in a project once it names where its keys are kept and where its service records live, and SHALL be off, with one line saying what is missing, before then. The app's own helper commands that sign in, list, describe, and call actions SHALL keep working, and SHALL run in a project with no memory.

#### Scenario: Connecting a tool in WongStack

- **WHEN** the owner of a WongStack app says *connect my Stripe* after this release
- **THEN** the services list, the sealed key send, and the first look-up work as before, and no key's value appears in the chat

#### Scenario: Access alone with no keys named

- **WHEN** a person in a project with Access alone runs the services list before the project names where its keys are kept
- **THEN** it says the keys are not set up and what to fill, and nothing fails

### Requirement: Setup adds Access from one pasted message

A person SHALL be able to add Access to any repo whose app runs JavaScript on its server, by pasting one message that names the setup guide's web address into any AI tool. Setup SHALL copy the folder in as a real folder, write the project's slots outside it, add one route and one gate to the app, and connect a store in the app's own database. It SHALL ask before each step that costs money or makes something public, SHALL report Access ready only when its check passes, SHALL save its work in the repo, and SHALL ask before any push. It SHALL change nothing in a full WongStack install. In a repo with no such app, it SHALL say so and change nothing, offering WongStack's hosting setup only in an empty repo.

#### Scenario: A repo with its own app and login

- **WHEN** a person pastes the install message in a repo with a JavaScript app, its own login, and a database
- **THEN** the AI copies Access in, fills the sign-in slot from that login, adds the route, gate, and store, runs the check until it passes, saves the work in the repo, and asks before it pushes

#### Scenario: Setup in a WongStack install

- **WHEN** the setup guide is followed in a full WongStack install
- **THEN** it says Access already comes with each update, and changes nothing

### Requirement: A repo with no Access set up is asked once

When the Access folder is in a repo whose slots are missing, a new chat SHALL have the AI ask the person once whether to set Access up. It SHALL start no setup without a yes, a resumed chat SHALL stay quiet, and the chat SHALL go on.

#### Scenario: A new chat with no slots

- **WHEN** a person opens a new chat in a repo with the Access folder and no slots file, and later resumes it
- **THEN** the AI asks once whether to set Access up, starts nothing unasked, and the resumed chat does not ask again

### Requirement: Other modules use Access through their own slots

Access SHALL change no file in another module's folder, and its setup SHALL offer no step that fills or changes another module. A project MAY connect another module to Access's sign-in from the project's own files. A module SHALL work when Access is absent.

#### Scenario: Memory and Access together

- **WHEN** Access's setup runs in a repo that already has memory
- **THEN** it changes no file in memory's folder and offers no memory step, and memory's own check still passes

### Requirement: An Access-only repo updates and keeps its edits

A repo with Access alone SHALL update it with one pasted message. The update SHALL keep the repo's own edits inside the folder and leave its slots as they are. When an edit and the new version change the same lines, it SHALL stop, name each such file, and change no file.

#### Scenario: A conflicting edit

- **WHEN** a repo edited a line of the Access page that the new version also changes, and the person pastes the update message
- **THEN** no file changes, and the AI names that file
