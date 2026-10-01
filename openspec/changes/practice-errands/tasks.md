# Tasks

## 1. The practice shop

- [x] 1.1 Create `scripts/practice/shop.mjs`: one server on two loopback origins (shop and card box), with login plus code step, products (one sold out), cart, checkout (email, terms, pre-ticked add-on, unticked newsletter), the card box frame, the bank code step, confirmation, the *Verify you are human* page, and the "text message" endpoint for the code. Write a JSON-lines order log per run. Verify with `scripts/tests/practice-shop.test.mjs`: a `playwright-core` walk with `4242 4242 4242 4242` logs the right order, `4000 0000 0000 0002` is declined, the card frame's origin differs from the shop's, and a wrong bank code fails.
- [x] 1.2 Confirm `scripts/practice/` is absent from `payload-files.json` and add a one-line exclusion note to `payload-manifest.md`. Verify `node scripts/check-payload-links.mjs` passes.

## 2. The runner and the stand-in

- [x] 2.1 Spike: run one `@anthropic-ai/claude-agent-sdk` `query()` in a throwaway worktree with project settings and persistence off; check that `canUseTool` can answer `AskUserQuestion`, and whether `agent-browser auth save` with `AGENT_BROWSER_NAMESPACE` set writes outside `~/.agent-browser/auth/`. Record both answers in the design's decisions; switch to the `claude -p --resume` fallback or the named-login cleanup if needed.
- [x] 2.2 Add `@anthropic-ai/claude-agent-sdk` to `scripts/tests/package.json` devDependencies and create `scripts/practice/run.mjs`: per errand, a throwaway worktree, an isolated agent-browser namespace, session, and temp profile, `WONG_MEMORY_RUN=1`, the practice login saved and removed in a `finally`, a cost and time cap, streamed messages kept as the transcript, and `--only <errand>`. Verify against a fake `query()` in `scripts/tests/practice-run.test.mjs` that the worktree, env, login, and shop are cleaned up on success, on a thrown error, and on timeout, and that no `close --all` is ever run.
- [x] 2.3 Create `scripts/practice/person.mjs` and `scripts/practice/errands.json` with the five first errands from the design. The stand-in answers questions from the brief and works a hand-over link at 390×844 through *Fill fields* and *Other typing*. Verify in `scripts/tests/practice-person.test.mjs` with sample questions (ready, a choice, an unmatched one) and a real local hand-over on the practice shop that completes the card step through the hand-over page.

## 3. The grader and the report

- [x] 3.1 Create `scripts/practice/grade.mjs` with the named checks from the design, each returning pass or fail and its evidence line. Verify in `scripts/tests/practice-grade.test.mjs` with hand-written transcripts and order logs: each check passes on a good one and fails on its matching bad one (link before *ready*, card number in a tool input, add-on left on, an order on a read-only errand, a substitute, a bypass flag), and grading twice gives identical output.
- [x] 3.2 Add results keeping and the report to `run.mjs`: one line per errand in `~/.wong-stack/practice/results.jsonl`, transcripts and order logs in a dated folder beside it, and the better/worse/same/new comparison with failed checks and transcript paths. Verify with fixture result files in `practice-run.test.mjs`.

## 4. Docs

- [x] 4.1 Write `wiki/maintaining/practice-errands.md`: what the practice shop is, how to run all errands or one, what a run costs, how to read the report, and how to add an errand. Link it from `wiki/maintaining/README.md`. Verify `node scripts/check-payload-links.mjs` passes.

## 5. Practice runs and real errands

- [x] 5.1 Run every practice errand once and show the person the report. Verify the report prints and every failed check has a transcript.
- [x] 5.2 Fix what the run found in `.agents/skills/hand-over/`, `.agents/skills/browser/`, or `wiki/development/browsing.md`, each with its own test; add a `browser-logins` delta for any behavior change; split a fix too big for this change into its own plan, with the person's yes. Rerun the affected errands. Verify the report shows them better and no other worse.
- [ ] 5.3 With the person, after a *ready?* in chat each time (outward): an Uber Eats order through Cloudflare's browser with the login carried in; their phone's autofill on a card field list; swiping the hand-over page on their iPhone. The person taps Pay. Verify by their report in chat, and close or update memory threads #562, #456, and #530.
- [ ] 5.4 Fix what the real errands found, as in 5.2. Verify each fix's test and a rerun of the practice errands.

## 6. Release

- [ ] 6.1 If any shipped file changed, add a `## Next (minor)` CHANGELOG entry in plain words naming what users get, and leave VERSION alone. Verify `node scripts/check-openspec-config.mjs` and `node scripts/measure-context.mjs --check` pass.
- [ ] 6.2 Validate with `openspec validate practice-errands --strict --no-interactive`, rebuild `review.html`, and leave the CI tests to `/save`. Verify the page is current and CI passes.
