# asking-the-user Specification

## Purpose

How WongStack asks and writes to a person: one choice format through the best question tool, clarification bounded before planning, a next step ending every reply, all in plain words, with detail when the person asks.

## Requirements

### Requirement: Every ask offers structured choices

Every question a skill puts to the person SHALL offer two or three real options, the recommended one first and labelled `(Recommended)`, each with a short tradeoff, and SHALL keep the person's own answer open and use it as given. The allowed fourth options are *Review the plan*, in a closing question after a plan changed, and *See the preview*, in a closing question below a preview link. Where real options cannot be formed, such as a name only the person knows, the skill SHALL ask a free-text question instead of inventing options.

#### Scenario: A decision is needed

- **WHEN** a skill cannot continue without the person's choice
- **THEN** it asks with two or three options, the recommended one first, each with its tradeoff

#### Scenario: A custom answer

- **WHEN** the person answers in their own words instead of picking an option
- **THEN** the skill uses that answer as given, not the nearest option

### Requirement: Confirmations, offers, and menus are asks

A confirmation, an offer, a selection menu, and a blocked-state fork SHALL use the same choice format; a confirmation SHALL name what happens on each side, and a menu SHALL show the detail needed to choose. A skill SHALL NOT resolve several candidates by a guess.

#### Scenario: Several candidates remain

- **WHEN** a skill cannot tell which change, account, or branch the person means
- **THEN** it lists the candidates with their identifying detail and waits

### Requirement: The format never adds a question

The ask format SHALL decide how a question looks, not whether one is needed. An action the person's invocation already authorized SHALL be taken and reported without a prompt.

#### Scenario: An authorized action

- **WHEN** an action falls inside the run the person invoked, such as `/ship`'s merge
- **THEN** the skill takes it and reports it without asking

### Requirement: The best available question tool carries the ask

A skill SHALL ask through the first callable structured question tool (Codex `request_user_input`, Claude `AskUserQuestion`, or a host equivalent) within its capacity, else as numbered chat, and SHALL wait for the answer; elapsed time and a preselected option SHALL NOT count as one. Only where nobody can answer SHALL it take the recommended options, labelled assumed, and continue.

#### Scenario: Only chat is available

- **WHEN** no structured question tool is usable and the person can answer in chat
- **THEN** the skill writes the numbered questions with options and waits

#### Scenario: Nobody can answer

- **WHEN** the session is unattended
- **THEN** the skill uses the recommended options without waiting and labels them assumed

### Requirement: Codex can ask in Default mode

An installed repo SHALL let Codex ask structured questions in its Default mode through project configuration, without changing the person's global Codex settings.

#### Scenario: A trusted checkout

- **WHEN** Codex starts a Default-mode session in a trusted WongStack checkout
- **THEN** `request_user_input` is callable and the global Codex configuration is unchanged

### Requirement: Every reply that returns control ends with the next step

A reply that hands control back SHALL end with the decision that moves the work on, asked in the choice format through the question tool, with the report and every link written as chat text above it. A link SHALL NOT appear inside the question tool's question or options, and SHALL NOT appear only in the agent's reasoning; an option may name a link shown above it. A handoff the invocation already authorized SHALL continue instead of asking. The only replies that end with no question are a finished plan's, which ends with its link and a line telling the person to review it, and the answers to *Review the plan* and *See the preview*.

#### Scenario: A stage finishes

- **WHEN** a skill finishes and a structured question tool is callable
- **THEN** the report is chat text, and the next steps are asked through the tool, recommended first

#### Scenario: The chain continues

- **WHEN** `/ship` moves from one of its stages to the next
- **THEN** it continues without a next-step question

#### Scenario: A link the person needs

- **WHEN** a reply gives the person a link, such as a pull request, a key link, or a private form, and ends with a question card
- **THEN** the full link is a line of chat text above the card, and neither the card's question nor its options holds the address

### Requirement: Plans, asks, and reports use plain words

For every reader, a plan's Why and What Changes, every ask, and every report SHALL name what the person will see, get, lose, or risk, with no file path, identifier, command, or engineering term unless the person used it first or asked for that detail. Messages SHALL be short, in the voice `wiki/voice.md` owns: the point first, a few lines, and more only when asked. Git, OpenSpec, or CI SHALL be named only when the person asks or must act; code, commands, identifiers, and quotations SHALL stay exact. A skill SHALL try a fix within its own rules before asking, and SHALL NOT offer a choice that needs judgment the person lacks.

#### Scenario: A migration question

