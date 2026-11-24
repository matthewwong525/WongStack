---
name: page
description: Make an HTML page (chart, tool, report) for the inbox and share it with the team.
user-invocable: true
---

# /page

Put one HTML page in the person's inbox as a [plain page](../../../wiki/development/plain-pages.md#a-plain-page); one that wants an answer is a [review page](../../../wiki/review-pages.md). Share only when asked.

Write `.scratch/pages/<name>/index.html` and its files. Run `node "$(git rev-parse --show-toplevel)/.claude/skills/page/scripts/page.mjs" .scratch/pages/<name> --title "<title>" [--share]`, adding `--id` to change a page, and do what it says. Print its links.
