## 1. The token variable

- [x] 1.1 Change `.env.example` back to `CLOUDFLARE_API_TOKEN`, keeping the surrounding comment block (the two permission rows and the Account Resources note) intact
- [x] 1.2 Grep the whole payload for `CLOUDFLARE_USER_TOKEN` and confirm no occurrence survives outside historical `CHANGELOG.md` entries
- [x] 1.3 Choose the owning file for the variable name — `wiki/stack/cloudflare-credentials.md` or `wiki/development/secrets.md` — and state the choice in the change's Decision log
- [x] 1.4 Reduce every other mention to a link or a single summarizing sentence naming the owner, per the payload's one-owner rule
- [x] 1.5 Record in the payload that renaming a value the code reads is a behavioural change requiring a version bump, not a docs edit

## 2. The `.gitignore` fragment

- [x] 2.1 Add `.env*` and `!.env.example` to the `.gitignore` fragment in `.claude/skills/wong-sync/references/stack-pack-fragments.md`, alongside the existing `.dev.vars*` pair
- [x] 2.2 Extend the fragment's explanation to cover both files with one rationale rather than two, per the single-source rule
- [x] 2.3 Note in the fragment that applying it to a repo which already committed a `.env` does not untrack that file, and what the applier should say

## 3. The `opsx` claim

- [x] 3.1 Correct `.claude/skills/wong-sync/references/payload-manifest.md` — state what `openspec init` produces at the supported CLI version (the five `openspec-*` skills, not `.claude/commands/opsx/`)
- [x] 3.2 Update the `WONG-STACK` block in `CLAUDE.md` so it stops offering `/opsx:*` as a command surface a fresh repo has; point at the `openspec-*` skills instead
- [x] 3.3 Sweep the payload for any other prose promising `/opsx:*` commands to a target repo

## 4. Verify

- [x] 4.1 Fresh-install into a scratch repo and confirm the token variable in the installed `.env.example` matches what `scripts/cf-secrets.mjs` and `deploy.yml` read
- [x] 4.2 Confirm the applied `.gitignore` fragment covers `.env`, `.env.local`, and `.env.staging` while leaving `.env.example` committable
- [x] 4.3 Confirm no payload file claims a command exists that the fresh install lacks

## 5. Release

- [x] 5.1 Bump `VERSION` (minor — the fragment change alters what a provisioning run does to a target)
- [x] 5.2 Write the `CHANGELOG.md` entry with two things stated prominently: any repo that filled in `.env` from the 9.0.0 template has its token under a name nothing reads and must rename it; and existing repos get the `.gitignore` widening as a `/wong-sync` proposal, not automatically
