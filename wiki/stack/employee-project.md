# Employee assistant connection

*Connect your assistant* puts the company's project on a person's device and links their assistant to their apps, with their own business app login as the only credential. They sign in to the app, copy its setup prompt and paste it into their assistant. They need no GitHub or Cloudflare account, type no key and install nothing by hand. This page owns the device side; [Access](employee-access.md) owns who is given what. The setup prompt is copied from one place: the [*Connect your assistant*](mini-apps.md#the-home-page-lists-the-apps) card on the home page.

```text
you          the app        their device
 │─ tick ─────▶│                 │
 │             │◀─ paste, sign in│
 │             │── the project ─▶│
 │             │◀─ use the apps ─│
 │─ untick ───▶│                 │
 │             │── no updates ──▶│
```

## Who gets what

The owner or [an Admin](employee-access.md#admin) gives the project in [Access](access-screens.md#a-panel-has-apps-and-keys): the tick *Can install the project* on a person's panel, or on a role's. The tick is **Project code** at Read, [a key with one level](employee-access.md#a-key-with-no-app). It needs no app ticked: ticking an app never gives it. The owner always holds it; nobody else does until it is given. It shows as saved once the app can read the project.

**The same tick lets them save changes.** A person who can install the project can also [save a change through the app](#save-a-change-through-the-app), for the owner or an Admin to publish. The panel says so under the tick: *They can save changes too.* There is no second tick: untick anyone who should not.

The tick is off for a new person, and saves before the key is in. While the app can't hand the project out, the ticked box names the step left: [a GitHub key](#the-owners-one-step-on-github), or [finishing Access setup](employee-access.md#finish-access-setup) on an install with no project recorded. The owner gets a request to copy for their assistant; an Admin reads that the step is the owner's. The person gets the project once the step is done, with no further change in Access.

One step shows at a time. Once the app hands the project out and can't save yet, the box says *Saving needs one more step* and names it: [the newer GitHub key](#an-install-that-holds-the-older-key), or finishing Access setup on [a project kept in Cloudflare](#no-step-on-a-project-kept-in-cloudflare). People keep installing the project meanwhile.

| The person | The Connect card | What the prompt does |
|---|---|---|
| holds Project code | opens the steps | installs the project and connects their apps |
| lacks it | greyed, *No access* | nothing: a press says *Ask your admin for access to Connect your assistant.* |
| anyone, while [the app can't hand the project out](#the-apps-only-connection) | opens the steps | connects their apps only |

**A skill arrives with the project, so running one needs Project code.** Everyone who holds it gets every skill's file. Whether a skill then works is the app's answer: each call it makes needs [the app it belongs to](employee-access.md#apps), or, for a call that belongs to a key alone, [that key's level](employee-access.md#key-levels). [Access lists no skill](employee-access.md#skills).

## Install in one step

The prompt names the app, [the reviewed bootstrap](#get-the-reviewed-bootstrap) and one command:

```bash
node "$PRIVATE/bootstrap.mjs" install --origin https://business.example.com
```

`install` does three things and prints one summary:

1. **Signs in.** The tool prints a sign-in link, checked to be this business's own, and the assistant shows it at once and waits. The person opens it and approves their own app sign-in. Nothing else from the sign-in is shown.
2. **Downloads the project** from the app's own address into a folder, with its history. With no `--dir`, the folder is the one used last time, else one in the home directory named for the app.
3. **Reads back what works**: who is signed in, their apps, where the project is, and the line to run company actions from it.

It keeps its private files in one directory per company under `~/.local/state/wong-company/`, outside every project folder.

The device needs Node, `cloudflared` and Git. When `install` names one as missing, the assistant installs it from its official distribution and runs the same step again. None needs an account.

## Update the copy

Run the same `install` again, or `code` alone:

```bash
node "$PRIVATE/bootstrap.mjs" code --dir ~/business --state "$PRIVATE_CONNECTION"
```

- **A clean copy moves forward** to the newest published project.
- **A changed copy is kept.** When a tracked file was edited, a commit was made on top, or another branch is checked out, nothing is applied: the result says *kept your changes; update not applied* and the command ends as a failure. It never resets, cleans, stashes or forces a checkout. Files the project does not track stop nothing.
- **A folder that holds other work is refused.** A new copy goes only into a missing or empty folder; pick another with `--dir`.

## Save a change through the app

A person who holds Project code asks their assistant for a change, and it is saved from their copy with their app sign-in alone: no GitHub or Cloudflare account, and no `gh`. **They save; the owner or an Admin publishes.**

`/save` in an installed copy does what it does anywhere, through the app:

1. **Pushes the branch** to the address the copy came from.
2. **Opens the change**, on a GitHub project: a pull request against the published branch, ending *Saved through the app by* and their email. A second save renews its description. A project kept in Cloudflare has no pull request: the change is its branch.
3. **Reads the checks and the preview** for that exact commit, and reports them. A failed check comes with the end of its log.

Their assistant's reply ends with who publishes: the change is saved, and the owner or an Admin publishes it.

### What the app takes and refuses

The app takes one new commit on one branch. Everything else is refused before anything reaches where the project is kept, in a line Git prints:

| The push | The line |
|---|---|
| `main`, `master` or the branch the project publishes from; a delete; a tag; two branches at once | *The app saves a change and never publishes. Push one branch that is not main.* |
| any push, while [the app can't save yet](#an-install-that-holds-the-older-key) | *Saving through the app is not set up yet. Ask the owner to finish it in Access.* |
| a change to a file under `.github/workflows/`, on GitHub | *This change edits the files that define the checks, which can not be saved through the app. Ask the owner to save it.* |

A person without Project code is refused as for a download: *Ask your admin*. The app never merges, closes or deletes: publishing, and removing a saved branch, happen where the project is kept.

### How the verbs differ

[`delivery-route.mjs`](../../.agents/skills/save/scripts/delivery-route.mjs) answers `app` for a copy whose `origin` is the app's own address, whatever [the install record](artifacts-route.md) names.

| Verb | In an installed copy |
|---|---|
| `/save` | Pushes, opens or renews the change, waits for the checks, and prints the preview: all through the app. A red check is reported with its log's end; it can't be rerun from here. |
| `/ship` | Stops after the save with one `NEXT:` line: the owner or an Admin publishes. |
| `/continue` | Lists saved branches, and no pull requests. |
| `/verify` | Reads the gate again: a save through the app leaves no receipt. |

### Publishing stays manual

The owner or an Admin publishes the saved change where the project is kept, with their own sign-in and [gates](../development/the-change-loop.md#the-gate). To let someone else publish, the owner adds them there by hand, as a collaborator on GitHub. That person then points their copy's `origin` at that address; it keeps its history and their work. App login issues no repository credential or invitation and changes no personal GitHub login.

## When access is taken away

Unticking Project code, or removing the person, refuses their next download and their next save at once, with no sign-out needed: every download is judged against their access at that moment.

**The copy already on their device stays there.** The app can not reach it, and Access says so when a person is removed. A change they already saved stays where the project is kept until the owner closes it. The copy holds no keys or passwords: [those never sit in the project](../development/secrets.md). Access given where the project is kept is removed there.

## The apps-only connection

Until the app can hand the project out, Connect works as it did before for every signed-in person: the prompt connects company actions and nothing else. That is the case when:

- a GitHub project has no [key](#the-owners-one-step-on-github) saved yet;
- [permissions or key levels have not started](employee-access.md#the-first-open);
- the install has no recorded owner.

An assistant connected this way keeps working after the project is switched on. Its person gets the project once they are given Project code and run Connect again.

After verifying the artifact, the apps-only commands use one private directory for this business:

```bash
node "$PRIVATE_CONNECTION/bootstrap.mjs" login --state "$PRIVATE_CONNECTION" --origin https://business.example.com
node "$PRIVATE_CONNECTION/bootstrap.mjs" status --state "$PRIVATE_CONNECTION"
node "$PRIVATE_CONNECTION/bootstrap.mjs" list --state "$PRIVATE_CONNECTION" --q orders
node "$PRIVATE_CONNECTION/bootstrap.mjs" describe orders.lookup --state "$PRIVATE_CONNECTION"
node "$PRIVATE_CONNECTION/bootstrap.mjs" call orders.lookup --state "$PRIVATE_CONNECTION" --file - <<'JSON'
{"reference":"synthetic-order"}
JSON
```

`status` reads the person's current app assignments, including none, and `code`: `ready`, `lacked` or `off`. Removed employees are denied. Discovery describes only permitted live actions; calls consult the current contract and execute once. Check an uncertain write before repeating it. Changing the signed-in person needs a separate private connection.

Inside an installed copy, [company calls](company-api.md#connect-and-call) use the same connection with `--state`.

## How the app hands the project out

The app passes Git's two read calls, and [one kind of push](#what-the-app-takes-and-refuses), through to where the project is kept and adds the server's own credential. It stores no copy, so a wiki-only publish is there on the next download.

- **The address** is `/api/access/code/git/` on the app, behind [the sign-in wall](cloudflare-access.md).
- **Before anything is asked upstream**, the caller must be a signed-in person who holds Project code now. A service token is refused on the live app; on a preview [the checker stands in for the owner](employee-access.md#the-checker-on-a-preview).
- **Reading, and one branch's save, are forwarded.** A push's ref updates are read and judged first; the pack is streamed on, never held. Every other call is refused before any upstream request.
- **A saved change is read at `/api/access/code/change`**, judged the same way: its checks, preview and page, one check's log, and a restart of a cut-off check run on a project kept in Cloudflare. Answers carry chosen fields, never the upstream's own words.
- **The credential never leaves the server.** It is in no prompt, answer or log, and the upstream's cookies and sign-in challenge are dropped. A refusal upstream reads as `code_unavailable`.
- **The device sends its session to the app alone**, as a request header set in Git's environment: never an argument, the saved address or a config file. Redirects are refused.
- **No mini app or action is handed the credential**, even one that lists the key.

`WONG_CODE_REPOSITORY`, in both Workers' `vars` in `app/wrangler.jsonc`, names the one project: `owner/name` on GitHub, or the repository's name in the account's Artifacts. [Setup and the Access step](employee-access.md#finish-access-setup) write it.

### The owner's one step on GitHub

The app needs one key for this one repository, `WONG_CODE_WRITE`: it hands the project out and saves changes. **Access asks for it, not setup.** The first time the owner ticks *Can install the project* with no key saved, [the panel says one step comes first](access-screens.md#a-panel-has-apps-and-keys) and gives a request to copy: *Let teammates install the project*. Setup and an update say nothing of the key, so an owner who works alone is never asked. The Access step's report still carries `codeKey` with the steps until both Workers hold it, and no to-do: `status` says whether the project can be handed out, `save` whether a change can be saved.

When the owner hands you that request, [send the key link](../development/secrets.md#receive-a-key-through-a-private-link) for `WONG_CODE_WRITE` with this guide:

1. Open [GitHub's new fine-grained token page](https://github.com/settings/personal-access-tokens/new).
2. *Repository access*: **Only select repositories**, then this one repository.
3. *Repository permissions*: **Contents: Read and write** and **Pull requests: Read and write**.
4. Three more at **Read-only**: **Actions**, **Commit statuses**, **Deployments**.
5. Add no other permission, and never **Workflows**: it would let a saved change rewrite the checks.
6. *Expiration*: none, or renew it before it ends. An expired key turns Connect back to apps only, never to open.
7. Generate the token and paste it into the link's page.

Then `npm run secrets:push` loads it into the live app and the preview app. To rotate it, delete the token on GitHub and paste a new one.

**The key writes to that one repository**, and the app uses it only for the calls above. GitHub can't hold a key to branches other than the published one, so protect that branch on GitHub: with a rule set that requires a pull request, nothing reaches it without the owner.

### An install that holds the older key

An install from before saving holds `WONG_CODE_READ`, which reads the project and nothing else. It keeps handing the project out. Access says *Saving needs one more step* under the tick, with the request *Let teammates save changes*: send the key link for `WONG_CODE_WRITE` with the guide above. Once the new key is in both Workers, delete the old token on GitHub and remove `WONG_CODE_READ` from the secrets file.

### No step on a project kept in Cloudflare

On [the Artifacts route](artifacts-route.md) the Access step binds both Workers to the account's `wongstack` namespace. The app asks that binding for a five-minute token for the one recorded repository on each call, to read or to save, so no key is made or pasted, and Project code shows as saved after the next publish.

The same step binds both Workers to the check runner, as `CODE_CHECKS`, so the app can read a saved change's check run. An install from before saving gets it by [finishing Access setup](employee-access.md#finish-access-setup) once more, then publishing. The step leaves a to-do when it can't add the binding itself: a `workflows` list already in `app/wrangler.jsonc` means adding the entry by hand, and an install record with no check runner means running setup's Cloudflare step again.

## Get the reviewed bootstrap

The prompt names an exact public WongStack Source commit and SHA-256 digest for `scripts/employee-bootstrap.mjs`, at `https://raw.githubusercontent.com/matthewwong525/WongStack/<full-commit>/scripts/employee-bootstrap.mjs`. A mutable branch URL, business-server script or invented release asset is unsuitable. Missing release pins show setup unavailable.

Fetch the exact URL without credentials and refuse redirects. Verify its complete digest before running anything. Save it as `bootstrap.mjs` in an OS-user-private directory outside every checkout (directory 0700, file 0600). The business origin must be HTTPS without a path, query, fragment or credentials. The helper checks its own private files and refuses a redirect that asks for the session, so the short prompt need not repeat those rules.

## Memory keeps its own setup

Company login grants no memory permission or machine enrollment. Preserve already installed memory and its target. A fresh computer reports independent operator setup required without blocking company actions. Follow [memory access](../development/memory-key.md) through the trusted owner when needed.

## Publish checked artifact pins

[The committed release record](../../app/worker/employee-access/bootstrap-release.json) carries `version: 1`, a full public Source `commit` and complete `sha256`; blank pins deliberately leave prompt copying unavailable. The final source checkpoint may create a complete source commit, pin its artifact bytes in a subsequent commit, and push once. Distribution tests prove the pinned digest is the bootstrap under test's, and that the pinned commit's bytes equal it wherever the checkout holds that commit. Publishing squashes the branch, so the commit is not in the default branch's history; its public address still serves it. Confirm the exact public raw URL after those checks pass. Commit existence alone proves no readiness.

If bootstrap bytes change afterward, establish a new immutable source commit and matching digest before claiming the copied prompt ready. Never change existing pins to a mutable URL. Customized installs retain their branding, login, app routes, dirty local work and separate memory.

Part of the [Cloudflare stack](README.md).
