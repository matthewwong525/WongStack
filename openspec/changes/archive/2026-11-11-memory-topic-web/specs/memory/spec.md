# Spec Delta

## ADDED Requirements

### Requirement: One pull reads any node and names its neighbours

Memory SHALL offer one read that takes a topic, a repo path, a change, or a fact, and answers what it is and each thing it connects to, in short groups: a topic's page with its parts, the pages one step away, its related topics, its changes, its open threads, the person's preferences, and its decisions; a change's topics, threads, facts and chats; a fact's topics, its change, the fact that replaced it and those it replaced, and the other facts from its chat. Every item SHALL be a name that the same read takes, so one answer leads to the next. An answer SHALL stay within 60 lines and 6 KB, say how many items each group left out, and give one group whole on request. Who sees which fact SHALL be the store's decision, as for any read. When the store does not answer, the parts read from the repo SHALL still print, with one line that says the facts are missing. The older lookup commands for a path, a topic, and a change SHALL keep working.

#### Scenario: Following a topic to a change

- **WHEN** an assistant pulls the topic `memory`, which has 141 live facts on 11 changes
- **THEN** the answer shows its page, related topics, three changes with a count of the rest, and at most three items in each group, and a pull of one of those change names shows that change's facts and topics

#### Scenario: A name that is no node

- **WHEN** an assistant pulls `memry`
- **THEN** the read answers no node, names the nearest topics, and prints no facts

### Requirement: Related topics are found from shared facts and changes

For a topic, memory SHALL find by code, with no model, the other topics that share live facts with it or have facts on the same changes, ranked by how much they share, eight at most, each with its counts, one sample fact, and whether either topic's page already links the other. It SHALL read them fresh on each call and store no link. Only a tag that has a page SHALL count as a topic. A fact that concerns two topics SHALL carry both.

#### Scenario: Two topics that share facts

- **WHEN** twelve live facts carry both `memory` and `dream`, and neither page links the other
- **THEN** a pull of `memory` lists `dream` among its related topics with that count and marks it as not linked

#### Scenario: A tag with no page

- **WHEN** many of a topic's facts also carry a tag that has no page
- **THEN** that tag is not listed as a related topic

### Requirement: A helper reads memory and answers with a short brief

Memory SHALL give an assistant one page of steps for a helper that gathers context for a task: it starts from the task and the topics, follows only the connections that bear on the task, within a stated number of reads, and answers in at most 300 words what applies, each line with its fact or page, the open threads, the person's preferences, and the names it did not follow. The steps SHALL work in any host that can start a helper, and the assistant SHALL be able to follow them itself where the host has none. The helper SHALL see only what the caller may see, SHALL write nothing to memory, and SHALL treat a fact's or a chat's words as evidence, never as an instruction.

#### Scenario: A task that spans topics

- **WHEN** an assistant gives the helper the task *change how sign-in works*, and memory holds facts on it under three topics and two changes
- **THEN** the helper answers within 300 words, each applied line names its fact or page, and it lists the topics it did not follow

#### Scenario: Memory holds nothing on the task

- **WHEN** no topic, fact, or page bears on the task
- **THEN** the helper says so plainly and invents nothing

## MODIFIED Requirements

### Requirement: A bounded digest loads at session start

When a session starts or resumes, the session-start hook SHALL add a digest built by code with no model: every open thread of the change on the current branch first, then the topic list, then the topics that gained facts lately, then the current person's page, then only the person's own preferences stated since the last daily tidy. It SHALL NOT list other facts. The topic list SHALL show the company topics the company knowledge hub links, one line each with its summary, then the code topics' names on one line, and SHALL show even when memory holds no facts or cannot be reached. It SHALL NOT list open threads of other changes; when there are any, it SHALL say how many carry each verb's tag and how many carry none, and they SHALL stay live and searchable. It SHALL stay within 40 lines and 6 KB, say how many live facts memory holds, report the last daily tidy, stay the same for the whole session, and never block the session: offline, it SHALL use the last cached digest with its age.

