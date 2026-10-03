# Spec Delta

## MODIFIED Requirements

### Requirement: The person gives a key through a private key link

When a task needs a key that the live files lack, or the person asks for the key link, the agent SHALL send a private link in the same reply, without first asking whether the person is ready. The link SHALL have the hand-over link's safety: a new address and secret key each time, one link at a time, ending private input once every asked-for key is saved, on explicit closure, or at its time limit. The page SHALL offer one field for each key the agent named, and only those, and a primary action that saves entries and returns to the requesting task in one tap. The agent SHALL name only keys already declared in `.env.example` or `app/.dev.vars.example`. A saved key SHALL go to the matching ignored live file, in the primary worktree and in a seeded branch copy, and a key the live site reads SHALL then reach both Workers. Only successful persistence of every requested key SHALL declare readiness and notify the originating workspace, with no value in that notification. Failed or partial saves SHALL preserve successes, keep missing or failed entries editable, and SHALL NOT declare readiness. The agent SHALL learn only the names of the saved keys.

#### Scenario: A task needs a missing key

- **WHEN** a task needs `STRIPE_SECRET_KEY`, which `app/.dev.vars.example` declares and `app/.dev.vars` lacks, and the person pastes it on the key link's page and taps its save-and-continue action
- **THEN** it lands in `app/.dev.vars`, the originating workspace is notified and pushes it to both Workers, the chat names `STRIPE_SECRET_KEY`, and no command, log, tracked file, or chat message holds its value

#### Scenario: An undeclared name

- **WHEN** the agent asks for a key named in neither example file
- **THEN** no link opens until the name is declared blank, with its comment, in the right example file

## ADDED Requirements

### Requirement: The key link waits for the person

A key link SHALL stay open for 30 minutes from when it is sent, and its page SHALL show the time left. A key link nobody has opened SHALL close at once when another private link is opened on the same computer; the agent SHALL then say the link closed and offer a new one. An opened key link SHALL keep its place: a second link SHALL NOT open until it ends.

#### Scenario: A slow sign-in at the service

- **WHEN** the person opens a key link 5 minutes after it was sent, then takes 15 minutes to sign in at the service
- **THEN** the page is still open, and the pasted key is saved

#### Scenario: A link nobody opened

- **WHEN** a key link sits unopened and another chat on the same computer needs a hand-over link
- **THEN** the key link closes, the hand-over link opens, and the first chat says its link closed and offers a new one

### Requirement: The key page carries the steps

For each asked-for key the agent MAY give a plain name, the address of the service's key page, and up to six short steps, written for that request from the service's public guidance. The page SHALL show them above that key's field, with a control that opens the address in the person's own browser, and SHALL show them as plain text only. The address SHALL be an `https` address. WongStack SHALL ship no per-service names, addresses, or steps. A key given none SHALL show its declared name and hint.

#### Scenario: Steps on the page

- **WHEN** the agent sends a key link for `STRIPE_SECRET_KEY` with the name *Stripe key*, Stripe's key-page address, and four steps
- **THEN** the page is headed *Stripe key*, lists the four steps with a control that opens Stripe's key page in a new tab, and the chat message carries only the link

#### Scenario: No steps given

- **WHEN** the agent sends a key link naming only `MAPS_API_KEY`
- **THEN** the page shows `MAPS_API_KEY` with the hint from its example-file comment

### Requirement: A key is tested when it is saved

When the agent gives a test for a key, the page SHALL send that key once, on save, to the service's `https` address the agent named, and SHALL tell the person whether the service accepted it. The page SHALL name that address's host. A key the service refuses SHALL NOT be saved and SHALL NOT count toward readiness unless the person chooses to save it anyway. A test that gives no answer, or a key with no test, SHALL be saved and reported as not tested. The test SHALL learn only whether the service accepted the key: no response content SHALL be kept, shown, or passed to the agent, and the key SHALL reach nothing but that address and the live files.

#### Scenario: A wrong paste

- **WHEN** the person pastes half a key and saves, and the service answers the test with a refusal
- **THEN** the key is not written, the field stays editable with a message that the service refused it, and the chat is not told the key is ready

#### Scenario: The service can't be reached

- **WHEN** the test times out
- **THEN** the key is saved, the page says it was saved but not tested, and the task resumes

### Requirement: The key page takes a paste, a long key, or a key file

The page SHALL offer a one-tap paste where the person's browser allows it, and SHALL accept a key that spans several lines, pasted or picked as a file that the person's device reads itself. Such a key SHALL be stored on one line in a form the app reads back with the same content: the same data for a JSON key file, the same lines for any other text. The page SHALL show a picked file's name and line count, never its content. A key no single line can hold whole SHALL be refused with a message, never saved changed.

#### Scenario: A key file

- **WHEN** the person picks a service's JSON key file for `GOOGLE_SERVICE_KEY`, which `app/.dev.vars.example` declares, and saves
- **THEN** the page shows the file's name and line count, the key lands on one line in `app/.dev.vars`, and the Worker reads back the same JSON data

#### Scenario: The browser blocks the paste button

- **WHEN** the person's browser refuses to read the clipboard
- **THEN** the page says to paste into the field by hand, and a hand-pasted multi-line key keeps its line breaks
