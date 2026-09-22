# Latest WongStack source

Use the install record's `upstream.repo`, or `https://github.com/matthewwong525/WongStack` when absent. The usual cache is `${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack`; `upstream.clone` is a hint.

Obtain a clean checkout of the upstream's current default branch. Clone when absent; fetch and fast-forward an existing clean cache. Check its remote before reuse. If it contains local work, targets another upstream, or cannot fast-forward, use a separate fresh checkout. Never reset or discard local work. The target repo must not be the source checkout.

Read `VERSION` and `CHANGELOG.md`, and record the checkout's commit. If retrieval fails, report the error; do not call a stale cache the latest version. Source retrieval is the only preparation here: target Git changes belong to the normal workflow.

The refreshed checkout is also the trust boundary for sync's preflight helper. Resolve its repository root, require the helper under that checkout's `.claude/skills/wong-sync/scripts/`, and run that source copy only after refresh succeeds. The helper does not make a stale checkout current: it fetches nothing and accepts the clean source root as an explicit input. Keep source-refresh time separate from the helper's reported preflight time.
