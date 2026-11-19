<!-- openspec-archive v1 2026-10-04-choose-project-in-setup -->
<!-- file proposal.md utf8 31784 -->
# Sign in and connect your assistant

**Status:** ready-to-ship
**Branch:** smooth-repo-selection
**Open questions:** The live-app test follows publishing: make the key for the live app, then check a real second person end to end.

## Why

Employees should start from the business app they already use, copy one setup prompt and connect their assistant to the apps they are allowed to use. The employer should control those permissions in one small app.

The first build could not be switched on. Access stayed locked until someone filled in five hidden settings and ran about seven commands, and it refused to work on a preview at all. The owner signed in and saw no access and no way to add anyone. This revision makes Access work the moment the owner opens it.

## What Changes

- **Access knows the owner.** Setup already records the owner's email when it puts the sign-in in front of the app. Open Access with that email and the people list is there: no hidden settings, no commands.
  ```text
    BEFORE                      AFTER
  ┌────────────────────────┐  ┌────────────────────────┐
  │ Access                 │  │ Access   +[Add person] │
  │ People management is   │  │ bo@example.com         │
  │ unavailable.           │  │ Orders · Can sign in   │
  │ [Retry people]         │  │ ana@example.com        │
  │ [Copy private setup]   │  │ No apps · Can sign in  │
  │ Assistant setup is     │  │ +Connect assistant     │
  │ unavailable.           │  │ +[Copy setup prompt]   │
  └────────────────────────┘  └────────────────────────┘
  ```
- **Add person does everything in one save.** Type an email, tick the apps, save. The app records the choices and adds the email to the sign-in list itself. One line per person says whether they can sign in. A retry shows only when that step failed.
  ```text
  ADD PERSON
  ┌──────────────────────────────────┐
  │ Email  [bo@example.com       ]   │
  │ Apps   [x] Orders  [ ] Payroll   │
  │ [Save access]         [Cancel]   │
  └──────────────────────────────────┘

  SAVED
  ┌──────────────────────────────────┐
  │ bo@example.com                   │
  │ Orders · Can sign in    [Edit]   │
  │ [Copy app link]                  │
  └──────────────────────────────────┘

  SIGN-IN STEP FAILED
  ┌──────────────────────────────────┐
  │ bo@example.com                   │
  │ Orders · Can't sign in yet       │
  │ [Try again]                      │
  └──────────────────────────────────┘
  ```
- **The live app holds its own key for the sign-in list.** Setup makes a Cloudflare key that can only edit sign-in rules and stores it in the live app, never in a preview. Cloudflare scopes that kind of key to the whole account; the app only ever edits its own list. An install made before this change gets the key the next time it updates. Until then Access still opens and saves app choices, and says one step is left.
  ```text
  ONE STEP LEFT
  ┌──────────────────────────────────┐
  │ Access                           │
  │ You can choose apps now. To let  │
  │ new people sign in, ask your     │
  │ assistant: Finish Access setup   │
  │ [Copy that request]              │
  └──────────────────────────────────┘
  ```
- **People who can already sign in keep every app.** The first time the owner opens Access, it lists everyone already on the sign-in list with every app ticked. Nothing changes for them until the owner unticks something. A person added later starts with no apps.
  ```text
  FIRST OPEN
  ┌──────────────────────────────────┐
  │ 3 people could already sign in.  │
  │ They keep every app until you    │
  │ change them.                     │
  │ cy@example.com                   │
  │ All apps · Can sign in  [Edit]   │
  └──────────────────────────────────┘
  ```
- **A new app shows up by itself.** When an app is built it appears in the tick list, unticked for everyone but the owner. Nobody edits a second hidden list of apps.
  ```text
  build Payroll ─▶ Access lists Payroll
                          │
                          ▼
                owner ticks it for Bo
  ```
- **A preview has its own practice list.** On a preview link the owner can add people and choose apps to try the screen before publishing. Those choices stay on previews and never touch the real sign-in list.
  ```text
  ON A PREVIEW
  ┌──────────────────────────────────┐
  │ Access · Practice list           │
  │ Changes here stay on previews.   │
  │ The real sign-in list is not     │
  │ touched.          [Add person]   │
  └──────────────────────────────────┘
  ```
- **The setup prompt is always there, in one box.** Anyone signed in can copy it from Home or Access, paste it into their assistant and approve the same sign-in on that computer. The prompt holds no keys. If copying fails, the text stays on screen to copy by hand.
  ```text
  CONNECT YOUR ASSISTANT
  ┌──────────────────────────────────┐
  │ Signed in as bo@example.com      │
  │ Apps: Orders                     │
  │ [Copy setup prompt]              │
  │ Paste it into your assistant     │
  │ and approve the sign-in.         │
  └──────────────────────────────────┘

  you            assistant        app
   │── paste ─────▶│               │
   │               │── sign in? ──▶│
   │── approve ───────────────────▶│
   │               │◀── allowed ───│
  ```
- **The same app permissions apply everywhere.** App pages, direct calls and assistant actions all check the person's current apps. Unticking an app blocks their next request, even while they stay signed in.
  ```text
  Orders ticked   ─▶ page / call / assistant: yes
  Payroll unticked ─▶ page / call / assistant: no
  ```
- **Removing a person blocks them at once, and signs everyone out.** Their app use stops with the save. Taking them off the sign-in list also ends every open session of this app, so the people who remain sign in again. This can't be undone.
  ```text
  REMOVE PERSON
  ┌──────────────────────────────────┐
  │ Remove bo@example.com?           │
  │ Everyone is signed out and       │
  │ signs in again. Can't be undone. │
  │ [Remove access]       [Cancel]   │
  └──────────────────────────────────┘
  ```
- **Repository access stays manual.** Signing in to the app gives no access to the project's code. The employer grants that separately, and Access does not manage it. Memory setup also stays separate.
- **Build first, check at the end.** Finish the remaining work, then run the checks once and review the finished preview.

**Non-goals:** repository invitations, GitHub App registration or token issuance, private Git/PR adapters, Artifacts automation, new-project setup, Cloudflare OAuth changes, hosting administration, custom invitation email, per-record business roles, fresh memory enrollment, changing who the owner is from inside the app.

## Capabilities

### New Capabilities

None; the earlier source checkpoints already introduced employee onboarding in this branch.

### Modified Capabilities

- `employee-onboarding`: the owner is the signed-in email setup recorded, with no private activation; saving a person also admits their email; existing people keep their apps when permissions start; previews keep a practice list; the prompt is available to every signed-in person.
- `company-api`: current selected-app permissions govern both described and legacy business routes once permissions start, while preserving stricter checks.
- `agent-api-discovery`: current permissions filter action summaries, details and OpenAPI.
- `cloudflare-provisioning`: setup provisions the production-only sign-in-list key and the committed owner email; the key is omitted from staging, and both push targets are validated before the first provider write.
- `mini-apps`: permitted app navigation, the people-first Access screen, the prompt on Home for every signed-in person and private login-management binding exclusions.

## Impact

Existing Source app: core authorization and login management, Access mini app, Home setup box, standalone company API helper, setup's provisioner and the update path for existing installs, secret tooling, payload inventory, owning documentation and tests. Removed from this unshipped change: private owner activation, the private rollout list, the policy latch, the sealing key, the owner-setup script and the operator panel. Additive migrations and customer data stay. No Cloud companion or new sign-in service is added.

Completed source-check evidence remains in [source-checks.md](source-checks.md); it covers the first build, not this revision. Real owner and employee sign-in on the live app must be checked after publishing and must not be claimed from synthetic tests.

## Decision log

- **2026-10-04** — Asked to support Cloudflare only and require manual GitHub access → chose manual GitHub admission/authentication, superseding automatic GitHub App registration, employee credential issuance and the special GitHub repository adapter. Cloudflare Artifacts versus app/API-only scope remains pending clarification; preserve completed source evidence without treating withdrawn GitHub features as remaining work. Remaining work should use fewer shared verification checkpoints rather than a full remote gate after each small task.

- **2026-10-04** — Asked what selecting a repository should do → chose starting a new project or opening an existing WongStack project, with customized starters separate.
- **2026-10-04** — Asked where a new Cloudflare project belongs → chose the person's own Cloudflare account.
- **2026-10-04** — Asked how to handle the overlapping managed starter work → chose to keep going here, design around it and leave it unchanged.
- **2026-10-04** — Asked whether setup may use a shared sign-in helper → chose yes, for sign-in only, with projects and hosting still owned by the person.
- **2026-10-04** — Asked how much teammate access to include → chose existing GitHub invitations and separate Artifacts repository tokens, without a new invitation flow.
- **2026-10-04** — Asked whether to plan this flow → chose to plan, assuming #259 will merge.
- **2026-10-04** — Assumed: one coordinated Source/Cloud change, because replacing the picker depends on the same setup and sign-in handoff working end to end.
- **2026-10-04** — Assumed: deterministic helpers own repeatable sign-in, selection, resume and provisioning state; the assistant explains results and carries the ordinary workflow, because API identities and retries must be consistent.
- **2026-10-04** — Assumed: full personal installation for new own-account projects, because existing setup includes hosting and memory, whereas #259 deliberately defines a smaller managed starter.
- **2026-10-04** — Assumed: source retrieval can still read the public GitHub template without GitHub sign-in on the Artifacts route; removing all GitHub network access was not requested.
- **2026-10-04** — Asked whether to add invitations and an employee setup page to this plan → chose to add them here, superseding the earlier manual-sharing scope.
- **2026-10-04** — Asked whether all invited employees should receive project access → chose app access by default, with project editing selected per employee.
- **2026-10-04** — Assumed: the employer's own-account installation runs membership management, because the shared helper remains authorized for sign-in only.
- **2026-10-04** — Assumed: employee setup consumes the published trusted-machine memory contract without a Devices UI or separate browser approval, because the owning active change explicitly replaces that flow.
- **2026-10-04** — Assumed: invitation cancellation, editing removal and employee removal are in scope, because employers need to withdraw the access this flow grants.
- **2026-10-04** — Asked whether to include employee-specific app access controlling API and assistant calls → chose to include it in Team invitations and employee settings.
- **2026-10-04** — Assumed: per-app access is allowed or denied, with no apps preselected and new apps denied until assigned, because that implements the selected-app choice without inventing business-specific roles or automatic access.
- **2026-10-04** — Assumed: project editing and memory remain separate grants, because allowing a business app does not authorize its whole source repository or redefine the established machine-memory policy.

- **2026-10-04** — Asked to simplify setup around hosted-app login, a copyable prompt and an Access mini app → chose that entry point and a smaller setup experience, superseding the larger provider-first flow.
- **2026-10-04** — Asked whether the smaller first version should cover only an existing app and GitHub repository → chose existing app + GitHub first, leaving new-project setup, Cloudflare OAuth changes, Artifacts delivery and Cloud picker replacement for later.
- **2026-10-04** — Assumed: GitHub App installation credentials authorize employee assistant operations without a separate employee GitHub login, because app login should be their single identity; native GitHub website membership remains separate.
- **2026-10-04** — Assumed: add allowed emails and share the ordinary app link, with no custom invitation mail sender, because the app itself is now the starting point.
- **2026-10-04** — Assumed: the copied prompt contains routing and instructions only, with credentials handed to the helper privately after app authentication, because pasting reusable keys into assistant history is unnecessary.
- **2026-10-04** — Assumed: fresh memory enrollment stays out of this smaller version, because it needs the separate trusted operator contract and cannot be granted by ordinary app login.

- **2026-10-04** — Assumed: checkpoint the additive owner-activation slice for its required remote checks before continuing, because task 2.1 requires that gate and leaves employee policy/issuance disabled.

- **2026-10-04** — Assumed: distinguish completed source/provider-contract inventories from actual owner/provider acceptance, because the current target lacks verified owner setup and live confirmation remains in task 7.2. The activation slice passed remote app, build, payload and generated-starter checks at 8ba9ab9.

- **2026-10-04** — Grouped related provider, bootstrap, UI and distribution tasks into shared remote-check slices, preserving all named checks and the separate live acceptance gate. This changes checkpoint timing only; no feature or acceptance requirement was removed.
- **2026-10-04** — Task 2.2 adds current primary-snapshot membership checks and explicit route scopes. Source is ready for remote checks; runtime policy remains disabled pending reviewed owner rollout.

- **2026-10-04** — Integrated merged #263 memory-recall baseline without changing independent memory authority. Remote 2.2 checks caught a fixture foreign-key cleanup error; fixed its dependent-row removal order without weakening schema or checks.

- **2026-10-04** — Remote distribution checks found a wiki link to generated install-only Worker configuration. Generalized the reference to its installed path; all script and generated-starter checks passed before that documentation failure. Checks remain unchanged.

- **2026-10-04** — Task 2.2 passed remote app/build/payload checks at `37288ef`, with two fixture/documentation fixes and no loosened checks. Continued to current-grant discovery/readback; the production rollout latch stays disabled.

- **2026-10-04** — Task 2.3 source now filters every discovery representation with current route scopes, and reads frontend app assignments without granting a legacy caller an owner role. Kept the client-only-app test portable across payload installs rather than requiring the meta-only Tips app. Preparing its remote gate.

- **2026-10-04** — Task 2.3 passed remote app/build/distribution checks at `40a7a4c5`, with no gate fixes or loosened checks. Current verification baseline #261 is retained. Continued to the shared owner/provider connection slice 3.1–3.4; rollout and issuance remain disabled.

- **2026-10-04** — Primary GitHub documentation showed that publication inspection requires Secrets read and Environments read for name/metadata listings, which never expose secret values. Narrowed the earlier no-secrets wording to forbid secret modification/employee authority while allowing necessary owner-only inspection permissions in the new manifest, approved by the owner at connection. No existing live grant is expanded; unreadable or unproven publication boundaries remain blocked. Source: https://docs.github.com/en/rest/actions/secrets#list-repository-secrets.

- **2026-10-04** — The owner/provider source slice 3.1–3.4 is ready for its shared remote gate, including durable unknown-write/token outcomes and caller-only setup status. Runtime rollout/issuance remain disabled. Preserved the separate controlled provider acceptance and the production/staging secret-distribution follow-up.

- **2026-10-04** — Integrated merged #265 workflow baseline `1c5c65fe`, retaining current gate diagnosis and mid-build decision handling. Added the required plain consequence of credential revocation to the existing removal description; revocation behavior and scope are unchanged.

- **2026-10-04** — The shared 3.4 gate found three oversized functions and an unescaped workflow-expression fixture. Split focused checks/owner dispatch and corrected the fixture without changing behavior or limits. Retain CI coverage metadata for precise diagnosis; all coverage requirements remain unchanged.

- **2026-10-04** — Check: `.github/workflows/test.yml` adds retained coverage-map diagnostics after the existing suite; no check, failure outcome or threshold is loosened. The workflow-setting detector requires this record because a diagnostic upload step changes the check configuration.

- **2026-10-04** — Asked: the person approved continuing after the stopped connection gate. Resume the same change, consolidate bounded decoding without changing wire errors or checks, then complete bootstrap, Access screens, distribution and reviewable verification.

