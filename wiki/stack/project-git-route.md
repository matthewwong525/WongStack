# How the app hands the project out

The app passes Git's two read calls, and [one kind of push](employee-project.md#what-the-app-takes-and-refuses), through to where the project is kept and adds the server's own credential. It stores no copy, so a wiki-only publish is there on the next download.

- **The address** is `/api/access/code/git/` on the app. It skips [the sign-in wall](cloudflare-access.md#4-bypass-the-public-surface), and the Worker checks the sign-in itself, since Git sends it as a password.
- **Before anything is asked upstream**, the caller must be a signed-in person who holds Project code now. A service token is refused on the live app; on a preview [the checker stands in for the owner](preview-access.md#the-checker-on-a-preview).
- **Reading, and one branch's save, are forwarded.** A push's ref updates are read and judged first; the pack is streamed on, never held. Every other call is refused before any upstream request.
- **A saved change is read at `/api/access/code/change`**, judged the same way: its checks, preview and page, one check's log, and a restart of a cut-off check run on a project kept in Cloudflare. Answers carry chosen fields, never the upstream's own words.
- **The credential never leaves the server.** It is in no message, answer or log, and the upstream's cookies and sign-in challenge are dropped. A refusal upstream reads as `code_unavailable`.
- **The device sends its session to the app alone**: setup's download as a header set in Git's environment, and the copy's Git through [its credential helper](employee-project.md#update-the-copy). Never an argument, the saved address or a config file. Redirects are refused.
- **No mini app or action is handed the credential**, even one that lists the key.

`WONG_CODE_REPOSITORY`, in both Workers' `vars` in `app/wrangler.jsonc`, names the one project: `owner/name` on GitHub, or the repository's name in the account's Artifacts. [Setup and the Access step](employee-access.md#finish-access-setup) write it.

## The owner's one step on GitHub

The app needs one key for this one repository, `WONG_CODE_WRITE`: it hands the project out and saves changes. **Access asks for it, not setup.** The first time the owner ticks *Can install the project* with no key saved, [the panel says one step comes first](access-screens.md#a-panel-has-apps-and-keys) and gives a request to copy: *Let teammates install the project*. Setup and an update say nothing of the key, so an owner who works alone is never asked. The key lives in the live app alone, never in a preview. The Access step's report still carries `codeKey` with the steps until the live app holds it, and no to-do: `status` says whether the project can be handed out, `save` whether a change can be saved.

When the owner hands you that request, [send the key link](../development/secrets.md#receive-a-key-through-a-private-link) for `WONG_CODE_WRITE` with this guide:

1. Open [GitHub's new fine-grained token page](https://github.com/settings/personal-access-tokens/new).
2. *Repository access*: **Only select repositories**, then this one repository.
3. *Repository permissions*: **Contents: Read and write** and **Pull requests: Read and write**.
4. Three more at **Read-only**: **Actions**, **Commit statuses**, **Deployments**.
5. Add no other permission, and never **Workflows**: it would let a saved change rewrite the checks.
6. *Expiration*: none, or renew it before it ends. An expired key turns Connect back to apps only, never to open.
7. Generate the token and paste it into the link's page.

Then `npm run secrets:push` loads it into the live app alone: previews never hold it. To rotate it, delete the token on GitHub and paste a new one.

**The key writes to that one repository**, and the app uses it only for the calls above. GitHub can't hold a key to branches other than the published one, so protect that branch on GitHub: with a rule set that requires a pull request, nothing reaches it without the owner.

## An install that holds the older key

An install from before saving holds `WONG_CODE_READ`, which reads the project and nothing else. It keeps handing the project out. Access says *Saving needs one more step* under the tick, with the request *Let teammates save changes*: send the key link for `WONG_CODE_WRITE` with the guide above. Once the live app holds the new key, delete the old token on GitHub and remove `WONG_CODE_READ` from the secrets file.

## No step on a project kept in Cloudflare

On [the Artifacts route](artifacts-route.md) the Access step binds the production Worker alone to the account's `wongstack` namespace, and removes any staging binding it made before. The app asks that binding for a five-minute token for the one recorded repository on each call, to read or to save, so no key is made or pasted, and Project code shows as saved after the next publish.

The same step binds the production Worker to the check runner, as `CODE_CHECKS`, so the app can read a saved change's check run. An install from before saving gets it by [finishing Access setup](employee-access.md#finish-access-setup) once more, then publishing. The step leaves a to-do when it can't add the binding itself: a `workflows` list already in `app/wrangler.jsonc` means adding the entry by hand, and an install record with no check runner means running setup's Cloudflare step again.

Part of [Employee assistant connection](employee-project.md), in the [Cloudflare stack](README.md).
