# Hosted workspaces

WongStack Cloud prepares a private repository and AI entry point; `/wong-setup` installs the assistant, site and memory. Your own computer uses the same command with your own hosting. Back to [the stack](README.md).

## Detect the route first

Before GitHub authentication, Cloudflare tokens, repository discovery or a local preview upload, run the installed `.claude/skills/save/scripts/hosted.mjs context` from the target folder. During a first setup, run that file from the verified source checkout instead. `{"hosted":false}` selects the personal workflow. A positively confirmed folder outside Git selects personal setup. Corrupt repositories, unreadable origins and other inspection errors stop; uncertainty never selects personal hosting. A prepared empty clone holds its context in Git’s common directory, so linked workspaces resolve it too. A hosted origin or committed hosted installation record without that private context stops with a reconnect message. Committed fields only identify the route; they cannot authorize calls or reconstruct a grant. A cloud repository cloned onto another computer needs a verified operator private handoff through the existing cloud access path. There is no self-service local grant endpoint; never ask for a platform token or silently create a replacement repository.

Hosted context reports the project, role, original source repository and exact source commit without a credential. Preparation installs the source's `/wong-setup` globally for Claude and Codex; no payload, site or memory is created until the person sends that command. No GitHub login or customer Cloudflare token is required for this route.

## Finish setup

Use the prepared folder and verified source checkout. For an installed target, first run `node <source>/server/prepare-hosted.mjs configure`. A matching hosted project resumes through verified workspace identity and read-only service status for members and returning owners; it preserves the installed app and configuration. The committed record only selects this route: its installing owner identity grants no authority to a teammate. A different hosted project stops. Use the returned published app pins and pending enrollment result; unpublished, stopped or unprotected sites offer no Devices action. Another connected device never makes this computer ready. Follow installation-owned invitations and device enrollment when the owner, operator and Devices UI are available; otherwise report what is still pending. A member cannot provision infrastructure or install an empty project before its owner. Source updates use `/wong-sync`.

A personal or legacy installation requires an owner-led hosted migration plan. A prepared migration with files needs a plan adapting those files. For a migration, run that configure command in apply to provision hosted infrastructure and return its trusted settings. Adapt `app/wrangler.jsonc`, add the hosted client when absent, and update only the installation record’s hosted and service-memory fields. Preserve local app code, skill names, source fields, former memory settings and stored facts; any memory transition needs a separate installation-owner plan. A memory store is independent of cloud membership. This is the same setup flow, never a silent continuation of the former personal hosting.

The same explore, plan and apply steps describe a fresh install. In apply, invoke `node <source>/server/prepare-hosted.mjs install` in the prepared folder. It copies the whole payload, links `.claude` and `.codex`, writes the install record and trusted app configuration, and creates pending owner/device memory enrollment. Report the returned private enrollment action and pending status; memory is ready only when enrollment completes. It leaves the work uncommitted. For a fresh installation, the person’s install request includes the first private site: continue through `/save`, require its passing exact preview, then invoke `/ship` for the initial scaffold. Existing installs and migrations retain the normal publication approval; do not publish their app changes merely because setup was invoked.

The initial site plan covers infrastructure, payload, the exact remote preview, and the accurately pending memory result. Owner confirmation and device enrollment are separate follow-up work, never falsely completed tasks that prevent or authorize the site’s first publication. After the service’s exact production and default-ref acknowledgment, fetch the published commit and show the canonical Devices action. Before that receipt, production and Devices still serve the setup placeholder. Continue owner confirmation and this machine’s device connection only through the installation-owned protocol; missing operator support remains explicitly pending. Never report memory ready from a cloud owner role or infrastructure completion.

The setup response's private settings and the scoped service token go directly into the ignored primary-workspace `.env`, with mode 0600. Setup prints only the nonsecret configuration and install record. The bootstrap credential helper requests fresh 30-minute Git grants for the exact repository URL and path. It supplies a token only through Git's credential protocol. Neither customer builds nor repository files receive platform deployment authority.

## Save and check