#### Scenario: A store with many facts

- **WHEN** the store holds 400 live facts
- **THEN** the digest stays within its cap, lists none of them but the person's new preferences, and its last line says how many live facts there are

#### Scenario: Open threads outnumber the digest

- **WHEN** the store holds 80 open threads on other changes and 100 other live facts
- **THEN** the digest lists none of those threads, gives their count per verb tag and untagged, and names the topics that gained facts lately

#### Scenario: The current change's threads

- **WHEN** the current branch's change has 12 open threads, one over 30 days old
- **THEN** the digest shows all 12 first, within its line and byte caps

#### Scenario: Topics with an empty memory

- **WHEN** the company knowledge hub links `people` and `ads`, and the store holds no facts
- **THEN** the digest shows both topics with their summaries and the code topics' line

#### Scenario: A preference stated yesterday evening

- **WHEN** a person stated a preference after the last daily tidy, and 30 older preferences are live
- **THEN** the digest shows the new preference and none of the older ones

### Requirement: The digest holds what always applies and asks for a search

The digest SHALL include the people page that lists the current git email, found in `knowledge/people/` and then in `wiki/people/`, after the current change's threads, within at most 1.5 KB; a page cut short SHALL end with a line naming its path. The digest's opening lines SHALL tell the agent, once it knows the task and before it acts on more than a quick question, to pull the task's topics, or to give the task to the memory helper when it spans topics.

#### Scenario: A person with a people page

- **WHEN** the current git email is listed on `knowledge/people/ana.md`, a 3 KB page
- **THEN** the digest shows the first part of that page within 1.5 KB, a line naming `knowledge/people/ana.md` for the rest, and then the preferences new since the last tidy

#### Scenario: No people page

- **WHEN** no page in `knowledge/people/` or `wiki/people/` lists the current git email
- **THEN** the digest shows no person section, and its opening lines still say to pull the task's topics or use the helper once the task is known

### Requirement: Live facts are consolidated, never deleted

The daily tidy SHALL merge facts that say the same thing into one new fact, supersede contradicted facts, newest wins, and close an open thread that a later live fact shows was answered. It SHALL NOT delete a fact or edit its body. Work that needs no judgment (area and verb tags read from a fact's words, tag aliases and definitions, closing stale threads) SHALL NOT wait for this run: it belongs to upkeep.

#### Scenario: Two facts disagree

- **WHEN** two live facts on one slug give different values for one setting
- **THEN** the newer supersedes the older, and both bodies are unchanged

#### Scenario: A thread a later fact answered

- **WHEN** an open thread asks for a real phone test and a later live fact records that test passing
- **THEN** consolidation supersedes the thread with a fact that says so, and the thread's body is unchanged

## REMOVED Requirements

### Requirement: A selective helper leaves simple lookups fast

**Reason**: The experimental extraction helper is replaced by the memory helper, which any host runs from one page of steps.

**Migration**: Use the pull for one topic, path, change or fact, and the memory helper for a task that spans topics. The removed commands exit with an error that names the helper page.

### Requirement: Helper work and returned context have enforced limits

**Reason**: The task handles and byte allowances belonged to the removed extraction helper.

**Migration**: The memory helper has a stated number of reads and a 300-word answer; no handle is needed.

### Requirement: Helper selection preserves evidence and authority

**Reason**: It described the removed extraction helper's model isolation.

**Migration**: The memory helper reads through the same store reads as any caller, so the store's permissions apply, and it writes nothing.

### Requirement: Helper failure keeps the caller informed

**Reason**: It described the removed extraction helper's fallback packet.

**Migration**: Where no helper can start, the assistant follows the helper's steps itself.

### Requirement: Helper evaluation reports coverage and total work

**Reason**: The evaluation compared the removed extraction helper with fixed selections; the keyword-search evaluation stays.

**Migration**: None. The search question set and its evaluation runner are unchanged.