- **2026-10-04** — The bootstrap/transport source slice uses one dependency-free Node artifact, distributed at an immutable checked public Source commit plus SHA-256 digest; no existing GitHub release asset is assumed. Private folder locators preserve the same connection after cloning. Finite owner identity supports closed-rollout resume without claiming employee readiness. The employee REST adapter keeps read-only Actions and refuses unsupported reruns/comment writes; missing log archives and thread-resolution counts require the owner path. Employee publication stops before archive/numbering. Tasks 4.1–4.3 await their shared remote gate, and live no-GitHub/provider acceptance remains 7.2.

- **2026-10-04** — Asked whether Cloudflare-only setup includes Artifacts repository automation → chose app/API access only; all repository grants and authentication stay manual. This supersedes the existing GitHub-only and automatic repository connection scope.
- **2026-10-04** — Asked to pass the findings to the other chat and to run tests only at the end → chose complete implementation followed by one final required source checkpoint and preview verification, with no per-task test or save checkpoints. Shared measured timings and this instruction with the verification and original implementation chats.

- **2026-10-04** — Check: remove dedicated unshipped GitHub registration/publication/token and private Git/PR adapter tests with the withdrawn implementations. Retained employee policy/discovery/login, personal GitHub delivery, app coverage, lint and distribution checks stay unchanged; author replacement API-only connection/UI/pin/staging-exclusion regression tests before the single final gate.

- **2026-10-04** — Assumed: at the single final source checkpoint, create a complete source ancestor, pin its bootstrap commit/digest in the final head and push once. Final distribution checks prove ancestor bytes/digest match the checked bootstrap; public raw readback follows the successful gate. Blank pins honestly leave setup unavailable until that checkpoint.

- **2026-10-04** — Completed all remaining app/API-only source, regression tests and owning documentation before any checks. Reconciled the reduced contracts, including production-only login authority in secret distribution. The single final source checkpoint will check the complete implementation; actual controlled human login/provider acceptance remains separate.

- **2026-10-04** — Integrated merged #268 drawing baseline (30.9.0) and preserved its release notes. Final source head pins the unchanged standalone bootstrap to ancestor `3e739ca8f82f7df90916ba0d31c078948682b5ba` and SHA-256 `2182ca2abac0e9b4163b60cedac38a830e1646a76dfa4fd717a6d45a1f4e35c4`; final checks and public readback must establish those exact bytes before calling distribution ready.

- **2026-10-04** — Check: `app/tsconfig.worker.json` enables typed JSON imports for the reviewed bootstrap release pins. No type strictness, test, lint, coverage or duplication requirement is lowered. Condensed this change's payload inventory wording after the combined instruction-byte check exceeded its unchanged limit.

- **2026-10-04** — The first complete-source gate passed the build and script coverage but found two app lint errors and three precise rejection-message assertions. Repair attempt 1 keys asynchronous permission readback, extracts the existing page guard and corrects those assertions; unchanged bootstrap bytes preserve the reviewed public pin. All fixes are grouped into one recheck, with every check and limit retained.

- **2026-10-04** — Repair attempt 1 passed lint, build and all 1,303 script tests. App/generated-starter failures exposed example-page permission fixtures and an Access test reading before reload finished. Repair attempt 2 updates those consumers and adds zero-app roster and disabled/missing-installation status checks; missing owner status now fails closed. Checks, bootstrap bytes and pins remain unchanged.

- **2026-10-04** — Final complete-source head `33762826f3352c8841d96c665cb27009bb80ac8b` passed app/build/payload checks after two grouped repairs. Marked 2.x–5.x and 6.1 complete; finishing safe preview checks and retaining live controlled-installation acceptance pending. Keep post-gate records local until the next authorized publication checkpoint, avoiding a metadata-only repeat of the whole branch gate.

- **2026-10-04** — Finished safe deployed-preview probes and browser-only owner/employee simulations at the checked source head. Actual preview denies unconfigured setup/management; simulated UI covers copying, zero-app/direct-denial, roster and removal/retry states on phone/keyboard. Current-grant deployed human API/provider acceptance remains unverified without a controlled installation and independently verified owner; requested only its URL/email. Retain 6.2/6.3 pending for those portions, and keep evidence/completion metadata local pending publication.

- **2026-10-04** — The person selected WongStack and independently confirmed themselves as owner. Public main-source readback lacks the employee-access runtime; readonly live identity/setup probes establish whether this feature is installed before requesting human login. Publishing the checked source is a prerequisite for acceptance on that existing app. Asked to publish first and continue the real login checks; no approval or signed owner authority is inferred from the target choice. Private activation remains closed pending verified session/configuration.

- **2026-10-04** — Asked whether the Access app works as intended after the owner saw no access and no way to add people → found the screen locked behind private activation, a private rollout list and a production-only rule; chose to plan five fixes: automatic owner, built app list, one-save add, a preview practice list and a simpler screen.
- **2026-10-04** — Asked how a new person's email reaches Cloudflare's sign-in list → chose the app adds them, with setup giving the live app its own narrow Cloudflare key; the account-wide scope of that key was named and accepted.
- **2026-10-04** — Assumed: fold these fixes into this unpublished change, because the owner wants a fix found while checking folded into the same change, not a follow-up.
- **2026-10-04** — Assumed: the owner is the email setup recorded, checked on every signed request; the signed user id is logged, not pinned, because the sign-in wall already trusts that email and the second hidden pin is what locked the screen.
- **2026-10-04** — Assumed: people already on the sign-in list keep every app, and permissions start by themselves at the owner's first open, because silently taking apps from current teammates would break them and a confirm button is cheap to add later.
- **2026-10-04** — Assumed: previews keep a practice list in the preview database and never touch the real sign-in list, because one sign-in wall covers live and previews and the owner wants previews to be a safe playground.
- **2026-10-04** — Assumed: the key is read from the live app's private settings on each use, with no encrypted database copy, because one private place is enough and it removes a setup step.
- **2026-10-04** — Assumed: an install with no key yet still opens Access and saves app choices, showing one step left, because a missing key should not lock the owner out of the screen.
- **2026-10-04** — Assumed: built apps and the route rules in reviewed code replace the private rollout list, because that list only repeated what the reviewed code already says.
- **2026-10-04** — Assumed: changing the owner stays outside the app, done by rerunning setup, because an in-app transfer is a takeover path nobody asked for.

- **2026-10-04** — Check: deleted `activation.test.ts`, `identity.test.ts`, the sealing test in `core.test.ts`, `employee-owner-setup.test.mjs` and the owner-consumer case in `company-api.test.mjs`, each with the withdrawn code it covered. Tests for the recorded-owner rule, the built catalogue, the automatic start, one-save admission, the practice list and setup's key step replace them. No lint, coverage, duplication or limit setting changed.
- **2026-10-04** — Assumed: each person's sign-in status reads from the newest generation the sign-in list is known to match, kept in the existing `wong_access_connections` row, because one line per person needs it and the applied migrations stay as they are. A change to apps alone moves no sign-in work, so it never makes someone who can sign in look unfinished.
- **2026-10-04** — Assumed: an earlier sign-in write of unknown outcome holds back "done" for 150 seconds, the lease plus the provider timeout, then the next matching readback settles it, because with no operator a lost write would leave *Try again* failing forever.
- **2026-10-04** — Assumed: an open site gets a blank owner email and no key, and the key is recorded as its own `components.accessKey`, because an open site has no sign-in to know an owner by, and setup rewrites the access record whole on every run.
- **2026-10-04** — Assumed: existing installs get the step as `provision.mjs access`, named in the changelog's update note and the wiki, with no new skill text beyond one clause, because the context check has under 100 bytes of headroom.
- **2026-10-04** — Assumed: the sign-in list check keeps the application's id, audience and Worker destination and drops the hostname comparison, because the origin pin is gone and the Worker destination already shows the application covers this Worker.
- **2026-10-04** — Removing the owner-setup operations and the identity fallback changed the bootstrap bytes (SHA-256 `cd03278312a8cb4a9d88552c56a675c02be5617168d49d64cb8ea477dcf31af8`). The pins are blank, so the copied prompt honestly reads unavailable, until the final checkpoint creates the source commit and pins it.
- **2026-10-04** — Asked what the automated checker may open once app permissions are on → chose every app, everywhere, as today, so preview checks and the look at the live app after publishing keep working; it never manages people. The risk of a leaked checker key opening every live app was named and is unchanged from today.
- **2026-10-04** — Saved the owner-first revision for its one gate (task 10.1). Merged main through 31.0.1, which removed the server installer: setup alone now supplies the owner email and the key, and the server-install test went with main. The setup helper is pinned to source commit `a53d1e4ba3dde23098f5d6c94e6a1e3f10c2b78d`, SHA-256 `cd03278312a8cb4a9d88552c56a675c02be5617168d49d64cb8ea477dcf31af8`. Open before publishing: the pin test requires that commit to be an ancestor of the checked head, which a squash publish to main does not keep.
- **2026-10-04** — Check: `scripts/tests/employee-bootstrap.test.mjs` no longer requires the pinned helper commit to be an ancestor of the checked head, because publishing squashes the branch and that commit is never in main's history, so the test would fail on main. It still requires the pinned digest to equal the checked helper's bytes, and the pinned commit's bytes to equal them wherever the checkout holds that commit. The public address for commit `a53d1e4b` was read back on 2026-10-04 with the pinned digest.
- **2026-10-04** — Asked whether Access worked for the owner on the preview → chose yes, it worked; task 10.2 is ticked on the owner's own report plus the machine probes.
- **2026-10-04** — Asked how to handle the live-app test, which can only run after publishing → chose publish, then test: it leaves the task list and stays open work, with the owner's OK before the key step and the real second-person test.
- **2026-10-04** — Archive checkpoint for publishing as 31.2.0: merged main through 31.1.0, numbered the release, archived with every task ticked. The live-app test stays open work in memory.

<!-- end proposal.md -->
<!-- file design.md utf8 10809 -->
# Design

## Context

See [proposal.md](proposal.md). The first build (source gate `33762826`) implements per-app membership checks, discovery filtering, Cloudflare policy/session reconciliation, the standalone bootstrap, and the Access and Home screens. It also put management behind a private owner pin (`WONG_ACCESS_ACTIVATION`), a private rollout list (`WONG_ACCESS_ROLLOUT`), a committed latch (`WONG_ACCESS_POLICY`), a sealing key and a hand-made login-management record, driven by `scripts/employee-owner-setup.mjs`, and it refused every non-production environment. Nobody ran that ceremony, so the owner's own sign-in showed "People management is unavailable" on the preview and the live app had no Access at all.

This revision keeps the checks and reconciliation and removes the ceremony. Setup's provisioner (`.agents/skills/wong-setup/scripts/private-access.mjs`, `provision.mjs`) already knows the owner email, account, Access application, human policy and Worker IDs, and already mints a narrow deploy key; it now also supplies what Access needs.

## Goals / Non-Goals

Goals: the owner opens Access and it works; one save adds a person; previews are usable; existing teammates lose nothing; no hand-made private record.

Non-goals: repository access, memory enrollment, owner transfer inside the app, per-record roles, a scheduler, changes to the general verification workflow.

## Decisions

### 1. The owner is the email setup recorded

Add a committed, nonsecret `WONG_OWNER_EMAIL` to production and staging `vars`, beside the existing `CF_ACCESS_*` identifiers. The provisioner writes it for installs; this repo's `app/wrangler.jsonc` carries it directly. A request is the owner's when the Worker has verified its Access assertion (signature, issuer, audience, expiry, as today), the caller is a human and the lowercased email equals `WONG_OWNER_EMAIL`. Service tokens, git email, first visit and request bodies establish nothing.

Remove `WONG_ACCESS_ACTIVATION`, `/api/access/activate`, the origin and signed-subject pins, `activation.ts`, `scripts/employee-owner-setup.mjs` and the client `ownerSetup` operations. The first owner request creates the single `wong_access_installation` row if absent, filling its NOT NULL identifier columns from the environment; the row then holds only the revision and the permissions switch. The first-seen signed subject is written to the audit log, not compared.

Why not keep a private pin: the sign-in wall already trusts this email, and anyone who can change committed config can already publish any code. A second secret added a ceremony without a stronger boundary. Changing the owner stays a setup rerun.

`WONG_OWNER_EMAIL` absent means an older install: no policy database read, existing behavior, and Access says setup is not finished. An open site with no sign-in keeps reporting Access unavailable.

### 2. The built apps are the catalogue

Remove `WONG_ACCESS_ROLLOUT`, `rollout.ts`, and the `prepare` and `rollout` operations. `catalogue` (the built `app.json` folders) is the list. Owner reads and saves insert missing `wong_access_apps` rows; policy reads ignore grants for apps no longer built. Main-route access stays in `mainRouteInventory()` in reviewed code; an unmapped business route still denies employees. A newly built app is unticked for everyone but the owner.

### 3. Permissions start by themselves and take nothing away

Replace the `WONG_ACCESS_POLICY` latch with the database switch `policy_enabled`. While it is 0, every signed-in person keeps every app, as today, and the owner can already manage people.

On production the owner's first Access read, with the key present, reads the recorded human policy's emails, inserts each non-owner email as an active person with a grant for every built app, sets `policy_enabled = 1` and audits it, in one batch. With no key or a failed read, nothing changes and the switch stays 0, so nobody is locked out. On staging the first owner read sets the switch with no import. Once the switch is 1, an unavailable database denies business work; it never falls back to open.

### 4. One save admits the person

`POST /api/access/people` commits the person, grants and pending policy work as it does now, then takes the installation lease and reconciles in the same request, returning the status. Removal does the same for policy and sessions. The durable generation, lease and unknown-write handling stay; a failed step stays pending with *Try again*.

The key is the production-only secret `WONG_ACCESS_LOGIN_MANAGEMENT`, now `{ version: 2, token, accountId, policyId }`, read from the environment on each use. Remove `WONG_ACCESS_SEAL_KEY`, `seal.ts`, the sealed database copy, the stored policy template and `login/connect`. Each write reads the live policy, changes only its email list and sends the rest back unchanged; it still refuses a shared or reusable policy, an unknown allow policy, or an application that does not cover this Worker, and preserves the machine policy. Calls stay limited to the recorded application and human policy ([provider contract](cloudflare-contract.md)).

Staging holds no key and the core makes no provider call outside production. A practice save commits to the staging database and reports *Practice list*.

### 5. Setup supplies the key

The provisioner mints one account-scoped key with only `Access: Apps and Policies Write`, the same way it mints the deploy key, stores it as the production Worker's `WONG_ACCESS_LOGIN_MANAGEMENT` with the account and human policy identifiers, records the key's id in the install record for rotation, and never writes it to staging. A rerun reuses a recorded key. The deploy key is not reused and gains no Access write.

An existing install gets the same step from `/wong-sync`. When the saved Cloudflare token can not make keys, the step is declared missing and the person receives [the key link](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link). For this repo's own live app the step is run once, as an outward action with a confirm, after publishing.

Secret tooling keeps one production-only name. `WONG_ACCESS_ACTIVATION`, `WONG_ACCESS_ROLLOUT`, `WONG_ACCESS_SEAL_KEY` and `WONG_ACCESS_POLICY` leave `.env.example`, `app/.dev.vars.example` and the tooling; none was ever set on a live app, so nothing is revoked.