- **WHEN** `/explore` must ask about changing stored data
- **THEN** it asks what should happen to the accounts that exist today, not how to migrate the schema

#### Scenario: The person names the mechanism

- **WHEN** a person asks to move the app's data into a new `accounts` table
- **THEN** the plan may name the `accounts` table, because the person used the term first

### Requirement: Reports give the outcome and one link

A reply that returns control SHALL open with the outcome in plain words and, when the person invoked the verb, give at most one link and leave out branch names, commit ids, gate lines, and fact counts unless the person asks, for that reply or as a standing preference on their person page. The plan's link line SHALL NOT count toward that one link. The agent SHALL NOT infer a wish for detail from one message. A verb running inside another SHALL still print the lines its caller reads.

#### Scenario: Details from now on

- **WHEN** a person says "always show me the branch and commit"
- **THEN** the next wiki save records that preference on their person page, and later reports include those lines after the outcome

#### Scenario: A save inside a publish

- **WHEN** `/save` runs inside `/ship`
- **THEN** it still prints its gate result for `/ship` to read

### Requirement: Explore always runs before a plan

`/plan` SHALL run a bounded `/explore` pass first, however planning was reached, and SHALL record every answer in the Decision log marked asked or assumed, asking nothing of its own. Notes pasted from a plan's review page SHALL update that plan with no explore pass, because the plan already holds its answers.

#### Scenario: Plan through apply

- **WHEN** `/apply` invokes `/plan` for unexplored work
- **THEN** the bounded explore pass runs before any artifact is drafted

#### Scenario: Notes from the review page

- **WHEN** the person pastes notes copied from a plan's review page
- **THEN** `/plan` updates that plan without an explore pass or a question round

### Requirement: Review notes change only what they ask to

Notes pasted from a plan's review page, under the current first line or the older `Update the plan <change-name> with these notes from the review page`, SHALL change the plan only for a note that asks for a change. A note that asks a question SHALL get its answer in chat and leave the plan, its Decision log, and its page unchanged; when the answer shows the plan should change, the closing question SHALL offer that edit rather than make it.

#### Scenario: A question and a change pasted together

- **WHEN** the person pastes one note asking why a step exists and one asking to rename a step
- **THEN** the reply answers the question, and only the rename reaches the plan and its rebuilt page

#### Scenario: Notes from an older page

- **WHEN** the pasted notes start `Update the plan <change-name> with these notes from the review page`
- **THEN** they are handled the same way as notes with the current first line

### Requirement: Standalone explore asks in small groups

Standalone `/explore` SHALL ask material questions in small groups of related questions that can be answered together, SHALL wait for answers before asking what depends on them, and MAY ask several groups as the thinking develops. It SHALL change no repo file; throwaway files in the git-ignored `.scratch/` folder are allowed. When the thinking is done, it SHALL end with a next-step question whose recommended option is to plan it, and SHALL NOT start `/plan` without that answer.

#### Scenario: One answer shapes the next question

- **WHEN** a later question depends on an earlier answer
- **THEN** `/explore` asks it only after that answer arrives

#### Scenario: The thinking is done

- **WHEN** a person who typed `/explore` has answered its last round
- **THEN** it summarizes and asks whether to plan it, keep thinking, or stop, and drafts nothing until they choose

### Requirement: Explore checks memory before asking

Before its first question, `/explore` SHALL search the memory store once for the work, and SHALL NOT ask what a live fact already answers; it SHALL state that fact with its age and author as an assumption the person can correct. An unreachable store SHALL be reported in one line.

#### Scenario: A known preference

- **WHEN** memory holds a live fact that the person wants one pull request for refactors
- **THEN** `/explore` does not ask how to split the work, and names that fact as the reason

### Requirement: Questions before planning continue while a choice is open

At the move into planning, however planning was invoked, `/explore` SHALL ask only the choices a wrong guess would make the plan wrong, not merely different, as structured multiple-choice asks of no more questions than the tool holds per group. When the answers open another such choice, it SHALL ask a follow-up group rather than assume it, and SHALL stop asking once none is open. In an interactive session, an unanswered material choice SHALL remain open rather than be hidden in the summary as an assumption or evidence gap. A choice already settled SHALL NOT be asked again, nested calls included, unless a changed answer or new evidence invalidates its premise; only affected decisions SHALL be reopened. A minor gap SHALL become a recorded assumption with its reason. Previously authorized defaults and the explicitly assumed-default fallback when nobody can answer SHALL remain available.

#### Scenario: Everything is settled

- **WHEN** the conversation already answered every material choice
- **THEN** `/explore` asks nothing and moves to its summary

