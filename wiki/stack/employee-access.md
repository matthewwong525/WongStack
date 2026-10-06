# Employee access

Access is the mini app where the owner chooses who can sign in to the business app, which [areas](#areas-and-their-levels) each person may use and how far, and what each may do with [the keys the app holds](#key-levels). It opens for the owner with no command, and each person gets a prompt there to [connect their assistant](employee-project.md). The owner can let [managers](#managers) do the same work.

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

It adds `WONG_OWNER_EMAIL` and [the project's name](employee-project.md#how-the-app-hands-the-project-out) to both Workers' `vars`, makes or reuses the key, stores it in the live app, and makes or reuses [the read-only key for Cloudflare look-ups](cloudflare-credentials.md#the-read-only-look-up-key) in the live app. The preview app gets a copy only when Cloudflare accepts it; a report that names it as `waiting` is finished, not failed. It makes nothing else. Publish the config change through [the change loop](../development/the-change-loop.md). When the report's `accessKey.status` or `cloudflareReadKey.status` is `missing`, the saved token can not make keys: [send the key link](../development/secrets.md#receive-a-key-through-a-private-link) for a Cloudflare token with *Account API Tokens Write*, then run it again. Until then Access opens, saves app choices and levels, and says one step is left.

To rotate the key, delete the `<worker>-access` token in Cloudflare and run the step again.

## The first open

Permissions start by themselves the first time the owner opens Access, and take nothing away.

1. Until then, every signed-in person keeps every app, as before Access.
2. On the live app, the first open reads the sign-in list, lists each person on it with every built area at Look up & change, and turns permissions on, in one step.
3. With no key, or a list that can not be read, nothing changes and permissions stay off: nobody is locked out.
4. [Key levels](#key-levels) start next, in the same open. Each person keeps, for every key their apps use, the level those apps use: an app that changes things with a key leaves its people at Read & write. Nobody is given a role, and nobody is given a key that only [works with no app](#a-key-with-no-app). A step that can not be saved changes nothing, and levels stay off.

On an app that already had people, key levels start at the owner's next open; until then the area alone decides. Access says once that levels are on and that everyone kept what their apps use. [Area levels](#areas-and-their-levels) have no start: they arrive with the update.

Once permissions are on, permission data that can not be read denies business work. It never falls back to open. The same holds for level data once levels are on.

## Areas and their levels

An area is one named group of work in the app, such as Orders. Every app is an area. An area may also [have no screen](mini-apps.md#an-area-with-no-screen), when it exists for skills and assistants: Access lists it marked *No screen*, you give it like an app, and Home shows no card for it.

| Level | Look things up | Change or send things |
|---|---|---|
| None | no | no |
| Look up | yes | no |
| Look up & change | yes | yes |

- **The server checks the level on every request**, by [what the call does](company-api.md#list-the-keys-a-route-uses), before any key: a screen's call, a direct call and an assistant's action are judged alike. Opening an app's screen needs Look up. A refusal names the area and the level needed. Lowering a level governs the person's next request, with no sign-out.
- **A newly given area starts at Look up.** Letting someone change things is the owner's choice, or [a manager's](#managers).
- **The update took nothing away.** Every app a person or a role held before levels reads as Look up & change, which is what a tick gave. Lower one any time.
- **The owner holds every area at Look up & change.** So does the verification service token.

## Add, change and remove people

*Add person* saves the email with their areas and levels, then adds the email to the sign-in list in the same request. Each person's row says whether they can sign in. Send them the website's address yourself.

- **A new person starts with no apps**, or with [a role](#roles). A newly built area shows up at None for everyone but the owner; nobody edits a second list of them. A level for an area that is no longer built is ignored.
- **A failed sign-in step stays pending.** The app choices are saved; *Try again*, in [the row's menu](access-screens.md#a-rows-menu), finishes the step. After a Cloudflare call that timed out, the step waits about three minutes before it is called done, because the lost call could still land.
- **Removing a person blocks them at once.** Taking them off the sign-in list also ends every open session of the app, so everyone who remains signs in again. This can't be undone.

## Key levels

Each saved key has a level per person. A level is set once per key and holds in every app.

| Level | Look things up | Change or send things |
|---|---|---|
| None | no | no |
| Read | yes | no |
| Read & write | yes | yes |

- **The server checks the level on every request**, after the area's level and never in place of it: an app's screen, a direct call and an assistant's action are judged alike. A refusal names the key and the level needed, never the key's value. Lowering a level governs the person's next request, with no sign-out.
- **Giving an area gives Read on the keys it uses, never Read & write.** Letting someone change things is always a choice the owner or [a manager](#managers) makes. Taking the area away leaves the level: it is the key's, not the app's.
- **What an app does with a key comes from its routes.** *Uses Stripe: look up, change* is worked out from [the keys each route lists](company-api.md#list-the-keys-a-route-uses), so the screen shows what the server enforces. An app is handed only the keys it lists.
- **A key that offers only Read shows two choices.** [The supplied Cloudflare key](company-api.md#look-things-up-in-cloudflare) is one.
- **The owner holds every key.** So does the verification service token, as it keeps every app. A manager holds only the levels they were given.

### A key with no app

A look-up can belong to a key alone. A person with that key's level can run it with no app ticked, and every app's actions stay refused. Cloudflare look-ups and [Project code](employee-project.md#who-gets-what) ship this way. For another key, ask the usual way, such as *let the team look up a charge*, and the assistant [builds the action](company-api.md#list-the-keys-a-route-uses). No key works alone until levels have started.

## Roles

A role is a named set of area and key levels, such as *Sales*, that several people share.

- **A person has one role, or their own set, never both.** There are no exceptions on top of a role: one place answers what a person can do.
- **A role is read live.** Changing it governs every holder's next request.
- **Moving a person off a role, or removing a role people hold, takes nothing away.** Each person keeps what the role gave, as their own set.
- **A new role can start from a person's current access.** No role is made for you, and people who were there before roles keep their own set.
- **Only the owner or [a manager](#managers) makes, changes, gives or removes a role.** Giving one changes nobody's sign-in, and never makes its holder a manager.

## Managers

A manager is a person the owner lets manage Access. The owner ticks *Can manage Access* where the person is opened; nobody is a manager until then.

- **Only the owner picks managers.** The tick shows for the owner alone. A manager's save that names it is refused, so a manager never makes or unmakes one.
- **A manager does what the owner does in Access.** They add, change and remove people, make and edit roles, and set area and key levels, for anyone: themselves and other managers included.
- **A manager can't remove a manager, themselves included, or change the owner.** So the owner can always step in. [Who the owner is](#how-the-owner-is-known) stays a setup step.
- **It is full trust, and the panel says so under the tick.** A manager can give themselves any app or key level. Each change is recorded under its maker's email; no screen shows that record yet.
- **Managing gives no app and no key.** A manager keeps their own apps, levels and home page, and a route [with no entry](#what-a-persons-apps-govern) still denies them.
- **It is a switch on a person, never part of a role.** A manager edits roles, so a role that carried it would let a manager pick managers.
- **Taking it back works at once.** Untick it and the person's next request in Access is refused, with no sign-out; they keep their apps and levels. Removing a manager ends it too; adding them back does not restore it.
- **The missing key stays the owner's step.** With [no key yet](#finish-access-setup), a manager reads that one step is left for the owner, with nothing to copy: it needs the owner's Cloudflare token.
- **A manager's open can finish [the first open](#the-first-open)** when the owner's could not, such as before the key arrived. It takes nothing away.

A new Access save takes a [`Core`](../../app/worker/employee-access/core.ts), the sign-in check's pass; an owner-only one takes an `OwnerCore`. Building either by hand [fails the checks](../../app/worker/checked-caller.test.ts).

## The Skills view

Access lists each skill that [does business work through the app](company-api.md#build-a-skill-on-actions), with what it needs: each area and key at the level its actions need, and Project code, since a skill reaches a device [with the project](employee-project.md#who-gets-what).

- **Nobody is given a skill.** A person can run one once their areas and key levels cover all of it. Access stores no tick for a skill, and the server judges each of its calls by the caller's areas and keys alone.
- **Opened, a skill names who can run it**, and for every other role and person what they lack: *Office: Stripe Read & write*. The owner always can.
- **You give it where a person or a role is opened**: press the skill under [*Start from*](access-screens.md#a-set-has-three-parts).
- **A row's gap counts a skill** once the person holds every area it calls and a level or a key falls short. A skill they hold no area of is not theirs to miss.
- **With no such skill yet**, the view says so: ask your assistant to make one.

## The screens

Access has five views: People, Roles, Apps, Skills and Keys. [The Access screens](access-screens.md) owns how they look and behave.

## What a person's apps govern

A person's current areas and levels decide their app cards, direct visits, app calls and assistant actions; client state and an existing sign-in grant nothing more. Taking an area away blocks the next request. A mini app's routes follow its folder name. A route in [the main router](../../app/worker/api/router.ts) lists the apps it serves, and one with no entry denies everyone but the owner ([map business routes](company-api.md#map-business-routes-before-employee-policy)). Once permissions are on, only the owner and listed people pass. The verification service token keeps every built app, as before, so preview walks and the look at the live app still open them. On the live app it never manages people; [on a preview it stands in for the owner](#the-checker-on-a-preview).

**An app's name and screen layout stay in the page everyone downloads.** A signed-in teammate without an app sees no card for it, can't open it, and gets none of its data or actions. Its title, its description and its screen's code are still packed into the page, so someone who reads that code could find them. Keep anything private in the app's data, never in its screen.

## The practice list on previews

A preview has its own people, roles and key levels. On staging the owner opens Access, adds people and chooses apps and levels against the preview's database, which [starts from made-up people](d1-pipeline.md#seeded-staging-production-untouched) with permissions and levels on: one role held by two people, one person with their own set who is also a manager, and one who only looks things up and holds no key. A preview holds no sign-in list key and makes no Cloudflare call for the list, and the screen says the real sign-in list is not touched. When a preview holds no [read-only look-up key](cloudflare-credentials.md#the-read-only-look-up-key), Keys shows Cloudflare as *Not on previews yet*, with no step to ask for: none can finish it there. A practice person can sign in to a preview only if the real list admits them.

### The checker on a preview

On staging and its previews, the verification service token counts as the owner: it opens Access's five views and saves against the practice list, so [a preview walk](../development/browsing.md) can click through a change to Access and show pictures of it.

- **Only where `WONG_ENVIRONMENT` is `staging`.** That name is committed in `app/wrangler.jsonc`, never something a request sets. On the live app, and on a local run, the same token is refused: it keeps every app and manages nobody.
- **Nothing real is in reach.** A preview holds no sign-in-list key, makes no Cloudflare call, and its people are made up.
- **The checker no longer sees the view of someone who is not the owner** on a preview, a manager's included; code tests cover those views, and a waiting sign-in.

## What Access leaves alone

- **Publishing the project.** It is [granted where the project is kept](employee-project.md#publishing-stays-manual), by hand.
- **Memory.** [Memory access](../development/memory-key.md) keeps its own setup.
- **Downloaded copies.** Removing a person does not reach what they already saved.

Part of the [Cloudflare stack](README.md).
