# browser-module Specification

## Purpose
The browser module lets any repo add the agent's own browser, its private links, and Shop alone, by one pasted message, and keep them current without losing its own edits.

## Requirements

### Requirement: The module asks nothing at chat start

The module SHALL add no chat-start question and no hook. The browser and the tools a private link needs SHALL install the first time a task needs them, after the person's yes.

#### Scenario: A chat that never browses

- **WHEN** a chat starts in a repo with the module and never uses the browser
- **THEN** the module says nothing and installs nothing

### Requirement: WongStack keeps its browser behavior and paths

In a full WongStack install, every browser, live view, key link, saved details, password manager, Shop, and connect behavior SHALL stay as it was. The private-link and Shop skills SHALL move inside the browser skill's folder, and every WongStack part that calls them SHALL follow. Reply links and the live-line helper SHALL keep working outside the module. An update SHALL move an install to the new folder with no step by the person, and SHALL leave no old private-link or Shop folder behind.

#### Scenario: An install updates

- **WHEN** a WongStack install syncs to the release that puts the module in one folder
- **THEN** each chat opens the browser, a key link, a live view, and Shop as before, review pages and inbox taps still reach the chat, and the old `hand-over` and `shop` skill folders are gone
