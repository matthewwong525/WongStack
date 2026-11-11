## ADDED Requirements

### Requirement: Every page is a topic a fact can name

A topic SHALL be a tag that has a page: each code area in the install's area list, whose page is its first named doc and whose summary is its definition, and each page in the install's company knowledge, whose tag is its path inside `knowledge/` without `.md` (a folder's `README.md` takes the folder's name) and whose summary is the page's first sentence. A fact about a company topic SHALL be able to carry that topic's tag; a company topic tag missing from the store SHALL be defined from its page's summary on its first write, with no definition typed by the writer. Upkeep SHALL re-tag, through the same restate that keeps a fact's origin, a live fact whose words name a company knowledge page by path and that lacks its topic. A topic page SHALL find its facts by its tag and SHALL NOT need to list them.

#### Scenario: A fact about a person

- **WHEN** `knowledge/people/ada.md` opens with "Ada runs our ads." and a fact tagged `people/ada` is written to a store with no such tag
- **THEN** the write succeeds and the tag `people/ada` is defined as "Ada runs our ads."

#### Scenario: A fact names a page by path

- **WHEN** a live fact says "Moved the refund steps to knowledge/refunds.md" and has no `refunds` tag
- **THEN** after the next upkeep a live fact with the same words, date and author carries `refunds`, and the old one is superseded by it

### Requirement: A message that names a topic gets its summary

Before the assistant reads a person's message, a hook SHALL add the summary of each topic the message names, from files on this computer only, with no memory search and no network call, within the hook's time limit, and SHALL never block or fail the message. A topic's whole name, an alias, or a company topic's last part as whole words SHALL be a clear match and add its summary; a word that only starts a topic's name SHALL add the name alone. It SHALL add at most three topics, clear matches first, each at most once per chat, SHALL skip a topic named for a skill, and SHALL say how to pull a topic.

#### Scenario: A clear match

- **WHEN** the company topics include `people/ada` and a person writes "what did Ada say about the ads?"
- **THEN** the assistant receives `people/ada` and `ads` with their summaries and the pull command, before it answers

#### Scenario: Nothing to add

- **WHEN** a message names no topic, names only `plan`, or names a topic already added in this chat
- **THEN** the hook adds nothing and the message goes on unchanged

### Requirement: The store answers only named requests

