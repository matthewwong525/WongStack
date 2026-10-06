# Connect your assistant installs the project

**Status:** in-progress

**Branch:** prolific-bumblebee

**Open questions:** none

## Why

*Connect your assistant* links an assistant to a person's apps today, and nothing more. The project itself is handed out by hand, on GitHub or in Cloudflare, wherever it is kept, to people who have an account there. You said Connect "should basically install the github repo on their device and they are able to connect to APIs via the repo and access is given based on their login credentials", and that a person without access should see Connect greyed out. This plan makes the app login the one login: you tick a person in Access, and their assistant downloads the project from the app's own address and installs it. The person needs no GitHub or Cloudflare account and installs nothing by hand.

## What Changes

- **Connect puts the whole project on the person's device.** They paste a short setup text into their assistant and approve their app sign-in on that computer. The assistant then downloads the project from the app's own address into a folder, and uses your apps from inside it. The download comes from the app whether the project is kept on GitHub or in Cloudflare. The person needs no GitHub or Cloudflare account, types no key, and installs nothing by hand. Running the same step again later brings the copy up to date.
- **The setup text is short, and one step does it all.** Today's text is five long paragraphs of instructions. The new one names the app, the checked installer and one step to run; the installer signs in, downloads, and reports what works.
  ```text
  you          the app        their device
   │─ tick ─────▶│                 │
   │             │◀─ paste, sign in│
   │             │── the project ─▶│
   │             │◀─ use the apps ─│
   │─ untick ───▶│                 │
   │             │── no updates ──▶│
  ```
- **You choose who gets the project, in Access.** *Project code* shows in Access beside your keys, with two choices per person or role: None or Read. Nobody has it on the day this goes live but you. A manager can give it, to themselves included, as with any key.
  ```text
  ┌──────────────────────────────────────┐
  │ Access           [Connect assistant] │
  │ People 3  Roles 2  Apps 2  [Keys 2]  │
  │ Keys                                 │
  │ Key            Read       Read&write │
  │ ──────────────────────────────────── │
  │ Cloudflare     you, kim   —          │
  │ +Project code  you, kim   —          │
  └──────────────────────────────────────┘
   opened: tick who may Read it
  ```
- **A person without it sees Connect greyed.** The card is marked *No access*, opens nothing, and a click says *Ask your admin for access to Connect your assistant.*, like an app they lack.
  ```text
    BEFORE                    AFTER, not ticked
  ┌────────────────────────┐  ┌────────────────────────┐
  │ Hello                → │  │ Hello                → │
  ├────────────────────────┤  ├────────────────────────┤
  │ Connect your         → │  │ Connect your  No access│
  │ assistant              │  │ assistant     (greyed) │
  └────────────────────────┘  └────────────────────────┘
                               Ask your admin for access
                               to Connect your assistant.
  ```
- **The popup says what the person gets.** It names the apps and that the project comes with them.
  ```text
  ┌──────────────────────────────────────┐
  │ Connect your assistant               │
  │ Signed in as kim@example.com         │
  │ Apps: Hello, Orders                  │
  │ +Project: the whole project, kept    │
  │ +up to date                          │
  │ ┌──────────────────────────────────┐ │
  │ │ Install my company's project     │ │
  │ │ from https://app.example.com …   │ │
  │ └──────────────────────────────────┘ │
  │ [Copy setup prompt]                  │
  │ Paste it into your assistant and     │
  │ approve the sign-in on that computer.│
  │                              [Close] │
  └──────────────────────────────────────┘
  ```
- **The copy is for using, not for publishing.** A person can read the project and work in their copy. They can't publish a change from it. To let someone publish, you still add them where the project is kept, by hand. Their copy then keeps its history and their work.
- **One step for you on a GitHub project.** The app needs a read-only GitHub key for this one project. Your assistant sends a private link with numbered steps; you make the key and paste it once. Until it is saved, Connect works as it does today for everyone, and Access tells you one step is left.
  ```text
  key saved? ─ no ─▶ Connect as today, for all
       │ yes
       ▼
  ticked? ─ no ─▶ greyed, "ask your admin"
       │ yes
       ▼
  Connect installs the project
  ```
- **No step on a project kept in Cloudflare.** An install with no GitHub hands out the project straight from your Cloudflare account, with no key to make. The update switches it on. This is the first way a teammate gets the project on such an install.
- **Assistants already connected keep working.** Nobody is cut off. A person connected the old way keeps using their apps. They get the project once you tick them and they run Connect again.
- **Unticking or removing a person stops updates at once.** Their next download is refused. The copy already on their device stays there; the app can't reach it, and Access says so when you remove someone. The copy holds no keys or passwords: those never sit in the project.
- **A device with nothing installed still works.** The assistant installs the small programs it needs by itself, as it does today, now including git. None needs an account. A folder that already holds other work is left alone: the assistant picks an empty one, and an update never throws away what the person changed.