#### Scenario: An answer opens a new choice

- **WHEN** the first group's answers reveal another choice that would make the plan wrong if guessed
- **THEN** `/explore` asks a follow-up multiple-choice group before the plan is drafted
- **AND** while its answer is pending, that material choice remains open rather than being reported as settled or silently assumed

### Requirement: Changed premises revise only affected decisions

When a person's answer or newly discovered evidence invalidates an earlier premise, exploration SHALL reflect that change in every affected decision and recommendation. It SHALL preserve unrelated settled choices and SHALL explain why an affected choice needs revisiting.

#### Scenario: Expense visibility changes after an earlier answer

- **WHEN** the person changes expenses from shared to private after settling visibility and duplicate handling
- **THEN** the recommendation revises the approval queue and notification audience for private visibility
- **AND** the unchanged duplicate-handling answer remains settled

#### Scenario: The premise remains valid

- **WHEN** a later answer does not invalidate a settled choice
- **THEN** exploration keeps that choice without restarting its interview

### Requirement: Missing evidence delays only dependent questions

When a fact still needs investigation, exploration SHALL keep only the choices requiring that fact pending. Independent material choices with settled prerequisites SHALL remain eligible for the next question group, within the host's capabilities and existing group limits. The person SHALL NOT be asked to guess the missing fact.

#### Scenario: Independent choices are ready

- **WHEN** notification delivery cannot yet be verified but expense visibility and duplicate treatment can be decided independently
- **THEN** exploration asks the ready material choices without waiting for the delivery fact
- **AND** it preserves delivery as an evidence gap rather than inventing its behavior

#### Scenario: A choice needs the missing fact

- **WHEN** a consequential choice depends on evidence not yet available
- **THEN** exploration keeps that choice pending and names the evidence it needs rather than recommending an answer founded on a guessed fact

### Requirement: Exploration recommendations distinguish evidence from uncertainty

Exploration SHALL ground its recommendation in the relevant available project or process evidence rather than ask the person for discoverable facts. A claim not established by that evidence SHALL be identified as an assumption or an evidence gap. Exploration SHALL preserve its read-only boundary when additional proof would require implementation or an outward action.

#### Scenario: A proposed approach rests on a discoverable premise

- **WHEN** a proposed change assumes how an existing flow behaves and that behavior is discoverable in the available context
- **THEN** the recommendation reflects that context and the person is asked only about a remaining material choice

#### Scenario: Proof requires work outside exploration

- **WHEN** proving a claim requires a prototype, a write, or an unavailable observation
- **THEN** exploration names the evidence gap without claiming the result or performing that work

### Requirement: Exploration handoffs expose consequential assumptions

An exploration handoff SHALL distinguish settled choices, supported minor assumptions, and remaining evidence gaps. Its recommendation SHALL reflect available evidence about consequential assumptions and plausible failure paths; unsupported hypotheticals SHALL NOT create extra requirements or questions. A bounded pass SHALL reuse prior findings unless a new material gap exists.

#### Scenario: Evidence contradicts the proposed approach

- **WHEN** available evidence shows a plausible failure in the proposed approach
- **THEN** exploration explains the problem and revises the recommendation or asks about a new material choice before handoff

#### Scenario: Planning follows completed exploration

- **WHEN** the person asks for a plan after exploration settled its material choices
- **THEN** the handoff retains the reasons, assumptions, and evidence limits without repeating the interview

### Requirement: A review build choice carries its notes into the build

When review notes accompany an explicit Build it or Build and publish choice, the assistant SHALL apply requested plan changes and answer question notes, then continue directly into the authorized build or publish action without asking for a further build choice. Question notes SHALL NOT cause unrequested plan edits. A missing plan or material blocker SHALL stop the action and be reported. Notes sent alone SHALL retain their plan-only reach.

#### Scenario: Notes with build authorization

- **WHEN** the reviewer sends a rename note with Build it
- **THEN** the plan is updated and the assistant builds it without waiting for another build instruction

#### Scenario: Notes alone

- **WHEN** the reviewer sends the same note through Send notes
- **THEN** the plan is updated and building waits for a separate build choice

### Requirement: A changed plan's reply carries its link

A reply that creates a plan, or changes what it says or its checklist, SHALL show the full link to the plan's review page as its own chat line near the top of the reply, never inside a question, so a chat that folds a long reply does not hide it. When the plan is finished and waits on the person, the reply SHALL end with a line telling the person to review it, building or publishing from the page, and SHALL ask no question. When the page opens without build choices, that line SHALL say how to build or publish from the chat. Any other closing question in a reply that changed a plan SHALL offer to review the plan; choosing it SHALL show the link again and start nothing. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change, and the link SHALL NOT add a stop.

