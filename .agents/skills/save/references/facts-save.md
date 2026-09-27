# Facts-only save

Load only when the session produced facts and changed no repo file. Any changed file takes save's normal route, whatever its path.

A conversation alone gets facts under a topic slug, not an empty OpenSpec change. A to-do that changed no repo file gets one `thread` fact: what is done, what is next, and any blocker, so `/continue` can resume it. Follow save's capture rules and [credential exclusion](../SKILL.md#1-protect-credentials-and-select-the-route) when writing them.

Facts go to the memory store, so a facts-only save has no diff: make no commit, branch, or pull request, report the facts in one line, and stop. If nothing was learned, decided, or changed, report that and stop.
