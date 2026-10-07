# The Access screens

Access's screens are five lists the owner switches between, a panel that opens one row beside its list, and one place where a person or a role is given what they can reach. [Employee access](employee-access.md) owns the rules these screens show: who the owner is, areas, keys, roles and managers.

## Five views

The owner's Access has five views, each with its own address, so Back and reload keep your place. A [manager](employee-access.md#managers) has the same five. Each is a table of one-line rows that share their columns; on a phone a row stacks.

- **People** opens first: who, whether they can sign in, their role, and a count such as *2 apps, 1 key*. The owner is the first row, with nothing to change. *You* and *Manager* sit beside the email.
- **Roles** counts each role's apps, keys and holders.
- **Apps** lists each [area](employee-access.md#areas-and-their-levels), the keys it uses and how many have it; one with no screen says *No screen*. Opened, it ticks roles and people, with the area's level and its keys' levels beside each tick. A tick starts at Look up.
- **Skills** lists each skill that does business work, how much it needs, such as *1 app, 2 keys*, and how many people can run it. Opened, a skill names each with its level. It is a list to read: [the Skills view](employee-access.md#the-skills-view) says how that is worked out.
- **Keys** lists every key the app holds, whether it is saved, how many apps use it, its [direct-use choice](employee-access.md#key-levels) and how many hold each level. Opened, a key sets that choice, with how many people it reaches, and every level for it. A key whose service is not set up says so. No value is ever shown. A key shows here once it is [in the registry](api-keys.md#a-saved-key-shows-in-access).

A level set in any view is the same level in the others. A count names the owner first. Someone who manages nothing sees only their own areas and keys, each with its level.

## One frame on every screen

Access sits in [the shared frame](mini-apps.md#the-home-page-lists-the-apps). The five views, each with a count, top every Access screen as its heading. Under them is the one spot for notices: *Saved*, the practice list, a step left.

- **The add button ends the views' line.** The assistant makes apps, skills and keys: a line under those lists says so.
- **A row opens in a panel beside its list**, at its own address, on a click that is not on a control. The list stays, with that row marked. The panel sits under the top bar; on a phone it fills the screen. *✕*, Escape, *Cancel* and a press beside it close it. A key not saved yet says its next step there. A skill's panel is only read, so it has no buttons.
- **Connect your assistant** is [Home's card](mini-apps.md#the-home-page-lists-the-apps) alone, with [its steps](employee-project.md).

## Change a role in the row

A person's role is a dropdown in their row. A pick saves at once and governs their next request. The notice offers *Undo*, which puts back their old role, or their own set with the same levels. Their panel sets areas and levels, and changes nothing until *Save access*.

## A row's menu

A person's row ends with `⋯`: *Open*, *Remove*, *Try again* while a sign-in step is unfinished, or *Add back* for a removed person. The owner's row has none, and a manager's has no *Remove* for a manager.

## A label says the level in words

A row counts; the names show where a person is opened. There a label is one area or one key with its level: *Orders Look up*, *Stripe Read*. A line marked `!` says what an app or a skill can't do yet: *Hello can look up, not change*, *Refund a customer: Stripe Read & write*. The row says *! 1 gap*, so a gap shows without opening anyone. Nothing is marked by colour alone.

## A set has three parts

A person's panel starts with their role; with their own set, and for a role, the panel has three parts. For the owner, a person's panel ends with the *Managing* group: [the manager tick](employee-access.md#managers), and what it means right under it.

1. **Start from** is a row of your apps and skills. Press one and the panel fills in what it needs: an app gives Look up on its area and Read on its keys; a skill gives every level it needs, changes included, since it can't run on less. No level is lowered. Press it again to take that back.
2. **Can reach** is the one list the app enforces: a level for every area, then for every key. Change any by hand. Under a level, a line says what it opens: *opens Orders app, Refund a customer*. A level a press raised is marked *new* until you save; a change by hand clears the mark on what you pressed.
   **The project is one tick** under that list, *Can install the project*: [Project code](employee-project.md#who-gets-what) at Read, with [its step](employee-project.md#the-owners-one-step-on-github) below while the app can't hand the project out.
3. **Can't yet** lists each app and skill the set has and can't fully use, with what is missing and *Give what it needs*. An app counts once its area is held: at Look up it needs Read on its keys, and at Look up & change whatever it does with them. A skill counts once every area it calls is held.

Nothing changes for the person until *Save access*; the panel says *Not saved yet* while a change waits.

## A save says how it went, and leaving asks first

After a save the list shows a box in [the notice spot](#one-frame-on-every-screen): *Saved*, or that the save did not finish, so check the list before trying again. Every question is a popup: *Remove*, and *Leave without saving?* when a panel with changes closes, by *✕*, *Cancel*, another view, any link or the Back button. A reload or a closed tab asks through the browser. Staying keeps the changes; a panel put back as it was closes at once.

Part of the [Cloudflare stack](README.md).
