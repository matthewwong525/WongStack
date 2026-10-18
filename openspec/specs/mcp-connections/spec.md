# MCP connections

## Purpose

Let a team add remote MCPs to the app and let each person sign in to each one once, as themselves, so the app holds and renews every sign-in and each person's chat can use the MCP's tools through the app without holding a sign-in. A person may let the team use their sign-in, for look-ups only or for everything.

## Requirements

### Requirement: Anyone on the team adds an MCP

Any signed-in person SHALL be able to add an MCP, from the Services view or through the assistant. Adding SHALL take an HTTPS address and a name, SHALL check that the address offers a sign-in the app can use with no setup at the service, and SHALL save nothing and say why in plain words when it does not. The assistant SHALL be able to give the person a link that opens straight on that MCP's Connect. The person who added an MCP SHALL be able to remove it while nobody else is connected to it; the owner or an Admin SHALL be able to remove any MCP. Removing an MCP SHALL delete every sign-in for it.

#### Scenario: Notion is added from the chat

- **WHEN** a teammate asks the assistant to connect Notion
- **THEN** Notion appears in Services for everyone and the assistant gives a link that opens on Notion's Connect

#### Scenario: An address with no usable sign-in

- **WHEN** a person adds an address that offers no MCP sign-in the app can use
- **THEN** no MCP is saved and the person is told the address has no sign-in the app can use

#### Scenario: The adder can't remove others' sign-ins

- **WHEN** Kim added Canva, Lee has connected it, and Kim tries to remove Canva
- **THEN** it is refused and Kim is told to ask the owner or an Admin

### Requirement: Each person signs in once, as themselves

Each person SHALL be able to connect their own account to any MCP on the app and disconnect it, and SHALL NOT be able to disconnect anyone else's. Connect SHALL send the person to the service's own sign-in page and return them to Services showing them as connected, with the account and date. A sign-in return SHALL be accepted only once, only shortly after Connect, and only for the person who pressed Connect. A tool call SHALL use the caller's own sign-in when they have one; a caller with neither their own nor a shared sign-in SHALL be told to connect and given the link. Removing a person from Access SHALL delete their sign-ins.

#### Scenario: Two teammates use Notion

- **WHEN** Kim and Lee each connect their own Notion and each runs a page search
- **THEN** each sees only the pages their own Notion account can see

#### Scenario: Not connected yet

- **WHEN** a person who has not connected Notion, with no shared Notion sign-in, runs a Notion tool
- **THEN** nothing is sent to Notion and they are told to connect Notion, with the link

### Requirement: A person can let the team use their sign-in

On their own connection, a person SHALL be able to let the team use their sign-in, choosing *Look-ups only* (the default) or *Everything*, and to stop at any time. A teammate with no sign-in of their own SHALL then use the shared one: with *Look-ups only*, only the tools the MCP marks as look-ups in the list the app itself saved; every other tool, including one missing from that list, SHALL be refused. A teammate's own sign-in SHALL always come first. Each MCP SHALL have at most one shared sign-in at a time. Sharing SHALL stop at once when the sharer unticks it, disconnects, or is removed from Access; the owner or an Admin SHALL be able to stop anyone's sharing. Services and the chat SHALL say whose sign-in a call uses.

#### Scenario: A shared look-up

- **WHEN** Kim shares Canva as look-ups only and Lee, who has not connected Canva, runs a look-up tool
- **THEN** the tool runs with Kim's sign-in and Lee's chat says it used Kim's

#### Scenario: A shared sign-in refuses a change

- **WHEN** Kim shares Canva as look-ups only and Lee runs a Canva tool not marked as a look-up
- **THEN** nothing is sent to Canva and Lee is told Kim's sign-in allows look-ups only, with the link to connect their own

### Requirement: The app renews each sign-in alone

The app SHALL renew each sign-in before it ends, with no person signing in again. Calls made at the same moment with the same sign-in SHALL renew it at most once, so a renewal that replaces the old sign-in never signs the person out. When the service ends a sign-in, that person's row SHALL show *Needs a new sign-in*, calls with it SHALL say to connect again, and nothing SHALL be sent with it until they do.

#### Scenario: Two chats call while a sign-in is ending

- **WHEN** two chats call Canva at once with Kim's sign-in, which is about to end
- **THEN** the app renews it once and both calls succeed

### Requirement: No sign-in leaves the app

No screen, response, log line or chat SHALL contain a stored sign-in or a client secret. Stored sign-ins SHALL be sealed with a secret no route is handed, so that a route reading the app's database by mistake gets nothing usable. An answer from an MCP that contains the sign-in it was sent SHALL be refused.

#### Scenario: A mini app reads the database by mistake

- **WHEN** a mini app's handler reads the stored MCP rows
- **THEN** it gets no usable sign-in

### Requirement: Tool calls go only to the MCP and are recorded

Each call SHALL be recorded with who made it, whose sign-in it used, the MCP, the tool and whether it was a look-up, never its arguments or answer. The app SHALL send a call only to the MCP's own address and follow no redirect, and a change that times out SHALL be reported as outcome unknown and not sent again.

#### Scenario: A change times out

- **WHEN** a Canva tool that is not a look-up gets no answer in time
- **THEN** the chat is told the outcome is unknown and the call is not sent again

### Requirement: The Services view shows keys and MCPs without values

Access SHALL give everyone a Services view beside People and Roles, listing every MCP with its address, how many people are connected, whose sign-in is shared and how, and the viewer's own state and share choice. The owner and Admins SHALL also see every registered key with its name, purpose, whether it is saved and whether it is used directly. The view SHALL show no key value and no sign-in, and SHALL offer no place to type a key; an unsaved key SHALL say to ask the assistant for its key link. Searching SHALL never contact an MCP: its saved tool list SHALL change only on a first Connect, a call naming a tool it lacks, or Refresh.

#### Scenario: The owner opens Services

- **WHEN** the owner opens Services with Stripe saved, Mailchimp not saved and Canva connected by 3 people
- **THEN** Stripe shows Saved, Mailchimp says to ask for its key link, and Canva shows 3 connected and the owner's own state, with no value on the screen

#### Scenario: A teammate opens Services

- **WHEN** a teammate opens Services with Canva and Linear on the app and Kim sharing Linear
- **THEN** they see both MCPs with their own Connect, Linear marked as Kim's shared, and no keys

### Requirement: MCPs already set up in Claude or Codex can be brought in

On request, the assistant SHALL find the remote MCPs listed in this computer's Claude and Codex settings and offer to add them by name and address, then add the ones the person agrees to. It SHALL read only names and addresses, SHALL never read, copy or send a stored sign-in or a fixed key, and each added MCP SHALL still need each person's Connect. It SHALL skip, naming each with its reason, an MCP that runs on the computer, one that uses a fixed key, one already added, and one the app can't speak to. Once a brought-in MCP is connected in the app, the assistant SHALL offer to remove it from Claude or Codex, and SHALL remove it only when the person agrees.

#### Scenario: Canva and Linear are in Claude

- **WHEN** a person asks to bring in their MCPs and Claude lists Canva and Linear by address
- **THEN** after they agree, both appear in Services, and no sign-in was read

#### Scenario: A local MCP is listed

- **WHEN** Codex lists an MCP that runs as a program on the computer
- **THEN** it is not added and the assistant says it runs on this computer
