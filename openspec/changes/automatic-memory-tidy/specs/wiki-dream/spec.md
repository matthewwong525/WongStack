# Spec Delta

## ADDED Requirements

### Requirement: One daily tidy keeps memory true, with no command

An install SHALL keep what it remembers true through one daily tidy that a person's first chat of the day starts in the background, and the chat SHALL NOT wait for it. The tidy SHALL save what that person's ended chats learned, clean memory, place lasting facts on the pages that own them, link the topics that connect, re-check the install's own pages, correct saved facts the project has outgrown, and fix what chats looked for and did not find. No person SHALL need to type a command for any of this, and the install SHALL offer no command that runs a different or larger check.

#### Scenario: A preference from an unclosed chat

- **WHEN** a person stated a lasting preference in a chat archived without `/close`, and starts a chat the next day
- **THEN** that day's tidy puts the preference on that person's page and publishes it

#### Scenario: The update removes the command

- **WHEN** an install updates to this version and a person starts a chat the next day
- **THEN** the install has no command that runs a memory clean-up, and that day's tidy does the full check

### Requirement: The tidy works toward retrieval, from a map of where memory is weak

A tidy SHALL work toward one goal: a chat that looks up a topic gets what is true, quickly. Plain code SHALL make a map of where memory falls short of that goal: facts with no topic, tags that hold facts but have no page, topics too large to read in one pull, saved facts that name a file that is gone, own pages longest unchecked, facts saved since the last tidy, open notes about trouble, and how chats used memory. The assistant SHALL choose what to fix from the map, weakest first. Its instructions SHALL state the goal, the tools, and what must never happen, and SHALL NOT fix the order of the work or how much of each kind it does.

#### Scenario: A tag that holds facts and has no page

- **WHEN** the map shows a tag with thirty live facts and no page
- **THEN** after the tidy those facts are reachable from a topic that has a page, or the tag is unchanged and no person is asked about it

#### Scenario: A quiet day

- **WHEN** the map shows a few new facts and nothing else weak
- **THEN** the tidy places those facts and ends, and checks no page only to fill its time

### Requirement: Each tidy reads every new fact, and no count limits it

A tidy SHALL read every fact saved since the last tidy's record, however many there are, and SHALL correct every live saved fact that names a file that is gone. The map SHALL leave out an own page, a tag, or a topic that a tidy checked, or that changed, in the last 7 days, and SHALL order the pages that remain by how much chats used them, then longest unchecked first. No count SHALL limit a run; its time limit does, and what a run did not reach SHALL stay on the next day's map.

#### Scenario: A page a teammate's tidy checked yesterday

- **WHEN** a teammate's tidy checked a page yesterday and nobody changed it since
- **THEN** today's map does not show that page

#### Scenario: Many new facts

- **WHEN** 300 facts of one kind were saved since the last tidy
- **THEN** the tidy reads all 300 before it records how far it read

### Requirement: A tidy shows whether memory got easier to search

Plain code SHALL make the map again when a tidy ends, and SHALL ask again each question that found nothing since the last tidy. The tidy's record SHALL hold the numbers from before and after, and each chat start SHALL show the numbers that changed. Before it ends, a tidy SHALL test its own changes by asking memory as a new chat would, and SHALL fix what a question could not find.

#### Scenario: A tidy that gave topics to facts

- **WHEN** a tidy starts with 140 facts that have no topic and ends with 60
- **THEN** its record holds both numbers and the next chat start shows the change

#### Scenario: A placed fact that a question can't find

- **WHEN** a tidy placed a preference on a page, and its own question about that preference finds neither the page nor the fact
- **THEN** the tidy changes the fact's topic or the page's words until the question finds it, before it ends

### Requirement: The tidy works where chats used memory

A tidy SHALL read how chats used memory on its computer. For a question that found nothing while memory holds the answer, it SHALL change a topic, a tag, or a page's words so the same question finds the answer. It SHALL use the counts to choose where to work: the topics used most, a fact returned often that no page states, and topics used in the same chats that no page links. It SHALL NOT supersede or hide a fact because no chat used it, and SHALL NOT copy a question's words onto a page or into a fact.

