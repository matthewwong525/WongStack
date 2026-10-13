# Tasks

## 1. The Shop script (`.agents/skills/shop/`)

- [x] 1.1 Write `scripts/shop.mjs` with `install` by the design (version and integrity in one constant, `fetch`, SHA-512 check before unpacking, `~/.wong-stack/shop/<version>/`, `SHOP_NEEDS=install` exit 3, `SHOP_NEEDS=node` outside the engines, the command run by path, never PATH); verify `scripts/tests/shop.test.mjs` covers needs-install, a mismatch that installs nothing, and the Node range, against a stand-in tarball.
- [x] 1.2 Add the allow-list pass-through, `guide`, and each refusal with its `SHOP_REFUSED=` line, and set `SHOP_AUTH_FILE` on POSIX; verify the tests cover every allowed and refused row of the design's table, an unknown subcommand, and the sign-in path, against a stand-in command that records argv, env, and stdin.
- [x] 1.3 Add instrument masking on every JSON result and the kept file (0600, replaced per checkout, removed after a day); verify by test that a canned credential appears in no stdout or stderr, that the masked entry keeps `n`, `id`, `type`, `display`, and `selected`, and that `--format md` is refused on checkout commands.
- [x] 1.4 Add `pay` by the design: one read, the status and total check, one completion with the entry on stdin, one read after an uncertain result, and `SHOP_PAY=completed|changed|unknown|not-completed`; verify the tests cover each result, that exactly one completion is ever sent, and that the entry is in no argv.
- [x] 1.5 Write `SKILL.md` as `browser`'s is (`hidden`, `disable-model-invocation`, the script's commands, a link to the wiki page); verify `node scripts/measure-context.mjs --check` passes.
- [x] 1.6 Add the script to `scripts/tests/cli-conventions.test.mjs` if that test lists scripts by name; verify the script suite passes.

## 2. Dependencies and setup

- [x] 2.1 Teach `.agents/skills/update-dependencies/scripts/update.mjs` to read the Shop pin from `shop.mjs` and survey it, never moving it; verify its test covers reading the pin and a repo without the file.
- [x] 2.2 Add one line to `.agents/skills/wong-setup/references/tools.md`: setup never offers Shop's command, the first shopping request asks; verify it links the install section and `measure-context.mjs --check` still passes.

## 3. Docs (`wiki/`, `AGENTS.md`)

- [x] 3.1 Write `wiki/development/shopping.md` by the design's list: Shop first, reading Shop's guide and where this page wins, connecting on a yes, the pay question with one example, the checkout link, what ends without a second try, what Shop learns, where things are kept and how to remove them, and what is untried (Windows); verify the wiki checks pass and each command on the page runs as written against the stand-in.
- [x] 3.2 Link the page from `wiki/development/README.md` under Browsing; verify the hub-coverage check passes.
- [x] 3.3 Add Shop's command to `wiki/development/required-tools.md`: the first-use sentence, a table row, and an *Installing Shop's command* section (size, folder, the Node range, the fingerprint, how to remove it); verify the page stays under 3,000 words.
- [x] 3.4 Add `[buying](wiki/development/shopping.md)` to the browsing rule in the `WONG-STACK` block of `AGENTS.md`; verify `measure-context.mjs --check` passes and start-up words stay under the ceiling.

## 4. Payload wiring

- [x] 4.1 Add `shop` to `core.skillDirs` in `.agents/skills/wong-sync/references/payload-files.json` and name it in the payload manifest's Core line; verify `node scripts/check-payload-links.mjs` passes.
- [x] 4.2 Add a `shopping` area to `.agents/skills/memory/references/areas.json` (the skill folder, the wiki page, the new spec); verify `memory-areas.test.mjs` passes.

## 5. Release

- [x] 5.1 Add the `## Next (minor) — Buy through Shop` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: nothing is installed by the update, the first shopping request asks, and connecting Shop is optional; verify the entry names no file or command the person need not type.

## 6. Verification

- [x] 6.1 On this machine, run `shop.mjs install` against the real registry, then one anonymous search, `guide`, and each refusal; verify real products return, the install folder holds only the pinned version, and no file appears in the repo.
- [x] 6.2 Check whether the command has a setting that drops the harness name from its `User-Agent`; set it in `shop.mjs` if so, and write what Shop learns on the wiki page either way.
- [x] 6.3 Ask the owner, the shared way, to connect his Shop account and buy one small item he picks. On a yes: connect, create the checkout, record the field names (never values) of one live saved-payment entry in the design, widen the mask's allow-list if the card can't be named, ask the pay question, and run `pay` once; verify the order shows in `order search`. On a no: record connecting and paying as untried on the wiki page and as an open thread in memory.
- [x] 6.4 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate "buy-through-shop" --strict --no-interactive`; verify both pass.
