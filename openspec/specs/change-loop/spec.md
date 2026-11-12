# change-loop Specification

## Purpose

How a request becomes work in every WongStack repo: plain requests are done directly, a code or process change runs the verbs with two stops for the person, and an invoked verb also serves work that changes no repo file.

## Requirements

### Requirement: Plain requests are done directly

The agent SHALL do a plain request (research, an errand, a reminder, a question) directly, with no verb and no question round, asking only when it cannot act without an answer. A plain request that edited a repo file, such as a wiki note, SHALL end by asking whether to publish it, so no edit is left unsaved.

#### Scenario: An errand

- **WHEN** the person asks for a shop's opening hours
- **THEN** the agent answers, with no `/explore` round and no OpenSpec change

#### Scenario: A note to remember

- **WHEN** the person says "remember that invoices go out on the 1st" and the agent writes it to the wiki
- **THEN** the reply ends by asking whether to publish it, recommended first, and a yes runs `/ship`

### Requirement: A new page or tool is a mini app

A request for a new standalone page or small tool SHALL run the change loop like any code change and SHALL be built as a mini app, as `mini-apps` defines.

#### Scenario: A running tracker

- **WHEN** the person asks for a new page that tracks their runs
- **THEN** the agent stops at the plan's review, and the plan builds the page as a mini app

### Requirement: No repo has a mode

No install field, flag, or file SHALL change how a repo handles requests or writes its wiki; a home repo and a work repo SHALL follow the same rules.

#### Scenario: The same request in two repos

- **WHEN** the same errand is asked in home and in a work repo
- **THEN** both handle it the same way

### Requirement: A task that will come back gets one offer

When a task done by hand will clearly come back (the person says it recurs, or memory shows they asked before), the next-step question SHALL include one option for a schedule or a mini app, named by its outcome. The agent SHALL NOT offer on a guess, after a code change it built, in an unattended run, or after a decline for that task.

#### Scenario: The person says it recurs

- **WHEN** the person asks for a support email summary and says they need it every Monday
- **THEN** the next-step question includes doing it every Monday, beside stopping

#### Scenario: The person declines

- **WHEN** the person turns down the offer
- **THEN** the decline is recorded in memory and a later request for the same task gets no offer

### Requirement: An invoked verb serves work that changes no repo file

When the person invokes `/explore`, `/plan`, or `/apply` for work that changes no repo file, the verb SHALL run in its non-code form and SHALL NOT create an OpenSpec change, branch, commit, or review page. The work, not a setting, SHALL decide the form. `/ship` SHALL act only on repo changes.

#### Scenario: Plan an errand

- **WHEN** the person invokes `/plan` to compare suppliers and email the chosen one
- **THEN** the agent writes a numbered to-do in the conversation that marks the sending step as outward

#### Scenario: Ship an errand

- **WHEN** the person invokes `/ship` after an errand
- **THEN** `/ship` says the work finishes in `/apply` and makes no git change

### Requirement: Each outward action is confirmed

For work that changes no repo file, `/apply` SHALL show exactly what each outward step will do (a message, a post, a changed record, a payment, a deletion) and ask first, one confirmation per action unless the person asked for a batch. Reading, searching, and drafting SHALL need no prompt.

#### Scenario: Send an email

- **WHEN** `/apply` reaches a step that sends an email
- **THEN** it shows the recipient and full text and asks before it sends
- **AND** a declined step is skipped and reported

### Requirement: Planning prefers code for repeated processes

When the work is a process that will run again, planning SHALL weigh deterministic code against a recurring AI-run step, by the principle the knowledge center states.

#### Scenario: A repeated report

- **WHEN** a plan covers a task that will run every week
- **THEN** the plan considers a script before a recurring AI step

### Requirement: A change asked with no verb stops at the plan and at the preview

A code or process change asked for with no verb SHALL stop at the plan's review link, with no question: from that page the person builds it, or builds and publishes it in one go with no stop before the merge. After a build alone, it SHALL stop at the preview to ask whether to publish, running the next verb on yes. A verb the person types SHALL keep its own reach. A small change whose shape a skill's own page fixes, such as adding a new tool while connecting tools, SHALL instead be recorded and built on the person's request, with no plan review link, and SHALL stop only to ask whether to publish.

#### Scenario: Yes to both stops

- **WHEN** the person asks to change how the app stores data, taps *Build it* on the plan's page, then says yes at the preview
- **THEN** the agent runs `/plan`, `/apply`, and `/ship` without the person naming a verb

#### Scenario: The person types /ship

- **WHEN** the person invokes `/ship add a sign-up page`
- **THEN** the chain runs to the merge with no stop at the plan or before the merge

#### Scenario: Connect my tools

- **WHEN** the owner types *connect my tools* and names a tool the app does not know
- **THEN** one change that adds it is recorded and built, the owner is asked *publish it?* once, and no plan review link is shown

### Requirement: One rule decides fix or ask