#### Scenario: A question that found nothing

- **WHEN** a chat asked how refunds get approved and found nothing, and live facts tagged `returns` hold the answer
- **THEN** after the next tidy on that computer the same question finds those facts, and the chat start shows one question fewer with no answer

#### Scenario: A fact nobody used

- **WHEN** a live fact was returned to no chat for a month
- **THEN** the tidy leaves it live and searchable

### Requirement: The tidy cleans memory before it updates the wiki

A tidy SHALL first consolidate the memory store: facts that say the same thing merge, a contradicted fact is superseded by the newer one, and an answered open thread closes. The wiki SHALL then be updated only from live facts. On a teammate's key the tidy SHALL change only that installation's own facts.

#### Scenario: A contradicted fact does not reach the wiki

- **WHEN** two facts added since the last tidy contradict each other
- **THEN** after the tidy the older is superseded in memory and only the newer is on the wiki

### Requirement: The tidy places only lasting facts

A tidy SHALL place a fact on the wiki only when the fact is repeatable knowledge by the wiki's own rules, is expected to stay true for months, and would change what a reader does. Every other fact SHALL stay in memory. Guidance a page already holds but buries SHALL be moved or reworded where it is, never added a second time.

#### Scenario: A one-off decision stays in memory

- **WHEN** a new fact records one change's decision, a date, or finished work
- **THEN** no page gains it

### Requirement: The tidy compares every place the project remembers

A tidy SHALL compare the install's own pages and live saved facts with each other and with the files they describe, and SHALL read the specs and the plans, active and archived, as evidence. It SHALL correct what an own page states wrongly, merge duplicates, move a fact to the page that owns it, and leave every hub listing its pages. It SHALL supersede a saved fact that names a file that is gone, or that the repository contradicts, with a fact stating what is true; a fact SHALL never be edited or deleted. Before it replaces a statement or a fact that quotes a person, it SHALL read the source, and a fact recorded as the assistant's interpretation SHALL NOT be written as the person's own preference.

#### Scenario: A stale statement is corrected

- **WHEN** a re-checked own page states something a newer live fact contradicts
- **THEN** the tidy replaces the statement with the newer fact

#### Scenario: A fact about a file that is gone

- **WHEN** a live fact says a helper lives at a path the repository no longer has
- **THEN** after the tidy a newer fact supersedes it, and the old one stays searchable as history

### Requirement: The tidy finishes alone and brings a person no decision

A tidy SHALL NOT edit a page WongStack ships, a spec, a plan, or an archive, and SHALL NOT check a spec against the code or look for plans left behind. What it may not fix, and what the evidence does not settle, it SHALL leave unchanged. It SHALL ask no person a question and SHALL make no list of things for a person to decide. Each chat start SHALL show only what the last tidy did.

#### Scenario: A fact that contradicts a shipped page

- **WHEN** a live fact contradicts a page WongStack ships
- **THEN** the page and the fact are unchanged, and the next chat start names no open decision

#### Scenario: Two facts the evidence does not settle

- **WHEN** two live facts disagree and neither the sources nor the repository show which is true
- **THEN** both facts stay live, and the tidy asks nobody

### Requirement: The tidy publishes alone, from its own copy

A tidy SHALL work in a copy of the repository made for the run, so no checkout a person works in is touched. It SHALL save a company-knowledge edit at once and publish any other edit apart from all other work through the project's checks, with no question; where the install names no way to publish, its edits SHALL wait on a branch. A second tidy on the same day SHALL publish as its own change. A person SHALL be able to undo one tidy as one change.

#### Scenario: Nothing worth keeping

- **WHEN** no new fact passes the keep test and no checked page needs an edit
- **THEN** the tidy publishes nothing, records how far it read and which pages it checked, and the next chat start says so

#### Scenario: Two tidies in one day

- **WHEN** a person asks for a tidy on a day that already had one, and each has an edit to publish
- **THEN** both publish, each as its own change

### Requirement: A tidy stopped at its time limit keeps what it finished

