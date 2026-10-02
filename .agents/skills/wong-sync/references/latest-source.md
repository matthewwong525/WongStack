# Latest WongStack source

Use the install record's `upstream.repo`; for fresh setup use the explicitly requested repository, else `https://github.com/matthewwong525/WongStack`. An existing record wins over a new setup request. The usual cache is `${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack`; `upstream.clone` is a hint.

Get a clean checkout of that repository's current default branch. Clone when absent; otherwise check its remote, then fetch and fast-forward when clean. Local work, another remote, or failed fast-forward → separate fresh checkout. Never reset, rewrite a remote, or discard work. Keep source and target separate.

Read its `VERSION` and `CHANGELOG.md` and record the commit. Retrieval failure stops: never substitute another repository or call stale content latest. Target changes belong to the normal workflow.

This checkout is the preflight helper's trust boundary. Resolve its root, require the helper under its `.claude/skills/wong-sync/scripts/`, and run it only after the refresh succeeds: the helper fetches nothing, so it cannot make a stale checkout current. Report refresh time apart from the helper's preflight time.
