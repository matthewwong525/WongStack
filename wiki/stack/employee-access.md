# Employee access

Access is the mini app where the owner chooses who can sign in to the business app and which apps each person may use. It opens for the owner with no command, and each person gets a prompt there to [connect their assistant](employee-project.md).

## How the owner is known

The owner is the person whose sign-in email equals `WONG_OWNER_EMAIL`, a committed, nonsecret setting in both Workers' `vars` in `app/wrangler.jsonc`. [Setup](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) writes it beside the `CF_ACCESS_*` ids.

A request is the owner's when the Worker has [verified its signed sign-in](cloudflare-access.md), the caller is a person, and the email matches. A service token, a git email, a first visit and a request body establish nothing. The signed user id is written to the log the first time it is seen, never compared: the sign-in wall already trusts the email.

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

It adds `WONG_OWNER_EMAIL` to both Workers' `vars`, makes or reuses the key, stores it in the live app, and makes nothing else. Publish the config change through [the change loop](../development/the-change-loop.md). When the report's `accessKey.status` is `missing`, the saved token can not make keys: [send the key link](../development/secrets.md#receive-a-key-through-a-private-link) for a Cloudflare token with *Account API Tokens Write*, then run it again. Until then Access opens, saves app choices, and says one step is left.

To rotate the key, delete the `<worker>-access` token in Cloudflare and run the step again.

## The first open

Permissions start by themselves the first time the owner opens Access, and take nothing away.

1. Until then, every signed-in person keeps every app, as before Access.
2. On the live app, the first open reads the sign-in list, lists each person on it with every built app ticked, and turns permissions on, in one step.
3. With no key, or a list that can not be read, nothing changes and permissions stay off: nobody is locked out.

Once permissions are on, permission data that can not be read denies business work. It never falls back to open.

## Add, change and remove people

*Add person* saves the email and the ticked apps, then adds the email to the sign-in list in the same request. One line per person says whether they can sign in.

- **A new person starts with no apps.** A newly built app shows up unticked for everyone but the owner; nobody edits a second list of apps. A tick for an app that is no longer built is ignored.
- **A failed sign-in step stays pending.** The app choices are saved; *Try again* finishes the step. After a Cloudflare call that timed out, the step waits about three minutes before it is called done, because the lost call could still land.
- **Removing a person blocks them at once.** Taking them off the sign-in list also ends every open session of the app, so everyone who remains signs in again. This can't be undone.

## What a person's apps govern

A person's current apps decide their app cards, direct visits, app calls and assistant actions; client state and an existing sign-in grant nothing more. Unticking an app blocks the next request. A mini app's routes follow its folder name. A route in [the main router](../../app/worker/api/router.ts) lists the apps it serves, and one with no entry denies everyone but the owner ([map business routes](company-api.md#map-business-routes-before-employee-policy)). Once permissions are on, only the owner and listed people pass. The verification service token keeps every built app, as before, so preview walks and the look at the live app still open them; it never manages people.

## The practice list on previews

A preview has its own people. On staging the owner opens Access, adds people and chooses apps against the preview's database, which [starts from made-up people](d1-pipeline.md#seeded-staging-production-untouched) with permissions on. A preview holds no key and makes no Cloudflare call, and the screen says the real sign-in list is not touched. A practice person can sign in to a preview only if the real list admits them.

## What Access leaves alone

- **The project's code.** Signing in to the app gives no access to it. The owner grants and removes that where the code is kept.
- **Memory.** [Memory access](../development/memory-key.md) keeps its own setup.
- **Downloaded copies.** Removing a person does not reach what they already saved.

Part of the [Cloudflare stack](README.md).
