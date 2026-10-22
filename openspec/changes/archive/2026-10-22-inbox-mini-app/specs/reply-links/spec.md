## MODIFIED Requirements

### Requirement: A reply link closes itself and holds a secret

A reply link SHALL open either in the person's inbox, reached only through their company sign-in, or at an address through Cloudflare's tunnel, and SHALL be given to the person only once it answers from outside the computer. Through the tunnel, sending SHALL need a secret that only the link carries and that is never sent as part of an address. A link SHALL stop accepting sends at its time limit or when closed, even if the assistant's session has ended, and a send SHALL be bounded in size and rate.

#### Scenario: The time limit passes

- **WHEN** a reply link's time limit has passed and the person taps send
- **THEN** nothing reaches the chat and the page is told the link has closed

#### Scenario: A send without the secret

- **WHEN** a request to send arrives through the tunnel without the link's secret
- **THEN** it is refused and nothing reaches the chat

## ADDED Requirements

### Requirement: A reply link opens in the inbox when it can

When the computer is signed in to the live app and the app has the inbox, opening a plan's reply link SHALL put the page in the person's inbox and give its inbox address, and SHALL start no tunnel for it. Otherwise, and for any other page, it SHALL open through the tunnel as before. While any inbox item is open, the computer SHALL collect the person's taps, deliver them under the same fixed-message, version and once-per-action rules, and report each result back. A rebuilt page SHALL replace its inbox copy at the same address.

#### Scenario: Signed in with the inbox

- **WHEN** a plan is made on a computer signed in to an app that has the inbox
- **THEN** the plan's link is its inbox address and no tunnel starts

#### Scenario: Not signed in

- **WHEN** a plan is made on a computer that is not signed in, or whose app has no inbox yet
- **THEN** the plan opens at a tunnel link, as before
