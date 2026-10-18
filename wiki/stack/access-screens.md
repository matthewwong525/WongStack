# The Access screens

Access's screens are three lists the owner switches between, People, Roles and Services, and a panel that opens beside a list for one row. [Employee access](employee-access.md) owns the rules these screens show: who the owner is, apps, keys, roles and Admin; [MCP connections](mcp-connections.md) owns how MCPs work.

## Three views

The owner's Access has three views, each with its own address, so Back and reload keep your place. An [Admin](employee-access.md#admin) has the same three. Each is a table of one-line rows that share their columns; on a phone a row stacks.

- **People** opens first: who, whether they can sign in, their role, and a count such as *2 apps, 1 key*. The owner is the first row, with nothing to change. *You* sits beside your own email.
- **Roles** counts each role's apps, keys and holders. [Admin](employee-access.md#admin) is first and reads *Everything*; opened, its panel says what it gives and who holds it, with nothing to save.
- **Services** is for everyone: every MCP on the app, with your own Connect. The owner and Admins also see every key. [The Services view](#the-services-view) says more.

Apps and key levels are set only [where a person or a role is opened](#a-panel-has-apps-and-keys): Services shows each key's status and each person's own MCPs, never a level. To give one app or one key level to several people, give it to their role. Someone who manages nothing sees only their own apps and key levels, and Services.

## One frame on every screen

Access sits in [the shared frame](mini-apps.md#the-home-page-lists-the-apps). The views, each with a count, top every Access screen as its heading. Under them is the one spot for notices: *Saved*, the practice list, a step left, and [who an update unticked](#unticked-in-this-update).

- **The view's add button ends the views' line**; in Services it adds an MCP. The assistant makes apps and keys, so nothing adds one here.
- **A row opens in a panel beside its list**, at its own address, on a click that is not on a control. The list stays, with that row marked. The panel sits under the top bar; on a phone it fills the screen. *✕*, Escape, *Cancel* and a press beside it close it.
- **Connect your assistant** is [Home's card](mini-apps.md#the-home-page-lists-the-apps) alone, with [its steps](employee-project.md).

## Unticked in this update

After an update that [ended *look only* on apps](employee-access.md#unticked-in-an-update), the notice spot names each person and role who lost an app, with the app: *kim@example.com: Orders*. It is marked `!` and says *Tick an app to give it back*. It stays until the next save in Access, of anything.

## Change a role in the row

A person's role is a dropdown in their row. A pick saves at once and governs their next request. The notice offers *Undo*, which puts back their old role, or their own set with the same apps and levels. Their panel sets apps and key levels, and changes nothing until *Save access*.

Picking [Admin](employee-access.md#admin) asks first, *Make kim@example.com an Admin?*, in the row and at *Save access*: it is full trust. Only the owner's dropdown offers it. For anyone else an Admin's role is plain words, with nothing to pick.

## A row's menu

A person's row ends with `⋯`: *Open*, *Remove*, *Try again* while a sign-in step is unfinished, or *Add back* for a removed person. The owner's row has none, and an Admin's has no *Remove* for an Admin.

## A label says the level in words

A row counts; the names show where a person is opened. There a label is an app's name, or a key with its level: *Orders*, *Stripe Read*. No row and no label marks something as missing: an app needs no key level, so nothing can fall short. Nothing is marked by colour alone.

## A panel has apps and keys

A person's panel starts with their role. With [Admin](employee-access.md#admin) it says only that the person has every app and key, manages Access and is fully trusted. With their own set, and for any other role, the panel has two groups, then one tick.

1. **Apps** is a tick for each app. A tick gives [all of the app](employee-access.md#apps), and no key level.
2. **Keys** is a level for each key: *None*, *Read* or *Read & write*. It governs [the key used by itself](employee-access.md#key-levels), never an app, and its first line says so: *A level lets a person's assistant use this key by itself. Apps need no level.*
   - **Each key says whether it is saved**, beside its name: *Stripe · Saved*. No value is ever shown. A key shows once it is [in the registry](api-keys.md#a-saved-key-shows-in-access), and a level can be set before the key arrives.
   - **An unsaved key names the step left**: ask for its link, or [finish Access setup](employee-access.md#finish-access-setup) for the key setup makes. The owner gets a request to copy; an Admin reads that the step is the owner's.
   - **A key set up for [direct use](employee-access.md#key-levels) says so** under its level: *also reaches Notion directly*. Nothing switches it on or off but the level.
3. **Project code is two ticks.** *Can install the project* is [Project code](employee-project.md#who-gets-what) at Read; it also lets the person [save changes](employee-project.md#save-a-change-through-the-app), and a line under it says so. *Can publish* is Read & write: their changes go live once the checks pass. It needs the install tick, and unticking install clears it. [Its step](project-git-route.md#the-owners-one-step-on-github) shows below while the app can't hand the project out, then *Saving needs one more step* while it can't save yet.

Nothing changes for the person until *Save access*; the panel says *Not saved yet* while a change waits.

## The Services view

Services lists what a chat can reach outside the app. It shows no key value and no sign-in, and has no box to type a key in.

- **MCPs, for everyone.** A row is the MCP's name, *N connected*, and a *shared by kim@example.com, look-ups only* tag when someone [shares their sign-in](mcp-connections.md#share-your-sign-in-with-the-team). Under it is your own state: *Connected* with your account and date, *Needs a new sign-in*, or *Connect*.
  - **One main button per row**: *Connect*, *Connect again*, or *Connect mine* while you use a teammate's share. *Disconnect* and *Refresh* are quiet buttons.
  - **The share box sits under your own connected row**: *Let the team use my sign-in*, then *Look-ups only* or *Everything*. A change saves at once. While someone else shares, the box is off and names them.
  - ***Remove* shows only to [who may remove](mcp-connections.md#who-can-add-and-remove)**, and asks first. The owner or an Admin also gets *Stop sharing* on a shared row.
- **Keys, for the owner and Admins**, above the MCPs. A row is the key's name, [its purpose](api-keys.md#a-saved-key-shows-in-access), and *Saved* or *Not saved*. A key [used directly](employee-access.md#key-levels) says so. An unsaved key says to ask the assistant for its key link: a value comes in only through [the private link](api-keys.md#give-it-through-the-private-link).
- ***+ Add*** opens a dialog: the MCP's address and a name. A failed add keeps the dialog open, with what you typed and the reason under it.
- **No MCPs yet** says the assistant can connect one, beside *+ Add*.
- **A link from a chat opens on one MCP**: `/apps/access/services/<id>` scrolls its row into view with *Connect* ready.
- **Before the update's last step**, Services says connecting MCPs needs one more step from the owner.

## A save says how it went, and leaving asks first

After a save the list shows a box in [the notice spot](#one-frame-on-every-screen): *Saved*, or that the save did not finish, so check the list before trying again. Every question is a popup: *Remove*, and *Leave without saving?* when a panel with changes closes, by *✕*, *Cancel*, another view, any link or the Back button. A reload or a closed tab asks through the browser. Staying keeps the changes; a panel put back as it was closes at once.

Part of the [Cloudflare stack](README.md).
