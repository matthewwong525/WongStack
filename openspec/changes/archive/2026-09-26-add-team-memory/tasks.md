## 1. Memory Worker

- [x] 1.1 Write `.agents/skills/memory/worker/memory-worker.mjs`: look up the key hash in `wong-memory-keys`, check that the path's database and bucket match the key's repo, and answer the D1 query and R2 object requests on the matching binding, per design decisions 1 and 2 and review.html#/member-access/worker
- [x] 1.2 Enforce transcript access: a `member` key only under `sessions/<its email>/`, and anything else gets 403 `not_author`; an `admin` key reads its whole bucket, per review.html#/member-access/transcripts
- [x] 1.3 Add the `wong-memory-keys` migration
- [x] 1.4 Test the fetch handler with fake bindings: an unknown key gets 401, another repo's store gets 403, a batch returns Cloudflare's shape, member own-prefix PUT and GET pass, another person's key and an old key get 403 for a member, and an admin reads them

## 2. Memory script

- [x] 2.1 In `lib/store.mjs`, pick the base URL (`WONG_MEMORY_API`, then `components.memory.worker`, then the Cloudflare API), and turn a `not_author` 403 into the author-only message
- [x] 2.2 In `memory.mjs`, upload new transcripts to `sessions/<email>/<agent>/<session-id>.jsonl`, with the email read from the key
- [x] 2.3 Add `worker deploy`: create the keys database when missing, merge this repo's bindings with the existing ones, upload the module, turn on `workers.dev`, and record the URL. Check whether `keep_bindings` can replace the merge, and whether bindings per Worker have a limit
- [x] 2.4 Add `member add|remove|list`, with `--admin`, the key printed once, `components.memory.team` set by the first member, and the missing permission named on a Cloudflare 403
- [x] 2.5 Add the personal-fact filter to the digest (`lib/digest.mjs`) and to search, with the person's emails read from their `wiki/people/` page, and add `search --everyone`
- [x] 2.6 Test Worker routing through the fake store, the author-keyed upload, the author-only message, the filter on and off, two emails from a people page, `--everyone`, and `worker deploy` and `member` against a fake Workers and D1 API, including a merge that keeps another repo's bindings

## 3. Setup and sync

- [x] 3.1 Update provisioning step 4b in `.agents/skills/wong-setup/references/cloudflare.md`: run `worker deploy`, run `migrate` with the user token, run `member add <git email> --admin --env`, and mint no memory token. Update the R2-later and re-run paths
- [x] 3.2 Update the teardown runbook in `wiki/stack/` to detach this repo, and to delete the Worker and keys database only when no other repo is attached
- [x] 3.3 Add the move step to `/wong-sync` (`.agents/skills/wong-sync/`): deploy or attach, add the admin key, check a digest query through the Worker, then replace `.env` and delete the old token. Tell the admin that teammates need member keys
- [x] 3.4 Add the Worker module and migration to the payload manifest (`payload-files.json` and `payload-manifest.md`) if the memory skill entry does not already cover them

## 4. Docs

- [x] 4.1 Update `wiki/development/memory.md`: memory keys, the shared Worker, who can read what, how to add and remove a teammate, and the accepted risks. Replace the line that says every token holder reads every transcript
- [x] 4.2 Update the memory skill (`.agents/skills/memory/SKILL.md`) with the `member` and `worker` commands and `--everyone`
- [x] 4.3 Update `SECURITY.md`: the memory key replaces the memory token, and the CI deploy token's reach is recorded

## 5. Release

- [x] 5.1 Bump `VERSION` to 21.0.0 and add the `CHANGELOG.md` entry, with the move steps for existing installs
- [x] 5.2 Run the payload link check and the script tests, then pass CI through `/save`