When an agent meets a problem while building, saving or checking a change, it SHALL fix the problem alone when the plan already settles what is right, and SHALL bring it to the person when fixing it needs a decision the plan does not make. A problem SHALL be brought to the person when the fix goes outside the plan (a change people see that the plan doesn't name, added scope, a new dependency, or unrelated code), would weaken a check, can't be undone or touches keys, logins, access, data loss or money, still fails after two fixes, or is a finding the builder disputes after one exchange. Inside `/ship`, the rule for asking during a publish SHALL decide instead which of these the person sees. `/apply`, `/save` and `/verify` SHALL follow this one rule from one owning page.

#### Scenario: A failing test in the change's own files

- **WHEN** a check fails and the fix lies in files the change already touches, inside the plan
- **THEN** the agent fixes it and lists the fix in its report, without asking

#### Scenario: A fix would loosen a check

- **WHEN** the only fix an agent finds for a failure is to switch a check off or weaken it
- **THEN** the agent asks the person, with its recommended answer, before making that edit

### Requirement: Picking up work new to this computer is reviewed first

Before `/apply` switches the working tree to a saved branch, it SHALL list the branch's commits that no local branch and not the published default branch already hold. When there are any, it SHALL switch nothing and run nothing from the branch. Instead it SHALL show the files those commits change, code before plans and wiki pages, and ask the person. A commit's author SHALL NOT count as evidence that the work is the person's own. On a yes, it SHALL switch only to the exact commit shown, and SHALL show the new part and ask again when the branch moved since. After a switch that needed a review, it SHALL recap and ask before building, and SHALL NOT build or run the local checks in the same turn, even when the `/apply` call carried an instruction.

#### Scenario: A teammate's branch edits a library every hook imports

- **WHEN** the owner runs `/apply` on a teammate's saved change whose only change appends code to `.agents/skills/memory/scripts/lib/cli.mjs`
- **THEN** the working tree stays on its current branch, the reply lists that file as code and asks whether to switch, and running every hook command from `.agents/settings.json` and `.agents/hooks.json` leaves no trace of the branch's code

#### Scenario: The owner's own branch picks up as before

- **WHEN** `/apply` names a change whose branch's commits all sit on a local branch or the published default branch
- **THEN** it switches with no ask and goes on to build

#### Scenario: A faked author email is still asked about

- **WHEN** a branch new to this computer carries commits whose author email is the owner's
- **THEN** `/apply` still lists its files and asks before switching

#### Scenario: The branch moves after the review

- **WHEN** the person says yes to the commit they were shown, and the branch has a newer commit by the time the switch runs
- **THEN** nothing switches, and the reply shows the newer commits and asks again

#### Scenario: A reviewed switch stops before building

- **WHEN** the person says yes and the switch lands on the reviewed commit
- **THEN** the reply recaps the change and asks whether to build it, and no install, test, or build has run

#### Scenario: A teammate's branch named like the main one is still asked about

- **WHEN** the remote publishes `master` and a teammate saves a branch named `main`
- **THEN** `/apply` on a change saved on `main`, or on a branch built on it, lists `main`'s commits and files and asks before switching

#### Scenario: The yes says what switching runs

- **WHEN** `/apply` asks whether to switch to work new to this computer
- **THEN** the switch option says the change's code then runs on this computer, with the person's keys

### Requirement: Each step limits what it may change

Every chat SHALL be in one step, starting in plan. Explore SHALL change no repo file. Plan SHALL change only plans and wiki pages, and MAY save a schedule to the company app after the person's OK; a code change SHALL wait for the person's go. Apply, ship, and any other step the person types SHALL be free to change any repo file. Every step MAY read, research, run the repo's tests and scripts, and write throwaway files outside the tracked repo.

#### Scenario: Exploring finds a fix

- **WHEN** the person types `/explore` and the agent finds a one-line fix
- **THEN** it reports the fix and offers a plan, and changes no repo file

#### Scenario: A note in a new chat

- **WHEN** a new chat is asked to remember that invoices go out on the 1st
- **THEN** the agent writes it to the wiki in plan, with no build step

#### Scenario: A reminder in a new chat

- **WHEN** a new chat is asked to remind the person every Monday to send invoices
- **THEN** the agent shows the schedule, saves it to the app after the person's OK, and makes no repo change and no build step

### Requirement: Only the person moves a chat past plan

A chat SHALL move past plan only when the person types a step, taps a build button on a plan's page, picks a build or publish choice the agent offered, or asks for a small change whose shape a skill's own page fixes, such as connecting a new tool. A step started inside another SHALL NOT narrow the outer one's limits.

#### Scenario: A plan is written

- **WHEN** a chat in plan has written a plan and the person has given no go
- **THEN** the agent ends on the plan's link and builds nothing

#### Scenario: Ship runs its chain

- **WHEN** the person types `/ship add a sign-up page`
- **THEN** planning and building inside it change files freely, through to the merge

#### Scenario: Connect my tools

- **WHEN** the owner types *connect my tools* and names a tool the app does not know
- **THEN** the chat builds the change that adds it with no other go, and stops at *publish it?*

### Requirement: Trying things is research

Asked to test or try something, the agent SHALL run it and report the results before offering any plan, in explore or with no step named. A try that needs new code SHALL keep that code out of the tracked repo.

#### Scenario: Go test it

- **WHEN** the person asks the agent to find out whether a script is slow
- **THEN** the agent runs it, reports the timing, and only then offers a plan

### Requirement: Ship takes a safe recommended answer instead of asking

Inside `/ship` and every step it runs, a question whose recommended answer stays inside the work and can be undone SHALL be answered with that recommendation, with no stop. Each such choice SHALL be logged in the change's Decision log as assumed, with its reason, and the ship report SHALL list every one under *Choices I made*, one plain line each. `/ship` SHALL still stop and ask when the recommended answer uses a key, signs in or changes access; spends money; sends, posts, or changes a business record or real data; deletes something outside the change; accepts terms; or weakens a check; and when something still fails after two fixes or no answer is clearly best. The same steps typed on their own SHALL keep asking.

#### Scenario: A design question mid-publish

- **WHEN** the build inside `/ship` asks where a removed screen's controls should go, recommending new commands that the change adds
- **THEN** `/ship` takes the recommendation, logs it as assumed, goes on to publish, and lists it under *Choices I made*

#### Scenario: A real sign-in is needed

- **WHEN** a live check inside `/ship` needs to sign in with the person's saved login
- **THEN** `/ship` stops and asks, even though signing in is the recommended answer

#### Scenario: A plain build

- **WHEN** the person types `/apply` and its build meets the same design question
- **THEN** `/apply` asks the person, as before

### Requirement: A chat's name shows the step that runs now

Every chat that runs the change loop SHALL start its name with the step that runs now, as a full capital word followed by `: ` (`EXPLORE: `, `PLAN: `, `APPLY: `, `SHIP: `, or `DONE: `), and the rest of the name SHALL name the work at that time in at most 60 characters. The name SHALL change when a step starts its own work, not when a step word is typed, in Paseo, in Claude Code without Paseo, and in Codex without Paseo. A step run inside another step SHALL move the name to itself, back as well as forward. Each step that starts SHALL give the task words for its work, and those words SHALL replace the earlier ones; once a plan is the work, its title SHALL be the task words until the work is done. `DONE` SHALL keep the words it has. The Daily chat, routines, helper chats, and a workspace shared by several chats SHALL keep their names.

#### Scenario: Publish from a plan builds first

- **WHEN** a chat named `PLAN: Fix the invoice total` is told to publish, builds first inside that publish, and its work goes live
- **THEN** its name is `APPLY: Fix the invoice total` while it builds, `SHIP: Fix the invoice total` while it publishes, and `DONE: Fix the invoice total` once the work is live

#### Scenario: Claude Code without Paseo

- **WHEN** a chat runs in Claude Code with no Paseo, and the person types `/ship`
- **THEN** the name keeps its step until a step starts its work, and the step the chat is in shows by the person's next message

#### Scenario: Words about other work give way

- **WHEN** a chat's name is `PLAN: why is it only hidden on mac?`, from a message about other work, and the chat then plans a change titled `Add an add-on, then open its sign-in`
- **THEN** the chat's name becomes `PLAN: Add an add-on, then open its sign-in`

### Requirement: A chat's name changes only when a step starts or a command is typed

A chat SHALL NOT get a step word in its name until a step starts its work or the person types a skill command. A chat whose messages start no step and type no command, such as a question or an errand, SHALL keep the name it has. A typed `/explore`, `/plan`, or `/improve-code` SHALL show its step at once; a typed `/apply` or `/ship` SHALL wait for the step that starts. Any other typed command of a repo skill SHALL show the skill's name in capitals at once. A command that a step runs for the person SHALL NOT change the name. A name the host gave the chat before its first step name, copied from a message or not, SHALL give way to the task words a step gives. A name the person gives the chat after it has a step name SHALL keep its words, where the host lets the chat read its name; only the step word changes.

#### Scenario: A question starts no step

- **WHEN** a chat's first message is a question with no command, and the chat answers it without starting a step
- **THEN** the chat's name has no step word

#### Scenario: A typed command names the chat at once

- **WHEN** the person types `/verify the invoice page` in a chat
- **THEN** the chat's name becomes `VERIFY: The invoice page` before the reply, in Paseo and in Claude Code without Paseo

#### Scenario: A plan's title replaces a copied name

- **WHEN** Paseo names a chat with the first characters of its first message, and the chat then plans a change titled `Fix the invoice total`
- **THEN** the chat's name becomes `PLAN: Fix the invoice total`

#### Scenario: A name the person gave stays

- **WHEN** a Paseo chat named `PLAN: Fix the invoice total` is renamed by the person to `Invoice fixes`, and the build then starts
- **THEN** the chat's name becomes `APPLY: Invoice fixes`
