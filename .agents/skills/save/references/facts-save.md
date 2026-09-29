# Facts-only save

Load only when the session produced facts and changed no repo file.

A conversation alone gets facts under a topic slug, not an empty OpenSpec change. A to-do that changed no repo file gets one `thread` fact — what is done, what is next, any blocker — so `/continue` can resume it. Write them by [save's capture rules](../SKILL.md#2-maintain-the-handoff-and-capture-context) and [credential exclusion](../SKILL.md#1-protect-credentials-and-select-the-route).

Facts go to the memory store, so there is no diff: make no commit, branch, or pull request. Report the facts in one line and stop.