A reply that ends on the review line, a finished plan's or the answer to *Review the plan*, SHALL print a readable copy of the plan below the link: its Why, its What Changes as numbered points, and its assumed decisions, with each picture the chat cannot show replaced by a line pointing to the page. The copy SHALL come from the same proposal as the page, so the two never differ. Other replies that show the plan's link SHALL NOT print the copy.

#### Scenario: A plan finishes

- **WHEN** `/plan` finishes and the plan waits on the person
- **THEN** the reply shows the plan's link first, then the plan's copy, then ends with a line to review it and build from its page, and no question card

#### Scenario: A plan built on the way

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply shows the plan's link without the copy and the build continues without a stop

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no review of the plan

### Requirement: A preview link opens the page that changed

A reply that prints a preview link, or any other link the person should open, SHALL print it as its own chat line near the top of the reply, above any closing question and never inside it, so a chat that folds a long reply does not hide it. A preview link SHALL be the full address of the page that shows the change, and the home page only when the change has no page of its own. That question SHALL offer to show the preview again; choosing it SHALL show the link and start, save, or publish nothing.

#### Scenario: A change to one page

- **WHEN** a build changes the settings page and uploads a preview
- **THEN** the preview link opens the settings page on the preview, not its home page, and the closing question offers to show the preview again

#### Scenario: No preview was uploaded

- **WHEN** a build finishes but no preview was uploaded, because the app is untouched or the upload cannot run
- **THEN** its closing question offers no preview

#### Scenario: A long reply with a link

- **WHEN** a long report gives a link to a web page
- **THEN** the link sits right after the opening outcome line, before the details

### Requirement: A consequential choice gets a grounded recommendation

When an open consequential choice has multiple viable approaches, exploration SHALL provide meaningfully different alternatives, their practical consequences, and a recommended approach supported by the available context.

#### Scenario: Two approaches could satisfy the outcome

- **WHEN** the choice between viable approaches changes the outcome, compatibility, or acceptance criteria
- **THEN** the person receives distinct options with their consequences and a reasoned recommendation

### Requirement: A typed closing choice is sent back to the question tool

In Claude Code, when a reply ends a turn with a question followed by a short list of options, or a list where an option is marked `(Recommended)`, and that turn called no structured question tool, an installed repo SHALL send the agent back once to ask those choices through the tool. It SHALL NOT send the same turn back twice in a row, SHALL NOT act on a background memory run, and SHALL let the turn end when it cannot read the turn.

#### Scenario: Choices typed after a report

- **WHEN** a Claude Code reply ends with `What next?` and three numbered options, and the turn made no `AskUserQuestion` call
- **THEN** the agent is sent back once and asks the same choices through `AskUserQuestion`

#### Scenario: A report with no choices

- **WHEN** a reply ends with a list of what changed and no question before it, or the turn already called `AskUserQuestion`
- **THEN** the turn ends untouched

### Requirement: The ask rule is restated after compaction

In Claude Code, when a session continues after its conversation is compacted, an installed repo SHALL add one line to the session saying that asks go through the structured question tool, never typed as a list while the tool is callable, and naming the rule's page.

#### Scenario: A long chat is shortened

- **WHEN** Claude Code compacts a session and resumes it
- **THEN** the resumed session receives the one-line ask reminder, and the memory digest is not reloaded

### Requirement: A request goes straight to a plan

A request for a change to the repo's code or process, made with no verb, SHALL go straight into planning: the assistant SHALL ask only the material questions, then write the plan, and SHALL NOT stop at a *Plan it?* question or announce which step it is in. Only a person who typed `/explore` SHALL get the *Plan it?* question. A chat message that asks for a change to a plan waiting on the person SHALL update that plan, asking only what the message newly opens and keeping settled answers, then show the plan's new link; a message that asks a question SHALL be answered as review notes are, leaving the plan unchanged.

#### Scenario: A plain request

- **WHEN** a person asks "make the plan page show the build buttons sooner" with no verb
- **THEN** the assistant asks only what it must, writes the plan, and ends with its link, without asking whether to plan it

#### Scenario: A follow-up on a waiting plan

- **WHEN** a plan waits on the person and they write in the chat "also cover the phone layout"
- **THEN** the assistant asks only a question that message opens, updates the plan, and shows its new link, without repeating earlier questions