Keep `/save`'s credential protection, plan selection, handoff upkeep, spec reconciliation, facts, review generation, intended-path staging and commit steps. Hosted preconditions check the context, origin and OpenSpec, omitting `gh`. Before the generic feature-branch step, run `node .claude/skills/save/scripts/hosted.mjs initial-branch`. Only `initial:true` means an unborn local `main` with no remote refs: keep `main` for the first commit and skip fetching a nonexistent remote branch. Preserve any selected user branch; inspection failure is an error, never proof of an empty repo. Existing commits or remote refs use the regular feature-branch route. After first publication, new changes branch from the acknowledged `main`. Keep the proposal's recorded branch distinct from its change name.

After the commit, push the selected branch and run:

```text
node .claude/skills/save/scripts/hosted.mjs candidate <full-sha> refs/heads/<branch>
node .claude/skills/save/scripts/hosted.mjs wait <full-sha> refs/heads/<branch>
```

The returned SHA and ref must match. Only `status: passed`, `checks: PASS`, and a reported private preview is `SAVE_GATE_RESULT=SUCCESS`. Failure is `FAILURE`; unreadable, busy or timed-out work is `UNKNOWN` or `TIMEOUT`, never no checks. Fix demonstrated source failures through the ordinary save loop, at most three times. Candidate requests are idempotent; a lost wait can resume without publishing. Report the service's URL and status instead of a GitHub PR. Keep the usual plan link and closing question.

## Publish approved work

`/ship` keeps its task completion, strict validation, delta reconciliation and archive steps, then runs `/save` on the finished archive. No GitHub release numbering or PR merge is needed for an installed hosted project. Require a passing exact commit and the same preview; an unknown or failed check stops publication. Walk the reported private preview through the cloud login. Evidence stays with the change and is checkpointed through `/save`; private login blocks remain unverified.

Only `/ship` or a person's explicit publish instruction permits these calls:

```text
node .claude/skills/save/scripts/hosted.mjs approve <full-sha> refs/heads/<branch>
node .claude/skills/save/scripts/hosted.mjs publish <returned-approval-id> <full-sha>
```

The service requires the current owner, successful exact checks and preview, unchanged authoritative branch head, and the same production base. The service must acknowledge the approved commit on the default ref before reporting complete publication. A divergent default branch stops advancement; uncertainty retains the publication reservation and preserved branch. It publishes the stored checked bytes without rebuilding. A changed head, outdated base or uncertain deployment is a stop; never bypass it or retry an uncertain publication. Read `status` to inspect recovery. Publication success must identify the approved SHA, version, and independently verified default-ref SHA. Fetch the repository afterward and fast-forward its default branch only after that acknowledgment, preserving local work. Hosted publication is the deployment gate; it does not require a GitHub merge.

## Build, resume and verify

`/apply` keeps planning and implementation inline or in its helper. At its preview boundary, run `/save` and use the remote candidate preview instead of `cf-preview.sh`; checks and builds run remotely. Do not publish during apply.

`/continue` resolves changes from proposals and remote Git branches, keeping its dirty-workspace protections and memory recap. A hosted change has a recorded branch and service status instead of a PR; fetch and check out that branch with Git. A GitHub PR handle is only valid for the personal route. Then invoke `/apply` normally.

`/verify` scouts the chosen change's scenarios, saves, and uses the exact passing candidate's reported preview. Request and browser probes go through authenticated cloud routes. Keep the ordinary SUCCESS/FAILURE/UNKNOWN/TIMEOUT evidence grading and bounded fixes; no customer Cloudflare service-token minting or GitHub comments. Store evidence alongside the change, checkpoint it, and return its path and deployed identity. A machine test alone does not prove human login or removal.

## Migration and removal

The cloud's explicit migration copies all advertised refs and verifies object identities in an independent restored mirror before changing the working origin or backend record. Existing work stays in place, and `github-backup` keeps the original remote. A mismatch reports failure and leaves the original working origin selected. An interrupted copy can resume only if every destination ref agrees with the source. The old GitHub repository is retained; export does not include service membership, approvals or secret settings.

Reconnect refreshes scoped access without replacing work. Cloud removal revokes hosted service and repository grants; incomplete provider revocation remains pending. Memory removal is a separate explicit installation-owner operation; report it independently and never claim the cloud action revoked it. Old server agents must be rebuilt to contract 3 before receiving Artifacts jobs. Existing GitHub and personal hosting routes remain supported.
