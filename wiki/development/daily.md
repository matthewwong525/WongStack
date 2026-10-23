# The daily routine

Type `/daily` to start your day: the assistant checks who you are, shows your reminders, runs the steps the whole team shares, then your own, and replies with what it did and what is left for today. Then the chat stays on as your [chief of staff](#the-chief-of-staff), keeping the agents it started moving.

## What it does

1. **Checks who you are** from your company sign-in. Signed out, it shows you the sign-in link and waits; once you are in, it carries on by itself. It runs no step under a guessed name. With no company app, it uses your git email and says so.
2. **Shows what's waiting:** your [reminders](#reminders) due today or overdue, and work you left open.
3. **Runs the team's steps due today, then yours.**
4. **Replies with a short list:** steps run, steps skipped and why, and steps left for today. With no steps of your own yet, it offers to start your list.

You start it; the assistant never runs it on its own. For a run every morning, ask: [offer a routine](the-change-loop.md#offer-a-routine-or-an-app) covers it.

## The two files

Both live in the daily skill's folder, [`.claude/skills/daily/`](../../.agents/skills/daily/SKILL.md):

- **`team.md`**: the steps everyone runs. The owner keeps it.
- **`people/<name>.md`**: one person's steps, named like a [person page](../wiki-style.md#people), such as `jo-lee.md`. Its `emails` lists every email the person signs in with; `/daily` finds the file by any of them.

A step is one line, `- [days:] what to do`, with `(own workspace)` at the end for a long one. Jo's file:

```markdown
---
emails: [jo@example.com, jo.lee@gmail.com]
---
- Check yesterday's Shopify orders and flag refunds.
- Weekdays: /email (own workspace)
- Fridays: draft the week's update for the team.
```

Write days in plain words: *Mondays*, *weekdays*, *the first of the month*. A line with no days runs every day. The assistant reads the words against today's date, and the reply lists each skipped step, so a misread shows at once.

## Add a step

Say it: *add checking yesterday's orders to my daily*. The assistant edits your file, making it with your sign-in email if you have none, shows you the new list, and saves it like any other edit through [the change loop](the-change-loop.md). Your next `/daily` runs it.

Anyone changes their own steps. A team step changes only with the owner's review. The steps sit in a shared project, so keep health, family, and money out of them, by [the People rules](../wiki-style.md#people).

## Own workspaces

A step ending `(own workspace)` opens in a workspace of its own where your chat app can open one, such as Paseo, so its questions stay out of the morning chat. Each opens once a day: a second `/daily` opens nothing twice and names the ones already open. `daily.mjs opened` lists today's.

The record of what opened lives in the project's hidden git folder, `wong-daily/`, so every workspace of this copy shares it and nothing saves it. It is one per computer: a second computer may open the same step again that day.

Where the app can't open a workspace, the step runs right in the chat.

## Plan the day first

Each morning agent plans before it works, so you start the day knowing what each will do. It only reads, writes a short plan, and stops: it changes, saves, sends and pays for nothing yet. The plan says what it will do, what it needs from you, what it will ask before it acts outside its own work, and any question it has now. An agent that stops without a plan gets one nudge, then shows *No plan*.

Once every plan is in, or 15 minutes after the first agent opened, the plans wait for you together in [the inbox](reply-links.md#in-your-inbox-first), one card per agent under *Needs you*. Each card starts on *Go*. Flip any to *Not today*, answer its questions, add a note, then tap *Start N agents*: one send for every card.

- **Go** hands the agent your note and answers, and it starts working. The chief watches it like any other.
- **Not today** stops the agent and closes its workspace. A one-off task comes back as tomorrow's reminder; a step on your list comes back on its own days.
- **A card still planning, or with no plan,** says so and still takes *Go* (the agent works from its brief) or *Not today*. An agent still busy planning gets your answer at its next stop.

Without the inbox, the daily chat shows each plan and asks one question: which agents go today. A task you hand the chat later in the day, such as *get someone to research packaging suppliers*, starts at once, with no plan first.

The plan itself is a small file in `wong-daily/`, checked by the script, not judged: one outside the shape counts as no plan.

## Reminders

Say *remind me Friday to call Kim back about the kits*, in the daily chat or after `/daily`. The assistant works out the date and saves it at once as your own private note in [memory](memory.md#who-sees-what): teammates never see it, and there is no edit to save.

Each `/daily` lists your reminders due that day or overdue, oldest first, before the steps, with your newest five pieces of open work. A reminder stays listed each day until you say it's done, so a missed day loses nothing. When memory can't be read, it says `Not read: reminders` and runs the day anyway.

A job that comes back, such as a weekly report or the books on the first of the month, is a [step with days](#the-two-files), not a reminder.

## The chief of staff

After the morning reply, the daily chat keeps watching each agent it started, and each chat you hand it, for up to 10 hours. It never reads or writes to a chat you started yourself and didn't hand over. Where your chat app can't watch other chats, `/daily` runs its steps in the chat and only reports.

A small script notices when an agent stops; the chief only judges what the stop needs. Each stop lands in one of three buckets:

1. **Keep going.** *Tests pass; next I'll update the wiki page.* The chief replies *keep going* and shows `Kept going: <title>`.
2. **Obvious pick.** *Run the tests now (Recommended) / Skip them.* A safe answer, one that stays inside the work and can be undone, it picks and shows `Picked "Run the tests now": <title>`.
3. **Needs you.** *Which supplier should I order from?*, with no recommendation. It asks you at once, with the agent's options, and your phone gets a notification where the app sends one.

**A finished plan waits for you.** An agent that stops at its plan's link gets nothing from the chief: no reply, no build. The plan waits under *Needs you* in [the inbox](reply-links.md#in-your-inbox-first), or as `Needs you: <title> — plan to review` with its link in the daily chat when there is no inbox.

**It never approves alone** anything that sends or posts a message, pays or buys, publishes or merges, deletes or overwrites data, accepts terms, changes a business record, or shares a key, even when the agent recommends it. Those wait on one **approval list**. With [the inbox](reply-links.md#in-your-inbox-first), each waits there with *Approve* and *Don't approve*, and its *Needs you* questions too, plus one line in the chat with the link; a tap answers the agent. Without it, the list is a single question where you tick what to approve, and an answer typed in the chat always works. Answer in the agent's own chat instead, and its inbox item goes at the next check, with `Answered in its chat: <title>`. After five actions in a row on one agent with no word from you, the next stop comes to you too.

**Done means checked.** An agent's *done* reaches you as `Done: <title> — <proof>` only after the chief opened the link, saw the checks pass, or found the file or draft, and its inbox card moves to *Done* with that proof. Without proof, it asks the agent once, then tells you.

**The inbox shows where each agent stands.** While it watches, the chief keeps one card per agent in [the inbox](reply-links.md#in-your-inbox-first): *Needs you* when anything waits on your answer, *Working* with its latest step in one line and the chief's last action, *Done* with its proof. A card leaves when its agent closes; *Done* cards clear when the next day's watch starts.

Before it starts an agent, it writes a short brief: the goal, what *done* looks like, the choices already made, what the agent may do alone, and what it must ask first. A choice only you can make, it asks you then, in one round, not halfway through.

**It keeps the chat free.** It answers quick things itself: a question, a reminder, where its agents stand, a quick lookup. A bigger task, one that edits files, takes several steps, or needs more than a few minutes, it hands to its own workspace without asking, says `Handed to its own workspace: <title>`, and watches it. Say *do it here* with the task to keep it in the chat instead. Said right after that line, the chief closes the new workspace first, so the task never runs twice. Where your chat app can't open a workspace, it does the task in the chat.

Talk to it any time in that chat:

- *Rewrite the returns page on the store*, or *get someone to research packaging suppliers*, starts a new agent in its own workspace, working at once, and watches it.
- *Watch flashy-crab* hands it a chat you started yourself.
- *What's going on?* lists each agent, where it stands, and the chief's last action on it.

## Updates keep your steps

A WongStack update brings the new `/daily`, but never copies over or removes `team.md` or anything in `people/`: [the payload manifest](../../.agents/skills/wong-sync/references/payload-manifest.md#categories) leaves both to your install.

Part of [Development](README.md).
