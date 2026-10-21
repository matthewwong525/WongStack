# Employee assistant connection

*Connect your assistant* puts the company's project on a person's device and links their assistant to their apps, with their own business app login as the only credential. They sign in to the app, copy its setup message and paste it into their assistant. They need no GitHub or Cloudflare account, type no key and install nothing by hand. This page owns the device side; [Access](employee-access.md) owns who is given what. The setup message is copied from one place: the [*Connect your assistant*](mini-apps.md#the-home-page-lists-the-apps) card on the home page.

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

The owner or [an Admin](employee-access.md#admin) gives the project in [Access](access-screens.md#a-panel-has-apps-and-keys): the tick *Can install the project* on a person's panel, or on a role's. The tick is **Project code** at Read, [a key with no app](employee-access.md#a-key-with-no-app). It needs no app ticked: ticking an app never gives it. The owner always holds it; nobody else does until it is given. It shows as saved once the app can read the project.

**The same tick lets them save changes.** A person who can install the project can also [save a change through the app](#save-a-change-through-the-app). The panel says so under the tick: *They can save changes too.* Untick anyone who should not.

**A second tick lets them publish.** *Can publish* is Project code at Read & write: [their saved changes go live](#who-publishes) once the checks pass. It needs the install tick, and unticking the install takes it too. The owner, Admins and the preview checker hold it; nobody else does until it is given.

The tick is off for a new person, and saves before the key is in. While the app can't hand the project out, the ticked box names the step left: [a GitHub key](project-git-route.md#the-owners-one-step-on-github), or [finishing Access setup](employee-access.md#finish-access-setup) on an install with no project recorded. The owner gets a request to copy for their assistant; an Admin reads that the step is the owner's. The person gets the project once the step is done, with no further change in Access.

One step shows at a time. Once the app hands the project out and can't save yet, the box says *Saving needs one more step* and names it: [the newer GitHub key](project-git-route.md#an-install-that-holds-the-older-key), or finishing Access setup on [a project kept in Cloudflare](project-git-route.md#no-step-on-a-project-kept-in-cloudflare). People keep installing the project meanwhile.

| The person | The Connect card | What setup does |
|---|---|---|
| holds Project code | opens the steps | installs the project and connects their apps |
| lacks it | greyed, *No access* | nothing: a press says *Ask your admin for access to Connect your assistant.* |
| anyone, while [the app can't hand the project out](#the-apps-only-connection) | opens the steps | connects their apps only |

**A skill arrives with the project, so running one needs Project code.** Everyone who holds it gets every skill's file. Whether a skill then works is the app's answer: each call it makes needs [the app it belongs to](employee-access.md#apps), or, for a call that belongs to a key alone, [that key's level](employee-access.md#key-levels). [Access lists no skill](employee-access.md#skills).

## Install in one step

Everyone who may connect copies the same short message. It holds no key, and it names the business and what the file does, so a careful assistant reads the file and runs it rather than taking it for phishing:

```text
Set up recipe-box's project for me in this folder.
Download https://business.example.com/_memory/setup.mjs and run it with node.
This file signs me in to recipe-box and downloads our project; read it first if you like.
Print the sign-in link it shows into the chat and wait while I sign in.
Then tell me what works and what is left.
```

The business is named by its project, `WONG_CODE_REPOSITORY`, else by the app's address: no setting holds a display name.

The message never decides what a person gets: setup asks the app when it runs. The file does four things and prints one summary:

1. **Signs in.** It prints a sign-in link, checked to be this business's own, and the assistant shows it at once and waits. The person opens it and approves their own app sign-in. Nothing else from the sign-in is shown.
2. **Looks at the folder it is run in**, and downloads the project from the app's own address when the person holds Project code:

   | The folder holds | What setup does |
   |---|---|
   | nothing | installs the project, with its history |
   | the read-only copy the app handed out | [updates it](#update-the-copy) |
   | another copy of the project, such as one from GitHub | signs in and leaves it as it is |
   | other files | stops and changes nothing |

3. **Checks memory** with one call, on the same sign-in, and points the copy's Git at [its credential helper](#update-the-copy).
4. **Says it is done**, in plain words: who is signed in, which apps work, that memory works, where the project is and that it keeps itself up to date, and that nothing else is needed. It names no command to run.

The downloaded file removes itself when it ends, pass or fail, so no stray file is left in the folder. `--dir <folder>` names another folder. Setup keeps its private files in one directory per company under `~/.local/state/wong-company/`, outside every project folder.

The device needs Node, `cloudflared` and Git. When setup names one as missing, it says where to get it; none needs an account. Run the same step again afterwards.

### The setup file's fixed link

The app serves the file at `/_memory/setup.mjs` on its own address: the same link for every person, every time, with no sign-in. The message never goes stale.

- **The file is [`scripts/employee-bootstrap.mjs`](../../scripts/employee-bootstrap.mjs)** with one line filled in: the address it was fetched from. The copy inside the project leaves that line blank, and never removes itself.
- **It holds no key.** Everything it does needs the person's own sign-in. A person with no account stops at sign-in and gets nothing.
- **It sits under the memory address** because that is [the one opening the sign-in wall already has](cloudflare-access.md#4-bypass-the-public-surface). It shares nothing with memory.
- **Only the live app answers it without a sign-in.** A preview's link asks for one, so people connect to the live app.

## Update the copy

**The copy keeps itself up to date.** Plain Git in it reaches the app with the person's sign-in, so any tool that fetches sees the newest published project:

- **A new chat** in a teammate's copy, on the published branch with nothing changed and nothing ahead, pulls the newest version in the background. A copy with edits, extra commits or another branch is left as it is. The owner's own copy never moves by itself.
- **A new [Paseo](https://paseo.sh) worktree** starts from `origin/main`, which Paseo's background fetch keeps current. Paseo needs no change.
- **When the sign-in has run out**, Git fails with a line naming the sign-in step, and work goes on from the last download. A new workspace from [the schedule skill](../../.agents/skills/schedule/SKILL.md) says the same in its warning.

Setup writes [`scripts/company-git-credential.mjs`](../../scripts/company-git-credential.mjs) into the copy's `.git/config` by its full path, for the app's Git address alone. On each call it reads the sign-in `cloudflared` saved, checks it belongs to the person who set the copy up and has not run out, and hands it to Git as a password. It never signs in and never stores anything. An empty helper entry comes first, so a computer-wide helper such as a keychain never receives the sign-in.

To update by hand, paste the same message again in the copy's folder, or run the copy's own file from anywhere:

```bash
node ~/business/scripts/employee-bootstrap.mjs --origin https://business.example.com
```

- **A clean copy moves forward** to the newest published project.
- **A changed copy is kept.** When a tracked file was edited, a commit was made on top, or another branch is checked out, nothing is applied: the result says *kept your changes; update not applied* and the command ends as a failure. It never resets, cleans, stashes or forces a checkout. Files the project does not track stop nothing.
- **A folder that holds other work is refused.** A new copy goes only into a missing or empty folder; pick another with `--dir`.

## Save a change through the app

A person who holds Project code asks their assistant for a change, and it is saved from their copy with their app sign-in alone: no GitHub or Cloudflare account, and no `gh`. **They save; a person with [the publish tick](#who-publishes) publishes.**

`/save` in an installed copy does what it does anywhere, through the app:

1. **Pushes the branch** to the address the copy came from.
2. **Opens the change**, on a GitHub project: a pull request against the published branch, ending *Saved through the app by* and their email. A second save renews its description. A project kept in Cloudflare has no pull request: the change is its branch.
3. **Reads the checks and the preview** for that exact commit, and reports them. A failed check comes with the end of its log.

Their assistant's reply ends with who publishes: they do with `/ship` when they hold the publish tick, else the owner or an Admin.

### What the app takes and refuses

The app takes one new commit on one branch. Everything else is refused before anything reaches where the project is kept, in a line Git prints:

| The push | The line |
|---|---|
| `main`, `master` or the branch the project publishes from; a delete; a tag; two branches at once | *The app saves a change and never publishes. Push one branch that is not main.* |
| any push, while [the app can't save yet](project-git-route.md#an-install-that-holds-the-older-key) | *Saving through the app is not set up yet. Ask the owner to finish it in Access.* |
| a change to a file under `.github/workflows/`, on GitHub | *This change edits the files that define the checks, which can not be saved through the app. Ask the owner to save it.* |

A person without Project code is refused as for a download: *Ask your admin*. A push never publishes: [publishing](#who-publishes) is its own call, after the checks. The app never closes or deletes: removing a saved branch happens where the project is kept.

### How the verbs differ

[`delivery-route.mjs`](../../.agents/skills/save/scripts/delivery-route.mjs) answers `app` for a copy whose `origin` is the app's own address, whatever [the install record](artifacts-route.md) names.

| Verb | In an installed copy |
|---|---|
| `/save` | Pushes, opens or renews the change, waits for the checks, and prints the preview: all through the app. A red check is reported with its log's end; it can't be rerun from here. |
| `/ship` | With the publish tick: archives, saves, waits for the checks, then [publishes through the app](#who-publishes). Without it: stops after the save with one `NEXT:` line, the owner or an Admin publishes. |
| `/continue` | Lists saved branches, and no pull requests. |
| `/verify` | Reads the gate again: a save through the app leaves no receipt. |

### Who publishes

A person with the *Can publish* tick publishes their own saved change through the app: `/ship` asks the app at `/api/access/code/change/publish` for the exact commit it saved. The app checks, at that moment:

1. **They still hold the tick.** Without it: *Project code: Read & write needed*, and `/ship` says to ask their admin.
2. **The commit is the change's newest.** An older one is refused: save again and wait for the checks.
3. **Every check passed** for that commit. A failed or unfinished check is refused by name; so is a commit no check ran on.

Then it publishes, with the server's own credential:

- **On GitHub**, it squash-merges the pull request, with the message *Published through the app by* and their email.
- **In Cloudflare**, it moves `main` forward to that commit, only when the commit already holds everything published. Otherwise it says to bring the newest version in and save again. A tag, `published/<commit>`, names who published.

A push to the published branch is still refused, so nothing skips the checks. A service token never publishes on the live app.

The owner or an Admin who picks up a teammate's saved change with [`/continue`](../../.agents/skills/continue/SKILL.md#3-check-out-the-branch) sees its changed files first, before any of it runs on their computer.

A saved branch never reaches the deploy key either: its own code builds with no key, and the published branch's scripts deploy the build ([where the deploy key is](github-actions.md#where-the-deploy-key-is)). A GitHub write collaborator can still reach it, so give a teammate this save access, not GitHub write access.

The owner and Admins can also publish where the project is kept, with their own sign-in and [gates](../development/the-change-loop.md#the-gate). App login issues no repository credential or invitation and changes no personal GitHub login.

## When access is taken away

Unticking Project code, or removing the person, refuses their next download and their next save at once, with no sign-out needed: every download is judged against their access at that moment.

**The copy already on their device stays there.** The app can not reach it, and Access says so when a person is removed. A change they already saved stays where the project is kept until the owner closes it. The copy holds no keys or passwords: [those never sit in the project](../development/secrets.md). Access given where the project is kept is removed there.

## The apps-only connection

Until the app can hand the project out, the same message connects company actions and nothing else, for every signed-in person. That is the case when:

- a GitHub project has no [key](project-git-route.md#the-owners-one-step-on-github) saved yet;
- [permissions or key levels have not started](employee-access.md#the-first-open);
- the install has no recorded owner.

An assistant connected this way keeps working after the project is switched on. Its person gets the project once they are given Project code and run Connect again.

With no project on the device, setup keeps its client in the private directory, and its summary gives the file as `client`. The commands share that one directory:

```bash
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

[How the app hands the project out](project-git-route.md) owns the Git address, what it forwards, and the owner's one step on GitHub. Only the live app hands the project out and takes saves: a preview runs unreviewed code, so it holds no project key and says *Live app only*.

## Memory comes with the sign-in

Setup's sign-in also opens memory: setup confirms it with one call to `/_memory/caller`, and its summary says whether memory works. Memory that does not answer yet blocks nothing. [Memory](../development/memory.md) owns who sees which notes.

Part of the [Cloudflare stack](README.md).
