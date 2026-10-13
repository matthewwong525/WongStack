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

The owner or [an Admin](employee-access.md#admin) gives the project in [Access](access-screens.md#a-panel-has-apps-and-keys): the tick *Can install the project* on a person's panel, or on a role's. The tick is **Project code** at Read, [a key with one level](employee-access.md#a-key-with-no-app). It needs no app ticked: ticking an app never gives it. The owner always holds it; nobody else does until it is given. It shows as saved once the app can read the project.

The tick is off for a new person, and saves before the key is in. While the app can't hand the project out, the ticked box names the step left: [a read-only GitHub key](#the-owners-one-step-on-github), or [finishing Access setup](employee-access.md#finish-access-setup) on an install with no project recorded. The owner gets a request to copy for their assistant; an Admin reads that the step is the owner's. The person gets the project once the step is done, with no further change in Access.

| The person | The Connect card | What setup does |
|---|---|---|
| holds Project code | opens the steps | installs the project and connects their apps |
| lacks it | greyed, *No access* | nothing: a press says *Ask your admin for access to Connect your assistant.* |
| anyone, while [the app can't hand the project out](#the-apps-only-connection) | opens the steps | connects their apps only |

**A skill arrives with the project, so running one needs Project code.** Everyone who holds it gets every skill's file. Whether a skill then works is the app's answer: each call it makes needs [the app it belongs to](employee-access.md#apps), or, for a call that belongs to a key alone, [that key's level](employee-access.md#key-levels). [Access lists no skill](employee-access.md#skills).

## Install in one step

Everyone who may connect copies the same short message. It holds no key:

```text
Set up my company's project for me in this folder.
Download https://business.example.com/_memory/setup.mjs and run it with node.
Print the sign-in link it shows into the chat and wait while I sign in.
Then tell me what works and what is left.
```

The message never decides what a person gets: setup asks the app when it runs. The file does three things and prints one summary:

1. **Signs in.** It prints a sign-in link, checked to be this business's own, and the assistant shows it at once and waits. The person opens it and approves their own app sign-in. Nothing else from the sign-in is shown.
2. **Looks at the folder it is run in**, and downloads the project from the app's own address when the person holds Project code:

   | The folder holds | What setup does |
   |---|---|
   | nothing | installs the project, with its history |
   | the read-only copy the app handed out | [updates it](#update-the-copy) |
   | another copy of the project, such as one from GitHub | signs in and leaves it as it is |
   | other files | stops and changes nothing |

3. **Reads back what works**: who is signed in, their apps, where the project is, and the line to run company actions from it.

The downloaded file removes itself when it ends, pass or fail, so no stray file is left in the folder. `--dir <folder>` names another folder. Setup keeps its private files in one directory per company under `~/.local/state/wong-company/`, outside every project folder.

The device needs Node, `cloudflared` and Git. When setup names one as missing, it says where to get it; none needs an account. Run the same step again afterwards.

### The setup file's fixed link

The app serves the file at `/_memory/setup.mjs` on its own address: the same link for every person, every time, with no sign-in. The message never goes stale.

- **The file is [`scripts/employee-bootstrap.mjs`](../../scripts/employee-bootstrap.mjs)** with one line filled in: the address it was fetched from. The copy inside the project leaves that line blank, and never removes itself.
- **It holds no key.** Everything it does needs the person's own sign-in. A person with no account stops at sign-in and gets nothing.
- **It sits under the memory address** because that is [the one opening the sign-in wall already has](cloudflare-access.md#4-bypass-the-public-surface). It shares nothing with memory.
- **Only the live app answers it without a sign-in.** A preview's link asks for one, so people connect to the live app.

## Update the copy

Paste the same message again in the copy's folder, or run the copy's own file from anywhere:

```bash
node ~/business/scripts/employee-bootstrap.mjs --origin https://business.example.com
```

- **A clean copy moves forward** to the newest published project.
- **A changed copy is kept.** When a tracked file was edited, a commit was made on top, or another branch is checked out, nothing is applied: the result says *kept your changes; update not applied* and the command ends as a failure. It never resets, cleans, stashes or forces a checkout. Files the project does not track stop nothing.
- **A folder that holds other work is refused.** A new copy goes only into a missing or empty folder; pick another with `--dir`.

## The copy is for using, not publishing

A person can read the project and work in their copy. A push to the address it came from is refused: *This copy is for reading. Your employer grants publishing where the project is kept.*

### Publishing stays manual

To let someone publish, the owner adds them where the project is kept, by hand: as a collaborator on GitHub, or [not yet at all](artifacts-route.md#limits) on a project kept in Cloudflare. The person then points their copy's `origin` at that address; it keeps its history and their work. App login issues no repository credential or invitation and changes no personal GitHub login. `/continue`, `/save` and `/ship` keep their own sign-in and [gates](../development/the-change-loop.md#the-gate).

## When access is taken away

Unticking Project code, or removing the person, refuses their next download at once, with no sign-out needed: every download is judged against their access at that moment.

**The copy already on their device stays there.** The app can not reach it, and Access says so when a person is removed. The copy holds no keys or passwords: [those never sit in the project](../development/secrets.md). Access given where the project is kept is removed there.

## The apps-only connection

Until the app can hand the project out, the same message connects company actions and nothing else, for every signed-in person. That is the case when:

- a GitHub project has no [read-only key](#the-owners-one-step-on-github) saved yet;
- [permissions or key levels have not started](employee-access.md#the-first-open);
- the install has no recorded owner.

An assistant connected this way keeps working after the project is switched on. Its person gets the project once they are given Project code and run Connect again.

With no project on the device, setup keeps its client in the private directory, and its summary names the line to run. The commands share that one directory:

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

The app passes Git's two read calls through to where the project is kept and adds the server's own credential. It stores no copy, so a wiki-only publish is there on the next download.

- **The address** is `/api/access/code/git/` on the app, behind [the sign-in wall](cloudflare-access.md).
- **Before anything is asked upstream**, the caller must be a signed-in person who holds Project code now. A service token is refused on the live app; on a preview [the checker stands in for the owner](employee-access.md#the-checker-on-a-preview).
- **Only reading is forwarded.** Every other call answers 403 before any upstream request.
- **The credential never leaves the server.** It is in no message, answer or log, and the upstream's cookies and sign-in challenge are dropped. A refusal upstream reads as `code_unavailable`.
- **The device sends its session to the app alone**, as a request header set in Git's environment: never an argument, the saved address or a config file. Redirects are refused.
- **No mini app or action is handed the credential**, even one that lists the key.

`WONG_CODE_REPOSITORY`, in both Workers' `vars` in `app/wrangler.jsonc`, names the one project: `owner/name` on GitHub, or the repository's name in the account's Artifacts. [Setup and the Access step](employee-access.md#finish-access-setup) write it.

### The owner's one step on GitHub

The app needs a read-only key for this one repository, `WONG_CODE_READ`. **Access asks for it, not setup.** The first time the owner ticks *Can install the project* with no key saved, [the panel says one step comes first](access-screens.md#a-panel-has-apps-and-keys) and gives a request to copy: *Let teammates install the project*. Setup and an update say nothing of the key, so an owner who works alone is never asked. The Access step's report still carries `codeKey: missing` with the steps until both Workers hold it, and no to-do.

When the owner hands you that request, [send the key link](../development/secrets.md#receive-a-key-through-a-private-link) for `WONG_CODE_READ` with this guide:

1. Open [GitHub's new fine-grained token page](https://github.com/settings/personal-access-tokens/new).
2. *Repository access*: **Only select repositories**, then this one repository.
3. *Permissions*: **Contents: Read-only**. Add no other permission.
4. *Expiration*: none, or renew it before it ends. An expired key turns Connect back to apps only, never to open.
5. Generate the token and paste it into the link's page.

Then `npm run secrets:push` loads it into the live app and the preview app. To rotate it, delete the token on GitHub and paste a new one.

### No step on a project kept in Cloudflare

On [the Artifacts route](artifacts-route.md) the Access step binds both Workers to the account's `wongstack` namespace. The app asks that binding for a five-minute read token for the one recorded repository on each call, so no key is made or pasted, and Project code shows as saved after the next publish.

## Memory keeps its own setup

Company login grants no memory permission or machine enrollment. Preserve already installed memory and its target. A fresh computer reports independent operator setup required without blocking company actions. Follow [memory access](../development/memory-key.md) through the trusted owner when needed.

Part of the [Cloudflare stack](README.md).
