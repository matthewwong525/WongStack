# reply-links Specification

## Purpose
Lets a page the assistant made send the person's answers straight to the chat that made it, through a link that closes itself, so nothing has to be copied and pasted.

## Requirements

### Requirement: A page sends its answers to the chat that made it

A page opened through a reply link SHALL be able to send text the person chose to send to the chat that opened the link, and to no other chat, including when that chat is idle. The message SHALL begin with a line fixed when the link was opened, never one the page supplies. The page SHALL be told whether the chat received it, and SHALL never be told it was sent when that is unconfirmed.

#### Scenario: The person submits

- **WHEN** the person taps the page's send control on an open reply link
- **THEN** the chat that opened the link receives the fixed line and the text, and starts on it without another message from the person

#### Scenario: The chat can not be reached

- **WHEN** the chat that opened the link is closed or the send is unconfirmed
- **THEN** the page is told the send failed, and nothing is reported as sent

### Requirement: A reply link closes itself and holds a secret

A reply link SHALL open either in the person's inbox, reached only through their company sign-in, or at an address through Cloudflare's tunnel, and SHALL be given to the person only once it answers from outside the computer. Through the tunnel, sending SHALL need a secret that only the link carries and that is never sent as part of an address. A link SHALL stop accepting sends at its time limit or when closed, even if the assistant's session has ended, and a send SHALL be bounded in size and rate.

#### Scenario: The time limit passes

- **WHEN** a reply link's time limit has passed and the person taps send
- **THEN** nothing reaches the chat and the page is told the link has closed

#### Scenario: A send without the secret

- **WHEN** a request to send arrives through the tunnel without the link's secret
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

### Requirement: A page can offer fixed actions

A reply link's opener MAY name actions, each with the message it sends. A page on that link SHALL be able to trigger an action by name only, with the link's secret, and the chat that opened the link SHALL receive that action's fixed message exactly as the opener wrote it, followed by any optional bounded reviewer text supplied with the action. The page SHALL never replace that fixed instruction or chat target; invalid or oversized text SHALL be refused before the action is delivered. An action SHALL be refused when the page's file has changed since the page read it, and SHALL be accepted at most once per version of the file. The page SHALL be told which actions the link offers and whether a trigger reached the chat.

#### Scenario: The person taps an action

- **WHEN** the person triggers a named action on an open reply link whose file is unchanged
- **THEN** the chat receives that action's fixed message once, and a second trigger sends nothing

#### Scenario: The file changed since the page loaded

- **WHEN** the page's file is rebuilt and the person triggers an action from a tab opened before
- **THEN** nothing reaches the chat and the page is told the file changed

#### Scenario: An action carries reviewer notes

- **WHEN** the person triggers an action with valid saved notes on an unchanged page
- **THEN** the chat receives the fixed action instruction and those notes together in one message, and the page receives acknowledgement only after confirmed delivery

### Requirement: A reply link opens in the inbox when it can

When the computer is signed in to the live app and the app has the inbox, opening a plan's reply link SHALL put the page in the person's inbox and give its inbox address, and SHALL start no tunnel for it. Any other page SHALL open through the tunnel as before and, when the inbox is available, SHALL also be listed there with its address only, never its content, until the link closes. Otherwise every page SHALL open through the tunnel as before. While any inbox item is open, the computer SHALL collect the person's taps, deliver them under the same fixed-message, version and once-per-action rules, and report each result back. A rebuilt page SHALL replace its inbox copy at the same address.

#### Scenario: Signed in with the inbox

- **WHEN** a plan is made on a computer signed in to an app that has the inbox
- **THEN** the plan's link is its inbox address and no tunnel starts

#### Scenario: A form while the inbox is on

- **WHEN** the assistant opens an intake form on a computer signed in to an app with the inbox
- **THEN** the form opens at a tunnel link, the inbox lists it with *Open*, and the app holds neither the form nor the answers

#### Scenario: Not signed in

- **WHEN** a page is opened on a computer that is not signed in, or whose app has no inbox yet
- **THEN** it opens at a tunnel link, as before, and nothing is listed

### Requirement: A page's send comes from the person

A message that a page or an inbox tap sends to its chat SHALL reach that chat as the person's own message. It SHALL NOT carry the name of any chat, such as the chat that first started the shared page server. After an update, a page server or inbox helper still running from older code SHALL be replaced the next time a page opens there, and each open link SHALL keep its address.

#### Scenario: A send after another chat started the server

- **WHEN** chat A opened the first page on the computer, and the person taps *Send notes* on a plan that chat B opened
- **THEN** chat B gets the notes as the person's own message, with no sign of chat A

#### Scenario: An older server is running

- **WHEN** a page server from older code is running and a chat opens a new page
- **THEN** the server is replaced, the new page and each open link keep working at the same address, and later sends come from the person
