# Daily

Daily keeps your AI chats moving while you are away: a check at each chat's stop sends back a safe next step, a background worker keeps your open chats in line, and `/schedule` runs work at set times. It works in Claude Code and Codex, and it needs no company app: your repo can add one through one profile file.

## Add it to your project

Paste this message into a chat in your project, in any AI tool:

> Add WongStack's Daily to this project. Follow the setup guide at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/daily/daily/references/setup.md

The AI copies the two Daily folders into your project, writes your settings file, runs the check, and saves the work. It asks you before each step that costs money or makes something public, and before it pushes. Until then, each new chat asks you once whether to set up Daily.

A [WongStack](https://github.com/matthewwong525/WongStack) project already has Daily: it comes with each update. The guide stops there and changes nothing.

## Update it

Paste this message:

> Update WongStack's Daily in this project. Follow the update steps at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/daily/daily/references/setup.md#update

It keeps your own edits to both folders. When one of your edits and a new change touch the same lines, it changes nothing and names each file.

## What you get

- **Check-ins:** when a chat stops while you are away, one read-only AI run judges the stop. A safe next step or a clear pick goes back to the chat; anything risky waits for you. *Stop check-ins* turns them off.
- **Your chats in line:** every 5 minutes, the worker looks at your open chats and tells a chat when another one changes its plan or covers its work. *Stop keeping my chats in line* turns it off.
- **Schedules:** `/schedule` runs a request as a new chat at a set time, such as *every weekday at 9*. With no schedule store in your repo, [Paseo](https://paseo.sh) keeps them on this computer.
- **A journal:** *What's going on?* gives what the background runs did since you last asked.

## What it needs

- **Node 20 or newer** on each computer.
- **Both folders** at `.claude/skills/daily/` and `.claude/skills/schedule/`, as real folders. Claude Code loads them from there, with no install step.
- **Your settings file:** `.agents/daily/<name>.json`, outside the folders, so an update never touches it.
- **Paseo, for schedules and the line-up,** unless your repo gives Daily its own schedule store. With neither, `/schedule` is off and the rest still works.
- **A profile, only if your repo has more to give:** `.agents/daily/profile.mjs`. It can add a schedule store, a sign-in, or chat names. Each part is optional.
- **For Codex**, one install on each computer, run from your project's folder:

  ```bash
  codex plugin marketplace add <this project's folder>
  codex plugin add daily@wongstack
  ```

[How WongStack uses Daily](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/daily.md) explains the settings, the profile, and the worker in full.
