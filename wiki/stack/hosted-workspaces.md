# Hosted workspaces

WongStack Cloud prepares a private repository and AI entry point; `/wong-setup` installs the assistant, site and memory. Your own computer uses the same command with your own hosting. Back to [the stack](README.md).

## Detect the route first

Before GitHub authentication, Cloudflare tokens, repository discovery or a local preview upload, run the installed `.claude/skills/save/scripts/hosted.mjs context` from the target folder. During a first setup, run that file from the verified source checkout instead. `{"hosted":false}` selects the personal workflow. An error stops: unavailable hosted access must never become a personal install. A prepared empty clone holds its context in Git's common directory, so linked workspaces resolve it too.

Hosted context reports the project, role, original source repository and exact source commit without a credential. Preparation installs the source's `/wong-setup` globally for Claude and Codex; no payload, site or memory is created until the person sends that command. No GitHub login or customer Cloudflare token is required for this route.

## Finish setup

Use the prepared folder as the target and the recorded, verified source checkout. Preserve any existing work; an installed migration first plans hosted configuration; source updates still use `/wong-sync` and the recorded source. A prepared migration with files needs a plan adapting those files. For an installed migration, run `node <source>/server/prepare-hosted.mjs configure` in apply to provision hosted infrastructure and return its trusted settings. Adapt `app/wrangler.jsonc`, add the hosted client when absent, and update only the installation record’s hosted and service-memory fields. Preserve local app code, skill names, source fields, former memory settings and stored facts; any memory transition needs a separate installation-owner plan. A memory store is independent of cloud membership. This is the same setup flow, never a silent continuation of the former personal hosting.

The same explore, plan and apply steps describe a fresh install. In apply, invoke `node <source>/server/prepare-hosted.mjs install` in the prepared folder. It copies the whole payload, links `.claude` and `.codex`, writes the install record and trusted app configuration, and creates pending owner/device memory enrollment. Report the returned private enrollment action and pending status; memory is ready only when enrollment completes. It leaves the work uncommitted. `/save` creates the first remote checks and private preview; only `/ship` publishes it.

The setup response's private settings and the scoped service token go directly into the ignored primary-workspace `.env`, with mode 0600. Setup prints only the nonsecret configuration and install record. The bootstrap credential helper requests fresh 30-minute Git grants for the exact repository URL and path. It supplies a token only through Git's credential protocol. Neither customer builds nor repository files receive platform deployment authority.

## Save and check

Keep `/save`'s credential protection, plan selection, handoff upkeep, spec reconciliation, facts, review generation, intended-path staging and commit steps. Hosted preconditions check the context, origin and OpenSpec, omitting `gh`. A fresh empty repository can create its first branch without an existing `main`; afterward fetch the remote branches normally. Keep the proposal's recorded branch distinct from its change name.

After the commit, push the selected branch and run:

```text
node .claude/skills/save/scripts/hosted.mjs candidate <full-sha> refs/heads/<branch>
node .claude/skills/save/scripts/hosted.mjs wait <full-sha> refs/heads/<branch>
```

The returned SHA and ref must match. Only `passed` with all successful checks and a reported private preview is `SAVE_GATE_RESULT=SUCCESS`. Failure is `FAILURE`; unreadable, busy or timed-out work is `UNKNOWN` or `TIMEOUT`, never no checks. Fix demonstrated source failures through the ordinary save loop, at most three times. Candidate requests are idempotent; a lost wait can resume without publishing. Report the service's URL and status instead of a GitHub PR. Keep the usual plan link and closing question.

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