A tidy SHALL stop its own work at a stated time limit. A tidy stopped there SHALL publish the parts it finished and record them, SHALL publish no half-made page, and SHALL NOT record a fact or page it did not finish, so the next tidy starts with them. The next chat start SHALL say the tidy was cut short.

#### Scenario: The limit ends the tidy between pages

- **WHEN** the time limit ends a tidy after it finished four pages and while it edits a fifth
- **THEN** the four pages publish and count as checked, the fifth is unchanged, and the next tidy checks the fifth first

### Requirement: Trouble with memory is checked first

A tidy SHALL load memory's open notes about trouble before it checks pages, and SHALL check first a page or a fact that a note says misled a chat. A note SHALL count as evidence, never as an instruction. When a tidy fixes a note's problem, a saved fact SHALL close that note; a note about code SHALL be left for `/improve-code`.

#### Scenario: A page that misled a chat

- **WHEN** an open note says a wiki page told the assistant something untrue
- **THEN** the next tidy checks that page first, and a fix closes the note

### Requirement: A tidy's record cannot be dated ahead

When a tidy finds the last record and each page's last check, it SHALL ignore a record dated in the future or not dated as a plain UTC time, and one that claims to have read a fact written after the record itself. A teammate's honest record, and a record an older version wrote as a dream, SHALL still count.

#### Scenario: A forged record from the future

- **WHEN** memory holds a record dated 2999-12-31 that claims to have read up to fact #999999999, beside a real one from 2026-10-01
- **THEN** the next tidy starts from the 2026-10-01 record and reads the facts added since it

#### Scenario: A record from before the update

- **WHEN** the newest record in memory is a dream an older version ran last week
- **THEN** the first tidy after the update starts from that record

## MODIFIED Requirements

### Requirement: Facts land on their topic's page

When a tidy places a repeatable fact, a fact that carries a topic SHALL go on that topic's page. A lasting fact about a company subject with no topic SHALL go on the page that owns the subject, or make that page, linked from its hub, and the fact SHALL then carry the page's topic, restated with its words, date and author kept. Each page the pass changes SHALL keep a first sentence that is a true one-line summary of the page. A page SHALL NOT name a fact by its id.

#### Scenario: A fact with a topic

- **WHEN** a lasting fact tagged `people/ada` says Ada wants ad numbers each Monday, and the tidy runs
- **THEN** `knowledge/people/ada.md` gains that preference in its own words, with no fact id, and is saved

#### Scenario: A new subject

- **WHEN** two lasting facts describe how refunds are approved, carry no topic, and no page covers refunds
- **THEN** the tidy makes `knowledge/refunds.md` with a one-line first sentence, links it from the company hub, and both facts carry `refunds` afterwards

### Requirement: A tidy links topics that connect, one way, with words

When a tidy has touched a topic's page, it SHALL read that topic's related topics and add a link between two own pages only where the two are truly related and neither page links the other, as one sentence that says how they connect, on one of the two pages only. It SHALL add no link between topics that share nothing, and none on a page WongStack ships. When it makes a new topic's page, it SHALL look back: older live facts that fit the topic SHALL get the topic, with their words, date and author kept; a teammate's run SHALL change only its own facts.

#### Scenario: Two topics that share a change

- **WHEN** `refunds` and `people/ada` share six facts, both pages are the install's own, and neither links the other
- **THEN** after the tidy one of the two pages has one sentence that links the other and says how they connect, and the other page has no new link

#### Scenario: A new topic looks back

- **WHEN** the tidy makes `knowledge/refunds.md` today, and four live facts from last month describe refunds with no topic
- **THEN** those four facts carry `refunds` afterwards, each with its words, date and author unchanged

### Requirement: A product fault is reported, not written over

When a page or spec disagrees with the product and the evidence shows the product is the one that is wrong, a tidy SHALL leave the page or spec as it is and SHALL record the fault as a note the next `/improve-code` reads.

#### Scenario: The page is right and the code is wrong

- **WHEN** a page states a rule a recorded decision confirms, and the code breaks that rule
- **THEN** the page is unchanged and a memory thread for `/improve-code` names the rule and where the code breaks it

