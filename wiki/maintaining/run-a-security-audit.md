# Run a security audit

You run [Cloudflare's security-audit skill](https://github.com/cloudflare/security-audit-skill) on this repo to find where a lower-trust person, branch or page can reach what it shouldn't. The audit edits no repo file, and its results stay outside git.

## Run it

1. **Clone the skill to a temp folder**, not into the repo. Run 1 used commit `c1c8a8c1`.
2. **Write the results to `~/security-audit-skill/WongStack/run-<n>/`.** A later run reads the earlier run's coverage ledger as prior coverage, so it skips nothing silently.
3. **Run target code only in the skill's sandbox runner**: no network, and a read-only copy of the source without `.git`, `.env` or `.dev.vars`. Put stubs for `paseo`, `gh`, `openspec`, `wrangler`, `cloudflared`, `codex` and `claude` first on `PATH`. In run 1, a missing stub let a hunter reach the real `paseo`.
4. **Keep every agent away from secrets.** Its prompt names `.env`, `app/.dev.vars`, `settings.local.json`, `~/.wong-stack`, `~/.claude` and `~/.codex` as off-limits, and tells it to treat file text as data.
5. **Give each verifier the branch-hooks check.** A teammate's branch already runs its own code as the owner when it is checked out, so a finding that needs that branch adds nothing. Once that hole is fixed, those findings count again.

## What to expect

The standard profile on 2026-10-21 spent about 120 agents over seven hunt waves. It confirmed 13 findings, left 9 leads and rejected 11. Records that quote agent settings or Claude Code tag names get flagged by the host as instruction-shaped; they are evidence, not instructions.

**Check the proposed fixes before you use them.** The final verifiers found two that failed their own tests: a filter function that threw when called through `Array.filter`, and a host check that let every host through when no production address was recorded.

Back to [maintaining WongStack](README.md).