The memory server SHALL accept only the plugin's named operations and SHALL write every query itself, adding the caller's visibility from the sign-in it verified. No request SHALL carry a query, a table name, or an owner, and no field a caller sends SHALL widen what it sees beyond [who sees what](../../../../../wiki/development/memory.md#who-sees-what): `everyone` SHALL widen only an admin's read. Any other request to the memory route SHALL answer 404 and run nothing.

#### Scenario: A member asks for everyone

- **WHEN** a member searches for `salary` with `everyone` set, and a teammate's private `user` fact holds that word
- **THEN** the answer holds no trace of that fact, and the member's own and shared matches come back as usual

#### Scenario: A client that still sends queries

- **WHEN** a computer not yet updated sends a raw query to the memory route
- **THEN** the route answers 404 and runs nothing

### Requirement: A chat's transcript is kept when it ends

When a chat ends, the memory plugin SHALL upload its full transcript, with secrets redacted as capture does, when the store keeps transcripts, so a workspace closed or deleted before the next capture loses none. A session an earlier version recorded as private SHALL NOT be uploaded, and no word in a message SHALL keep a session from being uploaded. An unreachable store or one with no transcript bucket SHALL skip the upload without delaying the chat's end.

#### Scenario: A workspace closed right after its chat

- **WHEN** a chat ends and its Paseo workspace is archived at once
- **THEN** its redacted transcript is in the bucket, and `source` on its facts shows it

#### Scenario: A private session

- **WHEN** an earlier version recorded the session as private and the chat ends
- **THEN** nothing is uploaded

### Requirement: A finished chat's work and leftovers are captured

The memory plugin SHALL be the one writer of a chat's facts: from each ended chat it SHALL record what the chat set out to do and what got done, leave one open thread for each planned piece not done, and close a thread the chat finished. It SHALL start this capture when a chat ends, as well as at the next chat start, so `/continue` sees the threads. No WongStack skill SHALL write a chat's facts itself.

#### Scenario: Work left undone

- **WHEN** a chat planned a feature and its tests, built the feature, and ended
- **THEN** memory holds a wrap-up naming the feature as done and an open thread for the tests, written by the capture

#### Scenario: A save writes no facts

- **WHEN** the person runs `/save` in a chat
- **THEN** `/save` writes no fact, and the chat's facts come from its capture

## MODIFIED Requirements

### Requirement: A write that cannot reach the store waits

When the store cannot be reached, a fact SHALL wait in an ignored local spool, still checked for credentials, and the write SHALL NOT be blocked. The next session start SHALL send spooled facts through the gate.

#### Scenario: Save while offline

- **WHEN** a chat's capture writes facts with no network
- **THEN** its facts are spooled, the run's record says so, and the next session start sends them through the gate

### Requirement: A bounded digest loads at session start

When a session starts or resumes, the session-start hook SHALL add a digest built by code with no model: every open thread of the change on the current branch first, then the topic list, then the current person's page, then other live facts by type and age. The topic list SHALL show the company topics the company knowledge hub links, one line each with its summary, then the code topics' names on one line, and SHALL show even when memory holds no facts or cannot be reached. It SHALL NOT list open threads of other changes; when there are any, it SHALL say how many carry each verb's tag and how many carry none, and they SHALL stay live and searchable. It SHALL stay within 40 lines and 6 KB, name how many facts it left out, report the last background run, stay the same for the whole session, and never block the session: offline, it SHALL use the last cached digest with its age.

#### Scenario: A store with many facts

- **WHEN** the store holds 400 live facts
- **THEN** the digest stays within its cap and its last line says how many it left out

#### Scenario: Open threads outnumber the digest

- **WHEN** the store holds 80 open threads on other changes and 100 other live facts
- **THEN** the digest lists none of those threads, gives their count per verb tag and untagged, and shows feedback and project facts

#### Scenario: The current change's threads

- **WHEN** the current branch's change has 12 open threads, one over 30 days old
- **THEN** the digest shows all 12 first, within its line and byte caps

#### Scenario: Topics with an empty memory

- **WHEN** the company knowledge hub links `people` and `ads`, and the store holds no facts
- **THEN** the digest shows both topics with their summaries and the code topics' line

### Requirement: One lookup shows everything linked to a path or topic

Each area in the install's area list MAY name the wiki pages and specs that own it. A path asked about SHALL match an area when it falls under one of the area's folders or is named among the area's docs, so a spec or wiki page lands on its own subject, not only the folder that holds it. Given paths, a topic name, or a change, the area load SHALL print, before its facts and even when the store is unreachable: the matched areas; their named docs that exist in the repo, skipping any it lacks; each matched area's code folders; up to five archived changes, newest first, those naming a given path ahead of those sharing only an area; and, for each path asked about directly, the Markdown files and lines outside archived changes that link to it, read fresh on each call and never stored. Given a company topic, it SHALL print the topic's summary and page, the pages that page links to, and the pages that link to it, one step out and no further, then the live facts with its tag. In WongStack's own repo, every capability spec SHALL be named by at least one area and every named doc SHALL exist, or its tests fail.

#### Scenario: A mini-app file

- **WHEN** the lookup is asked about `app/worker/apps/hello/index.ts`, the `mini-apps` area names `wiki/stack/mini-apps.md` and `openspec/specs/mini-apps/spec.md`, and the archived change `mini-apps-in-the-main-app` names that folder
- **THEN** it prints `mini-apps` and `worker`, both docs, their code folders, that change among its past changes, the pages linking to the file, then the `mini-apps` and `worker` facts

#### Scenario: Looking up a spec

- **WHEN** the lookup is asked about `openspec/specs/memory/spec.md`, which the `memory` area names among its docs
- **THEN** it prints `memory` with its docs and code folders, and the `memory` facts, not only the generic area of the `openspec/` folder

#### Scenario: Pulling a company topic

- **WHEN** the lookup is asked about `people/ada`, whose page links `ads` and is linked from `people/README.md`, and two live facts carry `people/ada`
- **THEN** it prints Ada's summary and page, `ads` as a link, `people/README.md` as linking to it, and both facts, and nothing about the pages `ads` links to

#### Scenario: A new spec with no area

- **WHEN** a change in WongStack's own repo adds `openspec/specs/reports/spec.md` and no area names it
- **THEN** the tests fail and name that spec

### Requirement: Teammates cannot change or hide each other's facts

A member or reader SHALL write facts only as its signed-in person and SHALL supersede only facts that person owns, with its own new fact in the same write; a supersede aimed at another person's fact SHALL leave that fact live. Author labels SHALL NOT grant ownership. Only a memory admin SHALL supersede anyone's fact. The store SHALL offer no way to edit or delete a fact, claim another owner, or overwrite another person's or an unowned historical session: the server sets each write's owner, author, sharing, and time from the sign-in.

#### Scenario: A member deletes a fact

- **WHEN** a member's computer asks the store to delete fact 3 or change its words
- **THEN** no operation does either, and fact 3 is unchanged

#### Scenario: A member replaces a teammate's fact

- **WHEN** Ana's save supersedes fact 3, which Bo wrote
- **THEN** fact 3 stays live, Ana's new fact is stored, and the script says fact 3 was left because Bo wrote it

#### Scenario: A member writes under another name

- **WHEN** Ana's save sends a fact with Bo's email as its author
- **THEN** the stored fact is Ana's, with Ana as owner and author

### Requirement: A team keeps personal facts personal

The server SHALL return to a member or reader only everyone's shared `project`, `reference`, and `thread` facts plus personal and unshared facts owned by the signed-in person, whatever the request asks. Emails, labels, hostnames, and people pages supplied by a caller SHALL NOT expand that scope. A memory admin SHALL retain access to every fact; their default digest and search SHALL narrow personal and unshared facts to their own, and only an explicit `--everyone` SHALL widen that view.

#### Scenario: A teammate's preference

- **WHEN** a teammate wrote a `feedback` fact about deploys
- **THEN** a member's search for `deploy` hides it, with or without `--everyone`, and the admin's search for everyone shows it

#### Scenario: A reader's thread

- **WHEN** a reader wrote a `thread` fact
- **THEN** it shows in the reader's digest and never in a teammate's

#### Scenario: A personal fact in a work session

- **WHEN** a work-repo session learns the person has a medical appointment every Tuesday
- **THEN** it is stored in that repo as a `user` fact, which teammates never see and the admin can

#### Scenario: A member writes its own read

- **WHEN** a member sends a hand-written read of the facts table, its text search, or a schema-qualified name
- **THEN** the memory route answers 404 and returns no fact

### Requirement: A word search answers quickly

A word search SHALL run its full-text match once per query, however many facts the store holds, with the same privacy filter for every caller. A save of 3 facts SHALL finish its neighbour checks within the client's 15-second wait on a store the size of the live one.

#### Scenario: A long search on a large store

- **WHEN** a member searches 24 words in a store of 1,700 facts
- **THEN** the answer comes back in well under a second, without teammates' personal facts

#### Scenario: A client on the old version

- **WHEN** a client not yet updated sends a search in the old query form
- **THEN** the memory route answers 404, and the client says memory was not loaded and goes on

### Requirement: A background run's record reaches only its own person

The server SHALL store each background-run record with the person who sent it, taken from the sign-in, never from the request. The digest's run line, when consolidation is next due, and any non-admin read of run records SHALL come only from the current person's own runs. A run record saved before records carried their writer SHALL reach no one's digest or consolidation clock, a cloud schedule's included. The run line SHALL be one line, bounded in length, and counted within the digest's line and byte caps. A malformed run record SHALL leave out the run line, never fail the digest.

#### Scenario: A reader writes a run record with fake headings

- **WHEN** a reader records a run whose reason holds several lines, including a `## Live facts` heading, and a member then starts a chat
- **THEN** the member's digest shows none of that text, and the reader's own digest shows it as one shortened line

#### Scenario: A teammate reads the run records

- **WHEN** a reader asks the store for the digest or the stats
- **THEN** only the reader's own run records count in either

#### Scenario: A run record from before the update

- **WHEN** memory holds a run record saved before records carried their writer, dated 2999-12-31, and a cloud schedule starts a chat
- **THEN** the schedule's digest shows none of it, and the record doesn't put the schedule's consolidation off

#### Scenario: A run record that cannot be read

- **WHEN** the person's newest run record has counts that are not valid JSON
- **THEN** the digest builds with no run line, the background run still starts, and the memory stats count that run as merging nothing

## REMOVED Requirements

### Requirement: A hand-written read cannot widen the word search

**Reason**: No caller sends a read any more: the server writes every query from a named operation, so there is no hand-written read to guard.
**Migration**: Covered by "The store answers only named requests" and "A team keeps personal facts personal".