### 6. Authorization stays consistent everywhere

Unchanged from the first build: one primary snapshot per request, described and bare routes, summaries, details, OpenAPI, conditional responses, app cards and direct navigation all use current grants; stricter action and record checks still apply; mini-app handlers receive no login-management binding. The verification service token keeps every built app once permissions start, on previews and live, so walks and the after-publish look still work; it is never the owner.

### 7. The prompt is always available

`/api/access/setup` answers any signed-in human: the owner, a current person, or anyone while permissions have not started. It returns their apps and the prompt when the reviewed bootstrap pins are valid. Home and Access show one *Connect your assistant* box. Removing the owner-setup operations changes the bootstrap bytes, so the final checkpoint pins a new immutable commit and digest ([distribution](../../../wiki/stack/employee-project.md#publish-checked-artifact-pins)).

## UX

### Use-case brief

The owner manages people a few times a month, often on a phone, usually when someone joins, changes role or leaves. Employees connect an assistant once per computer. Mirror the Home and Hello narrow-column forms and shared stylesheet. Done means the owner adds a person in one save and that person signs in and calls only their apps.

### Flow

Owner: open Access → *Add person* → email and apps → *Save access* → share the app link. Employee: sign in → *Copy setup prompt* → paste → approve the sign-in. First open with existing teammates shows them with every app. A missing key and a failed sign-in step are secondary states.

### Hierarchy

Access: *Add person*. Person form: *Save access*. Failed sign-in step: *Try again*. Removal: *Remove access*. One step left: *Copy that request*. Home and employee Access: *Copy setup prompt*. One primary action per state, labeled fields, keyboard focus, live status announcements, selectable fallback text. No operator panel, connection button or private-instructions copy.

### Review

[Review page](review.html). Items sketch Access before and after, the person form with its saved and failed states, one step left, first open, the preview practice list, the setup box and removal. Each fits phone width.

### Components

Shared header and app cards; loading, error and empty states; `CopyText`; people list with a per-person status line; person form; removal confirmation; practice banner; one-step-left notice; `AssistantSetup`. Loading reads *Loading people…*; a failed read reads *Access is unavailable* with *Retry*; a non-owner sees only their own setup box.

## Risks / Trade-offs

- The live app holds a key Cloudflare scopes to the whole account → the core calls only the recorded application and policy, refuses shared policies, and the key is production-only and separate from the deploy key. The owner accepted this.
- The owner is decided by committed config → anyone who can publish already controls the app; the owner email is visible in review.
- Permissions start without a button → the import gives existing people every app first, and a failed import leaves permissions off.
- A provider write can time out after applying → durable intent, generations and readback stay.
- Session removal signs everyone out → the removal confirm says so.
- A preview's practice people can not sign in unless the live list admits them → the practice banner says the real list is untouched.
- Skill instruction text has almost no headroom → the `/wong-sync` step must cut as many bytes as it adds.

## Migration Plan

Keep migrations `0001` and `0002` as applied; unused columns and tables stay inert. Update `schema/seed.sql` so staging starts with practice people under the new model. Remove the withdrawn modules, routes, script and secret names from this unshipped change. Ship the provisioner step, the update step, Access and bootstrap through the payload inventory; keep VERSION unchanged and revise the Next minor CHANGELOG entry.

Build everything first. Then one `/save` checkpoint runs the remote checks and returns a preview, where the owner can use Access for real with the practice list. After publishing, run the key step on the live app and check a real second person end to end.

## Open Questions

None for the build. Real owner and employee sign-in on the live app is checked after publishing.

<!-- end design.md -->
<!-- file tasks.md utf8 10676 -->
# Tasks

The user explicitly requests testing only after the full remaining implementation. Build 7.x–9.x together, author meaningful tests alongside the code but do not run tests, build, /save or intermediate preview checks between tasks. Keep those boxes unchecked until the single final gate 10.1 passes. Sections 1–6 record the first build, which passed its gate at `33762826`; sections 7–9 revise it so Access works without a private ceremony ([design](design.md)). Previous completed source checkpoints remain historical evidence in source-checks.md; withdrawn GitHub work is not remaining feature scope.

## 1. Retained completed backend baseline

- [x] 1.1 Trusted owner activation and additive membership migration passed the previous source checkpoint; preserve owner/session checks and customer data.
- [x] 1.2 Current app permissions, described/bare route guards and record-check composition passed the previous source checkpoint; preserve their guarantees.
- [x] 1.3 Discovery/cache filtering and finite authorized app readback passed the previous source checkpoint; preserve zero-app self-service and denied unknown policy.
- [x] 1.4 Cloudflare login-policy/session reconciliation passed the previous connection source checkpoint; retain durable generation/unknown-write handling and separate provider status.

## 2. Core app/API-only scope

- [x] 2.1 Remove unshipped GitHub registration, token issuance/renewal/revocation, protection inspection and project-editing runtime routes/modules/tests/config dependencies. Keep customer data/additive schema intact and existing personal GitHub workflows unchanged; no repository-provider mutations.
- [x] 2.2 Make trusted owner activation, private owner setup, roster forms and rollout independent of repository IDs/names or GitHub readiness. Reject owner takeover/service/foreign-session claims; preserve existing installation pins on repeated setup.
- [x] 2.3 Return API/current-app self-service status with manual repository and independent memory guidance. Keep finite owner roster/status/login/retry operations, current grant enforcement and production credential exclusions. Author regression coverage for denied removed employees, app deselection during a valid session and partial login removal.

## 3. Standalone company setup

- [x] 3.1 Trim the unfinished standalone bootstrap to app/API login, status, selective discovery and action calls from an empty folder without repo/memory imports. Keep private state, same-business browser approval, canonical target checks and refused redirects. Author expired/new-device/headless/removed/zero-app tests without executing them yet.
- [x] 3.2 Remove the unfinished private Git/PR adapter and git-fronting skill changes; repository access/authentication remains manual through its provider. Preserve installed company client compatibility and existing files/independent memory.
- [x] 3.3 Define the reviewed immutable commit/digest bootstrap distribution and prompt generation, with truthful unavailable state for missing pins. Author artifact pin/clipboard fallback/private-state tests and update actual copy/paste instructions.

## 4. Access and home screens

- [x] 4.1 Build owner Access people/add-edit/login/removal/retry/share-link states and employee own setup/status, with server-enforced owner operations and no editing checkbox or GitHub connection section. Author relevant form/identity/denial/retry tests.
- [x] 4.2 Home offers Copy setup prompt, allowed app list, safe pending/error/empty states and authorized direct navigation. Preserve branding and owner removable welcome; employees see setup guidance. Author clipboard/navigation/zero-app tests and ensure phone/keyboard accessibility.

## 5. Distribution and owning documentation

- [x] 5.1 Ship Access/bootstrap and additive migrations explicitly through payload inventory, remove withdrawn GitHub helper/secrets/dependency entries, and enforce production login-secret exclusions in staging tooling. Preserve customized installs; revise Next minor CHANGELOG and leave VERSION unchanged.
- [x] 5.2 Update employee/company API/mini-app/setup/sync guidance for API-only app login and manual repository authority; reconcile stale GitHub claims in implementation inventories/contracts. Keep source-check history exact. Validate the revised plan/review and instruction/payload requirements at the final gate.

## 6. First build's source gate

- [x] 6.1 After 2.x–5.x implementation is complete, run one /save checkpoint with all required remote app/build/script/generated-starter/distribution checks. No checks are weakened. Read all failures and repair together; repeat affected checks only when required by new fixes. Mark the corresponding implementation tasks complete only after this final source gate passes.

The first build's preview and live checks (formerly 6.2 and 6.3) are superseded by section 10: the preview refused Access by design, and the live app never received the change.

## 7. Access opens for the owner

- [x] 7.1 Decide the owner from committed `WONG_OWNER_EMAIL` plus the verified human Access assertion in `app/worker/employee-access/core.ts`; allow production and staging; create the installation row on the first owner request; audit the first-seen subject. Add the var to production and staging in `app/wrangler.jsonc`. Remove `activation.ts`, `/api/access/activate`, origin/subject pins, `scripts/employee-owner-setup.mjs`, its tests and the client `ownerSetup` operations. Author tests: owner email matches, other email denied, service identity denied, var absent keeps existing behavior, open site unavailable.
- [x] 7.2 Use the built catalogue: remove `rollout.ts`, `WONG_ACCESS_ROLLOUT`, `WONG_ACCESS_POLICY`, and the `prepare`/`rollout` operations; insert missing `wong_access_apps` rows on owner reads and saves; ignore grants for apps no longer built; keep `mainRouteInventory()` denial of unmapped routes. Author tests: a new app is listed unticked, a removed app's grant is ignored.
- [x] 7.3 Start permissions safely in `policy.ts`/`members.ts`: while `policy_enabled` is 0 every signed-in person keeps every app; the first owner read on production with the key imports the recorded policy's emails as people with every built app and sets the switch in one batch; staging sets it with no import; a failed import changes nothing; an unavailable database denies once started. Author tests for each branch and for a repeated first read.
- [x] 7.4 Admit in one save: `POST /api/access/people` commits then reconciles under the lease and returns one status per kind; read `WONG_ACCESS_LOGIN_MANAGEMENT` version 2 from the environment; change only the policy's email list from a live read; keep generation, lease, unknown-write and shared-policy refusals; no provider call outside production. Remove `seal.ts`, `WONG_ACCESS_SEAL_KEY`, the sealed copy and `login/connect`. Author tests: add, failed add then retry, removal with session step, missing key saves choices, staging makes no call.
- [x] 7.5 Serve the prompt to every signed-in human from `/api/access/setup`, before and after permissions start; keep bootstrap `status`, `list`, `describe` and `call` working in both states; drop identity-only owner readback. Author tests for owner, employee, zero apps and not-started states.
- [x] 7.6 Rebuild the screens in `app/src/apps/access/` and `app/src/components/AssistantSetup.tsx`: people first with *Add person*, one status line per person, *Try again* only on failure, first-open note, one-step-left notice with a copyable request, practice banner on previews, removal confirm that says everyone signs in again; delete the operator panel and private-instructions copy. Show the setup box on Home for every signed-in person. Author tests for each sketched state, phone width and keyboard use.

## 8. Setup supplies the key

- [x] 8.1 In `.agents/skills/wong-setup/scripts/provision.mjs` and `private-access.mjs`, write `WONG_OWNER_EMAIL` to both Workers' `vars`, mint the Access-write key, store the production-only `WONG_ACCESS_LOGIN_MANAGEMENT` secret with account and human-policy ids, record the key id, reuse it on rerun, and never touch staging. Keep the deploy key unchanged. Author fake-Cloudflare tests: fresh, rerun, token unable to create keys.
- [x] 8.2 Give `/wong-sync` the same step for existing installs, with the missing-key report and private key link. Cut as many skill-instruction bytes as the step adds; the context check has almost no headroom.
- [x] 8.3 Reduce the production-only names in `scripts/cf-secrets.mjs`, `.env.example`, `app/.dev.vars.example` and `scripts/retired-names.json` to the one login-management secret; keep the staging refusal and its tests. Update `schema/seed.sql` so staging starts with practice people and permissions started.

## 9. Documentation and distribution

- [x] 9.1 Rewrite `wiki/stack/employee-access.md` around how the owner is known, the key, the first open and the practice list; update `wiki/stack/employee-project.md`, `wiki/stack/cloudflare-access.md`, `wiki/stack/mini-apps.md` and `wiki/stack/staging-bindings.md` where they name the removed settings. Reconcile `cloudflare-contract.md` and `implementation-inventory.md` in this change.
- [x] 9.2 Update the payload inventory for removed and changed files, revise the Next minor CHANGELOG entry, leave VERSION unchanged, and pin the changed bootstrap bytes to a new immutable commit and digest in `app/worker/employee-access/bootstrap-release.json`.

## 10. One final gate, the preview, then the live app

- [x] 10.1 After 7.x–9.x are built, run one `/save` checkpoint with all required remote checks. Weaken no check. Read every failure and repair together. Mark 7.x–9.x complete only when this gate passes.
- [x] 10.2 On the deployed preview, signed in as the owner: open Access, see the practice list, add a person with one app, edit and remove them, copy the setup prompt, and confirm a non-owner identity is refused management. Check phone width and keyboard use. Record the evidence and return the preview for review.
After publishing, open work kept in memory and not a build task: with the owner's confirm for each outward action: run the key step for this repo's live app, open Access as the owner, add a real second email with one app, have that person sign in and connect an assistant from an empty folder, untick the app, then remove them. Report each real outcome; anything not observed stays unverified.

Task 10.2: the owner reported on 2026-10-04 that Access worked for them on the preview; machine probes are in source-checks.md. The live-app test follows the publish, with the owner's OK for each outward step.

<!-- end tasks.md -->
<!-- file specs/agent-api-discovery/spec.md utf8 1781 -->
## MODIFIED Requirements

### Requirement: Discovery describes the deployed company API

The protected company Worker SHALL publish OpenAPI 3.1 generated from its currently registered described actions and a bounded summary catalogue with per-action details. The outputs SHALL identify a contract revision, omit undeclared and infrastructure routes, preserve stable operation identities, and include only synthetic examples and nonsecret metadata. Every existing operation-level visibility restriction SHALL apply consistently to summary listings, selected details and OpenAPI; enabled Access per-app policy SHALL additionally enforce current employee app permissions on all three outputs. Permission changes SHALL govern the next discovery request even during an existing session; conditional or cached responses SHALL not reveal another caller's or a previously permitted action's contract. Discovery remains descriptive and SHALL grant no execution or memory authority.

#### Scenario: A new action is published

- **WHEN** a reviewed action joins the production registry and deploys
- **THEN** production discovery describes its real method, path, input, output and effect to permitted employees without a second manually maintained API document

#### Scenario: A route is not an employee action

- **WHEN** the Worker also serves the raw memory protocol, verification uploads, administrative operations or undescribed legacy handlers
- **THEN** discovery does not advertise those routes as company actions

#### Scenario: Employee app permission is removed

- **WHEN** an employee requests summaries, selected details or OpenAPI after their app permission is removed
- **THEN** none of those responses or conditional cache paths reveal that app's unauthorized action contract

<!-- end specs/agent-api-discovery/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 4034 -->
## MODIFIED Requirements

### Requirement: One secrets file loads both Workers

`app/.dev.vars` SHALL be the declared list of Worker runtime secrets, and `secrets:push` SHALL load ordinary runtime secrets into production and staging; a git-ignored `app/.dev.vars.staging` SHALL give staging its own values. A linked worktree with no copy SHALL read the primary worktree's file. The private production Access login-management binding SHALL be omitted entirely from staging sources/config, including a blank declaration. Both target sources and staging config SHALL be validated before the first provider write. Unsafe fallback, explicit override or staging source SHALL load nothing into either Worker.

#### Scenario: Staging diverges

- **WHEN** `app/.dev.vars.staging` exists
- **THEN** staging gets its values and production gets `app/.dev.vars`

#### Scenario: Production holds private login authority

- **WHEN** a production runtime file contains private Access management bindings and staging would reuse it
- **THEN** push fails before either Worker changes and requires a separate staging source omitting those bindings

#### Scenario: Staging source is invalid after production source passes

- **WHEN** production's source is valid but staging declares a private Access binding or account credential
- **THEN** validation fails before any production or staging secret push

### Requirement: A gate keeps the two Workers in step

`secrets:check` SHALL fail when ordinary runtime secret names differ or a stateful top-level binding is absent from `env.staging`, excluding documented production-only memory and private Access management bindings. It SHALL fail if a private Access management binding is present on staging. It SHALL only warn about disagreement with `app/.dev.vars.example`, compare names only, and never read or print secret values.

#### Scenario: A secret on one Worker

- **WHEN** production holds an ordinary runtime secret staging lacks
- **THEN** the check fails and names the key, with no value in its output

#### Scenario: Production-only Access management

- **WHEN** private Access management names are present only in production and ordinary names match
- **THEN** the parity check passes without requiring management authority on staging

#### Scenario: Staging holds a private management binding

- **WHEN** staging config or deployed secret names include private Access management authority
- **THEN** the check fails and names the binding without disclosing its value

## ADDED Requirements

### Requirement: Setup supplies what Access needs

Setup SHALL record the owner's email as committed nonsecret configuration for both Workers, and SHALL create a key limited to Access application-and-policy writes, store it with the account and human-policy identifiers as the production Worker's login-management secret, and record the key's identifier for reuse and rotation. The key SHALL NOT be the deploy key, SHALL NOT be written to staging, and a rerun SHALL reuse it. Updating an existing installation SHALL perform the same step. When the available Cloudflare token cannot create the key, the step SHALL be reported as missing with the private key link and SHALL NOT block the rest of setup or the update.

#### Scenario: A fresh install

- **WHEN** setup finishes on an account with sign-in turned on
- **THEN** the owner email is in both Workers' committed configuration, production holds the login-management secret, staging holds none, and the owner can add a person from Access without another step

#### Scenario: An existing install updates

- **WHEN** an installation made before this change updates and its saved token can create keys
- **THEN** the update adds the owner email and the production secret and leaves existing people's access unchanged

#### Scenario: The token cannot create keys

- **WHEN** the saved Cloudflare token lacks permission to create the key
- **THEN** the step is reported missing with the private key link, and Access still opens and names the step left

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/company-api/spec.md utf8 3194 -->
## MODIFIED Requirements

### Requirement: Apps and agents use the same defined company action

A described company action SHALL be callable through its existing Worker endpoint by both its app and an authenticated employee assistant. Both callers SHALL execute the same handler with verified identity and the same existing action and record checks. Once Access per-app permissions have started, both SHALL additionally require current employee permission for the action's associated app or apps, including direct API requests. Discovery SHALL NOT grant permission or bypass those checks. Started permissions with missing app permission or unavailable authority SHALL stop before business work; installations where permissions have not started SHALL retain their existing authorization.

#### Scenario: An employee uses an app action through their agent

- **WHEN** an employee authorized to use a described action calls it from their assistant with valid input
- **THEN** the company endpoint performs the same work and returns the same business result as the app

#### Scenario: An existing record check denies the caller

- **WHEN** a described action's existing record check denies the employee
- **THEN** the agent call is denied even if the action appears in discovery

#### Scenario: Direct call bypasses hidden navigation

- **WHEN** an employee without permission for an app calls its business endpoint directly
- **THEN** the server denies the call before its handler or outside service executes

### Requirement: Exposure is explicit and preserves existing apps

An existing unconverted handler SHALL retain its path, business behavior and existing authorization and SHALL be absent from discovery until deliberately described. Started Access per-app permissions SHALL additionally enforce the employee's current app permission before both described and legacy business handlers. Unmapped business routes SHALL deny employee execution until reviewed without removing or replacing their implementation. Possessing a key SHALL NOT expose every action of that service. An employee-enabled action requiring company connections SHALL require verified caller authentication even when an older starter site is open without login. Missing connections SHALL produce a safe unavailable state rather than a request for the owner key on the employee machine.

#### Scenario: An installed app updates

- **WHEN** the update adds discovery support around a custom app without describing its legacy handlers
- **THEN** its handlers still work as before for authorized callers and are not silently advertised to agents

#### Scenario: A connection or login is missing

- **WHEN** a new company-connected action has no saved connection or no verified employee identity
- **THEN** no outside business request runs and the caller receives a safe unavailable or authentication response

#### Scenario: A custom business route has no permission assignment

- **WHEN** Access per-app permissions have started and a legacy route lacks a reviewed app mapping
- **THEN** employee requests perform no business work until that mapping is reviewed, and the existing handler and stricter checks remain preserved

<!-- end specs/company-api/spec.md -->
<!-- file specs/employee-onboarding/spec.md utf8 12790 -->
## Purpose

Let employees connect an assistant from an existing business app using their app identity, with employer-managed app/API permissions. Repository access and authentication remain manual and independent.

## MODIFIED Requirements

### Requirement: The business app is the employee setup entry point

Every signed-in person SHALL receive a copyable assistant setup prompt and their own connection status after signing into the existing protected business app, before and after per-app permissions start. The prompt SHALL contain nonsecret routing and instructions only, SHALL remain manually copyable after clipboard failure, and SHALL perform no work or grant access when copied. Employees SHALL require no Cloudflare administration account or repository identity for the supported company API connection. Repository access SHALL be granted and authenticated separately through its provider. Expired or new-device sessions SHALL use the same employee app identity for renewed approval.

#### Scenario: Employee copies setup instructions

- **WHEN** a current employee copies the setup prompt from the app
- **THEN** the page confirms copying and the prompt identifies this business and its published setup instructions without including any credential

#### Scenario: A new computer needs approval

- **WHEN** the assistant has no valid employee session on that computer
- **THEN** setup requests approval through the same business login rather than asking for a provider token or separate employee GitHub account

### Requirement: The employer manages employee grants through Access

The employer SHALL be the person whose verified signed-in email equals the owner email setup recorded in the installation's committed configuration; no private activation record, command or rollout list SHALL be required before Access opens. Only the employer SHALL add, edit or remove employees or change selected-app grants. A new employee SHALL have no business apps preselected and SHALL receive no repository authority from app login. A newly built app SHALL appear in Access unassigned and SHALL require an explicit assignment. A current employee with no assigned business apps SHALL retain only their self-service setup/status. Public routing, service identity, request content and first visitation SHALL establish no employer authority. An installation with no recorded owner email SHALL keep its existing behavior and report Access setup unfinished.

#### Scenario: Employer adds a person

- **WHEN** the employer saves a person's email with Orders access
- **THEN** that person is assigned Orders only and the owner receives the ordinary app link to share and the actual admission status

#### Scenario: The owner opens Access for the first time

- **WHEN** the person whose sign-in email is the recorded owner email opens Access with no other setup done
- **THEN** the people list and Add person are available without a private record or command

#### Scenario: Employee attempts membership administration

- **WHEN** an ordinary employee invokes a membership or connection-management endpoint
- **THEN** it is denied without changing any employee or provider resource

### Requirement: App admission follows current desired employee membership

Saving a person SHALL commit their app choices and, in the same request on the live app, attempt to reconcile the current exact-email roster to the recorded app login policy, preserving the employer, other employees, the policy's other controls, unrelated policies and machine access. Each person SHALL show one sign-in status; failed admission/removal and session-revocation work SHALL remain observable and retryable. Stale work SHALL not restore a removed member. The login-management credential SHALL be supplied by setup, remain private in the live installation, stay separate from deployment authority, and have its actual provider scope disclosed. A live installation without that credential SHALL still open Access and save app choices while reporting the one remaining setup step. An open or unverified installation SHALL report onboarding unavailable rather than silently granting access.

#### Scenario: Login policy update fails

- **WHEN** the roster is saved but the provider refuses its email-policy update
- **THEN** admission remains pending and retryable without claiming the person can log in or asking them for a management token

#### Scenario: The credential has not been supplied yet

- **WHEN** the employer saves a person on a live installation that has no login-management credential
- **THEN** the app choices are saved, the person is shown as not yet able to sign in, and Access names the one setup step left

#### Scenario: A removed person's earlier add is retried

- **WHEN** stale add work runs after the person has been removed
- **THEN** reconciliation converges to current membership and reports any provider removal still pending

### Requirement: Assistant setup works before a private checkout exists

Published setup SHALL support an empty folder and supported remote workspace through a verified reviewed bootstrap artifact. An employee SHALL obtain a usable company API client without cloning a private project. Setup SHALL NOT issue repository credentials, register a repository integration or change repository authentication. Interrupted setup SHALL preserve dirty work, conflicting local folders and unpushed commits and resume against the same target. API readiness SHALL require actual authorized connection evidence; repository access SHALL be labeled separate manual setup.

#### Scenario: App-only employee starts from an empty folder

- **WHEN** an employee assigned business apps pastes the setup prompt into their assistant
- **THEN** the assistant can bootstrap and call their approved company actions without needing access to the private project source

#### Scenario: Existing local work conflicts with setup

- **WHEN** setup encounters a dirty checkout or a different local repository
- **THEN** it preserves that work and provides safe resume/folder guidance without replacing or resetting it

### Requirement: Connections remain private and destination bound

Employee sessions SHALL remain in private OS-user state outside checkouts and SHALL not appear in prompt text, model output, token-bearing arguments, URLs, git remotes, tracked files or ordinary diagnostics. App credentials SHALL go only to the verified business origin. Company API setup SHALL not receive or manage repository credentials. Owner, deployment, business-service, memory and verification credentials SHALL never substitute for employee connection. Employee sessions SHALL not be inherited by builds or unrelated commands.

#### Scenario: A redirect requests credential forwarding

- **WHEN** a setup response redirects a credential-bearing request to another destination
- **THEN** the helper refuses forwarding without exposing the credential

#### Scenario: Project command execution begins

- **WHEN** the connected assistant executes a build or unrelated business command
- **THEN** the command does not inherit the employee session used by selected company API operations

### Requirement: Current app grants govern business access everywhere

Current employee grants SHALL govern app lists, direct app visits, associated described and bare API routes, and assistant discovery/calls. Server authorization SHALL apply before business work, preserve stricter existing action and record checks, and deny unavailable or unmapped policy. Client state, existing login, cached descriptions and repository access SHALL grant no extra permission. The installation's verification service token SHALL keep every built app on previews and the live app, as before permissions started, and SHALL never manage people. Acknowledged grant removal SHALL deny subsequent requests; work already admitted SHALL not be claimed undone.

#### Scenario: An employee calls a hidden app API

- **WHEN** an employee assigned Orders but not Payroll calls Payroll directly with a valid session
- **THEN** the server denies Payroll before business work while Orders remains available

#### Scenario: The verification machine checks a preview

- **WHEN** the verification service token opens an app page or calls its API after permissions have started
- **THEN** the request is allowed, and a people-management request from it is denied

#### Scenario: An assigned app is removed during a session

- **WHEN** app deselection is acknowledged and the employee sends their next request with the same valid session
- **THEN** that app's request is denied without needing logout or changing other app grants

### Requirement: Existing memory authority is preserved

Setup SHALL preserve the installed memory target, machine authority and private history. Fresh memory enrollment SHALL remain outside this employee connection; app login and repository access SHALL not create memory authority. Missing trusted operator setup SHALL be reported as not connected without affecting otherwise ready API access.

#### Scenario: A fresh computer has no memory grant

- **WHEN** the employee connects their API on a computer lacking trusted memory setup
- **THEN** API access reports its own readiness while memory remains not connected with trusted-owner setup guidance

## REMOVED Requirements

### Requirement: Owner-approved GitHub access serves the existing project

**Reason:** The user reduced this change to app/API access only and explicitly chose manual repository access.
**Migration:** Grant and authenticate repository access through the repository provider. Remove the unshipped automated GitHub integration and private repository helper from this branch; app login grants only authorized company API actions.

### Requirement: Access removal reports each actual outcome

**Reason:** Automatic repository editing and token revocation have been withdrawn; removal now manages only company app/API and Cloudflare login authority.
**Migration:** Use the replacement app-access removal requirement. Remove manually granted repository access through its provider and manage independent memory separately.

## ADDED Requirements

### Requirement: App access removal reports actual login outcomes

Full removal SHALL deny company work immediately, withdraw managed app admission and revoke existing app sessions. Policy and session outcomes SHALL be reported separately, remain retryable and follow current desired membership. App removal SHALL NOT claim to revoke manually granted repository access, downloaded data or independently installed memory.

#### Scenario: Repository access was granted manually

- **WHEN** the employer removes a person's app access
- **THEN** company work is blocked and the app explains that repository access must be removed separately through its provider

#### Scenario: Full removal partly fails

- **WHEN** local removal commits but a provider policy or session revocation fails
- **THEN** new company work is denied and Access reports and retries unresolved provider outcomes without claiming full completion

### Requirement: People who could already sign in keep their apps

Per-app permissions SHALL start automatically at the employer's first Access visit and SHALL NOT reduce anyone's access. On the live app, every email already admitted by the recorded login policy SHALL first be recorded as a current person with every built app; if that import cannot complete, permissions SHALL stay off and everyone SHALL keep their existing access. Before permissions start, every signed-in person SHALL keep every app. After they start, unavailable permission data SHALL deny business work.

#### Scenario: Teammates existed before Access

- **WHEN** the employer first opens Access on a live app whose sign-in list already admits three other people
- **THEN** those three appear with every app selected and keep using every app until the employer changes them

#### Scenario: The existing sign-in list cannot be read

- **WHEN** the first visit cannot read the recorded login policy
- **THEN** permissions stay off, nobody loses an app, and Access reports the step left

### Requirement: Previews keep a practice list

On staging and previews the employer SHALL be able to open Access, add people and choose apps against the preview's own data. A preview SHALL hold no login-management credential, SHALL make no login-provider change, SHALL say that its list is for practice, and SHALL NOT read or change the live app's people.

#### Scenario: The employer tries Access on a preview

- **WHEN** the employer adds a person on a preview link
- **THEN** the person and their apps are saved in the preview's data, the screen says the real sign-in list is untouched, and the live app's people are unchanged

<!-- end specs/employee-onboarding/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 6100 -->
## MODIFIED Requirements

### Requirement: The home page lists every mini app

The home page SHALL list every mini app in the build that the current caller is authorized to use, each with its title, description, and link, and `/apps/` SHALL redirect to `/`. When Access per-app policy is enabled, an employee's list SHALL include only assigned apps and applicable self-service setup; direct navigation SHALL enforce the same current app permission. The verified employer SHALL retain access to the app catalogue and Access administration. A preview SHALL list the app it previews for its authorized viewer. A mini app whose manifest lacks a title or description, or whose folder name is not lowercase letters, digits, and hyphens, SHALL fail the `test` check and name the folder.

#### Scenario: A malformed manifest

- **WHEN** a mini app's manifest has no title
- **THEN** the `test` check fails and names the folder

#### Scenario: Employee has selected apps

- **WHEN** an employee has Orders permission and no Payroll permission
- **THEN** the home page offers Orders and applicable setup, omits Payroll, and a direct Payroll visit is denied

### Requirement: The home page's app list guides first use

The home page SHALL present each authorized mini app as a clearly focused link with its title and description, and SHALL identify the supplied example as an example when available. With no apps built it SHALL explain how the employer can ask for a first tool. An employee with no assigned apps SHALL instead see guidance to contact the employer and retain access to their own setup. Unavailable permission readback SHALL show a safe retry state without an unrestricted list. The list SHALL remain readable and operable at phone widths and with keyboard navigation.

#### Scenario: Apps are available

- **WHEN** a person opens the home page of a workspace with authorized apps
- **THEN** each allowed app has a title, description, and keyboard-accessible link, and the supplied example is visibly labeled when allowed

#### Scenario: No apps yet

- **WHEN** a workspace has no mini apps
- **THEN** the employer sees a first-tool request to copy into their chat

#### Scenario: Employee has no assigned apps

- **WHEN** an employee signs in with no assigned business apps
- **THEN** the page gives contact-your-employer guidance and their setup link without granting project creation or another app

### Requirement: A mini app reaches everything but memory

A mini app's server side SHALL receive the main app's business bindings and saved business-service keys, and the verified identity of the caller: a person's email or a service token's name. It SHALL receive no memory-store bindings or Access login-management credential. Identity-checked finite core operations SHALL provide required administration without exposing those secrets. The Worker SHALL keep other runtime routes to bindings, such as importing them, turned off. The docs SHALL say mini apps share the Worker with core authorization and memory, so binding exclusions stop mistakes rather than malicious deployed code. A preview SHALL use staging data and keys, never production management credentials or provider mutations.

#### Scenario: Production binds memory

- **WHEN** a mini app's handler runs on the production Worker, which binds the memory store
- **THEN** it gets the app database, business-service keys and signed-in person, but no memory bindings or raw connection-management credentials

#### Scenario: A handler imports the Worker's bindings

- **WHEN** a handler imports the environment from the Workers runtime
- **THEN** the runtime refuses, and no memory or connection-management binding reaches it

#### Scenario: The owner manages access on a preview

- **WHEN** the verified employer uses Access on a preview
- **THEN** people and app choices are saved in staging data with no login-provider call and no production credential

#### Scenario: The owner manages access

- **WHEN** the verified employer uses the Access mini app's approved core operations
- **THEN** the operation can reconcile the assigned membership without returning a provider key to the mini-app handler or user

### Requirement: The starter landing page teaches the loop

The starter landing page SHALL have a permanent workspace heading and open its employer guidance with one removable welcome, titled *Make it yours*, that makes clear that changes begin by asking in the person's existing chat. It SHALL offer one selectable, copyable first request that asks the agent to get to know the person, personalize the workspace heading, remove the welcome, explain the steps, and show a preview before publishing. The page SHALL confirm a successful copy and retain a way to copy by hand if clipboard access is unavailable. The mini-app list SHALL sit below the welcome. Removing the welcome SHALL leave the workspace heading and app list usable. Sync SHALL update the welcome only while the target still shows it. Every signed-in person SHALL see one assistant connection prompt on the page. Once Access per-app permissions have started, employees SHALL see that prompt and their authorized apps without employer personalization or administration guidance; the employer's existing removable welcome SHALL be preserved.

#### Scenario: A fresh install

- **WHEN** the employer opens a new install's production app
- **THEN** they see a workspace heading, the welcome and its one copyable first request, and the example app listed below
- **AND** the guidance makes clear where to paste the request and that a preview precedes publishing

#### Scenario: A removed tutorial after an update

- **WHEN** a target removed its tutorial and syncs to a later release
- **THEN** no tutorial comes back, and the workspace heading and app list remain usable

#### Scenario: Employee opens a configured app

- **WHEN** an employee opens the business app after Access per-app permissions have started
- **THEN** the page offers their assistant setup prompt and allowed apps, without giving them employer personalization or administration guidance

<!-- end specs/mini-apps/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-04

~~~
<!-- end .openspec.yaml -->
<!-- file cloudflare-contract.md utf8 5269 -->
# Cloudflare login-management contract

Verified against primary public API documentation on 2026-10-04. This records the source contract; it is not a live owner connection or propagation result.

- Update only the recorded application and human policy: `PUT /accounts/{account_id}/access/apps/{app_id}/policies/{policy_id}`. The documented accepted permission is `Access: Apps and Policies Write`. [Update policy](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/subresources/policies/methods/update/).
- Revoke sessions only for the recorded application: `POST /accounts/{account_id}/access/apps/{app_id}/revoke_tokens`. It revokes all application tokens. Either `Access: Apps and Policies Write` or `Access: Apps and Policies Revoke` is accepted. The policy-write credential therefore covers this endpoint without adding identity-provider, organization or provisioning authority. [Application revocation](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/methods/revoke_tokens/).
- Do not use organization-wide `revoke_user`; it affects unrelated applications and requires separate organization/identity-provider/group write authority.
- Provider scopes can cover the account rather than one application. The account and policy ids travel with the key; the application, audience and Worker ids are the committed `CF_ACCESS_*` values. Constrain the finite core adapter to those resources. Read back their ownership, destination and policies before mutation; reject shared or unreviewed policies and preserve machine/verification rules. Do not reuse the deploy credential.
- The existing private setup keeps distinct exact-email human and verification policies. `.agents/skills/wong-setup/scripts/private-access.mjs` now also mints the key; this feature provisions no new apps, machine tokens or login providers.
- Revocation can require remaining teammates to sign in again. Local member denial, policy reconciliation and session/provider outcome are separate states; a success envelope alone does not establish observed propagation.
- Preserve durable desired generations/retries across lost responses, and converge an older external write to the latest desired generation. Never acknowledge an old job as the latest success or restore removed membership. Any in-flight request with an unknown outcome remains pending until safely reconciled.
- No production provider writes from staging. Controlled live readback/admission/session-denial proof remains task 10.3.

## Delivered reconciliation

Setup's provisioner mints `<worker>-access`, an account token with the single permission `Access: Apps and Policies Write`, the same way it mints the deploy token, and stores `{ version: 2, token, accountId, policyId }` as the production Worker's `WONG_ACCESS_LOGIN_MANAGEMENT` secret through `PUT /accounts/{account_id}/workers/scripts/{script_name}/secrets`. Staging gets none. The install record keeps the key's id; a rerun reuses a key whose secret is still held, and rolls the value when it is not, because a value can not be read back. A token that can not make keys leaves the step `missing` and stops nothing.

The core reads the secret from the environment on each use, with no database copy and no stored policy template. Each write reads the live policy, replaces only its email list with the owner and the active people, sends every other field back unchanged, and reads back both the emails and the controls. It still refuses a reusable policy or one attached to another application, any second policy that is not the service-token machine policy, and an application whose id, audience or Worker destination is not this app's. The first owner visit reads the policy's emails once, to list who could already sign in.

Policy PUT intents and pending work commit together before an external mutation. Lease and generation checks constrain fresh calls; stale responses converge to the current state. A crashed or lost older write stays durable and keeps a matching readback from being called complete for 150 seconds, the lease plus the provider timeout, after which it can no longer land and the next matching readback settles it. Application-session revocation reports provider acceptance with propagation unverified. The save reconciles in the same request, and the owner's *Try again* drives what is left; no scheduler exists. Staging holds no key and makes no provider call. Actual admission and removal propagation remain live acceptance (task 10.3), not source-fixture evidence.

## Revision: setup supplies the key

Superseding the private operator steps above: setup's provisioner mints the Access-write key and stores it with the account and human-policy identifiers as the production-only login-management secret; the core reads it from the environment, with no sealed database copy and no stored policy template. Each write reads the live policy and changes only its email list. Resource pinning, shared-policy refusal, machine-policy preservation, generations, leases and unknown-write handling are unchanged. The first owner visit reads the policy's emails once to import existing people. Staging holds no key and makes no provider call.

<!-- end cloudflare-contract.md -->
<!-- file github-contract.md utf8 8149 -->
# GitHub repository contract

Withdrawn scope record, 2026-10-04. The user chose app/API access only and manual repository grants/authentication. No automatic repository adapter, registration, protection inspection or token issuance from the contract below ships. It records the superseded design and is not a current integration or acceptance requirement. Existing personal GitHub workflows remain unchanged.

## Reviewed permissions and endpoints

| Operation | Endpoint / transport | Narrow repository permission |
|---|---|---|
| Clone/fetch, branch push | HTTPS Git, private credential helper | Contents read/write |
| PR list/detail/create/update | `GET/POST /repos/{owner}/{repo}/pulls`, `GET/PATCH .../pulls/{number}` | Pull requests write |
| Review inspection | `GET .../pulls/{number}/reviews` | Pull requests read, covered by write |
| Existing PR-comment preview fallback | `GET .../issues/{number}/comments` | Pull requests read, covered by write |
| Check inspection | `GET .../commits/{ref}/check-runs`, `/check-suites` | Checks read |
| Workflow/check execution inspection | `GET .../actions/runs`, `.../actions/runs/{id}/jobs` | Actions read |
| Status-preview fallback | `GET .../commits/{ref}/statuses`, `/status` | Commit statuses read |
| Preview deployment/readback | `GET .../deployments?sha={sha}`, `.../deployments/{id}/statuses` | Deployments read |
| Branch protection inspection | `GET .../branches/{branch}/protection` | Administration read |
| Applicable rule inspection | `GET .../rules/branches/{branch}` | Contents read |
| Repository and installation readback | `GET /repos/{owner}/{repo}`, `/installation/repositories` | Metadata read |
| Token creation/renewal | `POST /app/installations/{id}/access_tokens` | Owner App JWT; explicit one-element `repository_ids` and permission subset |
| Token revocation | `DELETE /installation/token` | The distinct installation token being revoked |

Read endpoints are documented in [pull requests](https://docs.github.com/en/rest/pulls/pulls), [reviews](https://docs.github.com/en/rest/pulls/reviews), [check runs](https://docs.github.com/en/rest/checks/runs), [workflow runs](https://docs.github.com/en/rest/actions/workflow-runs), [statuses](https://docs.github.com/en/rest/commits/statuses), [deployments](https://docs.github.com/en/rest/deployments/deployments) and [deployment statuses](https://docs.github.com/en/rest/deployments/statuses). The existing [preview helper](../../../.agents/skills/save/scripts/preview-url.sh) uses deployments, statuses, checks and comments in that order. The employee adapter must use reviewed REST calls rather than assuming personal `gh` GraphQL commands accept the same permissions. Unsupported comment writes, labels, assignees, workflow edits, merge and deployment writes stay unavailable.

The App manifest's reviewed permission set is `contents:write`, `pull_requests:write`, `checks:read`, `actions:read`, `statuses:read`, `deployments:read`, `administration:read`, owner-only `secrets:read` and `environments:read`, plus implicit metadata read. Secrets read inspects only names/metadata; no API returns secret values. Employee tokens omit all three inspection rights. [PR comment reads](https://docs.github.com/en/rest/issues/comments#list-issue-comments) accept Pull requests read, so no additional Issues grant is needed. Keep administration read for owner-side protection inspection; employee tokens exclude it. No administration/workflows/secrets/deployments write or bypass grant is permitted. Recheck each concrete adapter endpoint before finalizing the manifest.

[Installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation) supports Git access and attributes requests to the App. [Token creation](https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app) supports explicit repository IDs and permissions; omitting these would inherit broader installation grants. [Revocation](https://docs.github.com/en/rest/apps/installations#revoke-an-installation-access-token) revokes the distinct token. Renewal requires fresh local membership checks; private sealed receipts track each machine, human requester and bounded expiry.

## Publication boundary

Contents/Pull requests rights are neither branch scoped nor a promise that merge is forbidden. Read the actual [branch protection](https://docs.github.com/en/rest/branches/branch-protection) and [applicable rules](https://docs.github.com/en/rest/repos/rules), including inherited rules and bypass actors. Ordinary required checks/reviews alone may still permit the App to merge after approval. The owner must have a provider-enforced update/publication restriction that excludes this App, with no bypass path and no alternate deployment ref.

Inspect deployment triggers and environment policy independently. [Environment readback](https://docs.github.com/en/rest/deployments/environments) and protected-branch behavior are provider-plan dependent. This source's [deployment workflow](../../../.github/workflows/deploy.yml) routes default-branch pushes to production, but its deployment secrets are repository-level. A branch editor able to rewrite publishing scripts can reuse those secrets from a changed branch workflow. A harmless `/ship` refusal cannot establish this boundary. Until owner-controlled secrets/environment protections and reviewed scripts prevent every editor-triggered production deployment, editing remains blocked. Do not automatically move secrets or modify protections.

Missing inspection rights, organization approval, unsupported restrictions, unknown rules/bypass actors, workflow-file push refusal, or an unverified deployment trigger produce blocked/pending status. Do not expand privileges to make a refused operation work. GitHub App approval, actual clone/branch/PR/check operations, renewal, revocation and publishing denial still need the authorized controlled installation test.

## Delivered inspection boundary

Owner-only inspection additionally uses `GET /app`, `GET /users/{ownerGithubLogin}`, repository collaborator permission readback, repository and inherited organization Actions-secret listings, environment detail/branch policies, workflow listings and the reviewed default-branch workflow contents. The App owner must match the recorded repository owner; organization identity is separate from the independently pinned human environment reviewer. Registration chooses that account/organization's GitHub manifest destination, sets both `redirect_url` and `setup_url`, and disables webhook delivery. Consumed callbacks redirect to clean locations with no-referrer policy. Pending organization approval resumes the sealed App through a fresh installation attempt.

The concrete supported fixture is organization-owned, keeps WongStack's read-only test workflow and has independently protected owner-approved preview/production jobs. The verifier compares exact environment branch policies and workflow blob pins, requires owner-only reviewers/no bypass/self-review, rejects unreviewed rules or dynamic/reusable/matrix/unsafe jobs, and refuses repository/inherited organization secrets accessible outside approved environments. It does not mutate live protections or move secrets. The current shared-token/dynamic-environment deployment workflow is an explicit rejected fixture. Missing inspection rights or other unverified publication paths leave editing blocked and remain live-acceptance work.

Primary permission references: [repository secret metadata](https://docs.github.com/en/rest/actions/secrets#list-repository-secrets), [inherited organization secrets](https://docs.github.com/en/rest/actions/secrets#list-repository-organization-secrets), [environment readback and branch policies](https://docs.github.com/en/rest/deployments/environments), [collaborator permission](https://docs.github.com/en/rest/collaborators/collaborators#get-repository-permissions-for-a-user), [manifest fields](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest).

<!-- end github-contract.md -->
<!-- file implementation-inventory.md utf8 5171 -->
# Existing-install compatibility and route inventory

Read-only source inventory, 2026-10-04. No resource was provisioned, no provider policy changed, and the Cloud picker remains outside this change.

The parent verified [#259](https://github.com/matthewwong525/WongStack/pull/259) merged at `2026-10-04T14:32:37Z`, head `82af26dbcbcb77c11c41fe1e3087108ae868e858`. The local setup contract in [private-access.mjs](../../../.agents/skills/wong-setup/scripts/private-access.mjs) records owned Worker/application/policy IDs and independent coverage/human-login status. This change consumes an existing protected business app/API installation. Repository grants/authentication remain manual for every provider; no repository automation is required.

## Current target

The public `.agents/.wong-stack.json` and [production configuration](../../../app/wrangler.jsonc) agree on:

| Resource | Recorded value |
|---|---|
| Account | `040f88e2bf4f25fb0b91b7cb24f3d442` |
| Access issuer | `https://startuptemplate.cloudflareaccess.com` |
| Audience | `b0e998ce836c59c284ff427902e65228fbbf2e5de3b1c77d26d2c81928cd2590` |
| Access application | `10a98858-5fe3-4650-a57f-a02786a1e851` |
| Human policy | `bcd7dbd7-0906-4793-b28d-0d945f7daa4c` |
| Independent machine policy | `2d042e45-ba2b-458c-93be-63a3f93db921` |
| Production Worker | `wongstack`, `37236d316a9d49028048b9217deae927` |
| Staging Worker | `wongstack-staging`, `bc809703c01f47528ff4e5449cf36e12` |
| App database | `wongstack-db`, `322d78e8-19e1-4bf0-8489-faa13c66deb1` |
| Recorded owner email | `matthewwong525@gmail.com` |

The record still says `humanLogin: unverified`. `app/wrangler.jsonc` now carries the recorded owner email as `WONG_OWNER_EMAIL` for both Workers; that committed value, with a verified human sign-in, is the owner authority. No repository ID, private pin or signed-subject pin is involved. The live app has no sign-in list key yet: task 10.3 runs `provision.mjs access` once, with a confirm, after publishing. No private setup record or credential value was read for this inventory.

## Routes to preserve

| Existing surface | Current handling | Employee-policy treatment to implement |
|---|---|---|
| `/`, static assets, `/apps/` redirect | Signed Access identity or explicit open starter | Current role/app readback; preserve shell/branding |
| `/apps/hello/`, `/apps/hello/api/greeting` | Hello page and described `hello.greeting` | App `hello`, preserve validation/guards |
| `/apps/tips/` | Customized Tips page; no server route | App `tips`; remains meta-only in distribution |
| `GET /api/health` | Described `main.health`, harmless health | Explicit reviewed infrastructure exception |
| `/api/actions`, `/api/openapi.json` | Verified company discovery | Filter current grants before ETags/contracts |
| `/_memory/*` | Independent memory credential before business identity | Preserve memory's authority and target |
| `/_walk/*` | Signed verification picture route, restricted bucket access | Preserve its independent verification contract |
| `/?memory_login_link=...` | Verified human machine-label association, clean redirect | Preserve existing memory-only labeling |
| `/api/access/setup`, `/api/access/apps` | Undescribed finite core readback | Every signed-in person's own prompt, apps and role |
| `/api/access/status`, `/api/access/people`, `/api/access/retry` | Undescribed finite owner operations | The recorded owner only; a preview keeps a practice list |

No other bare main business handlers exist in this source router. Installed customized routes require their own read-only inventory and reviewed app mappings before policy activation; this inventory cannot establish that for another business. New app IDs receive no automatic assignment. Existing action/record guards remain conjunctive.

## Retained source baseline and final acceptance

Previous remote checkpoints in [source-checks.md](source-checks.md) establish current app/discovery guards and durable Cloudflare policy/session reconciliation for the first build. Their original task numbers and withdrawn GitHub evidence remain historical records; they do not cover this revision.

This revision removes the private owner activation, the rollout list, the policy latch, the sealing key, the sealed database copy, the owner-setup script and the identity/activation routes. The owner is the recorded email; the built app folders are the catalogue; permissions start at the owner's first open, after listing everyone the sign-in list already admits with every app. Additive tables and deprecated fields remain intact: `wong_access_connections` now holds only the newest generation the sign-in list is known to match, and `wong_access_receipts`, `wong_access_attempts` and the repository columns stay inert. Home and direct app navigation enforce current permissions while branding and the removable welcome stay intact.

No live owner sign-in or provider change is established by this inventory or synthetic tests. Task 10.1 is the source gate, 10.2 the preview with its practice list, and 10.3 the live key step and a real second person. Production management credentials remain excluded from staging.

<!-- end implementation-inventory.md -->
<!-- file review.html utf8 77369 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-04-choose-project-in-setup</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-04-choose-project-in-setup">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-04-choose-project-in-setup</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Employees should start from the business app they already use, copy one setup prompt and connect their assistant to the apps they are allowed to use. The employer should control those permissions in one small app.</p>
<p data-note="why-2" tabindex="0">The first build could not be switched on. Access stayed locked until someone filled in five hidden settings and ran about seven commands, and it refused to work on a preview at all. The owner signed in and saw no access and no way to add anyone. This revision makes Access work the moment the owner opens it.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Access knows the owner.</b> Setup already records the owner's email when it puts the sign-in in front of the app. Open Access with that email and the people list is there: no hidden settings, no commands.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">  BEFORE                      AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌────────────────────────┐  ┌────────────────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ Access                 │  │ Access   +[Add person] │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ People management is   │  │ bo@example.com         │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ unavailable.           │  │ Orders · Can sign in   │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│ [Retry people]         │  │ ana@example.com        │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">│ [Copy private setup]   │  │ No apps · Can sign in  │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│ Assistant setup is     │  │ +Connect assistant     │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">│ unavailable.           │  │ +[Copy setup prompt]   │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">└────────────────────────┘  └────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Add person does everything in one save.</b> Type an email, tick the apps, save. The app records the choices and adds the email to the sign-in list itself. One line per person says whether they can sign in. A retry shows only when that step failed.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">ADD PERSON</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ Email  [bo@example.com       ]   │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ Apps   [x] Orders  [ ] Payroll   │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ [Save access]         [Cancel]   │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">└──────────────────────────────────┘</span>

<span class="ln" data-note="item-2-line-8" tabindex="0">SAVED</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">│ bo@example.com                   │</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">│ Orders · Can sign in    [Edit]   │</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">│ [Copy app link]                  │</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">└──────────────────────────────────┘</span>

<span class="ln" data-note="item-2-line-15" tabindex="0">SIGN-IN STEP FAILED</span>
<span class="ln" data-note="item-2-line-16" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-17" tabindex="0">│ bo@example.com                   │</span>
<span class="ln" data-note="item-2-line-18" tabindex="0">│ Orders · Can't sign in yet       │</span>
<span class="ln" data-note="item-2-line-19" tabindex="0">│ [Try again]                      │</span>
<span class="ln" data-note="item-2-line-20" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The live app holds its own key for the sign-in list.</b> Setup makes a Cloudflare key that can only edit sign-in rules and stores it in the live app, never in a preview. Cloudflare scopes that kind of key to the whole account; the app only ever edits its own list. An install made before this change gets the key the next time it updates. Until then Access still opens and saves app choices, and says one step is left.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">ONE STEP LEFT</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ Access                           │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ You can choose apps now. To let  │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ new people sign in, ask your     │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ assistant: Finish Access setup   │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│ [Copy that request]              │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>People who can already sign in keep every app.</b> The first time the owner opens Access, it lists everyone already on the sign-in list with every app ticked. Nothing changes for them until the owner unticks something. A person added later starts with no apps.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">FIRST OPEN</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ 3 people could already sign in.  │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">│ They keep every app until you    │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ change them.                     │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">│ cy@example.com                   │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">│ All apps · Can sign in  [Edit]   │</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>A new app shows up by itself.</b> When an app is built it appears in the tick list, unticked for everyone but the owner. Nobody edits a second hidden list of apps.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">build Payroll ─▶ Access lists Payroll</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">                        │</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">                        ▼</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">              owner ticks it for Bo</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>A preview has its own practice list.</b> On a preview link the owner can add people and choose apps to try the screen before publishing. Those choices stay on previews and never touch the real sign-in list.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">ON A PREVIEW</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">│ Access · Practice list           │</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">│ Changes here stay on previews.   │</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">│ The real sign-in list is not     │</span>
<span class="ln" data-note="item-6-line-6" tabindex="0">│ touched.          [Add person]   │</span>
<span class="ln" data-note="item-6-line-7" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The setup prompt is always there, in one box.</b> Anyone signed in can copy it from Home or Access, paste it into their assistant and approve the same sign-in on that computer. The prompt holds no keys. If copying fails, the text stays on screen to copy by hand.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-7-line-1" tabindex="0">CONNECT YOUR ASSISTANT</span>
<span class="ln" data-note="item-7-line-2" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-7-line-3" tabindex="0">│ Signed in as bo@example.com      │</span>
<span class="ln" data-note="item-7-line-4" tabindex="0">│ Apps: Orders                     │</span>
<span class="ln" data-note="item-7-line-5" tabindex="0">│ [Copy setup prompt]              │</span>
<span class="ln" data-note="item-7-line-6" tabindex="0">│ Paste it into your assistant     │</span>
<span class="ln" data-note="item-7-line-7" tabindex="0">│ and approve the sign-in.         │</span>
<span class="ln" data-note="item-7-line-8" tabindex="0">└──────────────────────────────────┘</span>

<span class="ln" data-note="item-7-line-10" tabindex="0">you            assistant        app</span>
<span class="ln" data-note="item-7-line-11" tabindex="0"> │── paste ─────▶│               │</span>
<span class="ln" data-note="item-7-line-12" tabindex="0"> │               │── sign in? ──▶│</span>
<span class="ln" data-note="item-7-line-13" tabindex="0"> │── approve ───────────────────▶│</span>
<span class="ln" data-note="item-7-line-14" tabindex="0"> │               │◀── allowed ───│</span></pre></div></details></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>The same app permissions apply everywhere.</b> App pages, direct calls and assistant actions all check the person's current apps. Unticking an app blocks their next request, even while they stay signed in.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-8-line-1" tabindex="0">Orders ticked   ─▶ page / call / assistant: yes</span>
<span class="ln" data-note="item-8-line-2" tabindex="0">Payroll unticked ─▶ page / call / assistant: no</span></pre></div></details></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>Removing a person blocks them at once, and signs everyone out.</b> Their app use stops with the save. Taking them off the sign-in list also ends every open session of this app, so the people who remain sign in again. This can't be undone.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-9-line-1" tabindex="0">REMOVE PERSON</span>
<span class="ln" data-note="item-9-line-2" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-9-line-3" tabindex="0">│ Remove bo@example.com?           │</span>
<span class="ln" data-note="item-9-line-4" tabindex="0">│ Everyone is signed out and       │</span>
<span class="ln" data-note="item-9-line-5" tabindex="0">│ signs in again. Can't be undone. │</span>
<span class="ln" data-note="item-9-line-6" tabindex="0">│ [Remove access]       [Cancel]   │</span>
<span class="ln" data-note="item-9-line-7" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-10"><span class="num">10</span><div class="body"><div class="text" data-note="item-10" tabindex="0"><b>Repository access stays manual.</b> Signing in to the app gives no access to the project's code. The employer grants that separately, and Access does not manage it. Memory setup also stays separate.</div></div></li>
<li class="item card" id="item-11"><span class="num">11</span><div class="body"><div class="text" data-note="item-11" tabindex="0"><b>Build first, check at the end.</b> Finish the remaining work, then run the checks once and review the finished preview.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> repository invitations, GitHub App registration or token issuance, private Git/PR adapters, Artifacts automation, new-project setup, Cloudflare OAuth changes, hosting administration, custom invitation email, per-record business roles, fresh memory enrollment, changing who the owner is from inside the app.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked to support Cloudflare only and require manual GitHub access → chose manual GitHub admission/authentication, superseding automatic GitHub App registration, employee credential issuance and the special GitHub repository adapter. Cloudflare Artifacts versus app/API-only scope remains pending clarification; preserve completed source evidence without treating withdrawn GitHub features as remaining work. Remaining work should use fewer shared verification checkpoints rather than a full remote gate after each small task.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what selecting a repository should do → chose starting a new project or opening an existing WongStack project, with customized starters separate.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked where a new Cloudflare project belongs → chose the person's own Cloudflare account.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked how to handle the overlapping managed starter work → chose to keep going here, design around it and leave it unchanged.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether setup may use a shared sign-in helper → chose yes, for sign-in only, with projects and hosting still owned by the person.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked how much teammate access to include → chose existing GitHub invitations and separate Artifacts repository tokens, without a new invitation flow.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to plan this flow → chose to plan, assuming #259 will merge.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: one coordinated Source/Cloud change, because replacing the picker depends on the same setup and sign-in handoff working end to end.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: deterministic helpers own repeatable sign-in, selection, resume and provisioning state; the assistant explains results and carries the ordinary workflow, because API identities and retries must be consistent.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: full personal installation for new own-account projects, because existing setup includes hosting and memory, whereas #259 deliberately defines a smaller managed starter.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: source retrieval can still read the public GitHub template without GitHub sign-in on the Artifacts route; removing all GitHub network access was not requested.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to add invitations and an employee setup page to this plan → chose to add them here, superseding the earlier manual-sharing scope.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether all invited employees should receive project access → chose app access by default, with project editing selected per employee.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the employer's own-account installation runs membership management, because the shared helper remains authorized for sign-in only.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: employee setup consumes the published trusted-machine memory contract without a Devices UI or separate browser approval, because the owning active change explicitly replaces that flow.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: invitation cancellation, editing removal and employee removal are in scope, because employers need to withdraw the access this flow grants.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to include employee-specific app access controlling API and assistant calls → chose to include it in Team invitations and employee settings.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: per-app access is allowed or denied, with no apps preselected and new apps denied until assigned, because that implements the selected-app choice without inventing business-specific roles or automatic access.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: project editing and memory remain separate grants, because allowing a business app does not authorize its whole source repository or redefine the established machine-memory policy.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked to simplify setup around hosted-app login, a copyable prompt and an Access mini app → chose that entry point and a smaller setup experience, superseding the larger provider-first flow.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether the smaller first version should cover only an existing app and GitHub repository → chose existing app + GitHub first, leaving new-project setup, Cloudflare OAuth changes, Artifacts delivery and Cloud picker replacement for later.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: GitHub App installation credentials authorize employee assistant operations without a separate employee GitHub login, because app login should be their single identity; native GitHub website membership remains separate.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: add allowed emails and share the ordinary app link, with no custom invitation mail sender, because the app itself is now the starting point.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the copied prompt contains routing and instructions only, with credentials handed to the helper privately after app authentication, because pasting reusable keys into assistant history is unnecessary.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: fresh memory enrollment stays out of this smaller version, because it needs the separate trusted operator contract and cannot be granted by ordinary app login.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: checkpoint the additive owner-activation slice for its required remote checks before continuing, because task 2.1 requires that gate and leaves employee policy/issuance disabled.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: distinguish completed source/provider-contract inventories from actual owner/provider acceptance, because the current target lacks verified owner setup and live confirmation remains in task 7.2. The activation slice passed remote app, build, payload and generated-starter checks at 8ba9ab9.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Grouped related provider, bootstrap, UI and distribution tasks into shared remote-check slices, preserving all named checks and the separate live acceptance gate. This changes checkpoint timing only; no feature or acceptance requirement was removed.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Task 2.2 adds current primary-snapshot membership checks and explicit route scopes. Source is ready for remote checks; runtime policy remains disabled pending reviewed owner rollout.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Integrated merged #263 memory-recall baseline without changing independent memory authority. Remote 2.2 checks caught a fixture foreign-key cleanup error; fixed its dependent-row removal order without weakening schema or checks.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Remote distribution checks found a wiki link to generated install-only Worker configuration. Generalized the reference to its installed path; all script and generated-starter checks passed before that documentation failure. Checks remain unchanged.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Task 2.2 passed remote app/build/payload checks at <code>37288ef</code>, with two fixture/documentation fixes and no loosened checks. Continued to current-grant discovery/readback; the production rollout latch stays disabled.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Task 2.3 source now filters every discovery representation with current route scopes, and reads frontend app assignments without granting a legacy caller an owner role. Kept the client-only-app test portable across payload installs rather than requiring the meta-only Tips app. Preparing its remote gate.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Task 2.3 passed remote app/build/distribution checks at <code>40a7a4c5</code>, with no gate fixes or loosened checks. Current verification baseline #261 is retained. Continued to the shared owner/provider connection slice 3.1–3.4; rollout and issuance remain disabled.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Primary GitHub documentation showed that publication inspection requires Secrets read and Environments read for name/metadata listings, which never expose secret values. Narrowed the earlier no-secrets wording to forbid secret modification/employee authority while allowing necessary owner-only inspection permissions in the new manifest, approved by the owner at connection. No existing live grant is expanded; unreadable or unproven publication boundaries remain blocked. Source: https://docs.github.com/en/rest/actions/secrets#list-repository-secrets.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The owner/provider source slice 3.1–3.4 is ready for its shared remote gate, including durable unknown-write/token outcomes and caller-only setup status. Runtime rollout/issuance remain disabled. Preserved the separate controlled provider acceptance and the production/staging secret-distribution follow-up.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Integrated merged #265 workflow baseline <code>1c5c65fe</code>, retaining current gate diagnosis and mid-build decision handling. Added the required plain consequence of credential revocation to the existing removal description; revocation behavior and scope are unchanged.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The shared 3.4 gate found three oversized functions and an unescaped workflow-expression fixture. Split focused checks/owner dispatch and corrected the fixture without changing behavior or limits. Retain CI coverage metadata for precise diagnosis; all coverage requirements remain unchanged.</li>
<li class="decision card" id="decision-39" data-note="decision-39" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>.github/workflows/test.yml</code> adds retained coverage-map diagnostics after the existing suite; no check, failure outcome or threshold is loosened. The workflow-setting detector requires this record because a diagnostic upload step changes the check configuration.</li>
<li class="decision card" id="decision-40" data-note="decision-40" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked: the person approved continuing after the stopped connection gate. Resume the same change, consolidate bounded decoding without changing wire errors or checks, then complete bootstrap, Access screens, distribution and reviewable verification.</li>
<li class="decision card" id="decision-41" data-note="decision-41" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The bootstrap/transport source slice uses one dependency-free Node artifact, distributed at an immutable checked public Source commit plus SHA-256 digest; no existing GitHub release asset is assumed. Private folder locators preserve the same connection after cloning. Finite owner identity supports closed-rollout resume without claiming employee readiness. The employee REST adapter keeps read-only Actions and refuses unsupported reruns/comment writes; missing log archives and thread-resolution counts require the owner path. Employee publication stops before archive/numbering. Tasks 4.1–4.3 await their shared remote gate, and live no-GitHub/provider acceptance remains 7.2.</li>
<li class="decision card" id="decision-42" data-note="decision-42" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether Cloudflare-only setup includes Artifacts repository automation → chose app/API access only; all repository grants and authentication stay manual. This supersedes the existing GitHub-only and automatic repository connection scope.</li>
<li class="decision card" id="decision-43" data-note="decision-43" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked to pass the findings to the other chat and to run tests only at the end → chose complete implementation followed by one final required source checkpoint and preview verification, with no per-task test or save checkpoints. Shared measured timings and this instruction with the verification and original implementation chats.</li>
<li class="decision card" id="decision-44" data-note="decision-44" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: remove dedicated unshipped GitHub registration/publication/token and private Git/PR adapter tests with the withdrawn implementations. Retained employee policy/discovery/login, personal GitHub delivery, app coverage, lint and distribution checks stay unchanged; author replacement API-only connection/UI/pin/staging-exclusion regression tests before the single final gate.</li>
<li class="decision card" id="decision-45" data-note="decision-45" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: at the single final source checkpoint, create a complete source ancestor, pin its bootstrap commit/digest in the final head and push once. Final distribution checks prove ancestor bytes/digest match the checked bootstrap; public raw readback follows the successful gate. Blank pins honestly leave setup unavailable until that checkpoint.</li>
<li class="decision card" id="decision-46" data-note="decision-46" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Completed all remaining app/API-only source, regression tests and owning documentation before any checks. Reconciled the reduced contracts, including production-only login authority in secret distribution. The single final source checkpoint will check the complete implementation; actual controlled human login/provider acceptance remains separate.</li>
<li class="decision card" id="decision-47" data-note="decision-47" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Integrated merged #268 drawing baseline (30.9.0) and preserved its release notes. Final source head pins the unchanged standalone bootstrap to ancestor <code>3e739ca8f82f7df90916ba0d31c078948682b5ba</code> and SHA-256 <code>2182ca2abac0e9b4163b60cedac38a830e1646a76dfa4fd717a6d45a1f4e35c4</code>; final checks and public readback must establish those exact bytes before calling distribution ready.</li>
<li class="decision card" id="decision-48" data-note="decision-48" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>app/tsconfig.worker.json</code> enables typed JSON imports for the reviewed bootstrap release pins. No type strictness, test, lint, coverage or duplication requirement is lowered. Condensed this change's payload inventory wording after the combined instruction-byte check exceeded its unchanged limit.</li>
<li class="decision card" id="decision-49" data-note="decision-49" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The first complete-source gate passed the build and script coverage but found two app lint errors and three precise rejection-message assertions. Repair attempt 1 keys asynchronous permission readback, extracts the existing page guard and corrects those assertions; unchanged bootstrap bytes preserve the reviewed public pin. All fixes are grouped into one recheck, with every check and limit retained.</li>
<li class="decision card" id="decision-50" data-note="decision-50" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Repair attempt 1 passed lint, build and all 1,303 script tests. App/generated-starter failures exposed example-page permission fixtures and an Access test reading before reload finished. Repair attempt 2 updates those consumers and adds zero-app roster and disabled/missing-installation status checks; missing owner status now fails closed. Checks, bootstrap bytes and pins remain unchanged.</li>
<li class="decision card" id="decision-51" data-note="decision-51" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Final complete-source head <code>33762826f3352c8841d96c665cb27009bb80ac8b</code> passed app/build/payload checks after two grouped repairs. Marked 2.x–5.x and 6.1 complete; finishing safe preview checks and retaining live controlled-installation acceptance pending. Keep post-gate records local until the next authorized publication checkpoint, avoiding a metadata-only repeat of the whole branch gate.</li>
<li class="decision card" id="decision-52" data-note="decision-52" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Finished safe deployed-preview probes and browser-only owner/employee simulations at the checked source head. Actual preview denies unconfigured setup/management; simulated UI covers copying, zero-app/direct-denial, roster and removal/retry states on phone/keyboard. Current-grant deployed human API/provider acceptance remains unverified without a controlled installation and independently verified owner; requested only its URL/email. Retain 6.2/6.3 pending for those portions, and keep evidence/completion metadata local pending publication.</li>
<li class="decision card" id="decision-53" data-note="decision-53" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>The person selected WongStack and independently confirmed themselves as owner. Public main-source readback lacks the employee-access runtime; readonly live identity/setup probes establish whether this feature is installed before requesting human login. Publishing the checked source is a prerequisite for acceptance on that existing app. Asked to publish first and continue the real login checks; no approval or signed owner authority is inferred from the target choice. Private activation remains closed pending verified session/configuration.</li>
<li class="decision card" id="decision-54" data-note="decision-54" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether the Access app works as intended after the owner saw no access and no way to add people → found the screen locked behind private activation, a private rollout list and a production-only rule; chose to plan five fixes: automatic owner, built app list, one-save add, a preview practice list and a simpler screen.</li>
<li class="decision card" id="decision-55" data-note="decision-55" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked how a new person's email reaches Cloudflare's sign-in list → chose the app adds them, with setup giving the live app its own narrow Cloudflare key; the account-wide scope of that key was named and accepted.</li>
<li class="decision card" id="decision-56" data-note="decision-56" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: fold these fixes into this unpublished change, because the owner wants a fix found while checking folded into the same change, not a follow-up.</li>
<li class="decision card" id="decision-57" data-note="decision-57" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the owner is the email setup recorded, checked on every signed request; the signed user id is logged, not pinned, because the sign-in wall already trusts that email and the second hidden pin is what locked the screen.</li>
<li class="decision card" id="decision-58" data-note="decision-58" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: people already on the sign-in list keep every app, and permissions start by themselves at the owner's first open, because silently taking apps from current teammates would break them and a confirm button is cheap to add later.</li>
<li class="decision card" id="decision-59" data-note="decision-59" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: previews keep a practice list in the preview database and never touch the real sign-in list, because one sign-in wall covers live and previews and the owner wants previews to be a safe playground.</li>
<li class="decision card" id="decision-60" data-note="decision-60" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the key is read from the live app's private settings on each use, with no encrypted database copy, because one private place is enough and it removes a setup step.</li>
<li class="decision card" id="decision-61" data-note="decision-61" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: an install with no key yet still opens Access and saves app choices, showing one step left, because a missing key should not lock the owner out of the screen.</li>
<li class="decision card" id="decision-62" data-note="decision-62" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: built apps and the route rules in reviewed code replace the private rollout list, because that list only repeated what the reviewed code already says.</li>
<li class="decision card" id="decision-63" data-note="decision-63" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: changing the owner stays outside the app, done by rerunning setup, because an in-app transfer is a takeover path nobody asked for.</li>
<li class="decision card" id="decision-64" data-note="decision-64" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: deleted <code>activation.test.ts</code>, <code>identity.test.ts</code>, the sealing test in <code>core.test.ts</code>, <code>employee-owner-setup.test.mjs</code> and the owner-consumer case in <code>company-api.test.mjs</code>, each with the withdrawn code it covered. Tests for the recorded-owner rule, the built catalogue, the automatic start, one-save admission, the practice list and setup's key step replace them. No lint, coverage, duplication or limit setting changed.</li>
<li class="decision card" id="decision-65" data-note="decision-65" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: each person's sign-in status reads from the newest generation the sign-in list is known to match, kept in the existing <code>wong_access_connections</code> row, because one line per person needs it and the applied migrations stay as they are. A change to apps alone moves no sign-in work, so it never makes someone who can sign in look unfinished.</li>
<li class="decision card" id="decision-66" data-note="decision-66" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: an earlier sign-in write of unknown outcome holds back &quot;done&quot; for 150 seconds, the lease plus the provider timeout, then the next matching readback settles it, because with no operator a lost write would leave <i>Try again</i> failing forever.</li>
<li class="decision card" id="decision-67" data-note="decision-67" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: an open site gets a blank owner email and no key, and the key is recorded as its own <code>components.accessKey</code>, because an open site has no sign-in to know an owner by, and setup rewrites the access record whole on every run.</li>
<li class="decision card" id="decision-68" data-note="decision-68" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: existing installs get the step as <code>provision.mjs access</code>, named in the changelog's update note and the wiki, with no new skill text beyond one clause, because the context check has under 100 bytes of headroom.</li>
<li class="decision card" id="decision-69" data-note="decision-69" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the sign-in list check keeps the application's id, audience and Worker destination and drops the hostname comparison, because the origin pin is gone and the Worker destination already shows the application covers this Worker.</li>
<li class="decision card" id="decision-70" data-note="decision-70" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Removing the owner-setup operations and the identity fallback changed the bootstrap bytes (SHA-256 <code>cd03278312a8cb4a9d88552c56a675c02be5617168d49d64cb8ea477dcf31af8</code>). The pins are blank, so the copied prompt honestly reads unavailable, until the final checkpoint creates the source commit and pins it.</li>
<li class="decision card" id="decision-71" data-note="decision-71" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what the automated checker may open once app permissions are on → chose every app, everywhere, as today, so preview checks and the look at the live app after publishing keep working; it never manages people. The risk of a leaked checker key opening every live app was named and is unchanged from today.</li>
<li class="decision card" id="decision-72" data-note="decision-72" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Saved the owner-first revision for its one gate (task 10.1). Merged main through 31.0.1, which removed the server installer: setup alone now supplies the owner email and the key, and the server-install test went with main. The setup helper is pinned to source commit <code>a53d1e4ba3dde23098f5d6c94e6a1e3f10c2b78d</code>, SHA-256 <code>cd03278312a8cb4a9d88552c56a675c02be5617168d49d64cb8ea477dcf31af8</code>. Open before publishing: the pin test requires that commit to be an ancestor of the checked head, which a squash publish to main does not keep.</li>
<li class="decision card" id="decision-73" data-note="decision-73" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>scripts/tests/employee-bootstrap.test.mjs</code> no longer requires the pinned helper commit to be an ancestor of the checked head, because publishing squashes the branch and that commit is never in main's history, so the test would fail on main. It still requires the pinned digest to equal the checked helper's bytes, and the pinned commit's bytes to equal them wherever the checkout holds that commit. The public address for commit <code>a53d1e4b</code> was read back on 2026-10-04 with the pinned digest.</li>
<li class="decision card" id="decision-74" data-note="decision-74" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether Access worked for the owner on the preview → chose yes, it worked; task 10.2 is ticked on the owner's own report plus the machine probes.</li>
<li class="decision card" id="decision-75" data-note="decision-75" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked how to handle the live-app test, which can only run after publishing → chose publish, then test: it leaves the task list and stays open work, with the owner's OK before the key step and the real second-person test.</li>
<li class="decision card" id="decision-76" data-note="decision-76" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Archive checkpoint for publishing as 31.2.0: merged main through 31.1.0, numbered the release, archived with every task ticked. The live-app test stays open work in memory.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
<!-- file source-checks.md utf8 19684 -->
# Source checks

## Owner activation slice

2026-10-04: commit `8ba9ab9` on `smooth-repo-selection`, [draft change #264](https://github.com/matthewwong525/WongStack/pull/264). Integrated merged #259 baseline `c22d448`.

- App tests and coverage: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37215721936).
- App build/staging: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37215721938).
- Payload, script tests, generated hosted starter and release checks: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37215721956).
- No checks loosened. Corrected routing complexity without changing behavior, preserved hosted-starter transformation anchors, and indexed the new capability.
- Preview discovered through deployment readback: https://smooth-repo-selection-wongstack-staging.matthewwong525.workers.dev

Task 2.1 is complete. Source inventories 1.1/1.2 record live trust gaps; actual owner/GitHub/employee acceptance remains unchecked in 7.2. Employee enforcement, provider credentials, repository issuance and Access UI are not yet implemented/enabled.

Session fact recording was skipped: this checkout has no registered current session hook. No credential values were read or recorded for this slice.

## Current app authorization slice

2026-10-04: commit `37288ef` on `smooth-repo-selection`. Integrated merged memory-recall baseline #263 `1a7e238` alongside #259.

- App tests, coverage and quality checks: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37217406295).
- Build/staging: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37217406303).
- Script coverage, generated hosted starter and release checks: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37217406307).
- Two gate fixes: dependent-row cleanup in an empty-policy fixture, and a wiki reference to generated installed configuration. No schema or check was weakened.
- Preview discovered by deployment readback: https://smooth-repo-selection-wongstack-staging.matthewwong525.workers.dev

Task 2.2 is complete. Current primary reads guard described/bare dispatch and core self-identity; acknowledged grants/member removal affects subsequent requests with the same JWT. The committed runtime rollout latch remains absent; owner policy activation and provider/live acceptance are still pending. Discovery/readback is the next source task.

## Discovery and app readback slice

2026-10-04: commit `40a7a4c5`; merged current verification baseline #261 `cb6fae84` without changing source checks.

- App tests/coverage/quality: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37218387301).
- Build/staging: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37218387318).
- Payload/script coverage/generated starter/release checks: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37218387296).
- No gate fixes or loosened checks. Source review kept the client-only-app fixture independent of meta-only Tips, which does not ship.
- Preview discovered by deployment readback: https://smooth-repo-selection-wongstack-staging.matthewwong525.workers.dev

