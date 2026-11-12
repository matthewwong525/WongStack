# Access

Access decides who can sign in to your app, which parts each person may open, and what each person's AI assistant may do with the app's keys. It gives the owner a page to choose all of this, and a gate your app's routes ask on every request. Services come with it: the app holds each outside service's key, and a chat calls the service through the app.

## Add it to your project

Paste this message into a chat in your project, in any AI tool:

> Add WongStack's Access to this project. Follow the setup guide at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/access/references/setup.md

The AI copies this folder into your project, connects it to your app's sign-in and database, adds the route and the gate, runs the store check, and saves the work. It asks you before each step that costs money or makes something public, and before it pushes. Until then, each new chat asks you once: *Access isn't set up yet. Set it up now?*

A [WongStack](https://github.com/matthewwong525/WongStack) project already has Access: it comes with each update. The guide stops there and changes nothing.

## Update it

Paste this message:

> Update WongStack's Access in this project. Follow the update steps at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/access/references/setup.md#update

It keeps your own edits to this folder. When one of your edits and a new change touch the same lines, it changes nothing and names each file.

## What you get

- **The Access page**: the owner, or an Admin the owner picks, adds people, gives each the apps they may open, and sets what their assistant may do with each key: *Read* or *Read & write*. Roles give a group the same set.
- **A gate**: `gate(request, need)` answers `null`, or the refusal your route sends back as it is.
- **People from a chat**: `/access` says who has what, and adds, changes or removes a person after you say yes.
- **Services**: a list of the keys you may use, a call through the app with your level, and a definition of each call your project uses. Keys reach the app sealed, never in a chat.
- **A sign-in list kept in step**, when your sign-in wall has one: a person you add can sign in, and a person you remove can not.

## What it needs

- **A JavaScript server**: Node, Cloudflare Workers, Deno or Bun. Access answers a standard `Request` with a standard `Response`.
- **A sign-in that tells your server who is asking**: a Cloudflare sign-in wall, or your app's own login. Access never signs people in itself.
- **A database** for a store that passes the check in [`store/contract.mjs`](store/contract.mjs). Start from [the stand-in store](store/stand-in.mjs).
- **This folder** at `.claude/skills/access/`, as a real folder, and two files outside it, so an update never touches them: your slots, and `.agents/access/slots.json`, which names them.
- **For Codex**, one install on each computer, run from your project's folder:

  ```bash
  codex plugin marketplace add <this project's folder>
  codex plugin add access@wongstack
  ```

[How WongStack uses Access](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/employee-access.md) explains people, apps, roles and key levels in full.
