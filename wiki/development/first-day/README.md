# A teammate's first day

A new teammate's first day goes in five steps, from the owner adding them to their first saved change. The owner and the new person both read this page; each step links to the page that owns it.

1. **The owner or an Admin adds them** in [Access](../../stack/employee-access.md#add-change-and-remove-people) and ticks *Can install the project*. A popup gives the message to send them.
2. **The owner sends that message** to the new person, by email or chat.
3. **The new person pastes it into their assistant.** That first chat is their start: it shows a sign-in link, they sign in to the app with the email the message names, and [setup](../../stack/employee-project.md#install-in-one-step) puts the project on their computer. A person who is not in Access yet is stopped at the sign-in, and asks the owner or an Admin. Setup's last words tell them to open a new chat for Lesson 1.
4. **Lesson 1: [use skills](use-skills.md)**, in a new chat, about 20 minutes. They tell the assistant who they are, learn what a skill is, and run one for their job. Nothing in the project changes.
5. **Lesson 2: [make your first change](make-a-change.md)**, in another new chat. They plan, build and save one small, real change from their job. The lesson stops at the save.

**What the owner sees:** one saved change from each new person, with a link to look at it. The owner or an Admin [publishes it](../../stack/employee-project.md#who-publishes), or the person does later with `/ship` when they hold *Can publish*.

**Why a new chat for each lesson.** The first chat started before the project was on the computer, so it knows none of the project's skills or rules. A new chat in the project's folder loads them. The same is true of each new task: [one task, one workspace](../the-change-loop.md#one-task-one-workspace).

**Open a lesson** by typing `lesson 1` or `lesson 2` as the first message of a new chat in the project. The [`lesson`](../../../.agents/skills/lesson/SKILL.md) skill reads the lesson's page and teaches it one step at a time. It waits for the person after each step.

- **With Paseo:** open a new workspace on the project, choose *New worktree* from *main*, and type the lesson there.
- **With another assistant:** open a new chat in the project's folder, and type the lesson there.

A teammate who set up before these lessons existed can type `lesson 1` in a new chat at any time.

Part of [development](../README.md).