Task 2.3 is complete. Every discovery representation evaluates current membership/scopes before a conditional response; ETags include the caller, policy revision and exact response. Core readback includes frontend manifests and returns no authority before rollout. Provider connections, bootstrap, screens and live acceptance remain pending.

## Owner/provider source slice 3.1–3.4

Prepared the source, colocated SQLite/provider/form-identity tests, private owner consumer and owning setup guidance for the shared remote gate. No local tests/builds, provider mutations or live connection material were used. Tasks 3.1–3.4 remain unchecked until `/save` passes their required app/build/distribution checks.

The implementation keeps strict owner pins independent of the legacy policy latch, seals Access/GitHub material, filters all new private mini-app bindings, and requires reviewed routes/grants before login reconciliation. Durable policy intents prevent a crashed/unknown old write being ignored by later removal readiness; leases/generations constrain new mutations. Session acceptance, policy readback and token revocation/unknown expiry remain independent.

GitHub registration handles customer-owned organization Apps, distinct manifest/install callbacks, disabled webhooks and one-use current-owner/CSRF checks; pending organization approval resumes the same sealed App. Owner-only read metadata permissions are excluded from employee tokens. The supported synthetic fixture retains WongStack read-only CI and owner-approved protected preview/production jobs; the current shared-secret/dynamic-environment workflow is explicitly denied. These fixtures establish neither live endpoint permission support nor actual provider publication readiness; task 7.2 remains separate.

