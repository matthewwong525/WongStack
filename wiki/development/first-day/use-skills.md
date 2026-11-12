# Use skills

Lesson 1 teaches a new teammate how to work with their assistant in this project: what a skill is, how to start one, and one task per chat. It takes about 20 minutes and changes no file in the project. It is the first lesson of [a teammate's first day](README.md).

**Open it:** type `lesson 1` as the first message of a new chat in the project. With Paseo, open a new workspace on the project and choose *New worktree* from *main* first. The assistant teaches one step, then waits for you.

## 1. Who you are

The assistant finds you by the email your project uses (`git config user.email`), or asks for it. When no page in the [company knowledge](../../stack/company-knowledge.md) lists that email, it asks who you are and what you work on. It writes a short page about you, `knowledge/people/<name>.md`, links it from the people list, and [saves it](../../stack/company-knowledge.md#save-a-page): your team sees it at once. The assistant uses that page in later chats, for example to suggest work that fits your job.

- **Your page is there already:** the assistant reads it, and asks only for what it does not hold. It writes no second page.
- **The project has no company knowledge:** the assistant says it skips the page, and goes on.

## 2. What a skill is

A skill is a set of steps the assistant follows for one kind of work, such as planning a change or checking your day. Type `/` to see the list of skills. Each one has a name and one line that says what it does.

## 3. Ask in plain words

You do not need the skill names. Say what you want in your own words, such as *what is going on today?* or *remind me Friday to call the supplier*. The assistant picks the skill that fits. Type the name only when you want that skill and no other.

## 4. Answer a question card

When the assistant needs a choice from you, it shows a question card: two or three answers, the best one first. Tap an answer, or type your own. Try it now on the card the assistant shows you.

## 5. Run one skill for your job

Run one real skill that fits your work and changes no file, for example:

- *What's going on?*, which shows what [the daily](../daily.md#ask-in-any-chat) did and, with Paseo, what each chat is doing.
- A search of the team's memory, such as *what did we decide about prices?*
- A look-up in one of your apps, such as *which orders came in today?*

You type it. The assistant shows you which skill ran.

## 6. One task, one chat

Keep each task in its own chat, so the assistant keeps its mind on that one task ([one task, one workspace](../the-change-loop.md#one-task-one-workspace)).

- **With Paseo:** each task gets its own workspace, on *New worktree* from *main*. When a task is done, type `/close`: it saves what the chat learned and closes the workspace.
- **With another assistant:** open a new chat in the project's folder for each task. Type `/close` when a task is done, then close the chat.

Each plan that waits on your review shows as one row in the Inbox of [your company app](../../stack/company-api.md), under *Needs you* ([your chat list](../daily.md#your-chat-list)).

## 7. Open Lesson 2

Open a new chat or workspace the same way you opened this one, and type `lesson 2`: [make your first change](make-a-change.md).

Part of [a teammate's first day](README.md).
