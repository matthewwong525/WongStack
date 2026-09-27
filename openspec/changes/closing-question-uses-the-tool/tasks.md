# Tasks

## 1. Ask convention

- [x] 1.1 In `.agents/skills/explore/references/asking-the-user.md`, *End every reply with the next step*, add a line that the next-step question is an ask like any other: it goes through the first callable tool in *Which tool carries it*, with the report and any review link written as chat text before it. Verify by reading the section: it names *Which tool carries it* by link and says numbered chat only when no tool is callable.
- [x] 1.2 Reword the finished-plan example in the same section so the *Click here to see the plan:* link is chat text and build it now *(Recommended)* / change the plan first / stop here is the question. Verify that no example in the section reads as a numbered list to type.

- [x] 1.3 Add a *Print the plan's link* section to the same page: whenever a reply makes or changes a plan, whatever skill made it and even when work continues, print *Click here to see the plan:* with a Markdown link to `review.html` on its own line, just above any question and outside the tool. Point the finished-plan example at it. Verify the section names every plan source in the spec's requirement.
- [x] 1.4 In `.agents/skills/plan/SKILL.md` *Finish*, replace the *Click here to see the plan:* wording with a link to the new section. Verify `grep -rn "Click here to see the plan" .agents` finds only the shared page.

## 2. Always-loaded rule

- [x] 2.1 Add one `WONG-STACK` block line to `AGENTS.md`: print the plan's link whenever you make or change a plan, linking the new section. Verify the line sits inside the block markers and `node scripts/check-payload-links.mjs` resolves its link.

## 3. Release

- [x] 3.1 Bump `VERSION` to 25.11.0 and add a newest-first `CHANGELOG.md` entry with an **Updating** line saying `/wong-sync` brings it and nothing needs migrating. Verify `VERSION` and the top `CHANGELOG.md` heading agree.
- [x] 3.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `openspec validate closing-question-uses-the-tool --strict --no-interactive`; verify each passes. If `origin/main` already has 25.11.0 by then, take the next minor.
- [ ] 3.3 Checkpoint with `/save` and verify CI passes on the pull request.