**Non-goals:** publishing changes from an app-given copy; inviting people on GitHub from the app; memory, which keeps its own setup; removing a copy from a device.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `employee-onboarding`: Connect installs the project for a person who holds Project code, with app login as the only credential; the grant, the greyed state, read-only copies, removal and already-connected people are promised; repository access is no longer manual-only.
- `mini-apps`: the home list's Connect entry is unavailable, with ask-your-admin guidance, to a person who lacks Project code once the install can hand the project out.
- `key-access`: Project code is a key with the single level Read that works with no app and is ready from a saved GitHub key or the install's own Cloudflare repository.
- `cloudflare-provisioning`: setup and the Access step record which project the app hands out, and on an install with no GitHub connect the app to its repository.

## Impact

- `app/worker/employee-access/`: new code route (read-only Git pass-through), `setup.ts`, `prompt.ts`, `router.ts`, `bootstrap-release.json`; `app/worker/keys.ts`; `app/worker/index.ts` route map; `app/wrangler.jsonc` (a nonsecret project name; an Artifacts binding on installs with no GitHub); `app/.dev.vars.example`.
- `app/src/pages/home/AppList.tsx`, `app/src/components/AssistantSetup.tsx`, `ConnectDialog.tsx`, `app/src/lib/access.ts`, `app/src/apps/access/` (the Connect button, the removal question's words), and their tests.
- `scripts/employee-bootstrap.mjs` (a `code` command) and its tests; a new pin.
- `.agents/skills/wong-setup/scripts/provision.mjs`, `references/cloudflare.md`, `permission-groups.md` if a permission is added; `scripts/cf-secrets.mjs` if the key name needs listing.
- `wiki/stack/employee-project.md`, `employee-access.md`, `artifacts-route.md`, `api-keys.md`, `mini-apps.md`, `company-api.md`.
- Staging's practice data: one person with Project code and one without.
- `CHANGELOG.md`: a `minor` entry with the one hand step.
- No database change: Project code is stored as a key level.

## Decision log

- **2026-10-05** — Asked how a person should get the project's code onto their device → chose through the app, with their app login; no GitHub account, and publishing still needs adding on GitHub by hand.
- **2026-10-05** — Asked who has the code on the day this goes live → chose only the owner, who then ticks people.
- **2026-10-05** — Asked about installs that keep their project in Cloudflare with no GitHub → chose to cover them in this change.
- **2026-10-05** — Assumed: Project code is a key in Access with the one level Read, because Access already gives a key per person or role, shows who has it, and starts with nobody but the owner holding it; a new kind of tick would be a second system.
- **2026-10-05** — Assumed: the app passes the project through from where it is kept and stores no copy, because a stored copy goes stale on every wiki-only publish and would need new storage in every install.
- **2026-10-05** — Assumed: until the app can hand the project out, Connect stays as it is today for everyone, because an update should take nothing away before the owner has done their one step.
- **2026-10-05** — Assumed: assistants already connected keep working with their apps, because the app can't tell an assistant's request from the person's own browser, and their reach is the same either way.
- **2026-10-05** — Assumed: nothing reaches into a copy already downloaded, because the app can't, and a promise to wipe a device would be false; Access says it at removal.
- **2026-10-05** — Assumed: a missing git is installed by the assistant from its official source, like the two tools setup needs today.
- **2026-10-05** — Assumed: staging hands out the project too, to practice people who hold it, because staging should mirror the live app and the checker already has the project.
- **2026-10-05** — Assumed: this is a minor release, because nothing changes for an install until its owner saves the key, and no one loses a working connection.
- **2026-10-05** — Assumed: confirmed from Cloudflare's documentation that a Worker can be bound to an Artifacts namespace and make a short-lived read-only token for one repository; which permission the deploy needs for that binding is proven on staging in the first task, and a refusal stops the build there.
- **2026-10-05** — Review note: Why now says the project is handed out by hand on GitHub or in Cloudflare, and that the download comes from the app's own address on both.
- **2026-10-05** — Review note: the setup text becomes short and the installer does sign-in, download and readback in one step, because he asked for a short prompt the assistant installs from.
- **2026-10-05** — Assumed: the device still approves the person's app sign-in with the small sign-in program the assistant installs, because the app's address sits behind the sign-in wall; a download link that needs no sign-in at all means a door in that wall and a secret in the copied text, so it is offered as a choice, not folded in.
- **2026-10-05** — Asked how the device proves who it is when it downloads the project → chose to keep the app sign-in, with no secret in the copied text, and to build it with a preview before anything is published.
- **2026-10-05** — Build order: the two upstream proofs moved from the first tasks to final verification (now 7.2 and 7.3), after the source and tests were written, because each needs a preview deploy and a key the build step can not make. A refusal there still stops the publish, and 5.2 takes any permission 7.2 names. The second proof clones through the real code route, so no throwaway route is added and removed.
- **2026-10-06** — Save: the source, tests and wiki are written and the local checks pass; the installer is pinned at the first saved commit. Left: confirm the public address serves the pinned installer (4.2), the two upstream proofs on a preview (7.2, 7.3, with 5.2 depending on 7.2), the preview walk (7.4) and a real sign-in from this computer (7.5).
