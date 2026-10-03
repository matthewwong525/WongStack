# Hosted workspaces

WongStack Cloud prepares a private repository and AI entry point for a new workspace; `/wong-setup` installs the assistant and site, reporting memory separately. Your own computer uses the same command with your own hosting. A workspace already on GitHub [stays on GitHub](#new-workspaces-only). Back to [the stack](README.md).

## Detect the route first

Before GitHub authentication, Cloudflare tokens, repository discovery or a local preview upload, run the installed `.claude/skills/save/scripts/hosted.mjs context` from the target folder. During a first setup, run that file from the verified source checkout instead. `{"hosted":false}` selects the personal workflow. A positively confirmed folder outside Git selects personal setup. Corrupt repositories, unreadable origins and other inspection errors stop; uncertainty never selects personal hosting. A prepared empty clone holds its context in Git’s common directory, so linked workspaces resolve it too. A hosted origin or committed hosted installation record without that private context stops with a reconnect message. Committed fields only identify the route; they cannot authorize calls or reconstruct a grant. A cloud repository cloned onto another computer needs a verified operator private handoff through the existing cloud access path. There is no self-service local grant endpoint; never ask for a platform token or silently create a replacement repository.

Hosted context reports the project, role, original source repository and exact source commit without a credential. Preparation installs the source's `/wong-setup` globally for Claude and Codex; no payload, site or memory is created until the person sends that command. No GitHub login or customer Cloudflare token is required for this route.

## Finish setup

Use the prepared folder and verified source checkout. For an installed target, first run `node <source>/server/prepare-hosted.mjs configure`. A matching hosted project resumes through verified workspace identity and read-only service status for members and returning owners; it preserves the installed app and configuration. The committed record only selects this route: its installing owner identity grants no authority to a teammate. A different hosted project stops. Use the returned published app pins and pending enrollment result; unpublished, stopped or unprotected sites offer no Devices action. Another connected device never makes this computer ready. Follow installation-owned invitations and device enrollment when the owner, operator and Devices UI are available; otherwise report what is still pending. A member cannot provision infrastructure or install an empty project before its owner. Source updates use `/wong-sync`.

Explore, plan and apply describe a fresh install. In apply, invoke `node <source>/server/prepare-hosted.mjs install` in the prepared folder. It copies the whole payload, links `.claude` and `.codex`, writes the install record and trusted app configuration, and reports pending memory. Until the independent installation-owned memory feature and its integration are delivered, report memory as unavailable or pending. A returned enrollment address does not prove a usable Devices page or machine grant. It leaves the work uncommitted. For a fresh installation, the person’s install request includes the first private site: continue through `/save`, require its passing exact preview, then invoke `/ship` for the initial scaffold. Existing installs retain the normal publication approval; do not publish their app changes merely because setup was invoked.

The initial site plan covers infrastructure, payload, the exact remote preview, and the accurately pending memory result. Verify the site works while memory remains unavailable/pending. Owner confirmation and device enrollment are separate follow-up work, never falsely completed tasks that prevent or authorize the site’s first publication. After the service’s exact production and default-ref acknowledgment, fetch the published commit. Offer a Devices action only once its separate implementation and integration are available and verified; a recorded address alone is insufficient. Continue owner confirmation and this machine’s device connection only through the installation-owned protocol; missing support remains explicitly pending. Never report memory ready from a cloud owner role or infrastructure completion.

The setup response's private settings and the scoped service token go directly into the ignored primary-workspace `.env`, with mode 0600. Setup prints only the nonsecret configuration and install record. The bootstrap credential helper requests fresh 30-minute Git grants for the exact repository URL and path. It supplies a token only through Git's credential protocol. Neither customer builds nor repository files receive platform deployment authority.

## New workspaces only

New cloud workspaces default to Artifacts. If you explicitly request GitHub, use the supported GitHub setup flow before Artifacts preparation. Your own computer keeps its personal setup flow.

A workspace or install whose repository is on GitHub keeps its GitHub route: a save opens a pull request, the checks run there, and a yes merges it. Nothing moves it, and there is no move to ask for.

Preparation and hosted setup refuse a GitHub workspace before they write anything, and name the GitHub route:

- **The folder's `origin` is a GitHub address.** The origin, the files and the cloud record stay as they were.
- **An installed project has no hosted record.** It was installed on the GitHub route, so `configure` stops instead of adopting it.
- **A job names a GitHub repository.** The server agent rejects it and runs nothing.

A prepared folder that already holds files stops too: hosted setup starts from an empty repository. A folder holding any other repository is refused the same way.

## Save and check

Keep `/save`'s credential protection, plan selection, handoff upkeep, spec reconciliation, facts, review generation, intended-path staging and commit steps. Hosted preconditions check the context, origin and OpenSpec, omitting `gh`. Before the generic feature-branch step, run `node .claude/skills/save/scripts/hosted.mjs initial-branch`. Only `initial:true` means an unborn local `main` with no remote refs: keep `main` for the first commit and skip fetching a nonexistent remote branch. Preserve any selected user branch; inspection failure is an error, never proof of an empty repo. Existing commits or remote refs use the regular feature-branch route. After first publication, new changes branch from the acknowledged `main`. Keep the proposal's recorded branch distinct from its change name.

After the commit, push the selected branch and run:

```text
node .claude/skills/save/scripts/hosted.mjs candidate <full-sha> refs/heads/<branch>
node .claude/skills/save/scripts/hosted.mjs wait <full-sha> refs/heads/<branch>
```

The remote checks are the project's own [check list](github-actions.md#one-check-list-two-callers), run at the saved commit: the same file the GitHub workflows call. A commit without it fails.

The returned SHA and ref must match. Only `status: passed`, `checks: PASS`, and a reported private preview is `SAVE_GATE_RESULT=SUCCESS`. Failure is `FAILURE`; unreadable, busy or timed-out work is `UNKNOWN` or `TIMEOUT`, never no checks. Fix demonstrated source failures through the ordinary save loop, at most three times. Candidate requests are idempotent; a lost wait can resume without publishing. Report the service's URL and status instead of a GitHub PR. Keep the usual plan link and closing question.

## Service-owned remote code

The hosted service generates trusted Git preparation, packing and runtime-protection code. Keep that code as canonical source text owned by the service. Do not extract it with `function.toString()`: deployment bundling can rename lexical imports and inject helpers such as esbuild's `__name`, leaving the generated command with unavailable identifiers. Body-local imports alone do not prevent helper injection.

Regression checks must bundle the service with deployment's pinned bundler and `keepNames`, then execute its generated commands and modules. Cover import collisions, packing refusal and signed runtime protection; source-only tests cannot establish that the deployed generator works. The [service source](https://github.com/matthewwong525/WongStack/tree/main/server/hosted) owns these bytes. A completed outer Workflow does not establish a passing candidate: use the candidate's exact checks and preview result described [above](#save-and-check).

## Publish approved work

`/ship` keeps its task completion, strict validation, delta reconciliation and archive steps, then runs `/save` on the finished archive. No GitHub release numbering or PR merge is needed for an installed hosted project. Require a passing exact commit and the same preview; an unknown or failed check stops publication. Walk the reported private preview through the cloud login. Evidence stays with the change and is checkpointed through `/save`; private login blocks remain unverified.

Only `/ship` or a person's explicit publish instruction permits these calls:

```text
node .claude/skills/save/scripts/hosted.mjs approve <full-sha> refs/heads/<branch>
node .claude/skills/save/scripts/hosted.mjs publish <returned-approval-id> <full-sha>
```

The service requires the current owner, successful exact checks and preview, unchanged authoritative branch head, and the same production base. The service must acknowledge the approved commit on the default ref before reporting complete publication. A divergent default branch stops advancement; uncertainty retains the publication reservation and preserved branch. It publishes the stored checked bytes without rebuilding. A changed head, outdated base or uncertain deployment is a stop; never bypass it or retry an uncertain publication. Read `status` to inspect recovery. Publication success must identify the approved SHA, version, and independently verified default-ref SHA. Fetch the repository afterward and fast-forward its default branch only after that acknowledgment, preserving local work. Hosted publication is the deployment gate; it does not require a GitHub merge.

A provider-confirmed active version is a deployment receipt, not completed publication. `deployed-awaiting-identity` retains its exact target, version and deployment while the service makes bounded identity reads. `deployed-awaiting-main` also requires exact repository acknowledgment. Either pending phase means inspect `status` and reconcile; never resend publication to repeat a deployment. Only the final published receipt establishes success.

## Build, resume and verify

`/apply` keeps planning and implementation inline or in its helper. At its preview boundary, run `/save` and use the remote candidate preview instead of `cf-preview.sh`; checks and builds run remotely. Do not publish during apply.

`/continue` resolves changes from proposals and remote Git branches, keeping its dirty-workspace protections and memory recap. A hosted change has a recorded branch and service status instead of a PR; fetch and check out that branch with Git. A GitHub PR handle is only valid for the personal route. Then invoke `/apply` normally.

`/verify` scouts the chosen change's scenarios, saves, and uses the exact passing candidate's reported preview. Request and browser probes go through authenticated cloud routes. Keep the ordinary SUCCESS/FAILURE/UNKNOWN/TIMEOUT evidence grading and bounded fixes; no customer Cloudflare service-token minting or GitHub comments. Store evidence alongside the change, checkpoint it, and return its path and deployed identity. A machine test alone does not prove human login or removal.

## Export and removal

A project's full history can be exported at any time, into any other Git destination. The export holds Git history only: not service membership, approvals or secret settings.

Restore Artifacts history with a single advertised branch followed by explicit ref fetches in batches of at most 32. Check the complete advertised ref map and full objects afterward; a branch-only clone is not an export. A missing ref or a differing object identity reports failure and removes nothing. The batches avoid an observed full-mirror fetch failure; its provider cause has not been established. The bound applies to preparation and verification. Normal later wildcard Git fetches retain their ordinary configuration and are not bounded by this helper. Fresh populated working clones select advertised `main`, the hosted publication branch, even when the provider advertises another branch as HEAD. If main is absent, use the verified advertised HEAD or existing branch fallback. A verification cache may seed any verified advertised branch; it still restores all refs and objects. Existing user branches are preserved.

Reconnect refreshes scoped access without replacing work. Cloud removal revokes hosted service and repository grants; incomplete provider revocation remains pending. Memory removal is a separate explicit installation-owner operation; report it independently and never claim the cloud action revoked it. Old server agents must be rebuilt from the reviewed contract-4 source before receiving Artifacts jobs; the contract number alone does not prove support. Existing GitHub and personal hosting routes remain supported.
