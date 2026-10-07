# Tasks

Build sections 1–4 together, authoring each group's tests and docs beside its code. Run nothing between tasks: no tests, no `/save`. The boxes in 1–4 are checked by source review; section 5 is the one gate.

## 1. Shared helpers (hand-over scripts)

- [x] 1.1 Move `freePort`, `hasCloudflared`, `startTunnel`, `tunnelOrigin`, `linkAnswers`, `killTunnel`, `alive`, and `keyMatches` from `.agents/skills/hand-over/scripts/hand-over.mjs` to `scripts/lib/tunnel.mjs`, taking the log and config paths as arguments ([design 1](design.md)); `hand-over.mjs` imports them and re-exports the ones its tests import. Verify by source review that no behavior changed and `hand-over.test.mjs` needs no new expectation.
- [x] 1.2 Move the `paseo send` call to `scripts/lib/wake.mjs` as `wakeChat(target, message)` returning `notified | unconfirmed | unavailable`; `notifyWorkspace` becomes a thin caller that still builds `completionMessage`. Author a unit test with a fake `paseo` for each of the three results.

## 2. The reply link (hand-over scripts)

- [x] 2.1 Write `.agents/skills/hand-over/scripts/reply-link.mjs` with `open <file> --header <line> [--hours N]`, `close <file>`, `list`, and the exported `openReplyLink()` ([design 2, 6, 7](design.md)): registrations under `~/.wong-stack/reply-link/pages/`, one shared tunnel and detached server, the outside probe before printing `REPLY_LINK=<url>`, and `REPLY_LINK=none` with `REPLY_REASON=` when no chat can be woken, `cloudflared` is missing, the tunnel is down, or `REPLY_LINK=off`. Verify by tests with a fake tunnel origin: a second `open` of another file starts no second tunnel; re-opening a file keeps its link and moves its deadline; each `none` reason exits 0 in under a second.
- [x] 2.2 Write the server's routes ([design 3, 4](design.md)): the file read from disk per request, keyed `alive` and `send`, the fixed header, the 20,000-character and 5-second bounds, 410 and the closed page for an unknown or expired id, the response headers, no logging, and exit with tunnel kill once no registration is unexpired. Author tests: a send with the key wakes the registered target with header plus text; no key is 403; an oversized or too-soon send is refused; an expired page is 410 and wakes nothing; an unconfirmed wake answers 502; a rebuilt file shows at the same address; the server exits when the last page expires.
- [x] 2.3 Author a test that an open hand-over link and an open reply link never touch each other's state: each opens while the other is open ([spec](specs/reply-links/spec.md)).

## 3. The review page and its builder (plan skill)

- [x] 3.1 In `.agents/skills/plan/references/review-kit.html`, add the live path ([design 5](design.md)): read `#key=` at an `http(s)` origin, ask `alive`, label the bar button *Send notes*, post unsent notes' bullets, mark them *Sent* on pins and rows, stop copying on save while live, and on a failed send copy and toast the closed-link line, then act as a file page. Keep every line inline and fetch nothing else. Extend `scripts/tests/review-browser.test.mjs`: from disk nothing changed; on a fake live origin two notes send once and a second tap sends nothing; a 410 copies and marks nothing sent; `#/why` still jumps with a key in the fragment.
- [x] 3.2 Add `--link` to `.agents/skills/plan/scripts/build-review.mjs` ([design 6](design.md)): the CLI calls `openReplyLink()` with the plan's header line and prints the link line with the live address, else the file path; `buildReview()` stays pure. Extend `scripts/tests/review.test.mjs`: without `--link` the output is byte-identical to today; with it and `REPLY_LINK=off` the file path prints; with a stubbed link the live address prints in the same line format.
- [x] 3.3 Pass `--link` in `/plan`'s build command and in each other place that prints a plan link (find them with `memory.mjs areas .agents/skills/plan/scripts/build-review.mjs` and a search for `build-review.mjs`); leave page-refresh-only runs without it. Verify by listing each caller and its choice in the save report.

## 4. Skill text, docs, and the release

- [x] 4.1 Write `wiki/development/reply-links.md`: what a reply link is, the 8 hours, *new link*, the fallback, the page-side contract with a short snippet for another page's *Submit*, and what never goes through one (a secret). Link it from `wiki/development/README.md`, from the private-link section of `wiki/development/browsing.md`, and from `hand-over/SKILL.md`. Verify with `node scripts/check-payload-links.mjs`.
- [x] 4.2 Update `plan/SKILL.md` (the command's flag; sent notes arrive as pasted notes do) and `explore/references/asking-the-user.md` (the link is the reply link when open, else the file; *new link*), cutting as many words as are added. Verify with `node scripts/measure-context.mjs --check`.
- [x] 4.3 Name `openspec/specs/reply-links/spec.md` in `.agents/skills/memory/references/areas.json` under the browser area and add `reply-link.mjs` to the payload file list if scripts are listed singly. Verify that `scripts/tests/memory-areas.test.mjs` would find the spec.
- [x] 4.4 Add the `## Next (minor) — …` entry to `CHANGELOG.md` in plain words, with an **Updating.** note: nothing to do by hand; plans made before the update keep *Copy notes* until rebuilt; WongOS's mail page can now open the same way. Verify that `VERSION` is unchanged.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate send-notes-to-chat --strict --no-interactive`; fix what fails.
- [x] 5.2 Walk it for real from this host: build this change's page with `--link`, open the link on a phone, save two notes, tap *Send notes*, and confirm the chat receives them once and builds nothing; then `close` the link and confirm the same tap copies. Record both results in the Decision log.
- [x] 5.3 `/save`, and confirm CI passes.
