# Employee access

Access is the mini app where the owner chooses who can sign in to the business app, which apps each person may use, and what each may do with [the keys the app holds](#key-levels). It opens for the owner with no command, and each person gets a prompt there to [connect their assistant](employee-project.md). The owner can let [managers](#managers) do the same work.

[Cloudflare's sign-in wall](cloudflare-access.md#the-wall-decides-who-the-app-decides-what) decides who gets in. The app decides the rest, on every request.

## How the owner is known

The owner is the person whose sign-in email equals `WONG_OWNER_EMAIL`, a committed, nonsecret setting in both Workers' `vars` in `app/wrangler.jsonc`. [Setup](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) writes it beside the `CF_ACCESS_*` ids.

A request is the owner's when the Worker has [verified its signed sign-in](cloudflare-access.md), the caller is a person, and the email matches. A service token, a git email, a first visit and a request body establish nothing, with one exception: [on a preview, the checker stands in for the owner](#the-checker-on-a-preview). The signed user id is written to the log the first time it is seen, never compared: the sign-in wall already trusts the email.

- **To change the owner**, run [the `access` step](#finish-access-setup) with `--owner-email <email>` and publish. Access has no transfer button: that would be a takeover path.
- **No `WONG_OWNER_EMAIL`** means an older install: every signed-in person keeps every app, and Access says its setup is not finished.
- **A site open with no sign-in** has nobody to know: Access stays unavailable until [the sign-in is on](cloudflare-access.md#open-until-the-card).

## The key

To add an email to the sign-in list, the live app holds one Cloudflare key of its own, in the production Worker's secret `WONG_ACCESS_LOGIN_MANAGEMENT`. Setup makes it, named `<worker>-access`, with the single permission *Access: Apps and Policies Write*, and stores it with the account and sign-in policy ids. The install record, `.claude/.wong-stack.json`, keeps the key's id under `components.accessKey`, for rotation.

- **Cloudflare scopes that permission to the whole account.** The app calls only its own Access application and its people policy. It refuses a policy shared with another application, a second policy that lets people in, and an application that does not cover this Worker. The verification service token's policy is left alone.
- **It is not the deploy token.** [The CI deploy token](cloudflare-credentials.md#the-ci-deploy-token) can read Access and never write it.
- **Staging never holds it.** `secrets:push` and `secrets:check` refuse the name on staging, and setup stores it on production alone ([staging's own bindings](staging-bindings.md#same-values-by-default-diverge-where-writes-escape)). A mini app's handler is handed no copy.

### Finish Access setup

An install made before Access, or one whose key is missing, needs one step: the `access` command of setup's [provisioning script](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/scripts/provision.mjs). Run it from the repo's main copy, where `.env` holds the saved Cloudflare token, with the script from [the latest WongStack source](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/references/latest-source.md):

```bash
node "<WongStack source>/.claude/skills/wong-setup/scripts/provision.mjs" access
```

It adds `WONG_OWNER_EMAIL` to both Workers' `vars`, makes or reuses the key, stores it in the live app, and makes or reuses [the read-only key for Cloudflare look-ups](cloudflare-credentials.md#the-read-only-look-up-key) in the live app. The preview app gets a copy only when Cloudflare accepts it; a report that names it as `waiting` is finished, not failed. It makes nothing else. Publish the config change through [the change loop](../development/the-change-loop.md). When the report's `accessKey.status` or `cloudflareReadKey.status` is `missing`, the saved token can not make keys: [send the key link](../development/secrets.md#receive-a-key-through-a-private-link) for a Cloudflare token with *Account API Tokens Write*, then run it again. Until then Access opens, saves app choices and levels, and says one step is left.

To rotate the key, delete the `<worker>-access` token in Cloudflare and run the step again.

## The first open

Permissions start by themselves the first time the owner opens Access, and take nothing away.

1. Until then, every signed-in person keeps every app, as before Access.
2. On the live app, the first open reads the sign-in list, lists each person on it with every built app ticked, and turns permissions on, in one step.
3. With no key, or a list that can not be read, nothing changes and permissions stay off: nobody is locked out.
4. [Key levels](#key-levels) start next, in the same open. Each person keeps, for every key their apps use, the level those apps use: an app that changes things with a key leaves its people at Read & write. Nobody is given a role, and nobody is given a key that only [works with no app](#a-key-with-no-app). A step that can not be saved changes nothing, and levels stay off.

On an app that already had people, levels start at the owner's next open; until then the app tick alone decides. Access says once that levels are on and that everyone kept what their apps use.

Once permissions are on, permission data that can not be read denies business work. It never falls back to open. The same holds for level data once levels are on.

## Add, change and remove people

*Add person* saves the email and the ticked apps, then adds the email to the sign-in list in the same request. Each person's row says whether they can sign in. Send them the website's address yourself.

- **A new person starts with no apps**, or with [a role](#roles). A newly built app shows up unticked for everyone but the owner; nobody edits a second list of apps. A tick for an app that is no longer built is ignored.
- **A failed sign-in step stays pending.** The app choices are saved; *Try again*, in [the row's menu](#a-rows-menu), finishes the step. After a Cloudflare call that timed out, the step waits about three minutes before it is called done, because the lost call could still land.
- **Removing a person blocks them at once.** Taking them off the sign-in list also ends every open session of the app, so everyone who remains signs in again. This can't be undone.

## Key levels

Each saved key has a level per person. A level is set once per key and holds in every app.

| Level | Look things up | Change or send things |
|---|---|---|
| None | no | no |
| Read | yes | no |
| Read & write | yes | yes |

- **The server checks the level on every request**, after the app tick and never in place of it: an app's screen, a direct call and an assistant's action are judged alike. A refusal names the key and the level needed, never the key's value. Lowering a level governs the person's next request, with no sign-out.
- **Ticking an app gives Read on the keys it uses, never Read & write.** Letting someone change things is always a choice the owner or [a manager](#managers) makes. Unticking an app leaves the level: it is the key's, not the app's.
- **What an app does with a key comes from its routes.** *Uses Stripe: look up, change* is worked out from [the keys each route lists](company-api.md#list-the-keys-a-route-uses), so the screen shows what the server enforces. An app is handed only the keys it lists.
- **A key that offers only Read shows two choices.** [The supplied Cloudflare key](company-api.md#look-things-up-in-cloudflare) is one.
- **The owner holds every key.** So does the verification service token, as it keeps every app. A manager holds only the levels they were given.

### A key with no app

A look-up can belong to a key alone. A person with that key's level can run it with no app ticked, and every app's actions stay refused. Cloudflare look-ups ship this way. For another key, ask the usual way, such as *let the team look up a charge*, and the assistant [builds the action](company-api.md#list-the-keys-a-route-uses). No key works alone until levels have started.

## Roles

A role is a named set of apps and key levels, such as *Sales*, that several people share.

- **A person has one role, or their own set, never both.** There are no exceptions on top of a role: one place answers what a person can do.
- **A role is read live.** Changing it governs every holder's next request.
- **Moving a person off a role, or removing a role people hold, takes nothing away.** Each person keeps what the role gave, as their own set.
- **A new role can start from a person's current access.** No role is made for you, and people who were there before roles keep their own set.
- **Only the owner or [a manager](#managers) makes, changes, gives or removes a role.** Giving one changes nobody's sign-in, and never makes its holder a manager.

## Managers

A manager is a person the owner lets manage Access. The owner ticks *Can manage Access* where the person is opened; nobody is a manager until then.

- **Only the owner picks managers.** The tick shows for the owner alone. A manager's save that names it is refused, so a manager never makes or unmakes one.
- **A manager does what the owner does in Access.** They add, change and remove people, make and edit roles, tick apps and set key levels, for anyone: themselves and other managers included.
- **A manager can't remove a manager, themselves included, or change the owner.** So the owner can always step in. [Who the owner is](#how-the-owner-is-known) stays a setup step.
- **It is full trust, and the panel says so under the tick.** A manager can give themselves any app or key level. Each change is recorded under the email of the person who made it; no screen shows that record yet.
- **Managing gives no app and no key.** A manager keeps their own apps, levels and home page. They do not hold every key as the owner does, and a route [with no entry](#what-a-persons-apps-govern) still denies them.
- **It is a switch on a person, never part of a role.** A manager edits roles, so a role that carried it would let a manager pick managers.
- **Taking it back works at once.** Untick it and the person's next request in Access is refused, with no sign-out; they keep their apps and levels. Removing a manager ends it too, and adding them back does not bring it back.
- **The missing key stays the owner's step.** With [no key yet](#finish-access-setup), a manager reads that one step is left for the owner, with nothing to copy: the step needs the owner's Cloudflare token.
- **A manager's open can finish [the first open](#the-first-open)** when the owner's could not, such as before the key arrived. It takes nothing away.

## Four views

The owner's Access has four views, each with its own address, so Back and reload keep your place. A [manager](#managers) has the same four. Each is a table of one-line rows that share their columns; on a phone a row stacks.

- **People** opens first: who, whether they can sign in, their role, and a count such as *2 apps, 1 key*. The owner is the first row, with nothing to change. *You* and *Manager* sit beside the email.
- **Roles** counts each role's apps, keys and holders.
- **Apps** lists each app, the keys it uses and how many have it. Opened, an app ticks roles and people, with its keys' levels beside each tick.
- **Keys** lists every key the app holds, whether it is saved, how many apps use it and how many hold each level. Opened, a key sets every level for it. No value is ever shown. A key shows here once it is [in the registry](api-keys.md#a-saved-key-shows-in-access).

A level set in any view is the same level in the others. A count names the owner first. Someone who manages nothing sees only their own.

### One frame on every screen

Access sits in [the shared frame](mini-apps.md#the-home-page-lists-the-apps). The four views, each with a count, top every Access screen as its heading. Under them is the one spot for notices: *Saved*, the practice list, a step left.

- **The add button ends the views' line.** The assistant makes apps and keys: a line under those lists says so.
- **A row opens in a panel beside its list**, at its own address, on a click that is not on a control. The list stays, with that row marked. The panel sits under the top bar; on a phone it fills the screen. *✕*, Escape, *Cancel* and a press beside it close it. A key not saved yet says its next step there.
- **Connect your assistant** is [Home's card](mini-apps.md#the-home-page-lists-the-apps) alone, with [its steps](employee-project.md).

### Change a role in the row

A person's role is a dropdown in their row. A pick saves at once and governs their next request. The notice offers *Undo*, which puts back their old role, or their own set with the same apps and levels. Their panel sets apps and levels, and changes nothing until *Save access*.

### A row's menu

A person's row ends with `⋯`: *Open*, *Remove*, *Try again* while a sign-in step is unfinished, or *Add back* for a removed person. The owner's row has none, and a manager's has no *Remove* for a manager.

### A label says the level in words

A row counts; the names show where a person is opened. There a label is one app, or one key with its level: *Stripe Read*, and a line marked `!` says what an app can't do yet: *Hello can look up, not change*. The row says *! 1 gap*, so a gap shows without opening anyone. Nothing is marked by colour alone.

### Give an app and its level in one place

A person's panel starts with their role; with their own set, and for a role, you tick apps and pick levels there. For the owner, it ends with the *Managing* group: [the manager tick](#managers), and what it means right under it.

- **A ticked app shows the level of each key it uses under its tick**, with a hint that names the fix: *Pick Read & write to let it*. An unticked app says which keys it uses and shows no level.
- **A key two ticked apps share shows under both and is one level.** Change it under one and the other follows, and each says the level is shared.
- **Keys no ticked app uses sit in a group below**, such as [a key with no app](#a-key-with-no-app).

### A save says how it went, and leaving asks first

After a save the list shows a box in [the notice spot](#one-frame-on-every-screen): *Saved*, or that the save did not finish, so check the list before trying again. Every question is a popup: *Remove*, and *Leave without saving?* when a panel with changes closes, by *✕*, *Cancel*, another view, any link or the Back button. A reload or a closed tab asks through the browser. Staying keeps the changes; a panel put back as it was closes at once.

## What a person's apps govern

A person's current apps decide their app cards, direct visits, app calls and assistant actions; client state and an existing sign-in grant nothing more. Unticking an app blocks the next request. A mini app's routes follow its folder name. A route in [the main router](../../app/worker/api/router.ts) lists the apps it serves, and one with no entry denies everyone but the owner ([map business routes](company-api.md#map-business-routes-before-employee-policy)). Once permissions are on, only the owner and listed people pass. The verification service token keeps every built app, as before, so preview walks and the look at the live app still open them. On the live app it never manages people; [on a preview it stands in for the owner](#the-checker-on-a-preview).

**An app's name and screen layout stay in the page everyone downloads.** A signed-in teammate without an app sees no card for it, can't open it, and gets none of its data or actions. Its title, its description and its screen's code are still packed into the page, so someone who reads that code could find them. Keep anything private in the app's data, never in its screen.

## The practice list on previews

A preview has its own people, roles and key levels. On staging the owner opens Access, adds people and chooses apps and levels against the preview's database, which [starts from made-up people](d1-pipeline.md#seeded-staging-production-untouched) with permissions and levels on: one role held by two people, one person with their own set who is also a manager, and one with no level. A preview holds no sign-in list key and makes no Cloudflare call for the list, and the screen says the real sign-in list is not touched. When a preview holds no [read-only look-up key](cloudflare-credentials.md#the-read-only-look-up-key), Keys shows Cloudflare as *Not on previews yet*, with no step to ask for: none can finish it there. A practice person can sign in to a preview only if the real list admits them.

### The checker on a preview

On staging and its previews, the verification service token counts as the owner: it opens Access's four views and saves against the practice list, so [a preview walk](../development/browsing.md) can click through a change to Access and show pictures of it.

- **Only where `WONG_ENVIRONMENT` is `staging`.** That name is committed in `app/wrangler.jsonc`, never something a request sets. On the live app, and on a local run, the same token is refused: it keeps every app and manages nobody.
- **Nothing real is in reach.** A preview holds no sign-in-list key, makes no Cloudflare call, and its people are made up.
- **The checker no longer sees the view of someone who is not the owner** on a preview, a manager's included; code tests cover those views, and a waiting sign-in.

## What Access leaves alone

- **The project's code.** Signing in to the app gives no access to it. The owner grants and removes that where the code is kept.
- **Memory.** [Memory access](../development/memory-key.md) keeps its own setup.
- **Downloaded copies.** Removing a person does not reach what they already saved.

Part of the [Cloudflare stack](README.md).
