# Latest WongStack source

Use the install record's `upstream.repo`, else `https://github.com/matthewwong525/WongStack`. The usual cache is `${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack`; `upstream.clone` is a hint.

Get a clean checkout of the upstream's current default branch. Clone when absent; otherwise check the cache's remote, then fetch and fast-forward it when clean. If the cache holds local work, tracks another upstream, or cannot fast-forward, use a separate fresh checkout. Never reset or discard local work. The target repo must not be the source checkout.

Read `VERSION` and `CHANGELOG.md`, and record the commit. If retrieval fails, report it; never call a stale cache the latest. Prepare only the source here: target Git changes belong to the normal workflow.

This checkout is the preflight helper's trust boundary. Resolve its root, require the helper under its `.claude/skills/wong-sync/scripts/`, and run it only after the refresh succeeds: the helper fetches nothing, so it cannot make a stale checkout current. Report refresh time apart from the helper's preflight time.
