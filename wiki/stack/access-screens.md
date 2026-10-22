# The Access screens

Access's screens are three lists the owner switches between, People, Roles and Services, and a panel that opens beside a list for one row. [Employee access](employee-access.md) owns the rules these screens show: who the owner is, apps, keys, roles and Admin.

## Three views

The owner's Access has three views, each with its own address, so Back and reload keep your place. An [Admin](employee-access.md#admin) has the same three. Each is a table of one-line rows that share their columns; on a phone a row stacks.

- **People** opens first: who, whether they can sign in, their role, and a count such as *2 apps, 1 key*. The owner is the first row, with nothing to change. *You* sits beside your own email. Under the table, *Can push on GitHub* lists [who can open previews through GitHub](preview-access.md#people-who-can-push-on-github), with one field and *Save* for a row that *Needs an email*.
- **Roles** counts each role's apps, keys and holders. [Admin](employee-access.md#admin) is first and reads *Everything*; opened, its panel says what it gives and who holds it, with nothing to save.
- **Services** lists every key: what it's for, and whether it's saved. [The Services view](#the-services-view) says more.

Apps and key levels are set only [where a person or a role is opened](#a-panel-has-apps-and-keys): Services shows each key's status, never a level. To give one app or one key level to several people, give it to their role. Someone who manages nothing sees only their own apps and key levels, and no Services view.

## One frame on every screen

Access sits in [the shared frame](mini-apps.md#the-home-page-lists-the-apps). The views, each with a count, top every Access screen as its heading. Under them is the one spot for notices: *Saved*, the practice list, a step left, and [who an update unticked](#unticked-in-this-update).

- **The view's add button ends the views' line.** The assistant makes apps and keys, so nothing adds one here.
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

Services is a status list: no button, no key value, no level, and no box to type a key in.

- **A row is the key's name**, [its purpose](api-keys.md#a-saved-key-shows-in-access), and *Saved* or *Not saved*. A key [used directly](employee-access.md#key-levels) says *also used directly* and links its API guide.
- **An unsaved key says to ask the assistant for its key link**: a value comes in only through [the private link](api-keys.md#give-it-through-the-private-link). A key setup makes says to ask the assistant to finish Access setup.
- **No keys yet** says the assistant sends a private link once you ask it to connect a service.
- **Project code is not a row**: its level is set in a person's or role's panel, as [the project's own key](employee-project.md#who-gets-what).

## A save says how it went, and leaving asks first

After a save the list shows a box in [the notice spot](#one-frame-on-every-screen): *Saved*, or that the save did not finish, so check the list before trying again. Every question is a popup: *Remove*, and *Leave without saving?* when a panel with changes closes, by *✕*, *Cancel*, another view, any link or the Back button. A reload or a closed tab asks through the browser. Staying keeps the changes; a panel put back as it was closes at once.

Part of the [Cloudflare stack](README.md).
