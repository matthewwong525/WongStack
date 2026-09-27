# Tasks

## 1. The token link

- [x] 1.1 Find the template keys for `API Tokens Write` (user) and `Account API Tokens Write` (account): build the URL, open it signed in to a real Cloudflare account, and confirm the form shows exactly those two rows with Edit, all accounts, and the name `WongStack`. Add a *Key* column to *What the user grants* in `.agents/skills/wong-setup/references/permission-groups.md`.
- [x] 1.2 In `wiki/stack/cloudflare-credentials.md`, lead *Create the token* with the link: open it, check the two rows, Create, copy (shown once). Keep the click path below it as the fallback, with the Account Resources callout; keep the heading text.
- [x] 1.3 In `scripts/tests/provision.test.mjs`, decode the link from the credentials page and assert the two keys from the table, `type: edit`, `accountId=*`, `zoneId=all`, and `name=WongStack`; run it with `TMPDIR=/var/tmp`.

## 2. Setup skill

- [x] 2.1 In `.agents/skills/wong-setup/SKILL.md` (*Get the Cloudflare token*) and `references/cloudflare.md` (the token ask), give the link from the credentials page first and the click path as fallback, linking that page rather than copying the URL.
- [x] 2.2 In `references/tools.md`, add a short Paseo check after the tools: `command -v paseo`; missing → one plain sentence on what it's for with the paseo.sh link, then continue; never install it, never stop.
- [x] 2.3 In `references/cloudflare.md` Step 5, add the phone line when Paseo is present: *Settings → your host → Pair Device*.

## 3. README and wiki

- [x] 3.1 Rewrite the README's *Start in three steps*: 1 get Claude Code or Codex (their own install pages) and the Paseo app; 2 open an empty folder in Paseo and paste `Install WongStack in this folder from github.com/matthewwong525/WongStack`, with the agent line carrying the raw `wong-setup/SKILL.md` address; 3 answer a few questions, with the GitHub code and the Cloudflare link. Rewrite *Where you chat* with Paseo first and no Claude desktop app. Verify `node --test scripts/tests/downstream-contract.test.mjs` passes.
- [x] 3.2 Trim `wiki/stack/getting-started.md`: link the README's steps at the top, drop the repeated steps, and update the manual-steps list and *When something goes wrong* for the link. Keep every heading another page links to.
- [x] 3.3 In `wiki/development/required-tools.md`, say Paseo is where you chat and setup points to it, and that WongStack still never installs it on your computer.

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Installing WongStack is easy` entry to `CHANGELOG.md`, with no hand step in its **Updating.** note.
- [x] 4.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`; `/save` runs the full gate in CI.
