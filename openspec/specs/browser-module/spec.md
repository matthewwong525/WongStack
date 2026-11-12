# browser-module Specification

## Purpose
The browser module lets any repo add the agent's own browser, its private links, and Shop alone, by one pasted message, and keep them current without losing its own edits.

## Requirements

### Requirement: A repo adds the browser module by one pasted message

The module's README SHALL lead with a one-line install message that names its setup guide by its GitHub address. Following the guide in a repo with nothing installed SHALL add the browser, the private links, and Shop as real folders in the repo's skills folder, run the module's check, and commit, asking before any step that costs money or makes something public and before any push. In a full WongStack install the guide SHALL stop and change nothing.

#### Scenario: An empty repo adds the module

- **WHEN** a person pastes the install message in a repo with no WongStack parts
- **THEN** the browser, private-link, and Shop skills are present as real folders, the module's check passes, and the work is committed, with no push before the person's yes

#### Scenario: A WongStack install pastes the message

- **WHEN** the repo is a full WongStack install
- **THEN** the guide stops, says the module comes with each update, and changes nothing

### Requirement: The module runs with no other part of WongStack

The module SHALL import no file outside its own folders, and SHALL work in a repo that has no memory, no plan step, no app, and no schedules. It SHALL reach the repo only through named slots in the repo's own profile, and each empty slot SHALL turn off only its own extra: the private pages use a plain look, the person says *done* in the chat instead of the chat waking, a private link shows only in the chat, a key goes only to the repo's git-ignored `.env`, and a tool's key stays on the computer.

#### Scenario: The module installed alone

- **WHEN** the module is copied into an empty repo with no profile
- **THEN** its scripts load, its check passes, and no script imports a file outside the module's folders

#### Scenario: A key link with no key-file slot

- **WHEN** the person sends a key through a key link in a repo whose profile names no key files
- **THEN** the key goes to the repo's `.env` only when that file is git-ignored, and the link refuses otherwise

### Requirement: The module asks nothing at chat start

The module SHALL add no chat-start question and no hook. The browser and the tools a private link needs SHALL install the first time a task needs them, after the person's yes.

#### Scenario: A chat that never browses

- **WHEN** a chat starts in a repo with the module and never uses the browser
- **THEN** the module says nothing and installs nothing

### Requirement: WongStack keeps its browser behavior and paths

In a full WongStack install, every browser, live view, key link, saved details, password manager, Shop, and connect behavior SHALL stay as it was, at the same skill paths. Reply links and the live-line helper SHALL keep working outside the module, and an update SHALL move a running helper to its new place with no step by the person.

#### Scenario: An install updates

- **WHEN** a WongStack install syncs to the release that adds the module
- **THEN** each chat finds the browser, private-link, and Shop commands at their old paths, and review pages and inbox taps still reach the chat

### Requirement: An update keeps the repo's own edits

The module SHALL carry one version for all its folders, raised by each change to any of them. Its update SHALL three-way merge the folders from the repo's recorded version, keep the repo's own edits, and change nothing when an edit and an update touch the same lines, naming each such file. The repo's profile SHALL sit outside the module's folders, so an update never touches it.

#### Scenario: An update meets a clashing edit

- **WHEN** the repo edited a module file on lines the update also changes
- **THEN** the update writes nothing and names the file
