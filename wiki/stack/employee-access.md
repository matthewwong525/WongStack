# Employee access

Access is the mini app where the owner chooses who can sign in to the business app, which apps each person may use, and what each may do with [the keys the app holds](#key-levels). It opens for the owner with no command, and each person gets a prompt there to [connect their assistant](employee-project.md).

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

*Add person* saves the email and the ticked apps, then adds the email to the sign-in list in the same request. One line per person says whether they can sign in.

- **A new person starts with no apps**, or with [a role](#roles). A newly built app shows up unticked for everyone but the owner; nobody edits a second list of apps. A tick for an app that is no longer built is ignored.
- **A failed sign-in step stays pending.** The app choices are saved; *Try again* finishes the step. After a Cloudflare call that timed out, the step waits about three minutes before it is called done, because the lost call could still land.
- **Removing a person blocks them at once.** Taking them off the sign-in list also ends every open session of the app, so everyone who remains signs in again. This can't be undone.

## Key levels

Each saved key has a level per person. A level is set once per key and holds in every app.

| Level | Look things up | Change or send things |
|---|---|---|
| None | no | no |
| Read | yes | no |
| Read & write | yes | yes |

- **The server checks the level on every request**, after the app tick and never in place of it: an app's screen, a direct call and an assistant's action are judged alike. A refusal names the key and the level needed, never the key's value. Lowering a level governs the person's next request, with no sign-out.
- **Ticking an app gives Read on the keys it uses, never Read & write.** Letting someone change things is always the owner's own choice. Unticking an app leaves the level: it is the key's, not the app's.
- **What an app does with a key comes from its routes.** *Uses Stripe: look up, change* is worked out from [the keys each route lists](company-api.md#list-the-keys-a-route-uses), so the screen shows what the server enforces. An app is handed only the keys it lists.
- **A key that offers only Read shows two choices.** [The supplied Cloudflare key](company-api.md#look-things-up-in-cloudflare) is one.
- **The owner holds every key.** So does the verification service token, as it keeps every app.

### A key with no app

A look-up can belong to a key alone. A person with that key's level can run it with no app ticked, and every app's actions stay refused. Cloudflare look-ups ship this way. For another key, ask the usual way, such as *let the team look up a charge*, and the assistant [builds the action](company-api.md#list-the-keys-a-route-uses). No key works alone until levels have started.

## Roles

A role is a named set of apps and key levels, such as *Sales*, that several people share.

- **A person has one role, or their own set, never both.** There are no exceptions on top of a role: one place answers what a person can do.
- **A role is read live.** Changing it governs every holder's next request.
- **Moving a person off a role, or removing a role people hold, takes nothing away.** Each person keeps what the role gave, as their own set.
- **A new role can start from a person's current access.** No role is made for you, and people who were there before roles keep their own set.
- **Only the owner makes, changes, gives or removes a role.** Giving one changes nobody's sign-in.

## Four views

The owner's Access has four views, each with its own address, so Back and reload keep your place.

- **People** opens first: each person's sign-in status beside their name, then their role or *Own set*, and a label per app and per key level.
- **Roles** lists each role with the same labels, and who holds it.
- **Apps** lists each app, the keys it uses and who has it. An app's page ticks roles and people and sets the levels of that app's keys beside each tick.
- **Keys** lists every key the app holds, whether it is saved, what uses it and who has it, a line per level. A key's page sets every level for that key. A key's value is never shown. A key shows here once it is [in the registry](api-keys.md#a-saved-key-shows-in-access).

A level set in any view is the same level in the others. Every list opens a page with *Edit*. Everyone else sees their own apps and levels as labels above their setup box.

### A label says the level in words

A label is one app, or one key with its level: *Stripe Read*. A line marked `!` says where an app can't do its job yet, such as *Hello can look up, not change*, so a gap shows without opening the page. Nothing is marked by colour alone.

### Give an app and its level in one place

A person's page starts with their role; with their own set, and on a role's page, you tick apps and pick levels there.

- **A ticked app shows the level of each key it uses under its tick**, with a hint that names the fix: *Pick Read & write to let it*. An unticked app says which keys it uses and shows no level.
- **A key two ticked apps share shows under both and is one level.** Change it under one and the other follows, and each says the level is shared.
- **Keys no ticked app uses sit in a group below**, such as [a key with no app](#a-key-with-no-app).

### A save says how it went, and leaving asks first

After a save the list opens with a box on top: *Saved*, or that the save did not finish, so check the list before trying again. Leaving a page with changes not saved asks *Leave without saving?*, from its back link, *Cancel*, another link, the browser's Back button, a reload or a closed tab. Staying keeps the changes; a page put back the way it was leaves at once.

## What a person's apps govern

A person's current apps decide their app cards, direct visits, app calls and assistant actions; client state and an existing sign-in grant nothing more. Unticking an app blocks the next request. A mini app's routes follow its folder name. A route in [the main router](../../app/worker/api/router.ts) lists the apps it serves, and one with no entry denies everyone but the owner ([map business routes](company-api.md#map-business-routes-before-employee-policy)). Once permissions are on, only the owner and listed people pass. The verification service token keeps every built app, as before, so preview walks and the look at the live app still open them. On the live app it never manages people; [on a preview it stands in for the owner](#the-checker-on-a-preview).

**An app's name and screen layout stay in the page everyone downloads.** A signed-in teammate without an app sees no card for it, can't open it, and gets none of its data or actions. Its title, its description and its screen's code are still packed into the page, so someone who reads that code could find them. Keep anything private in the app's data, never in its screen.

## The practice list on previews

A preview has its own people, roles and key levels. On staging the owner opens Access, adds people and chooses apps and levels against the preview's database, which [starts from made-up people](d1-pipeline.md#seeded-staging-production-untouched) with permissions and levels on: one role held by two people, one person with their own set, and one with no level. A preview holds no sign-in list key and makes no Cloudflare call for the list, and the screen says the real sign-in list is not touched. When a preview holds no [read-only look-up key](cloudflare-credentials.md#the-read-only-look-up-key), Keys shows Cloudflare as *Not on previews yet*, with no step to ask for: none can finish it there. A practice person can sign in to a preview only if the real list admits them.

### The checker on a preview

On staging and its previews, the verification service token counts as the owner: it opens Access's four views and saves against the practice list, so [a preview walk](../development/browsing.md) can click through a change to Access and show pictures of it.

- **Only where `WONG_ENVIRONMENT` is `staging`.** That name is committed in `app/wrangler.jsonc`, never something a request sets. On the live app, and on a local run, the same token is refused: it keeps every app and manages nobody.
- **Nothing real is in reach.** A preview holds no sign-in-list key, makes no Cloudflare call, and its people are made up.
- **The checker no longer sees the view of someone who is not the owner** on a preview; code tests cover that view.

## What Access leaves alone

- **The project's code.** Signing in to the app gives no access to it. The owner grants and removes that where the code is kept.
- **Memory.** [Memory access](../development/memory-key.md) keeps its own setup.
- **Downloaded copies.** Removing a person does not reach what they already saved.

Part of the [Cloudflare stack](README.md).
