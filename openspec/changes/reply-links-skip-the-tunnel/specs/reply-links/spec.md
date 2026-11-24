## RENAMED Requirements

- FROM: `### Requirement: A shipped plan leaves Needs you`
- TO: `### Requirement: A shipped plan leaves Open`

## MODIFIED Requirements

### Requirement: No reply link where no chat can be woken

When the host gives no way to wake the chat, opening a reply link SHALL end quickly with no link and no request to install anything, so the caller can fall back to its file. In a project with no company app, the same SHALL hold when the tunnel tool is missing or the tunnel does not come up.

#### Scenario: A host with no way to wake a chat

- **WHEN** a plan is made on a host that can not be sent a message
- **THEN** no link is opened and the plan's file is offered as before

### Requirement: A shipped plan leaves Open

When a change ships and is live, its plan's page in the person's Inbox SHALL close and move from *Open* to *Artifacts*, wherever the plan was made: another chat, folder or computer. A page whose chat or folder is gone SHALL still close in its app while any folder on the computer can reach that app. A failed close SHALL NOT stop the ship. Asking for a shipped plan's link SHALL NOT open a new page under *Open*.

#### Scenario: A plan made in a closed chat ships

- **WHEN** a plan's page waits in the Inbox, its chat was closed and its folder deleted, and the change ships from another chat
- **THEN** once the change is live, the page leaves *Open* and opens read-only from *Artifacts*

#### Scenario: The Inbox can not be reached at ship time

- **WHEN** the change merges but the Inbox does not answer the close
- **THEN** the ship finishes and its report says the plan page was not closed

## REMOVED Requirements

### Requirement: A reply link opens in the inbox when it can

**Reason**: Every reply-link page now opens in the inbox, not only a plan, and a project with a company app no longer falls back to a tunnel or lists a tunnel link.
**Migration**: Replaced by *Every reply-link page opens in the person's inbox*.

## ADDED Requirements

### Requirement: Every reply-link page opens in the person's inbox

In a project with a company app, every page a chat opens as a reply link, a plan's review page, a page for other work, or a page the chat wrote itself, SHALL open inside the person's inbox and give its inbox address when the computer is signed in and the inbox takes the page. The page's file SHALL stay as written. Such a project SHALL never open a tunnel for a reply link: signed out, or with the inbox out of reach, opening SHALL give no link and say why, so the chat gives the page's file and the sign-in link and takes the answer in the chat. A project with no company app SHALL keep opening its reply links at a tunnel, and SHALL list none in an inbox. While any inbox item is open, the computer SHALL collect the person's taps, deliver them under the same fixed-message, version and once-per-action rules, and report each result back. A rebuilt page SHALL replace its inbox copy at the same address while that item is open; one opened again after its item closed SHALL get a new address.

#### Scenario: A page the chat wrote, signed in

- **WHEN** a chat in a project with an app opens an intake form it wrote, on a computer signed in to that app
- **THEN** the printed link opens the form in the person's inbox, no tunnel starts, and its *Submit* reaches that chat only

#### Scenario: Signed out

- **WHEN** a chat in a project with an app opens a page while the computer is signed out
- **THEN** no tunnel starts, and the chat shows the page's file and the sign-in link

#### Scenario: A project with no app

- **WHEN** a chat in a project with no company app opens a page
- **THEN** the page opens at a tunnel link, as before, and nothing is listed in an inbox
