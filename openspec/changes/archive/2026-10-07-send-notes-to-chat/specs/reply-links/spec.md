# Spec Delta

## Purpose

Lets a page the assistant made send the person's answers straight to the chat that made it, through a link that closes itself, so nothing has to be copied and pasted.

## ADDED Requirements

### Requirement: A page sends its answers to the chat that made it

A page opened through a reply link SHALL be able to send text the person chose to send to the chat that opened the link, and to no other chat, including when that chat is idle. The message SHALL begin with a line fixed when the link was opened, never one the page supplies. The page SHALL be told whether the chat received it, and SHALL never be told it was sent when that is unconfirmed.

#### Scenario: The person submits

- **WHEN** the person taps the page's send control on an open reply link
- **THEN** the chat that opened the link receives the fixed line and the text, and starts on it without another message from the person

#### Scenario: The chat can not be reached

- **WHEN** the chat that opened the link is closed or the send is unconfirmed
- **THEN** the page is told the send failed, and nothing is reported as sent

### Requirement: A reply link closes itself and holds a secret

A reply link SHALL open at an address through Cloudflare's tunnel and SHALL be given to the person only once it answers from outside the computer. Sending SHALL need a secret that only the link carries and that is never sent as part of an address. A link SHALL stop accepting sends at its time limit or when closed, even if the assistant's session has ended, and a send SHALL be bounded in size and rate.

#### Scenario: The time limit passes

- **WHEN** a reply link's time limit has passed and the person taps send
- **THEN** nothing reaches the chat and the page is told the link has closed

#### Scenario: A send without the secret

- **WHEN** a request to send arrives without the link's secret
- **THEN** it is refused and nothing reaches the chat

### Requirement: Reply links and private links stay apart

An open reply link SHALL never stop a key link, a password link, or a private form from opening, nor the reverse, and several pages MAY hold reply links at once. A reply link SHALL never be used to collect a secret, and nothing in this capability SHALL let a private link's page content reach the chat.

#### Scenario: A key is needed during a review

- **WHEN** a plan's reply link is open and the assistant needs a key
- **THEN** the key link opens at once, and the plan's link keeps working

### Requirement: No reply link where no chat can be woken

When the host gives no way to wake the chat, or the tunnel tool is missing, or the tunnel does not come up, opening a reply link SHALL end quickly with no link and no request to install anything, so the caller can fall back to its file.

#### Scenario: A host with no way to wake a chat

- **WHEN** a plan is made on a host that can not be sent a message
- **THEN** no link is opened and the plan's file is offered as before
