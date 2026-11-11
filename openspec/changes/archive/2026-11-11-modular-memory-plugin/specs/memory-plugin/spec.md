## ADDED Requirements

### Requirement: Memory installs as one plugin with its own hooks

The core memory SHALL ship as one folder for Claude Code and Codex that carries its own start-of-chat, message, before-edit, and end-of-chat hooks, so a repo's own settings name no memory hook. Every repo that has memory, a full WongStack install or memory alone, SHALL hold it as a real folder in its skills folder, never as a link and never in a plugins folder. Claude Code SHALL load it from the repo's own checkout with no install step, so a branch runs its own copy. No repo SHALL need a plugin shop to get memory. Codex SHALL need one install per computer, and a Codex chat on a computer whose copy is missing or older than the repo's SHALL name the one command that installs it.

#### Scenario: An install after its update

- **WHEN** a WongStack install takes this release with its update, and a person opens a new Claude Code chat in it
- **THEN** memory is a real folder in the install's skills folder, the install has no plugins folder, and the digest loads with nothing installed, the before-edit warning shows on the first edit in a mapped folder, and a message naming a topic gets its summary

#### Scenario: Codex without the plugin

- **WHEN** a person opens a Codex chat in a repo with memory, on a computer where memory's Codex plugin is missing or older than the repo's folder
- **THEN** the chat names the one command that installs it, and the chat goes on

### Requirement: The plugin reaches a store only through named operations

The plugin SHALL read and write memory only through one fixed list of named operations, and SHALL never send a query, a table name, or an owner. It SHALL work the same with any backend that answers those operations, in the same process or over the network, and SHALL never itself hold back a fact for privacy: what a caller may see is the backend's decision.

#### Scenario: A stand-in backend

- **WHEN** the plugin's tests run against a stand-in backend that answers the operations from memory
- **THEN** the digest, search, the write gate, capture, upkeep, and the before-edit warning give the same results as against WongStack's store

#### Scenario: An operation the backend lacks

- **WHEN** the plugin calls an operation a backend does not answer
- **THEN** it reports memory as not loaded for that step, and the chat goes on

### Requirement: A fact names where it came from

Every fact the store returns SHALL carry its sources as links, and the plugin SHALL show them without reading what they point to. In WongStack a fact's source SHALL be the session it came from, as stored today, with no stored record changed, and a write SHALL NOT name another session's transcript as its source.

#### Scenario: A fact from a chat

- **WHEN** a fact saved from Claude Code chat `7f3a` is read in a brief
- **THEN** its source shows as that session, and `source <id>` opens that chat's kept transcript, as allowed today

#### Scenario: A source that is not the writer's

- **WHEN** a save names another person's session as a fact's source
- **THEN** the store refuses that fact and stores nothing from the write

### Requirement: A repo plugs into the plugin in one place

A repo SHALL connect the plugin to its store, and add its own topics, step tags, current change, person page, and lookup extras, through one profile file. A topic pull SHALL let the profile add the repo's own records with that topic, such as notes, beside memory's facts. A missing optional part SHALL turn only its own feature off. A repo with no profile SHALL get one short line, once per chat, that has the AI ask the person whether to set memory up; it SHALL NOT start setup without a yes, and the chat SHALL go on.

#### Scenario: A repo with no profile

- **WHEN** memory's folder is in a repo with no memory profile, and a person opens a chat and later resumes it
- **THEN** the AI asks once in that chat whether to set memory up, starts no setup unasked, and nothing fails

### Requirement: Setup installs memory from one pasted message

A person SHALL be able to add memory to any repo by pasting one message, which names the setup guide's web address, into any AI tool, with nothing installed first. Setup SHALL copy the memory folder into the repo as a real folder and write the repo's own parts outside it. It SHALL fill each missing part from what the repo has: a store the repo can already reach, else a server part in the repo's own app, else, with no app, an offer of WongStack's hosting setup. It SHALL ask before each step that costs money or makes something public. It SHALL NOT report memory ready until memory's own check passes against the store, including each role's limits. It SHALL then save its work in the repo and ask before it sends that work anywhere. It SHALL change nothing in a full WongStack install.

#### Scenario: A repo with an app and no store

- **WHEN** a person pastes the install message into an AI tool in a repo with its own app and database, no memory, and no WongStack
- **THEN** the AI copies memory in as a real folder, adds the server part to that app, writes the profile, runs the check until it passes, asks before it deploys or creates a database, saves the work in the repo, and asks before it pushes

#### Scenario: Setup in a WongStack install

- **WHEN** the setup guide is followed in a full WongStack install
- **THEN** it says memory already comes with each update, and changes nothing

### Requirement: An install updates only the modules it has

An update SHALL change only the module folders a repo already has, and SHALL leave the repo's own parts outside them as they are. A full WongStack install SHALL get memory's updates with WongStack's update. A repo with memory alone SHALL update memory with one pasted message. That update SHALL keep the repo's own edits inside the folder. When an edit and the new version change the same lines, it SHALL stop, name each such file, and change no file.

#### Scenario: A local edit is kept

- **WHEN** a repo with memory alone changed one line of a memory script, and a person pastes the update message
- **THEN** the folder takes the new version with that line kept, memory's check runs, and nothing outside the folder changes

#### Scenario: An edit that conflicts

- **WHEN** the repo's edit and the new version change the same line
- **THEN** the update stops, names that file, and the folder stays as it was

### Requirement: The plugin brings its own tidy

The plugin SHALL bring the memory tidy, so any repo with memory can file facts onto their topic pages and check those pages. A repo SHALL add its own pages to check, and how edits publish, through its profile; with none, the tidy SHALL check the topic pages and leave its edits unpublished on a branch.

#### Scenario: A repo with no extra pages

- **WHEN** a person runs the tidy in a repo whose profile names topics and no extra pages
- **THEN** facts are filed onto their topic pages, the edits wait on a branch, and nothing is published

### Requirement: An installed repo moves to the plugin with no fact lost

The update that brings the plugin SHALL keep every fact, tag, session, and transcript where it is, change no stored record, and need no database migration. A branch or computer that has not taken the update SHALL keep its last saved digest and hold its new facts on the computer, and those facts SHALL pass the write gate after it updates.

#### Scenario: Counts after the update

- **WHEN** an install runs `/wong-sync` to this release and production deploys
- **THEN** memory's counts of facts, live facts, sessions, and kept transcripts are the same as before

#### Scenario: A branch not yet updated

- **WHEN** a chat on a branch without the update saves two facts after production has deployed
- **THEN** it shows its last saved digest, the two facts wait on the computer, and the first chat after the branch updates sends them through the gate
