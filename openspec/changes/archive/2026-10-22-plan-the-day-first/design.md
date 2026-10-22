# Design

## Context

`/daily` opens each `(own workspace)` step with `D open`, and the agent starts working from its brief at once ([`daily.mjs`](../../../.agents/skills/daily/scripts/daily.mjs) `open`). `D watch` prints a `stopped` line each time a watched agent goes idle, and the chief sorts it into a bucket by [`chief.md`](../../../.agents/skills/daily/references/chief.md). The inbox lists `plan`, `approval` and `question` items in one group per kind ([`List.tsx`](../../../app/src/apps/inbox/List.tsx)), and every item already carries the `workspace` it came from. `inbox-private-links` (PR #435, branch `sulky-mule`) adds `link` items and the *Or type your own answer* box; this change builds on it once it lands.

## Goals / Non-Goals

**Goals:** a planning phase on the watch's own rows; an inbox grouped by agent, not by kind; a morning plan card answered with the existing one-button send; a status line per watched agent.

**Non-Goals:** WongOS's day page and its board moves; a pick page in WongStack; any hours count; a live log of an agent; opening an agent's chat from the inbox.

## Decisions

### 1. A plan is a file the agent writes, read by the script

The brief gains a sixth part, *Plan first*: read only, write the plan as JSON to an absolute path in the day's state folder, `wong-daily/<day>.plans/<n>.json`, then stop. Every worktree of a copy shares `wong-daily/`, so the daily chat reads it directly. The shape is `{willDo: string[], needs: string[], askFirst: string[], questions: [{text, options?, several?}]}`, each list up to 6 lines of up to 300 characters, like `detailOf`'s limits. A file outside the shape counts as no plan.

Alternative: parse the agent's last chat message. Rejected: agent text is data, and a fixed file is checked by code, not judged.

### 2. `open --plan-first` marks the row; the watch knows the phase

`D open --plan-first` writes `phase: "planning"` and `plan: <path>` on the day row and appends *Plan first* to the brief it launches with. For a planning row, the watch prints `planned` (once) when the agent is idle and its file is sound, and `stopped` with `phase: "planning"` when idle without one. When every planning row has `planned` or `no-plan`, or 15 minutes after the first planning row's `at`, it prints `plans-ready` once. `chief.md`: a planning `stopped` gets one nudge (*write your plan to <path>, then stop*); the second marks it `no-plan`; a planning row is never sorted into a bucket.

### 3. One `start` item per planned agent, sent with everything else

On `plans-ready`, `D inbox add --kind start --agent <a>` puts each plan in the inbox as its own item: body `{state, plan?}`, actions `go` and `skip`, the same `workspace` as the agent. One item per agent, not one Today item, so the existing desk, drafts and send bar carry it unchanged: the page pre-picks `go` in the draft, and the one send button sends one tap per card with the note and answers in its text. Each reaches the daily chat as `Inbox answer for <title> (<agent>): Go …`.

Alternative: one `today` item holding every card and one `start` tap (the plan's first draft). Rejected with the unified list: it would be a second kind of send beside the one the list already has.

### 4. `D start` relays a Go or Not today

`D start --agent <a> --file <answer>`: on Go, sends *Go.* plus the note and answers (bucket `person`) and sets the row's phase to `working`; on Not today, sends *Not today; stop here*, archives the agent with `paseo archive`, and for a `task:` row saves a reminder for the next day through `remind`. An agent still running holds the choice on its row (`held`); the watch prints `held` at its next stop, and `D start --agent <a>` then sends it. A held row never gets a second card. Without the inbox, the chief asks by [the ask convention](../../../.agents/skills/explore/references/asking-the-user.md) and runs `D start` per agent the same way.

### 5. The watch reports status as one `agent` item per agent

Each watch pass upserts one `agent` item per watched row, id derived from the day and agent: body `{state: "planning" | "working" | "done", step?, action?, proof?}`, no actions. `step` is the first line of the agent's last message, cut to 200 characters; `action` is the chief's newest log line on it; `done` and `proof` come from a new `D done-agent --agent <a> --proof <text>` the chief runs after checking proof. An upsert is skipped when nothing changed; a write the inbox missed is retried next pass, and only an inbox with no company sign-in stops the reports. A `gone` agent's item closes; the watch's end closes all, as it closes decisions today. `D watch` only reports; it still never acts on an agent.

### 6. The page groups by workspace

`List.tsx` groups open items by `workspace`. A group with any answerable item (`question`, `approval`, `start`, `plan`, `link`) is *Needs you*; else its `agent` item's state picks *Working* or *Done*. `AgentCard.tsx` shows the title (the `agent` or first item's title), the status line, and the existing `Decision`, `PlanCard`, link row or new `StartCard` for each item inside. Keys and the send bar keep working over the flattened decisions, in card order. A group with no `agent` item (a chat nothing watches) shows only its items.

### 7. The worker validates, the page renders text

`item-put.ts`'s `wellFormed` checks `start` and `agent` bodies against their shapes and limits; an `agent` item refuses taps. `store.ts` returns both bodies as `detail`. Every string renders as React text; nothing is set as HTML. One additive migration rebuilds `inbox_items` with `start` and `agent` in its kind check, numbered after `sulky-mule`'s `20261023120000_inbox_link_items.sql`.

## Risks / Trade-offs

- [An agent ignores *read only* and starts working] → The brief is the only guard while planning; the chief still never approves a risky step. Accepted: the same trust the brief already carries.
- [Status writes every minute] → Skipped when unchanged, so a quiet agent writes nothing; a busy day of 10 agents writes at most 10 rows a minute.
- [An agent's latest step leaks something sensitive to the app] → One line, 200 characters, the same trust as an approval's text today; the spec caps it there.
- [Skill text over budget] → `callable-daily` also adds to `SKILL.md`; cut wording in `SKILL.md` and `chief.md` to offset, and rerun `measure-context.mjs --check` after bringing `main` in.
- [Lands before `sulky-mule`] → `/apply` stops if `inbox-private-links` is not on `main`.

## Migration Plan

Additive: old items keep their kinds and show inside a card by their workspace. A computer on an older WongStack sends no `start` or `agent` items, so its person sees cards with *Needs you* only. Rolling back drops only the two new kinds.

## UX

### Use-case brief

The person, at a desk or on a phone, opens the inbox to steer their agents: first thing in the morning to start the day, then a few times a day to unblock whoever is stuck. The job: see which agents need them, answer right there, and trust the rest are moving. Done is an empty *Needs you*. Common case: 3 to 10 agents a day, most of them *Working*, one or two needing an answer at a time. Edge cases: a chat nothing watches, a card still planning, an agent with no plan, the computer offline. Opened a few times a day.

### Flow

- **Morning:** inbox → *Needs you* holds a plan card per agent, on *Go* → flip a few to *Not today*, answer questions, add notes → *Start N agents* → cards move to *Working*.
- **During the day:** inbox → a card in *Needs you* → pick, approve or open its plan → *Send* → the card moves back to *Working*.

### Hierarchy

*Needs you* first and open; *Working* below as compact one-line rows; *Done* last, compact. The send button at the bottom is the one primary; it reads *Start N agents* while plan cards are picked, else *Send N answers*. On a card, the agent's title leads; inside it, each waiting item is laid out as today's decision card. *Approval* stays marked in the danger colour.

### Review

[review.html](review.html): *The inbox is a list of your agents* sketches the phone list with all three groups; *A plan card* sketches the morning cards on Go, Not today and still planning.

### Components

`card`, `button`, `badge`, `textarea`, `separator` from `app/src/components/ui/`, a `toggle-group` added with `npx shadcn@latest add toggle-group` for *Go / Not today*, and `inbox-private-links`' own-answer box, link row and `checkbox`. Nothing is hand-styled.
