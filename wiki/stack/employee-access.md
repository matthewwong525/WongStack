# Employee access

Access is the mini app where the owner chooses who can sign in to the business app, which [apps](#apps) each person may use, and what each person's assistant may do with [the keys the app holds](#key-levels). It opens for the owner with no command, and each person gets a prompt there to [connect their assistant](employee-project.md). An [Admin](#admin), whom only the owner picks, does the same work.

[Cloudflare's sign-in wall](cloudflare-access.md#the-wall-decides-who-the-app-decides-what) decides who gets in. The app decides the rest, on every request.

## How the owner is known

The owner is the person whose sign-in email equals `WONG_OWNER_EMAIL`, a committed, nonsecret setting in both Workers' `vars` in `app/wrangler.jsonc`. [Setup](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) writes it beside the `CF_ACCESS_*` ids.

A request is the owner's when the Worker has [verified its signed sign-in](cloudflare-access.md), the caller is a person, and the email matches. A service token, a git email, a first visit and a request body establish nothing, with one exception: [on a preview, the checker stands in for the owner](preview-access.md#the-checker-on-a-preview). The signed user id is written to the log the first time it is seen, never compared: the sign-in wall already trusts the email.

- **To change the owner**, run [the `access` step](#finish-access-setup) with `--owner-email <email>` and publish. Access has no transfer button: that would be a takeover path.
- **No `WONG_OWNER_EMAIL`** means an older install: every signed-in person keeps every app, and Access says its setup is not finished.
- **A site open with no sign-in** has nobody to know: Access stays unavailable until [the sign-in is on](cloudflare-access.md#open-until-the-card).

## The key

To add an email to the sign-in list, the live app holds one Cloudflare key of its own, in the production Worker's secret `WONG_ACCESS_LOGIN_MANAGEMENT`. Setup makes it, named `<worker>-access`, with the single permission *Access: Apps and Policies Write*, and stores it with the account and sign-in policy ids. The install record, `.claude/.wong-stack.json`, keeps the key's id under `components.accessKey`, for rotation.

- **Cloudflare scopes that permission to the whole account.** The app calls only its own Access application and its people policy. It refuses a policy shared with another application, a second policy that lets people in, and an application that does not cover this Worker. The verification service token's policy is left alone.
- **It is not the deploy token.** [The CI deploy token](cloudflare-credentials.md#the-ci-deploy-token) can read Access and never write it.
- **Staging never holds it.** `secrets:push` and `secrets:check` refuse the name on staging, and setup stores it on production alone ([staging's own keys](staging-bindings.md#previews-get-only-their-own-keys)). A mini app's handler is handed no copy.

### Finish Access setup

An install made before Access, or one whose key is missing, needs one step: the `access` command of setup's [provisioning script](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/scripts/provision.mjs). Run it from the repo's main copy, where `.env` holds the saved Cloudflare token, with the script from [the latest WongStack source](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/references/latest-source.md):

```bash
node "<WongStack source>/.claude/skills/wong-setup/scripts/provision.mjs" access
```

It gives previews [their own private app](cloudflare-access.md#two-private-apps-one-per-worker), with the live app's people. It writes each environment's own `CF_ACCESS_AUD` and `CF_ACCESS_APP_ID`, plus `WONG_OWNER_EMAIL` and [the project's name](employee-project.md#how-the-app-hands-the-project-out), into both Workers' `vars`. It prunes the staging Worker to what `app/.dev.vars.staging` declares, [as `secrets:push` does](staging-bindings.md#one-declared-list-of-secrets-two-workers), and leaves the live app's keys and checker alone. Old preview links keep the keys previews held: rotate the GitHub key and each business key the report names, even after a stop; the step rolls the read-only key itself. It makes or reuses the key and [the read-only key for Cloudflare look-ups](cloudflare-credentials.md#the-read-only-look-up-key), stored in the live app alone; a rerun changes nothing. Previews pause until you publish the config change through [the change loop](../development/the-change-loop.md). When the report's `accessKey.status` or `cloudflareReadKey.status` is `missing`, the saved token can not make keys: [send the key link](../development/secrets.md#receive-a-key-through-a-private-link) for a Cloudflare token with *Account API Tokens Write*, then run it again. Until then Access opens, saves apps and key levels, and says one step is left.

To rotate the key, delete the `<worker>-access` token in Cloudflare and run the step again.

## The first open

Permissions start by themselves the first time the owner opens Access, and take nothing away.

1. Until then, every signed-in person keeps every app, as before Access, except a person you remove.
2. On the live app, the first open reads the sign-in list, lists each person on it with every built app, and turns permissions on, in one step.
3. With no key, or a list that can not be read, nothing changes and permissions stay off: nobody is locked out.
4. [Key levels](#key-levels) start next, in the same open, with nobody given one: an app needs none. Nobody is given a role, [Admin](#admin) included. A step that can not be saved changes nothing, and levels stay off.

On an app that already had people, key levels start at the owner's next open. A level a person or a role already holds is kept.

Once permissions are on, permission data that can not be read denies business work. It never falls back to open. The same holds for level data once levels are on.

## Apps

An app is given by a tick: a person has it or does not. The apps are the folders with a screen, `app/src/apps/<name>/app.json`; nobody edits a second list of them.

- **A ticked app is the whole app.** Its holder opens it and runs every call it makes, look-ups and changes alike, from the screen, a direct call or an assistant. No key level is checked, whatever keys the app uses. To stop someone changing things in an app, untick it: a tick can't say *look only*.
- **The server checks the tick on every request**, before any business work. Without it the answer is `App access denied`. Unticking governs the person's next request, with no sign-out. A stricter check inside an action still applies.
- **Giving an app gives no [key level](#key-levels)**, and taking it away leaves each level as it is.
- **The owner holds every app.** So does the verification service token.
- **[Work with no screen](mini-apps.md#work-with-no-screen) is not on the list.** It sits inside an app, under that app's tick, or behind a key, under that key's level.

### Unticked in an update

An install that had *look only* on apps loses it when it updates: a tick can't say it, and nobody gains the power to change things by surprise. Each person and role who could only look at an app no longer holds it. Access names them, with the app, under *Unticked in this update* until the next save in Access. Tick the app to give it back, all of it.

## Add, change and remove people

*Add person* saves the email with their apps and key levels, then adds the email to the sign-in list, the live app's and the previews', in the same request. Each person's row says whether they can sign in. A save that newly lets a person [install the project](employee-project.md#who-gets-what), by their own set or a role, whether they are new, already listed, or given a role in their row, opens a popup with a message to copy and forward yourself; other saves just say *Saved.*. The message names the app's address and their sign-in email, says to install an assistant if they have none, to paste the whole message into its chat, and to sign in with that email. It then carries [the setup message](employee-project.md#install-in-one-step), unchanged, under *For the assistant:*. The setup message is the same for everyone, so it uses yours; when yours can't be read, it says to open *Connect your assistant* instead. To copy it again, open the person: *Message to send them* folds out under their own *Can install the project* tick while it is ticked. Neither shows while the app can't hand the project out yet.

- **A new person starts with no apps**, or with [a role](#roles). A newly built app is unticked for everyone but the owner. A tick for an app that is no longer built is ignored.
- **A failed sign-in step stays pending.** The app choices are saved; *Try again*, in [the row's menu](access-screens.md#a-rows-menu), finishes the step. After a Cloudflare call that timed out, the step waits about three minutes before it is called done, because the lost call could still land.
- **Removing a person blocks them at once.** Taking them off the sign-in list also ends every open session of both apps, so everyone who remains signs in again. This can't be undone.

## Key levels

Each saved key has a level per person. A level governs the key used by itself: [a call that belongs to the key alone](#a-key-with-no-app), and direct use. It never governs an app: [an app's call](#apps) checks the app's tick and no level.

| Level | Look things up | Change or send things |
|---|---|---|
| None | no | no |
| Read | yes | no |
| Read & write | yes | yes |

- **The server checks the level on every such request**, by [what the call does](company-api.md#list-the-keys-a-route-uses). A refusal names the key and the level needed, such as `Stripe: Read & write needed`, never the key's value. Lowering a level governs the person's next request, with no sign-out.
- **A level changes only when the owner or [an Admin](#admin) changes it**, where the person or their role is opened. A role's level is each holder's.
- **An app is handed only [the keys it lists](company-api.md#list-the-keys-a-route-uses).** Access does not say which apps use a key: the two are set apart.
- **A key that offers only Read shows two choices.** [The supplied Cloudflare key](company-api.md#look-things-up-in-cloudflare) is one.
- **The owner holds every key.** So does the verification service token, as it keeps every app. [An Admin](#admin) holds every key at its highest level.
- **Direct use makes a level mean more.** A key whose service is set up can be [used directly](company-api.md#use-a-key-directly), with no built action. The level alone decides, with no switch: Read lets a person's assistant look up anything the key can see, and Read & write also changes it. So setting a service up opens it to the owner at once, and to everyone who holds a level for that key. Set a person's level to *None* to stop it. [Their panel](access-screens.md#a-panel-has-apps-and-keys) marks such a key.

### A key with no app

A call can belong to a key alone. A person with that key's level can run it with no app ticked, and every app's actions stay refused. Cloudflare look-ups and [Project code](employee-project.md#who-gets-what) ship this way; Project code is two ticks, not a level choice: *Can install the project* is Read, which installs the project and [saves changes through the app](employee-project.md#save-a-change-through-the-app); *Can publish* is Read & write, which also [publishes them once the checks pass](employee-project.md#who-publishes), and needs the first tick. So does [a server folder with no screen](mini-apps.md#work-with-no-screen). For another key, ask the usual way, such as *let the team look up a charge*, and the assistant [builds the action](company-api.md#list-the-keys-a-route-uses). Direct use needs no app either, only the key's level. No key works alone until levels have started.

## Roles

A role is a named set of apps and key levels, such as *Sales*, that several people share.

- **A person has one role, or their own set, never both.** There are no exceptions on top of a role: one place answers what a person can do.
- **A role is read live.** Changing it governs every holder's next request.
- **Moving a person off a role, or removing a role people hold, takes nothing away.** Each person keeps what the role gave, as their own set.
- **One role is made for you: [Admin](#admin).** A new role can start from a person's current access, and people who were there before roles keep their own set.
- **Only the owner or [an Admin](#admin) makes, changes, gives or removes a role.** Giving one changes nobody's sign-in, and no role but Admin lets its holder manage Access.

## Admin

Admin is the one role made for you: its holder has every app and every key, and manages Access. It is first in *Roles*, and nobody holds it until the owner picks them.

- **It always means everything.** Every built app and every saved key at its highest level, ones added later included. The app works that out on each request, so no list goes stale. Its keys wait for [key levels](#key-levels) to start, as everyone's do.
- **It can't be renamed, changed or removed**, and no other role takes its name. Opened, it says what it gives and who holds it.
- **Only the owner gives it or takes it.** Pick it as a person's role, in their row or their panel; Access asks first, because it is full trust. An Admin's picker doesn't offer it, and an Admin's save that gives or takes it is refused.
- **An Admin does what the owner does in Access.** They add, change and remove people, make and edit other roles, and set apps and key levels.
- **An Admin can't remove an Admin, themselves included, or change the owner.** So the owner can always step in. [Who the owner is](#how-the-owner-is-known) stays a setup step.
- **An Admin is not the owner.** A route [with no entry](#what-a-persons-apps-govern) still denies them. Each change is recorded under its maker's email; no screen shows that record yet.
- **Taking it back works at once.** Pick another role or their own set, and the person's next request in Access is refused, with no sign-out. On their own set they keep every app and key until you untick them, as when [leaving any role](#roles). Removing an Admin ends it too; adding them back does not restore it.
- **The missing key stays the owner's step.** With [no key yet](#finish-access-setup), an Admin reads that one step is left for the owner, with nothing to copy: it needs the owner's Cloudflare token.
- **An Admin's open can finish [the first open](#the-first-open)** when the owner's could not, such as before the key arrived. It takes nothing away.
- **It replaced a tick on each person.** The update that brought it gave Admin to everyone who had that tick, and renamed a role you had called Admin to *Admin (custom)*, with its apps, keys and people as they were.

A new Access save takes a [`Core`](../../app/worker/employee-access/core.ts), the sign-in check's pass; an owner-only one takes an `OwnerCore`. Building either by hand [fails the checks](../../app/worker/checked-caller.test.ts).

## Skills

Access gives no skill and lists none. The server judges each call [a skill](company-api.md#build-a-skill-on-actions) makes like the same call from a screen: by the caller's apps and key levels. A refused call says what the caller lacks. A skill reaches a device [with the project](employee-project.md#who-gets-what).

## The screens

Access has three views, People, Roles and Services. [The Access screens](access-screens.md) owns how they look and behave.

## What a person's apps govern

A person's current apps decide their app cards, direct visits, app calls and assistant actions; client state and an existing sign-in grant nothing more. Taking an app away blocks the next request. A mini app's routes follow its folder name. A route in [the main router](../../app/worker/api/router.ts) lists the apps it serves, and one with no entry denies everyone but the owner ([map business routes](company-api.md#map-business-routes-before-employee-policy)). Once permissions are on, only the owner and listed people pass. The verification service token keeps every built app, as before, so preview walks and the look at the live app still open them. On the live app it never manages people; [on a preview it stands in for the owner](preview-access.md#the-checker-on-a-preview).

**Memory follows the same sign-in.** The owner and Admins are memory admins, a person with Project code a member, anyone else a reader: [who sees what](../development/memory.md#who-sees-what).

**An app's name and screen layout stay in the page everyone downloads.** A signed-in teammate without an app sees no card for it, can't open it, and gets none of its data or actions. Its title, its description and its screen's code are still packed into the page, so someone who reads that code could find them. Keep anything private in the app's data, never in its screen.

## The practice list on previews

A preview keeps its own practice people, and whoever its sign-in lets in but the list does not name gets every app there. People who can push to the project on GitHub sign in to previews too. [Access on previews](preview-access.md) owns both, and the checker that stands in for the owner there.

## What Access leaves alone

- **Access to where the project is kept.** Access gives [the publish tick](employee-project.md#who-publishes), never a GitHub or Cloudflare account; those are granted there, by hand.
- **Downloaded copies.** Removing a person does not reach what they already saved.

Part of the [Cloudflare stack](README.md).
