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
