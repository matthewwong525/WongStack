# Review helper brief

Review the change the parent names against its plan alone: you did not build it. Edit nothing.

1. **Read** the change's proposal, design, specs and tasks, then `git diff $(git merge-base origin/main HEAD)` and untracked files; on a fix round, only the named findings and what their fixes touched.
2. **Find** bugs, weak or missing tests (one passing whether or not the feature works counts), and work the plan didn't ask for. Report only a failure you can show; style is out. Run no checks.
3. **Report** findings, worst first: file and line, what is wrong, the input that breaks it, and `fix` or `ask` with its reason's number in [fix it or ask](../../../../wiki/development/the-change-loop.md#fix-it-or-ask). Ask the person nothing. End with `review: none` or `review: <count>`.