Continuation: `/api/access/setup` now supplies authenticated caller-only API/editing/provider availability for 4.x/5.x. Bootstrap must independently prove local connection and memory state. The explicit payload inventory includes the new migration and owner consumer. Task 6.x must additionally enforce production/staging management-secret separation in secret distribution tooling; current owning guidance requires a separate staging file with all production connection authority explicitly empty. Source runtime management already rejects staging. No scheduler was installed; owner retries drive durable work and existing schedules/config remain unchanged.

### Shared gate corrections (not yet passed)

First correction at `63f10b7`: split high-complexity functions, escaped workflow expressions in the synthetic fixture, and retained the remote coverage map for diagnosis. No limit or failure was relaxed.

Second correction responds to all failing checks at that head:

- App tests: all 172 passed; strict coverage exposed missing authority/race/failure cases. Added tests for those runtime cases and removed an unreachable optional-holder fallback after lease admission.
- Build/staging: Node-only SQLite/crypto fixture helpers were included by the Worker TypeScript project; moved them into `app/tests/employee-access/` outside runtime source, keeping their test consumers and unchanged build/coverage configuration. Added Cloudflare's required `ignoreBOM` decoder option.
- Payload/generated starter: all 166 generated-app tests passed; the same runtime coverage gaps failed its gate. The shared source fixes apply to the generated starter.
- The workflow-setting detector required a formal Check record for the diagnostic artifact step; recorded that addition in the proposal without lowering any gate.

