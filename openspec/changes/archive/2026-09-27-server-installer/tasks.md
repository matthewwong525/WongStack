# Tasks

## 1. Provisioning script

- [x] 1.1 Write `.agents/skills/wong-setup/scripts/provision.mjs` with the `widen`, `accounts`, `names`, and `provision` exports and subcommands in design.md, porting the tested pieces of wongstack-cloud's `vm/install-wongstack.mjs` (widen, `ensureToken`, `chooseBase`, `database`, `subdomain`) and adding the memory steps, the R2 check and bucket, and the wrangler config built from the fragment. Verify: `node provision.mjs --help` lists the four subcommands.
- [x] 1.2 Write `scripts/tests/provision.test.mjs` with a fake Cloudflare and a fake `gh` covering the cases in design.md's Tests, plus a check that the group constants match both tables in `permission-groups.md`. Verify: the file passes under `node --test`.

## 2. Server installer

- [x] 2.1 Write `server/install-wongstack.mjs`: repo check, `.git/info/exclude` and `.env` first, the payload copy from this clone's `payload-files.json` (with `scaffold.files`), the source's `.env.example`, the hubs, `openspec init`, then `provision.mjs` with the job's account and the first free base, the install record from this clone's `VERSION` and commit, and the commit and push. Keep the job, reason codes, and `jobFolder`/`run` exports. Verify: task 2.2 passes.
- [x] 2.2 Write `scripts/tests/server-install.test.mjs` installing this checkout into a temp repo with a bare `origin`, covering the cases in design.md's Tests and that no token reaches an argument, error, output line, or committed file. Verify: it fails when a `payload-files.json` path is removed from the copy.
- [x] 2.3 Add `server/*.mjs` to `scripts/tests/.c8rc.json` (`src` and `include`) and `server` to the oxlint paths in `.github/workflows/payload.yml`. Verify: coverage stays above the floor in CI, through `/save`.

## 3. Docs and runbook

- [x] 3.1 In `server/README.md`, add the installer's host contract: clone at a commit into `~/.cache/wong-stack/WongStack`, run it as the workspace user, the job on stdin, the last-line codes, the git email it needs, and what it never does. Verify: `node scripts/check-payload-links.mjs` passes.
- [x] 3.2 Rewrite Steps 2 and 4a–4d of `.agents/skills/wong-setup/references/cloudflare.md` to call `provision.mjs`, keeping the account question, the one billable ask, the suffix offer, and the boundaries; point `permission-groups.md` at the script's check. Grep `wong-setup` by hand for any heading anchor it changed, since the link check skips it.
- [x] 3.3 Add a `## Next (minor) — Server installs come from WongStack` entry at the top of `CHANGELOG.md`, with an **Updating** line saying installed repos get nothing new and hosts move to `server/install-wongstack.mjs`.

## 4. Real server test

- [x] 4.1 After `/save` is green, confirm with the person, then make a throwaway Ubuntu 24.04 server, run `server/setup.sh`, clone this branch into `~/.cache/wong-stack/WongStack` as `wong`, and run the installer into a throwaway private GitHub repo. Check the first deploy, the production URL, `memory.mjs digest` through the Worker, and a rerun that prints `done` and changes nothing. Record the R2 error code seen; pin it in 1.2's test.
- [x] 4.2 Delete the server, the GitHub repo, and the test's Workers, databases, bucket, and deploy token, and list what was removed in the change's Decision log.
