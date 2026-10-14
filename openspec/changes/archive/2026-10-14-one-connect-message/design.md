# Design

## Context

See proposal.md. Today `GET /api/access/setup` (`app/worker/employee-access/setup.ts`) answers one of two prompts from `prompt.ts`, both naming `scripts/employee-bootstrap.mjs` at a pinned public Source commit with a SHA-256 from `bootstrap-release.json`. Blank pins make the prompt `unavailable`.

One Worker serves everything behind Cloudflare Access. `app/worker/index.ts` answers `/_memory/*` before the identity check, and the Access app carries a `public` override for `/_memory/*` on the production Worker and its anchor only. `scripts/check-private-access.mjs` deep-equals the app's destinations before every publish, so any other override fails the gate until the owner reruns `provision.mjs access`.

`scripts/employee-bootstrap.mjs` is one standalone file. `install` signs in through `cloudflared`, clones through `/api/access/code/git/` into `--dir`, else the folder used last time, else `~/<host>`.

The shape follows ClaymooApp's `one-connect-message` change, adapted to one Worker and, by review note, to a fixed link.

## Goals / Non-Goals

**Goals:**
- An assistant with no sign-in fetches the setup file from a fixed link in the message.
- No Access policy change on any install, no new secret, no new table.

**Non-Goals:**
- Any change to who may connect or install the project, or to the read-only code route.
- Replacing `cloudflared`, or opening the sign-in page for the person.

## Decisions

**D1. A fixed public link under the existing memory opening.**
- `GET /_memory/setup.mjs`, matched in `index.ts` before the `MEMORY_PREFIX` hand-off and before the identity check. It answers the setup file, `text/javascript; charset=utf-8`, `no-store`. Any other method is 405.
- It reads no database and carries no memory credential.
- Why not a ten-minute token link (the first draft): the owner asked for a fixed link; it also needs a table, a mint step and a message that goes stale. The file is the script the public Source repo already serves, so a token protected nothing secret.
- Why not a new `/_setup/*` override: `check-private-access.mjs` matches destinations exactly, so every existing install's publish would fail until its owner reran the Access step with a Cloudflare token.
- Why not keep the pinned GitHub URL: the fingerprint is what makes the message long, and the pin ceremony is a release step that can leave Connect unavailable.
- Staging has no override, so a preview's link answers Cloudflare's sign-in to an anonymous fetch. `/verify` fetches it with the service token.
- An install that is [open until the card](../../../wiki/stack/cloudflare-access.md#open-until-the-card) has no wall; the route works as written.

**D2. The served file.** The Worker imports `scripts/employee-bootstrap.mjs` as text (`?raw`) in a module of its own, `setup-file.ts`, that only `index.ts`'s route reaches, so a test that loads the handlers never loads it. The body is the script with its `const SERVED_FROM = '';` line replaced by the request's origin, by one pure tested function that throws when the marker is absent.

**D3. The message.** `setupMessage(origin)` in `prompt.ts` returns the proposal's lines with `<origin>/_memory/setup.mjs`. The `artifact` and `project` parameters, the pinned URL and `bootstrap-release.json` go. `GET /api/access/setup` keeps its shape; `prompt.state: 'unavailable'` remains only for `lacked`.

**D4. The popup.** `AssistantSetup` keeps its three steps and closing lines; only the message text changes. The handling of an unready install goes with the pins.

**D5. Setup installs into the current folder** (`scripts/employee-bootstrap.mjs`).
- No command means `install`. Origin: `--origin`, else `SERVED_FROM`, else the origin saved for the copy the script sits in.
- Folder: `--dir`, else the copy the script sits in when run as `scripts/employee-bootstrap.mjs` inside one, else `process.cwd()`. The `~/<host>` default and the remembered `project.json` folder go.
- After sign-in, look at the folder before asking for the download. A Git copy whose `origin` is another address for the same project is left as it is: the report says signed in, copy left alone, and never prints the *not included* line.
- The served file's own path does not count as "other files". It removes itself before a clone, since Git refuses a non-empty folder, and again when `main` ends, pass or fail. A copy inside the project never deletes itself.
- State stays in `~/.local/state/wong-company/<hash of origin>`. `login`, `status`, `code`, `list`, `describe`, `call` keep working. The sign-in link is printed as today.

**D6. Retire the pins.** Remove `bootstrap-release.json`, its distribution tests and the two wiki sections that own it; add the file name to `scripts/retired-names.json` and drop it from the payload lists and the journey file's watched paths.

## Risks / Trade-offs

- [Anyone can fetch the setup file from a live app] → it is the script the public Source repo already serves, plus the address they fetched it from. It holds no key; every call it makes needs the person's own sign-in.
- [No fingerprint: the assistant runs what the app's address serves] → that address is the one the person signs in to and trusts with their work; an attacker who controls it already controls the app.
- [A path under `/_memory/` now serves something that is not memory] → one route, named and commented at the match, documented in `cloudflare-access.md`; it shares nothing with the memory handler.
- [A person cannot connect an assistant to a preview without a signed-in fetch] → previews are for checking; the live app is where people connect.
- [`?raw` of a file outside `app/`] → proven at build in task 1; if Vite refuses the path, copy the script into the Worker at build with the existing prebuild hook.

## Migration Plan

No data change. An install gets the route with its next update; a message copied earlier keeps working, because the pinned public address stays reachable. Rollback: revert the code.
