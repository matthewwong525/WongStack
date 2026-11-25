# access-module Specification

## Purpose
Access as one module any app can add: who signs in, roles and Admin, apps and key levels, and the Access page, reached by the project only through named slots. WongStack uses the same module it ships.

## Requirements

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
