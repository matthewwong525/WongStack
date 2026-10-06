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

The owner or a manager gives **Project code** in [Access → Keys](employee-access.md#a-key-with-no-app), per person or per role. It has one level, Read, and needs no app ticked: ticking an app never gives it. The owner always holds it; nobody else does until it is given. It shows as saved once the app can read the project.

| The person | The Connect card | What the prompt does |
|---|---|---|
| holds Project code | opens the steps | installs the project and connects their apps |
| lacks it | greyed, *No access* | nothing: a press says *Ask your admin for access to Connect your assistant.* |
| anyone, while [the app can't hand the project out](#the-apps-only-connection) | opens the steps | connects their apps only |

**A skill arrives with the project, so running one needs Project code.** Everyone who holds it gets every skill's file. Whether a skill then works is the app's answer: each call it makes needs [the area it belongs to](employee-access.md#areas-and-their-levels) and the keys it uses, at the level the call needs. [The Skills view](employee-access.md#the-skills-view) shows who holds all of it.

## Install in one step

The prompt names the app, [the reviewed bootstrap](#get-the-reviewed-bootstrap) and one command:

```bash
node "$PRIVATE/bootstrap.mjs" install --origin https://business.example.com
```

`install` does three things and prints one summary:

1. **Signs in.** The person approves their own app sign-in on that computer. A computer with no browser shows only a validated sign-in link for this business.
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

## The copy is for using, not publishing

A person can read the project and work in their copy. A push to the address it came from is refused: *This copy is for reading. Your employer grants publishing where the project is kept.*

### Publishing stays manual

To let someone publish, the owner adds them where the project is kept, by hand: as a collaborator on GitHub, or [not yet at all](artifacts-route.md#limits) on a project kept in Cloudflare. The person then points their copy's `origin` at that address; it keeps its history and their work. App login issues no repository credential or invitation and changes no personal GitHub login. `/continue`, `/save` and `/ship` keep their own sign-in and [gates](../development/the-change-loop.md#the-gate).

## When access is taken away

Unticking Project code, or removing the person, refuses their next download at once, with no sign-out needed: every download is judged against their access at that moment.

**The copy already on their device stays there.** The app can not reach it, and Access says so when a person is removed. The copy holds no keys or passwords: [those never sit in the project](../development/secrets.md). Access given where the project is kept is removed there.

## The apps-only connection

Until the app can hand the project out, Connect works as it did before for every signed-in person: the prompt connects company actions and nothing else. That is the case when:

- a GitHub project has no [read-only key](#the-owners-one-step-on-github) saved yet;
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

The app passes Git's two read calls through to where the project is kept and adds the server's own credential. It stores no copy, so a wiki-only publish is there on the next download.

- **The address** is `/api/access/code/git/` on the app, behind [the sign-in wall](cloudflare-access.md).
- **Before anything is asked upstream**, the caller must be a signed-in person who holds Project code now. A service token is refused on the live app; on a preview [the checker stands in for the owner](employee-access.md#the-checker-on-a-preview).
- **Only reading is forwarded.** Every other call answers 403 before any upstream request.
- **The credential never leaves the server.** It is in no prompt, answer or log, and the upstream's cookies and sign-in challenge are dropped. A refusal upstream reads as `code_unavailable`.
- **The device sends its session to the app alone**, as a request header set in Git's environment: never an argument, the saved address or a config file. Redirects are refused.
- **No mini app or action is handed the credential**, even one that lists the key.

`WONG_CODE_REPOSITORY`, in both Workers' `vars` in `app/wrangler.jsonc`, names the one project: `owner/name` on GitHub, or the repository's name in the account's Artifacts. [Setup and the Access step](employee-access.md#finish-access-setup) write it.

### The owner's one step on GitHub

The app needs a read-only key for this one repository, `WONG_CODE_READ`. The Access step's report carries `codeKey: missing` with the steps until both Workers hold it. [Send the key link](../development/secrets.md#receive-a-key-through-a-private-link) for `WONG_CODE_READ` with this guide:

1. Open [GitHub's new fine-grained token page](https://github.com/settings/personal-access-tokens/new).
2. *Repository access*: **Only select repositories**, then this one repository.
3. *Permissions*: **Contents: Read-only**. Add no other permission.
4. *Expiration*: none, or renew it before it ends. An expired key turns Connect back to apps only, never to open.
5. Generate the token and paste it into the link's page.

Then `npm run secrets:push` loads it into the live app and the preview app. To rotate it, delete the token on GitHub and paste a new one.

### No step on a project kept in Cloudflare

On [the Artifacts route](artifacts-route.md) the Access step binds both Workers to the account's `wongstack` namespace. The app asks that binding for a five-minute read token for the one recorded repository on each call, so no key is made or pasted, and Project code shows as saved after the next publish.

## Get the reviewed bootstrap

The prompt names an exact public WongStack Source commit and SHA-256 digest for `scripts/employee-bootstrap.mjs`, at `https://raw.githubusercontent.com/matthewwong525/WongStack/<full-commit>/scripts/employee-bootstrap.mjs`. A mutable branch URL, business-server script or invented release asset is unsuitable. Missing release pins show setup unavailable.

Fetch the exact URL without credentials and refuse redirects. Verify its complete digest before running anything. Save it as `bootstrap.mjs` in an OS-user-private directory outside every checkout (directory 0700, file 0600). The business origin must be HTTPS without a path, query, fragment or credentials. The helper checks its own private files and refuses a redirect that asks for the session, so the short prompt need not repeat those rules.

## Memory keeps its own setup

Company login grants no memory permission or machine enrollment. Preserve already installed memory and its target. A fresh computer reports independent operator setup required without blocking company actions. Follow [memory access](../development/memory-key.md) through the trusted owner when needed.

## Publish checked artifact pins

[The committed release record](../../app/worker/employee-access/bootstrap-release.json) carries `version: 1`, a full public Source `commit` and complete `sha256`; blank pins deliberately leave prompt copying unavailable. The final source checkpoint may create a complete source commit, pin its artifact bytes in a subsequent commit, and push once. Distribution tests prove the pinned digest is the bootstrap under test's, and that the pinned commit's bytes equal it wherever the checkout holds that commit. Publishing squashes the branch, so the commit is not in the default branch's history; its public address still serves it. Confirm the exact public raw URL after those checks pass. Commit existence alone proves no readiness.

If bootstrap bytes change afterward, establish a new immutable source commit and matching digest before claiming the copied prompt ready. Never change existing pins to a mutable URL. Customized installs retain their branding, login, app routes, dirty local work and separate memory.

Part of the [Cloudflare stack](README.md).
