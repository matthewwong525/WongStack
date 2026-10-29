# Spec Delta

## Purpose

Say how many private links (key links, password links, private forms, and live views) can be open at once on one computer and in one chat, and what the agent hears when a link can't open.

## ADDED Requirements

### Requirement: One link per chat, several chats at once

Each chat SHALL have its own private-link place, named by its folder. A link from one chat SHALL open while another chat's link is open, and neither SHALL close, replace, or read the other. `wait` and `close` SHALL act only on the calling chat's link, and a finished link SHALL wake only the chat that opened it.

#### Scenario: Two chats

- **WHEN** chat A has a private form open and chat B opens a key link
- **THEN** both links are open, and saving the key wakes only chat B

#### Scenario: Close is per chat

- **WHEN** chat A has a key link open and chat B runs `close` during its `/close`
- **THEN** chat A's key link stays open

### Requirement: Same-chat replacement as before

In one chat, a new key link SHALL replace that chat's earlier key link only when nobody has opened it, and the earlier link's `wait` SHALL report `closed` with `HANDOVER_REPLACED_BY=` naming that same chat. Any other open link in the same chat SHALL block the new one until it closes.

#### Scenario: Unopened key link in the same chat

- **WHEN** a chat's key link is unopened, another chat's unopened key link is also open, and the first chat opens a new key link
- **THEN** the first chat's old link closes and its new one opens, and the other chat's link stays open

### Requirement: One live view on the computer

A live view SHALL NOT open while another live view is open or starting in any chat.

#### Scenario: Second live view

- **WHEN** chat A has a live view open and chat B asks for one
- **THEN** chat B's open fails with a message that names chat A, and chat A's view stays open

#### Scenario: Two views start at once

- **WHEN** chat A is starting a live view and chat B asks for one before chat A's link is ready
- **THEN** chat B's open fails with a message that names chat A

### Requirement: A blocked open names its holder

When a link can't open, the message SHALL name the chat folder that holds the place.

#### Scenario: Same chat busy

- **WHEN** a chat with an open private form asks for a key link
- **THEN** the open fails and the message names that chat

### Requirement: Older links are left alone

A link opened by an older copy of the tool, in the shared place, SHALL keep working until it closes. A new link SHALL NOT read, close, or replace it, except that a live view SHALL still count an older live view as open. `wait` and `close` from a chat with no link of its own SHALL act on the shared place only when its live link's state names that chat by folder or session; they SHALL NOT touch another chat's older link.

#### Scenario: Older form open

- **WHEN** an older chat's form holds the shared place and a new chat opens a key link
- **THEN** the key link opens and the older form stays open

#### Scenario: A chat closes its own older link

- **WHEN** the shared place holds a live link whose state names chat A, and chat A runs `wait` or `close`
- **THEN** `wait` reports that link's result, and `close` closes it and reports `closed`

#### Scenario: Another chat's older link

- **WHEN** the shared place holds a live link whose state names chat A, and chat B, with no link of its own, runs `wait` or `close`
- **THEN** chat B hears that no private link is open, and chat A's link stays open