These are source-related failures; no unrelated failed run was rerun. Provider authority, local execution and task completion remain unchanged until the remote checks pass.

Third correction at this shared gate fixes the two new test-fixture errors at `e20a371c`: the manifest assertion uses the helper's already-parsed response, and the deadline-race fixture advances sixty seconds beyond the ten-minute admission bound instead of depending on millisecond scheduling. Build/staging passed at that head. The app failure is limited to those two fixture errors; generated-starter checks failed on the same two fixture errors after script tests passed. All failed checks were read before this correction was pushed. Runtime authority and check thresholds are unchanged.

### Shared gate stopped after three corrections

At pushed head `f281e02cacaad1c72db4704a4726f675774a98f2`, all 181 app tests and all four 100% coverage metrics passed. Build/staging passed ([run](https://github.com/matthewwong525/WongStack/actions/runs/37223182155)). The app quality check failed ([run](https://github.com/matthewwong525/WongStack/actions/runs/37223182133)): `jscpd found too many duplicates (0.3%) over threshold (0.0%)`, identifying six lines in `app/worker/api/contract.ts:135` and `app/worker/employee-access/json.ts:14`. This is within the source diff, so an unrelated-run rerun is not applicable. No check was weakened.

The `/save` git-gate cap of three correction attempts has been reached for this checkpoint. No fourth source fix or new checkpoint was started. Tasks 3.1–3.4 remain unchecked; next authorized continuation should consolidate bounded decoding without changing API/access error behavior, then run a fresh gate before starting 4.x. Bootstrap and Access UI are still unbuilt; the deployed preview shows the existing shell only. Controlled provider acceptance remains unchecked. This final stop record is kept locally pending the next authorized continuation.

The generated-starter gate also passed all 175 tests and all four 100% coverage metrics, then failed on the same six-line duplication ([run](https://github.com/matthewwong525/WongStack/actions/runs/37223182201)). Script tests and coverage passed. Final waiter result: `FAILURE` for app test and payload checks. Exact-head deployment readback returned `https://smooth-repo-selection-wongstack-staging.matthewwong525.workers.dev` via deployment `6844702486`; this contains no Access UI/bootstrap. Branch `smooth-repo-selection`, draft PR #264, Status `in-progress`; session facts skipped because no current session hook is registered.

## Authorized continuation

The person approved continuing. The new checkpoint consolidates the bounded stream reader shared by API and access JSON parsing. Both callers preserve their existing size-limit and decoding errors; limits, malformed UTF-8 handling and reader cancellation remain unchanged. Existing tests exercise both wire contracts; no test or threshold was relaxed.

Continued checkpoint `d325c4cd`: app, build/staging, script checks and both generated starters passed. Payload release checks alone failed the instruction byte ceiling (`190955 >= 190845`): this branch adds owner-consumer distribution wording and merged #267 consumes the prior headroom. The first correction condenses only this change's Pack inventory sentence, retaining the helper/owner links and memory separation. This failure intersects the change; no unrelated rerun applies.

The first inventory trim at `5b30f919` remained 47 bytes over the ceiling; it was pushed before that static result was correctly handled. The corrective trim was verified before commit: instruction bytes `190806 < 190845`, with all helper links retained. This is the second correction in this resumed checkpoint; no threshold changed.

## Continued connection gate passed

2026-10-04, exact head `512e59a8dc24e330325ec77e106121308e726655`, branch `smooth-repo-selection`, draft #264, Status `in-progress`. Integrated #267 staging baseline `da9e7895` (VERSION 30.8.0) while retaining this change's Next minor entry.

- App tests/100% coverage/quality: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37226925438).
- Build/staging: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37226925447).
- Payload/scripts/generated starters/release checks: PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37226925633).
- Bounded stream reading is shared, with original caller errors preserved. Two instruction-inventory corrections kept the merged context within unchanged limits; no checks were weakened.

Tasks 3.1–3.4 are complete at the source gate. Provider acceptance remains pending in 7.2; rollout and live issuance were not enabled. Bootstrap and UI follow next. Session facts remain skipped because there is no registered current session hook.


## Bootstrap source slice 4.1–4.3

Prepared a standalone built-in-only Node artifact and reused its transport from installed company calls. API setup works before a clone with zero apps; finite owner identity is distinct from authenticated employee readiness. Private state has 0700/0600 modes and lives outside checkouts. A private nonsecret folder locator preserves the canonical-origin connection after clone, including a different recorded public install alias, while later public-routing changes still require reconnection. No credential enters the prompt, Git argv/URL/remotes, tracked files or hook/build environment.

Synthetic source tests cover independent app-only status, headless/expired login (the existing transport tests), missing connections, redirect refusal, issuance/renewal/removal races, same-origin employee identity changes and lost-response receipts, callback destination checks, protected private file modes, clone/fetch/feature push, conflicting/dirty folders, encoded REST lookup/create/update, exact-head checks/status pagination and settled-gate semantics, preview commit evidence, unsupported endpoints, and unchanged personal delivery gates. These tests have not been run locally. Tasks 4.1–4.3 remain unchecked until the parent completes the remote gate.

Static payload links, OpenSpec configuration, JavaScript syntax and context checks pass. Instruction headroom is 121 bytes at this source state; the new transport link and employee `/ship` guard were offset inside their touched guidance. No source check was loosened. The artifact is supplied by an exact passed public source commit and digest; the later setup-prompt slice must pin that actual passed artifact. No live provider credential was read, created or changed. Controlled empty-folder/provider acceptance remains separate in 7.2.


## Reduced app/API-only final source gate

2026-10-04, exact head `33762826f3352c8841d96c665cb27009bb80ac8b`, branch `smooth-repo-selection`, draft #264, Status `in-progress`. All remaining 2.x–5.x source, tests and documentation were completed before this single checkpoint. Automatic repository integration/editing/issuance was withdrawn; all repository authority is manual. Additive customer schema/data and independent memory remain intact.

- App: 173 tests, all four coverage metrics 100%, lint/unused/duplication checks PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37231798571).
- Build/staging PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37231798606).
- Payload: all 1,303 script tests, script coverage, generated installs and 37 release checks PASS, [run](https://github.com/matthewwong525/WongStack/actions/runs/37231798585).
- Initial complete-source check failed two lint conditions/three rejection-message assertions. Repair 1 exposed consumer fixtures and asynchronous reload timing; repair 2 grouped those fixes plus zero-app/missing-installation checks. No limits or checks were weakened; no local implementation tests/builds ran.
- Immutable bootstrap ancestor `3e739ca8f82f7df90916ba0d31c078948682b5ba`, SHA-256 `2182ca2abac0e9b4163b60cedac38a830e1646a76dfa4fd717a6d45a1f4e35c4`. Anonymous public raw readback after the gate returned HTTP 200/17,173 bytes with that digest and refused redirects; download was not executed locally.
- Finished-preview walkthrough is ongoing. Task 6.3 needs independently verified controlled-installation authority; source checks and browser simulations establish no live email admission/session propagation. Session facts skipped: no current session hook.

These post-gate completion records remain local for the next publication checkpoint; no metadata-only push or duplicate branch-wide gate was added.


## Finished preview evidence and live acceptance boundary

Safe walkthrough at unchanged checked head `33762826f3352c8841d96c665cb27009bb80ac8b`: actual preview reports owner setup unavailable (setup 403; management 503) and withdrawn repository routes 404. Staging was rebuilt safely under an owned turn. Browser-only synthetic responses exercised owner add/readback/share/removal/retry, employee copy/fallback/allowed-denied navigation and zero-app setup on the deployed UI. Phone width/document width were both 390px; keyboard reached app selection and selected all fallback text. Private pictures and a detailed verification comment are attached to PR #264.

Overall verification is UNKNOWN for live authority, not a failure of the observed UI: no independently verified controlled owner/session/configuration exists for deployed current-grant API/discovery/call probes or actual email admission/expiry/removal/provider convergence. Task 6.2's safe UI portion is complete; its deployed-human API portion and 6.3 remain unchecked. The person was asked for a controlled app URL and independently verified owner email only; credentials must use the existing private setup flow. No response, approval or skip is inferred. No production provider mutation or fresh memory enrollment occurred.

Journey repairs corrected two guide/runtime command mismatches and a render wait; no source revision or implementation test rerun was needed. Six response-cookie text captures were scrubbed; later simulation captures needed no redaction. Post-gate completion/evidence records stay local until the next authorized publication checkpoint; no extra branch-wide gate was introduced for metadata.


## Selected live target prerequisite

The person selected existing WongStack and confirmed themselves as expected owner. Readonly machine-authenticated probes to `https://wongstack.matthewwong525.workers.dev/api/access/identity` and `/api/access/setup` both returned HTTP 404/application JSON. Public `main` contains no employee-access identity module. Thus this checked, unmerged change must be installed before actual owner identity/setup can be verified on that target. Those requests establish no signed-human authority. No production writes occurred; two response-cookie captures were scrubbed and the temporary probe folder was cleaned. Publishing approval was requested once after the finished source/preview work; it remains pending.


## Owner-first revision gate

2026-10-04, branch `smooth-repo-selection`, draft #264, Status `in-progress`. Source commit `a53d1e4b` holds tasks 7.1–9.2, built with their tests and not run locally. Merge `d2658dd4` integrates main through 31.0.1; conflicts in `CHANGELOG.md`, `scripts/retired-names.json`, `wiki/stack/README.md` and `openspec/specs/cloudflare-provisioning/spec.md` kept both sides, and `scripts/tests/server-install.test.mjs` followed main's removal of the server installer. Local static checks on the merged tree passed: payload links, OpenSpec config, retired names, spec validation and the context measure. The remote result for this head is recorded in PR #264's checks.

Gate result at head `c83bfb7b`: app tests, build and payload checks PASS ([test](https://github.com/matthewwong525/WongStack/actions/runs/37238337473), [build](https://github.com/matthewwong525/WongStack/actions/runs/37238337467), [payload](https://github.com/matthewwong525/WongStack/actions/runs/37238337369)). The first run at `1fc29207` failed one of 182 app tests: the phone-fit test read stylesheets through a file URL inside the browser-like environment. Repair 1 moved it to `app/src/apps/access/style.test.ts`, unchanged in what it asserts; no check was weakened. Tasks 7.1–9.2 and 10.1 are complete. Tasks 10.2 (owner on the preview) and 10.3 (live app after publishing) remain.

Preview probes at `c83bfb7b` (`https://smooth-repo-selection-wongstack-staging.matthewwong525.workers.dev`, statuses only): an outsider is redirected to sign-in on every path; the verification machine gets 200 on `/`, `/apps/access/`, `/apps/hello/` and `/api/access/apps`, and 403 on `/api/access/status` and `/api/access/setup`. The owner's own use of Access on the preview (task 10.2) needs the owner's sign-in and is not yet observed.

<!-- end source-checks.md -->
