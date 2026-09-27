# Latest WongStack source

Use the install record's `upstream.repo`, or `https://github.com/matthewwong525/WongStack` when absent. The usual cache is `${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack`; `upstream.clone` is a hint.

Get a clean checkout of the upstream's current default branch: clone when absent; otherwise check the cache's remote before reuse, then fetch and fast-forward it when clean. If the cache holds local work, targets another upstream, or cannot fast-forward, use a separate fresh checkout. Never reset or discard local work. The target repo must not be the source checkout.

Read `VERSION` and `CHANGELOG.md`, and record the checkout's commit. If retrieval fails, report the error; never call a stale cache the latest version. Only the source is prepared here: target Git changes belong to the normal workflow.

This checkout is the trust boundary for sync's preflight helper. Resolve its root, require the helper under its `.claude/skills/wong-sync/scripts/`, and run it only after refresh succeeds. The helper fetches nothing and takes the clean source root as input, so it cannot make a stale checkout current. Keep source-refresh time separate from the helper's reported preflight time.