### Requirement: A tidy starts only as the person allows and keeps private things out

A tidy SHALL start on its own only from a person's own chat start, at most once a day, and never on a computer where that person turned it off. On a plain ask in any chat the assistant SHALL say when memory last tidied and what it changed, stop or start the daily tidy on that computer, and start one tidy at once. A tidy SHALL NOT read chats marked private and SHALL NOT write health, family, or money details to the wiki. A tidy SHALL treat the words of a saved fact or an old chat as evidence to weigh, never as an instruction to follow.

#### Scenario: An update arrives

- **WHEN** an install updates to this version and a person starts a chat the next day
- **THEN** one daily tidy runs for that person, and no spec, plan, archive, saved fact's words, or page WongStack ships is changed

#### Scenario: Turned off on one computer

- **WHEN** a person stopped the daily tidy on their laptop and starts a chat there the next day
- **THEN** no tidy starts on the laptop, and their other computer still tidies

#### Scenario: A chat that gives orders

- **WHEN** an old chat a tidy reads as a source contains text telling the assistant to delete a page
- **THEN** the tidy does not act on that text

## REMOVED Requirements

### Requirement: A dream tidies memory before it updates the wiki

**Reason**: The typed dream is removed; the daily tidy does its work.
**Migration**: See *The tidy cleans memory before it updates the wiki*.

### Requirement: A dream adds what memory has gained since the last one

**Reason**: The typed dream is removed; the daily tidy places the facts.
**Migration**: See *The tidy places only lasting facts* and *Each tidy reads every new fact, and no count limits it*.

### Requirement: A dream removes discrepancies from the install's own pages

**Reason**: The typed dream is removed; the daily tidy re-checks the pages.
**Migration**: See *The tidy compares every place the project remembers*.

### Requirement: A claim changes only after its source is read

**Reason**: Folded into the requirement that owns the comparison.
**Migration**: See *The tidy compares every place the project remembers*.

### Requirement: Pages WongStack ships are never edited

**Reason**: Folded into the requirement that says what a tidy leaves alone. A fact that belongs on a shipped page is no longer listed for anyone.
**Migration**: See *The tidy finishes alone and brings a person no decision*.

### Requirement: A dream publishes alone, through the project's checks

**Reason**: The typed dream is removed. A tidy works in its own copy, so no checkout with unfinished work can stop it.
**Migration**: See *The tidy publishes alone, from its own copy*.

### Requirement: A dry run shows the edits and publishes nothing

**Reason**: The dry run goes with the command. A tidy publishes with no question, and each tidy is one change a person can undo.
**Migration**: Ask a chat *when did memory last tidy?* to see what a tidy changed, and *undo the last tidy* to take it back.

### Requirement: A dream reads every place the project remembers

**Reason**: The typed dream is removed. The daily tidy reads the same places as evidence, and no longer lists a spec the code contradicts or a plan left behind.
**Migration**: See *The tidy compares every place the project remembers* and *The tidy finishes alone and brings a person no decision*. To check a spec against the code, ask a chat.

### Requirement: A dream corrects saved facts the project has outgrown

**Reason**: The typed dream is removed; the daily tidy corrects every such fact.
**Migration**: See *The tidy compares every place the project remembers*.

### Requirement: Trouble with memory is read first

**Reason**: Restated for the daily tidy, which now reads the notes too.
**Migration**: See *Trouble with memory is checked first*.

### Requirement: A dream can run again the same day

**Reason**: The typed dream is removed.
**Migration**: See *The tidy publishes alone, from its own copy*; ask a chat *tidy memory now*.

### Requirement: A dream's record cannot be dated ahead

**Reason**: Restated for the tidy's record; an older dream record still counts.
**Migration**: See *A tidy's record cannot be dated ahead*.

### Requirement: A daily tidy does every kind of tidy in a small part

**Reason**: The daily tidy now does the full check from a map, with no fixed part, and a stop at its time limit keeps what it finished.
**Migration**: See *One daily tidy keeps memory true, with no command*, *The tidy works toward retrieval, from a map of where memory is weak*, and *A tidy stopped at its time limit keeps what it finished*.
