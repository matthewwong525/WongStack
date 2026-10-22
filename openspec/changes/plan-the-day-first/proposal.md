# One inbox for your agents, planned before they work

**Status:** in-progress
**Branch:** inbox-daily-planning
**Open questions:** none

## Why

When you pick today's tasks, every agent starts working at once, so you only learn what each will do, and what it needs from you, as it stops through the day. You want to look over the whole day first: what each agent plans to do and what it will ask you, answered once in the morning, before any of them starts. The inbox also feels scattered: questions, approvals and plans sit in separate lists, apart from the agents they came from, and you can't see which agents are working and which are done.

## What Changes

- **The inbox is a list of your agents.** Each agent you have today is one card. Cards sort into three groups: *Needs you*, *Working* and *Done*. Whatever an agent waits on shows inside its own card: its morning plan, a question, an approval, a plan to review, or a key or form link. The separate *Questions*, *Approvals* and *Plans to review* lists go away.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><h3>Inbox</h3><span class="grow"/><span class="tag-outline">Computer online</span></div>
    <div class="row gap"><b>Needs you</b><span class="tag">2</span></div>
    <div class="card col gap">
      <div class="row gap"><b class="grow">Write the BFCM ad brief</b><span class="tag-outline">Question</span></div>
      <span>Which offer leads the ads?</span>
      <button class="btn-primary">1 $20 gift card</button>
      <button class="btn-ghost">2 Free shipping</button>
      <input placeholder="Or type your own answer">
    </div>
    <div class="card col gap">
      <div class="row gap"><b class="grow">Set up UpCart for Black Friday</b><span class="tag-outline danger">Approval</span></div>
      <span>Turn on the free-shipping bar on the live store?</span>
      <button class="btn-ghost">1 Approve</button>
      <button class="btn-ghost">2 Don't approve</button>
    </div>
    <div class="row gap"><b>Working</b><span class="tag">2</span></div>
    <div class="row gap"><div class="col grow"><span>Final check of the BFCM landing page</span><span class="muted">Checking the gift card banner on a phone</span></div></div>
    <div class="sep"></div>
    <div class="row gap"><div class="col grow"><span>Send Saeed a heads-up</span><span class="muted">Drafting the email · Kept going 2 min ago</span></div></div>
    <div class="row gap"><b>Done</b><span class="tag">1</span></div>
    <div class="row gap"><div class="col grow"><span>Get Ronald's files</span><span class="muted">Files in the shared drive</span></div><button class="btn-ghost">Proof</button></div>
    <div class="row gap"><span class="grow"/><button class="btn-primary">Send 2 answers</button></div>
  </div>
  ```
  | Group | An agent is here when | Its card shows |
  |-|-|-|
  | Needs you | something waits on your answer | each thing it waits on, to answer right there |
  | Working | it is working, with nothing for you | its latest step and the chief's last action |
  | Done | the chief checked its proof | the proof, as a link |
- **Morning agents plan first.** Each agent `/daily` opens in the morning only reads and plans. It changes nothing, saves nothing and sends nothing. It writes a short plan: what it will do, what it needs from you, what it will ask before it sends or pays, and any question it has now. Then it stops, and its card waits in *Needs you*.
  ```mermaid
  flowchart TD
    pick["your tasks for today"] --> plan["each agent plans"]
    plan --> needs["Needs you: one plan card each"]
    needs -->|Start| work["Working"]
    work --> done["Done, with proof"]
  ```
- **A plan card: Go or Not today.** A morning plan card shows the plan, its questions, *Go* or *Not today*, and a note box for the agent. Every card starts on *Go*, so you change only what is wrong. In the morning the button at the bottom reads *Start 3 agents*: one tap starts every *Go* agent with your note and answers. There is no hours count: you decide what fits.
  ```screen
  <div class="card col gap phone">
    <div class="card col gap">
      <div class="row gap"><b class="grow">Write the BFCM ad brief</b><button class="btn-primary">Go</button><button class="btn-ghost">Not today</button></div>
      <span class="muted">Will do</span>
      <span>Read last year's ads and the VIP launch notes, then draft the brief.</span>
      <span class="muted">Asks before</span>
      <span>Sending the brief to the ads team.</span>
      <input placeholder="A note for this agent">
    </div>
    <div class="card col gap">
      <div class="row gap"><b class="grow">Set up TikTok Shop</b><button class="btn-ghost">Go</button><button class="btn-primary">Not today</button></div>
      <span class="muted">Comes back tomorrow as a reminder.</span>
    </div>
    <div class="card col gap">
      <div class="row gap"><b class="grow">Get Ronald's files and handoff</b><span class="tag-outline">Still planning</span></div>
    </div>
    <div class="row gap"><span class="grow"/><button class="btn-primary">Start 2 agents</button></div>
  </div>
  ```
- **One button sends everything you picked.** Plans, answers and approvals go out together, as today's *Send* does. A *Not today* agent stops and its workspace closes. A one-off task comes back as tomorrow's reminder; a step on your daily list comes back on its own day.
  ```mermaid
  stateDiagram-v2
    [*] --> Planning: daily opens it
    Planning --> NeedsYou: plan written
    NeedsYou --> Working: Go, or an answer
    NeedsYou --> Closed: Not today
    Working --> NeedsYou: it asks you
    Working --> Done: proof checked
  ```
- **A slow plan doesn't hold up the day.** Plan cards show once every plan is in, or after 15 minutes. A card still planning says so; *Go* on it lets it work from its own plan, unseen. An agent that stops without a plan gets one nudge, then shows *No plan*.
- **A chat the daily chat doesn't watch still shows.** A plan or link from a chat you started yourself gets a card under that chat's name. It shows only what waits on you, with no *Working* or *Done* line, because nothing watches it.
- **Without the inbox, the same round happens in the chat.** The daily chat shows each plan and asks one question: which agents go today, with their questions alongside. Where the chat app can't open or watch other chats, `/daily` runs its steps in the chat as now.
- **Only the morning plans first.** A task you hand the daily chat later in the day (*get someone to …*) starts at once, as now: you are right there to answer it.

Non-goals: no day page with *Agent / Later / Drop* in WongStack; WongOS keeps its own and can send its *Agent* picks through this round on its next update. No hours count. Opening an agent's chat from its card is left for later.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: morning agents plan before they work and wait for the person's Go; Not today closes them and brings one-off tasks back tomorrow; the watch reports each agent's state to the inbox; without the inbox the round runs in the chat. Mid-day tasks start at once.
- `inbox`: the inbox lists agents, each with what waits on it, grouped into Needs you, Working and Done, replacing the three lists by kind; a morning plan card takes Go or Not today, a note and answers, sent with everything else on one button.

## Impact

- Depends on `inbox-private-links` (PR #435, branch `sulky-mule`) landing first: cards reuse its *Or type your own answer* box and link rows, and its migration rebuilds `inbox_items` just before this one.
- `schema/migrations/`: one additive migration rebuilding `inbox_items` with `start` and `agent` added to its kinds; `schema/seed.sql` gets a sample day: one agent per group.
- `app/worker/apps/inbox/`: `PUT item` takes a `start` item (a plan with Go / Not today) and an `agent` item (a status line, no taps).
- `app/src/apps/inbox/`: `List.tsx` groups items by agent into Needs you, Working and Done; an `AgentCard.tsx` holds an agent's items; a `StartCard.tsx` for the morning plan. `Decision.tsx`, `PlanCard.tsx` and the link row move inside a card, unchanged.
- `.agents/skills/daily/scripts/daily.mjs`: `open --plan-first`, the watch's `planned` line and its status reports, `inbox add --kind start`, and `start` (relay Go or Not today, close, remind).
- `.agents/skills/daily/SKILL.md` and `references/chief.md`: the morning round and a sixth brief part, *Plan first*; offset by cuts to stay under the skills' word budget.
- Wiki: `wiki/development/daily.md` (*Plan the day first*) and `wiki/development/reply-links.md` (the inbox lists agents).
- `CHANGELOG.md` gets a minor entry, with no hand step to update.

## Decision log

- **2026-10-22** — Asked where the person looks over the agents' plans each morning → chose one page in the inbox, one card per plan, with one Start.
- **2026-10-22** — Asked what the hours at the top should count → chose no hours at all: *No need for hours*.
- **2026-10-22** — Asked what happens when the day doesn't fit → chose nothing automatic: *the person will help decide what to work on*.
- **2026-10-22** — Asked to confirm the flow (pick, plan only, Today page, one Start, chief watches) → chose to write the plan.
- **2026-10-22** — Asked whether WongStack also gets the day page with Agent / Later / Drop → chose plan-first and the Today page only; WongOS's day page feeds its picks in after its next update.
- **2026-10-22** — Asked on the review page for a unified inbox: *show all the agents running and organize by which needs decisions from me … right now it feels disparate* → the inbox becomes one list of agents in Needs you, Working and Done, each card holding its own plans, questions, approvals and links; the separate Today page folds into it as morning plan cards.
- **2026-10-22** — Assumed: `inbox-private-links` lands first, because the person said to assume the other inbox workspace merges.
- **2026-10-22** — Assumed: only agents opened by the morning `/daily` plan first, and a mid-day *get someone to* starts at once, because the person is in the chat to answer it and the ask was about the start of the day.
- **2026-10-22** — Assumed: every plan card starts on *Go*, because the person already chose these tasks for today, as the day page does.
- **2026-10-22** — Assumed: plan cards show after every plan is in or 15 minutes, whichever is first, so one slow agent can't hold up the morning.
- **2026-10-22** — Assumed: *Not today* closes the agent's workspace, which holds only a plan, and a one-off task becomes a reminder for the next day, so nothing is lost and nothing piles up.
- **2026-10-22** — Assumed: an agent is grouped by its workspace, which every item already carries, so an item from a chat nothing watches still lands on a card, and *Done* clears at the next day's start.
- **2026-10-22** — Assumed: *Working* shows the agent's latest step in one line, because the person asked to see what's running, and a full log belongs in the chat.
- **2026-10-22** — Built after PR #435 merged; a second look found six problems (a choice for a still-planning agent was refused, one failed status upload stopped status all day, a late *No plan* never reached its card, a sent *Not today* card showed its plan again, a repeated title, the migration missing from the inbox area), all fixed and reread clean. A choice sent while the agent still plans is held and delivered at its next stop.
- **2026-10-22** — The preview check found that a sent card moved to *Working* without ever showing *Sent*; fixed by showing *Sent* on the agent's card until the answered item leaves the list, which keeps both the *Working* move and the scenario's *Sent*.
