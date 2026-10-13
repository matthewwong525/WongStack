# Rule map

Every rule in the scoped files, sorted by [design.md](design.md)'s table before any edit. One section per file, one row per rule.

**Sorts.** `guard`, `script`, `repeat`, and `no cause` are the design's. `incident (on record)` is the second pass's stricter sort: a failure someone saw, or the person's ask, cited by fact number or log line. `step` marks the behavior itself: the file's own procedure, a routing case, a command, a field list, a definition, or a line a caller reads. A step is kept and at most reworded.

**Second pass.** The first sort kept 135 rows as `incident`; for most the only evidence was the release that added the rule. By design.md's "Second pass: a release is not a cause", each was searched again (`memory.mjs search` over feedback and thread facts, `memory.mjs areas`, and the Decision log and Why of every archived proposal) and re-sorted: 38 are `incident (on record)`, 85 are `step`, 11 are `no cause` and dropped, and 1 is a `repeat`. Three rows were split so a dropped clause and a kept one each have a row (Q2b, E26b, W37b). A fresh second reader then checked the new drops alone; it sent back E7 and the "no video" half of W37, both kept as `step`, and a link on A18. A `step` row's Evidence still names the release, which no longer counts as a cause. A rule paired with its wrong turn ("X, not Y", as `wiki/voice.md` asks) is one rule, so the pair stays together.

**After.** `kept as is` (a guard, wording untouched or nearly), `one line` (the goal and its reason), `kept` (a step or a command), `merged → <home>` (a repeat; the home states it, this file links or says nothing), `dropped`.

**Evidence.** For a dropped row, the terms searched and what came back. A release number names the `CHANGELOG.md` entry that introduced the rule (found with `git log -S`), followed by its change name where one exists in `openspec/changes/archive/`. `#n` is a memory fact. "No cause found" means one search of memory, the archive, and the changelog found none.

Headings, frontmatter, code blocks, commands, flags, exit codes, `key=value` lines, and verdict names are unchanged in every file, so no row lists them one by one and no name is retired.

## `.agents/skills/apply/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| A1 | Selected schedule: route its record before code or checkout | step | kept, with the link | `schedule-records.md` owns it |
| A2 | "preserve its store and pending question" | repeat | merged → `save/references/schedule-records.md`, which says "retaining `--store <id>`" and "pending questions block dependent actions" | `schedule-records.md` first paragraph |
| A3 | Resolve by the rungs `explicit`, `session`, `changed-active`, `recorded-branch`, then `sole-active` | repeat | merged → `checkpoint-evidence.md#selection-rungs`, which now says which rungs each verb walks; here one line on the outcome and the link | design.md "A home for each kind of text" |
| A4 | An argument naming no existing change is intent for a new plan | step | kept: a routing case | 26.14.0; spec `apply` "Apply builds the work the person means" |
| A5 | An unrelated `sole-active` never overrides work this conversation explored | incident (on record) | one line: the only open plan is not the answer when the chat explored something else | `openspec/changes/archive/2026-08-08-apply-auto-plan/proposal.md` Why: "a bare apply can auto-select an unrelated active change when the current line of work has no plan" |
| A6 | Unsure → ask, listing what each candidate would implement | no cause | dropped: "Unclear intent → ask before any plan or code" in the same section, and the rungs page ("Several → ask, with them as the options"), cover it; `asking-the-user.md` says a menu "shows the detail the choice needs" | searched memory and the archive for a wrong plan built after no ask: none; 26.14.0 only |
| A7 | Attached review notes → review-note handling on the existing change before readiness; continue the authorized build without another choice | incident (on record) | one line and the link: the person already chose to build | memory #1416 (feedback, 2026-10-08): "it should also be able to select build, and build & publish as well" |
| A8 | "missing plan or blocker stops" (review notes) | repeat | merged → `plan/SKILL.md#review-notes` ("a missing change → report and stop"; "a material blocker stops") | same file section |
| A9 | `applyRequires` routing, four cases | step | kept as the short list | CLI data |
| A10 | `/apply` authorizes planning and building; after `/plan`, verify the `applyRequires` closure; paused/blocked → report and stop; keep its exact name | step | kept | — |
| A11 | At all-tasks-complete, even at invocation, finish with a preview; final acceptance's saved CI preview skips upload | step | kept | — |
| A12 | When `/ship` invoked you, return with no upload and no `/save`; `/ship` archives and makes the one checkpoint | step | kept: a routing case; `/ship` reads the return | 30.10.0 `reuse-checked-revisions` |
| A13 | A fresh helper on the parent's model; the prompt; `store <id>`; the brief owns its work and return | step | kept, with its reason (the build does not carry the planning talk) | 25.12.0 `apply-builds-in-a-helper` |
| A14 | Wait quietly with the longest host wait; timeouts → wait again; read none of its edited files; message only the person's answer or a stop | incident (on record) | one line with the reason: the helper exists so the build does not fill this chat | memory #990 (2,717 parent steps over 61 chats while a helper built); `openspec/changes/archive/2026-09-27-apply-builds-in-a-helper/proposal.md` log: "Asked whether to run a Paseo compact before building or build in a helper → chose build in a helper" |
| A15 | "at most one short line per wait" | no cause | dropped: a count; "don't narrate each wait" in A14 covers it | 31.3.0; no incident names the count |
| A16 | "Follow the brief's final verification phase and log timing changes. Preserve acceptance and explicit early requests; unavailable prerequisites block." | repeat | merged → `build-helper.md` step 2; this file says none of it | design.md worked example |
| A17 | A question → ask in the shared format, log it as `Asked`, start a new helper | step | kept | 25.12.0 |
| A18 | A blocker → report it and stop | step | kept, with the link to the closing ask (A39b) | — |
| A19 | Final acceptance → after the build and its tests are written, run `/save` and the retained live acceptance; tick observed passes; blocked/failed stays unchecked and stops | step | kept: what to do on that report | 30.10.0 |
| A20 | All done → confirm no unticked box, relay the `local checks:` line | step | kept | 31.3.0 |
| A21 | No helper, or inside one → follow the brief inline | step | kept | — |
| A22 | Preview step 1: `app-untouched.sh`; `untouched=true` → skip the upload and say so | script | kept as the command and how to read it | `app-untouched.sh` |
| A23 | Preview step 2: upload with the credential from the primary worktree's `.env`; can't run → say why | script | kept as the command | `cf-preview.sh` |
| A24 | Preview step 3: `loosened-checks.mjs`; fix each *needs a reason* file without asking; rerun until exit 0 | script | kept as the command and how to read it | 25.6.0; `loosened-checks.mjs` |
| A25 | Show the changed screens before the question, on the exact current preview URL, with `/verify`'s plain checks; no scout, save, or PR comment | incident (on record) | one line: show the screens that changed as pictures in the chat, from this exact preview | `openspec/changes/archive/2026-10-08-show-apply-screenshots/proposal.md` log: "Asked: show a couple of screenshots in the chat before the multiple-choice question during /apply → chose that behavior" |
| A26 | "agent-browser, temporary files, existing privacy safeguards and cleanup" | repeat | merged → `verify/SKILL.md#plain-checks` ("Same safeguards/handoff … `cleanup`") | that section |
| A27 | "Prefer two distinct changed screens; a useful state or phone view can supply the second. One meaningful view → one picture." | incident (on record) | one line: "a couple of the screens that changed, one when only one view matters"; how to pick the second stays dropped | `openspec/changes/archive/2026-10-08-show-apply-screenshots/proposal.md` log: "Asked: show a couple of screenshots in the chat" |
| A28 | Open each image with the host image tool, a short plain caption above it; a file link alone is insufficient | step | kept: how the pictures reach the person, with its reason | 38.4.0 (#1451) |
| A29 | No preview, no changed UI, or capture/access failure → say why, keep the link and the choice | step | kept: the fallback when no picture can be shown | 38.4.0 |
| A30 | Never substitute a live page or login screen | no cause | dropped: folded into the goal, as design.md's worked example says: "Show the screens that changed as pictures in the chat … from this exact preview" | searched "login screen", "live page", "wrong page" in memory and the archive: no failure or ask; 38.4.0 only |
| A31 | Report and ask: what was built, any can't-be-undone line, the preview link, each `Check:` bullet, unfixed files; the three options | step | kept | 30.7.0, 25.6.0 |
| A31b | "plus *See the preview* when available" | repeat | merged → `asking-the-user.md#print-the-previews-link` (Q34: "Its closing question offers *See the preview*"), linked from the same step | that section |
| A32 | Repeat under the same alias for further edits; added tasks go to a new helper | step | kept | — |
| A33 | No-repo work: work the numbered to-do in order; reading, searching, drafting need no prompt | step | kept | 26.4.0 |
| A34 | Each outward step shows exactly what it will do and asks; one confirmation, one action, unless a batch was asked for; skip and report a declined step | guard | kept as is | sent message, payment, deletion |
| A35 | Report without `/save`; nothing is committed | step | kept | — |
| A35b | "To stop halfway, the person runs `/save`, which keeps a memory thread for `/continue`" | repeat | merged → `the-change-loop.md#verbs-for-any-work`, linked at the top of the section | that section |
| A36 | Git stays with `/save`: no commit, push, branch, PR, or CI step here; the preview upload is not git and gates nothing | repeat | merged → `the-change-loop.md`; one line and the link here | the loop: "WongStack skills own all git" |
| A37 | Never save to stop or between parts; substantive live acceptance may use `/save`; routine final gates belong to delivery | repeat | merged → `the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task`; one line ("Never save to stop or between parts") and the link here | 24.0.3 |
| A38 | Resuming cold → `/continue <name>` | step | kept | — |
| A39 | Pause on ambiguity or blockers (the proposal is the intent) | no cause | dropped: "Unclear intent → ask before any plan or code", "A question → ask the person", and "A blocker → report it and stop" on the same page cover it; the brief says "Return on a question, blocker" | searched "ambiguity", "guessed intent": none; a 2026-07-25 config commit only (restored after the first second read, dropped by the stricter test) |
| A39b | "ending with the next step: ways to clear it, recommended first" | repeat | merged → `asking-the-user.md#end-every-reply-with-the-next-step` ("Blocked task: the supported ways to clear it") and the shape of an ask (recommended first); the blocker line links it ("ending with the ways to clear it"), a link restored after the second read of this pass | that page |

## `.agents/skills/apply/references/build-helper.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| B1 | Build the named change; its Decision log is the agreed context; the parent handles the person and delivery | step | kept | 25.12.0 |
| B2 | Step 1: `openspec instructions apply`, read every `contextFiles` path, `memory.mjs areas --change`, touched owners and warnings | script | kept as the commands | CLI data |
| B3 | Dated facts defer to the repo | step | kept: how to read the facts the command prints | 30.10.0 |
| B4 | Finish all implementation and test authoring before executing tests or verification | incident (on record) | one line with the reason: checking part by part multiplied a long build's wait | `openspec/changes/archive/2026-10-04-reuse-checked-revisions/proposal.md` Why (21 s of tests and 3 min 15 s of checks per run, repeated per part) and log: "Asked through the employee-setup handoff to stop running tests at every step → chose complete implementation first" |
| B5 | Write tests beside source | step | kept | 30.10.0 |
| B6 | Move existing intermediate test gates into the final phase, preserving acceptance obligations; log the timing change without an approval question | incident (on record) | one line | `openspec/changes/archive/2026-10-04-reuse-checked-revisions/proposal.md` log, same ask: "preserving final required checks and preview without new approval stops" |
| B7 | A substantive unavailable prerequisite is a blocker, never a pass | step | kept: defines a blocker; the home for P25 and L6b | 30.10.0 |
| B8 | Explicit early requests keep their reach through the parent | step | kept: the one exception to build order, and its one home | 30.10.0 ("explicitly asking to save early … keeps its behavior") |
| B9 | Run the local checks once; repair what the change broke and rerun only that, by its last line | script | kept as the command and how to read it | 31.3.0; `checks.mjs` prints the failed part |
| B10 | "three rounds at most" | step | kept: the loop's only stop; no other line bounds the repairs | 31.3.0 `faster-sessions` design; unsure, so kept |
| B11 | Exit 7, or no such command, means nothing ran: say so and go on; a pre-check, never the gate's result | script | kept (exit code) | `checks.mjs` |
| B12 | Tick implementation tasks on source review; do not tick live acceptance without evidence; return final verification to the parent | step | kept | 30.10.0 |
| B13 | Return on a question, blocker, complete implementation, or final live acceptance; name its tasks; never run that gate | step | kept | — |
| B14 | Never ask the person; return the exact question with two or three options, best first | step | kept: how a question travels: the parent holds the conversation | 25.12.0 |
| B15 | Never run git, CI, `/save`, `/ship`, or `/verify`; never upload previews; the parent owns these and the loosened-checks step | repeat | merged → `apply/SKILL.md` Boundaries and the loop; one line here: the parent owns the one checkpoint | 25.12.0 |
| B16 | "run a test before step 3" (in **Never**) | repeat | merged → step 2 of this file (B4); the second copy goes | design.md worked example |
| B17 | Never remove shared caches | guard | kept as is, with what the words already say: it reaches past this change | a deletion outside the change; 30.10.0, no cause found |
| B18 | Never install outside the repo | step | kept: no goal on the page covers it; kept with B17 | 30.10.0; unsure, so kept |
| B19 | Report fields: stop reason; source-complete task numbers; files; `local checks:` line; exact question or blocker; retained final checks | step | kept | 25.12.0, 31.3.0 |
| B20 | "At most ten lines" | no cause | dropped: a count; "a short report" and the field list cover it | 25.12.0; no incident names the count |
| B21 | (new) Don't end the turn while a sub-helper or background check still runs | incident (on record) | added as one line: the parent reads a stop as done | memory #1496 (four times, 2026-09-27 to 2026-10-08) |

## `.agents/skills/explore/references/asking-the-user.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| Q1 | One shape: two or three real options, recommended first, a tradeoff each, room for the user's own words | step | kept | 14.2.0 |
| Q2 | Only *Review the plan* and *See the preview* may add a fourth option | step | kept: the one exception to "two or three real options" | 26.31.0 |
| Q2b | "A confirmation normally has two options" | no cause | dropped: "A confirmation names what happens on each side" in the same page covers it, under the page's "two or three real options" | searched "two options", "confirmation": no failure or ask; 26.31.0 only |
| Q3 | Put `(Recommended)` in the option text itself | step | kept: what the person sees on the recommended option; spec `asking-the-user` promises the label | 14.2.0; unsure, so kept |
| Q4 | A tradeoff says what the user gets and what it costs | step | kept: defines a tradeoff | 14.2.0 |
| Q5 | Custom answer in the tool's own free-text field, never an added Other option; use it as given | step | kept: how the person's own words are carried; the rule paired with its wrong turn | 26.14.0 |
| Q6 | Ask only what changes the result; a credential is a structured free-text question; never invent alternatives | step | kept: the free-text case `/continue` links | 26.14.0 |
| Q7 | Plain words for every plan, question, and report; more detail only when asked; a standing ask goes on the person page, never guessed | incident (on record) | one line | `openspec/changes/archive/2026-09-27-plain-words-for-everyone/proposal.md` log: "by default this should be for non-technical people unless they ask for more details" → chose plain words for everyone |
| Q8 | Name what the person will see, get, lose, or risk; no file path, identifier, command, or engineering term they did not use | incident (on record) | one line | `openspec/changes/archive/2026-09-26-plain-plans-for-everyone/proposal.md` log: "Asked what a non-technical person sees when a check fails → chose: the agent tries to fix it first, and asks only in outcome terms" |
| Q9 | Fix before you ask; never offer a choice that needs judgment the reader lacks | incident (on record) | one line | `openspec/changes/archive/2026-09-26-plain-plans-for-everyone/proposal.md` log, same ask ("tries to fix it first"); memory #1011 (feedback: "if it breaks something old it should fix it") |
| Q10 | Lead a report with the outcome | step | kept: what a report leads with | 25.13.0 |
| Q11 | The person ran the verb: at most one link besides the plan's; leave out branch names, commit ids, the gate line, `merge.sh`'s lines, fact counts unless asked | incident (on record) | one line | `openspec/changes/archive/2026-09-27-plain-words-for-everyone/proposal.md` log, same ask: detail only when asked |
| Q12 | Inside another verb: still print every line the caller reads | step | kept: a caller reads those lines | 25.13.0 |
| Q13 | Tool order: `request_user_input`, `AskUserQuestion`, another host's tool, numbered chat | step | kept | 14.2.0 |
| Q14 | Follow the tool's schema, mode limits, and real capacity; four questions is not a universal limit | no cause | dropped: "Use the first callable tool" covers the tool's own limits, and `/explore`, which owns how many, says "within tool capacity" | searched "four questions", "tool capacity", "schema": none; 16.5.0 `add-structured-asks` only ("Assumed `/explore` keeps its clarification budget") |
| Q15 | A missing named tool moves you down the list, not into non-interactive mode | no cause | dropped: "Use the first callable tool", the list's last entry ("Numbered chat … wait for the answer"), and "Only where nobody can answer, as in an unattended run" cover it | searched "non-interactive", "missing tool", "not callable": no failure or ask; reworded in 25.17.0 from 16.5.0 only |
| Q16 | Only where nobody can answer: take the recommended options, label each assumed, continue | step | kept: the fallback `/explore` links | 26.14.0 |
| Q17 | A question stays pending until answered, however long and whatever is preselected; meanwhile only independent work | step | kept: the only line that makes the assistant wait | 26.14.0 |
| Q18 | A confirmation names what happens on each side, never a bare yes/no | step | kept: defines a confirmation | 16.5.0 |
| Q19 | An offer names the outcome, not the product, and always includes stopping | step | kept: defines an offer | 25.17.0 |
| Q20 | A menu shows the detail the choice needs; never resolve several candidates by guessing | step | kept: defines a menu; the covering goal for A6 | 25.17.0 |
| Q21 | Form, never whether to ask: an authorized action or handoff goes ahead unasked; `/explore`'s limits bound clarification, not a runbook's fork | step | kept: the home for E21 and S30 | 25.17.0 |
| Q22 | Before you finish, ask what the user must decide, through the first callable tool; report and link as chat text first; only two replies end without a question | incident (on record) | one line | `openspec/changes/archive/2026-09-27-closing-question-uses-the-tool/proposal.md` log: "Asked whether to fix the typed 'What next?' menus → chose plan the fix" |
| Q23 | The seven reply endings (explore, plan, blocked, report, recurring task, after a publish, Paseo worktree) | step | kept as the list | — |
| Q24 | *Close this workspace* never at a plan's review, mid-build, or on a blocker | incident (on record) | one line, inside Q23's list | `openspec/changes/archive/2026-09-28-add-close/proposal.md` log: "Asked when the close question appears → chose at the end of any finished work in a Paseo workspace, never mid-plan or mid-build" |
| Q25 | Plan link: print *Click here to see the plan:* and the link as one chat line when a reply makes or changes a plan or its checklist | incident (on record) | one line; stated once, in the section's first paragraph | `openspec/changes/archive/2026-09-27-closing-question-uses-the-tool/proposal.md` log: "Asked (review) whether the plan link should print only in `/plan` → chose a standing rule: every reply that makes or changes a plan prints the link, whatever made it" |
| Q26 | Copied from the page builder, never shortened: the reply link when one opens, else the `review.html` file; on *new link*, rerun the builder | step | kept: how the link line is made | 37.4.0 |
| Q27 | Status, branch, Open questions, and Decision-log lines alone are record-keeping, not a change | step | kept: defines what counts as a change to a plan | 26.4.0 |
| Q28 | Print it even when the build goes on; it adds no stop | incident (on record) | one line, folded into Q25's sentence | `openspec/changes/archive/2026-09-27-closing-question-uses-the-tool/proposal.md` log, same ask: "whatever made it" |
| Q29 | Just above the closing question, never inside it: a tool's card may not make a link clickable | incident (on record) | one line, reason kept | `openspec/changes/archive/2026-09-27-review-the-plan-choice/proposal.md` log: "the person rejected putting the link inside the box, because tapping the box picks an option instead of opening the link" |
| Q30 | The builder's *When you're ready, type `/apply` to build it.* line: copy it only on the *Review the plan* reply; leave it out everywhere else | incident (on record) | one line, said once with Q31 | memory #483 (feedback, 2026-09-29: the line shows only on the *Review the plan* reply, "because elsewhere the closing question already offers Build it now") |
| Q31 | Some hosts hide text above a question card, so any closing question in a reply that made or changed a plan offers *Review the plan*; picking it starts nothing; the next reply ends with the link line, its next-step line, and no question | incident (on record) | one line, reason kept | `openspec/changes/archive/2026-09-27-review-the-plan-choice/proposal.md` log: "the first test said nothing showed above the box"; "Asked how a plan's closing question should carry the link → chose a *Review the plan* option" |
| Q32 | "which ends with no question" said in both the second and third paragraph of the plan-link section | repeat | merged → one sentence in that section | in-file repeat |
| Q33 | Preview link: *Click here to see the preview:* and the full URL of the page showing the change, the home page only when none does | incident (on record) | one line | `openspec/changes/archive/2026-09-28-see-the-preview/proposal.md` log: "Asked for the preview link to open where the change can be seen → chose the page that shows the change, the home page only when none does" |
| Q34 | Its closing question offers *See the preview*, whose reply ends with that line and no question, and starts nothing | incident (on record) | one line | memory #463 (the preview link hid above the closing question); `openspec/changes/archive/2026-09-28-see-the-preview/proposal.md` log: "the person asked for the same fix as the plan's page" |
| Q35 | "Write prose short and plain, in our voice" (last line) | repeat | merged → `AGENTS.md` ("Keep messages short and plain, in our voice"), which every session loads, and `wiki/voice.md` | the always-loaded rule |

## `.agents/skills/explore/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| E1 | Compare options and settle scope before `/plan`; find related work with `openspec list --json` and `openspec context --json` | step | kept | — |
| E2 | Write nothing; `/plan` logs answers | step | kept: what the verb does | 22.0.0 |
| E3 | Explore precedes planning except review-page notes; bounded mode under `/plan` | step | kept | 40.3.0 |
| E4 | Read owning docs and source; trace trigger, result, constraints; for non-code, the process and authoritative sources | step | kept | 30.3.0 `sharpen-explore` |
| E5 | Discover facts; separate observations from inferences | step | kept: how to investigate | 30.3.0 |
| E6 | Use proportional, authorized read-only checks | step | kept: what checks explore may run | 30.3.0 |
| E7 | "no prototypes or local builds" | step | kept: restored after the second read of this pass. "Write nothing" reads as a rule about files, so a throwaway build or spike could pass as a "read-only check"; `openspec/specs/asking-the-user/spec.md` ("Proof requires work outside exploration") names "a prototype, a write" as work explore does not do | no failure or ask on record (`archive/2026-10-04-sharpen-explore/proposal.md` lists it as a non-goal); kept by the lean: unsure between `step` and `no cause` → `step`. Both second readers flagged it |
| E8 | Name unavailable evidence and a later check | step | kept: what to do with a gap | 30.3.0 |
| E9 | For consequential choices, compare viable approaches, outcomes, costs; recommend with evidence | step | kept | 30.3.0 |
| E10 | Invent no alternatives for settled or mechanical requests | no cause | dropped: "For consequential choices, compare viable approaches" sets when to compare; `asking-the-user.md` says "Ask only what changes the result … never invent alternatives" | searched "invented alternatives", "artificial option": none; 30.3.0 only |
| E11 | Before handoff, check material assumptions and failures against the flow; revise contradictions | step | kept: the challenge before handoff | 30.3.0 |
| E12 | "Speculative or cheaply changed concerns need no questions" | incident (on record) | one line, kept as it read | `openspec/changes/archive/2026-10-04-sharpen-explore/proposal.md` log: "the candidate added a payment-related replacement choice beyond the source and settled replacement preference; speculative or cheaply changed concerns must not create questions or reopen settled preferences" |
| E13 | Ask the shared way: two or three related ready choices, one if alone, within tool capacity | step | kept | 30.3.0 |
| E14 | Track decisions and prerequisites in chat | step | kept | 30.3.0 |
| E15 | Investigate missing facts; hold only dependent choices; never ask the person to guess facts | incident (on record) | one line | memory #1335 (thread: twice, 2026-10-04 and 2026-10-06, how-to-build choices offered before the person had a picture; one extra question round each) |
| E16 | Update dependencies after answers or evidence; explain changed premises; reopen only affected decisions; findings in chat, drawn when useful | step | kept | 30.3.0 |
| E17 | The 80/20 test | step | kept: the test itself | 12.4.0 |
| E18 | Before asking, recall the task and look up likely paths once; read cited originals | script | kept as the two commands; "read the originals it cites" stays as a clause | `memory.mjs recall`, `areas` |
| E19 | Treat dated facts as assumptions; memory unavailable → say so and continue | step | kept: how to read memory, and the fallback without it | 30.3.0 |
| E20 | Check other work once; compare intent, not files; overlap, no overlap, a `notes` line; skip if checked or no repo edits | script | kept as the command and how to read it | `other-work.mjs` |
| E21 | "Clarification limits preserve authorization and delivery gates" | repeat | merged → `asking-the-user.md#form-never-whether-to-ask` (Q21) | that section |
| E22 | Exit round: apply 80/20 and tool capacity; ask only ready choices; separate parts → a new workspace each; follow up until none remains | step | kept | 30.3.0 |
| E23 | Never repeat settled choices, nested calls included, except affected ones after changed premises | incident (on record) | one line: a settled choice stays settled; reopen only one a changed premise affects | `openspec/changes/archive/2026-10-04-sharpen-explore/proposal.md` log, the same failure as E12: a settled preference was reopened |
| E24 | Keep unanswered material preferences open, never disguised as assumptions or evidence gaps; preserve authorized defaults and the nobody-can-answer fallback | step | kept: keeps an open choice open; no other line does | 30.3.0 |
| E25 | Use supported minor assumptions with reasons; evidence gaps may remain if an approach is coherent; otherwise name the prerequisite, never guess | no cause | dropped: the 80/20 test ("Assume naming, placement, wording, and cheaply changed details, with reasons") and "Name unavailable evidence and a later check" cover it; the summary still lists "minor assumptions, and evidence limits" | searched "minor assumption", "evidence gap", "guessed": none beyond E15's; 30.3.0 only |
| E26 | Summarize outcome, approach, reasons over a serious alternative, minor assumptions, evidence limits | step | kept: what the summary holds; bounded mode returns it | 30.3.0 |
| E26b | "No extra sign-off: the next-step question is it" | no cause | dropped: "**Standalone:** offer next steps" and "**Bounded:** return by the steps below" say how the round ends; `asking-the-user.md` says "Ask only what changes the result" | searched "sign-off", "looks right": none; 30.3.0 only |
| E27 | Bounded returns by the steps; standalone offers next steps; only *Plan it* starts `/plan` | step | kept | — |
| E28 | Bounded mode's four steps; `/plan` never repeats searches | step | kept | 30.3.0 |

## `.agents/skills/plan/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| P1 | Selected schedule: route its record before code or checkout | step | kept, with the link | — |
| P2 | "preserve its store and pending question" | repeat | merged → `save/references/schedule-records.md` | as A2 |
| P3 | Create an apply-ready change and its `review.html`; no-repo work gets a numbered to-do with `(outward)` marks | step | kept | 26.4.0 |
| P4 | Run `/explore` in bounded mode; log each decision in the two Decision-log line formats | step | kept, formats byte-exact | — |
| P5 | New workspaces chosen → open one per other part, report before drafting, plan only this chat's part | step | kept: a routing case | 40.3.0 |
| P6 | Write every artifact by the CLI contract, in the selected root or store; complete `/apply`'s exact change; if planning blocks, report to `/apply` without implementing | step | kept | — |
| P7 | Before tasks, weigh deterministic code for a repeated process; raise it in the exit round if it changes scope | step | kept: a step before tasks | 13.x (#87) |
| P8 | Testable behavior gets test authoring beside source tasks; prose-only changes do not | step | kept | 30.10.0 |
| P9 | Why and What Changes use plain words; file names, code, commands go in design/specs/tasks; Capabilities and Impact may be technical | incident (on record) | one line | `openspec/changes/archive/2026-09-26-plain-plans-for-everyone/proposal.md` log: "Asked who the plan and its questions are written for → chose the person asking" |
| P10 | Deleting or reshaping data, sending a message, or removing a key gets one line saying it can't be undone; otherwise none | guard | kept as is | 30.7.0 `safer-build-and-publish` |
| P11 | Draw as you write, with no second agent or browser | step | kept: the rule paired with its wrong turn; spec `ux-wireframes` promises "no other agent and no browser" | 22.0.0 |
| P12 | One What Changes bullet carries one drawing by default, plus a sketch of each new or restructured screen; more only where a bullet can not be understood without it | incident (on record) | one line | `openspec/changes/archive/2026-09-15-add-review-html/proposal.md` log: "the user reframed: the What Changes list should be the navigation, and each bullet should open a visual" |
| P13 | Build the page after drafting and after each later edit; copy its three printed lines as is; `--link` makes a reply link | script | kept as the command and how to read it | `build-review.mjs` |
| P14 | Fix warned drawings | script | kept: how to read the result | `build-review.mjs` prints the warning |
| P15 | Keep no other copy of the proposal's text | step | kept: no goal on the page covers it | 25.17.0 |
| P16 | A screen change gets a `## UX` design section; sketch phone work phone-first; UI-less changes omit it | step | kept: what a screen change adds to the plan | 13.0.0 |
| P17 | Review notes: the two opening lines update the existing plan without an explore round; paths from `openspec status`; missing change → report and stop | incident (on record) | one line each; this section is the rule's home | `openspec/changes/archive/2026-09-27-review-notes-stop-at-plan/proposal.md` log: "Asked whether the copied text needs a command at the top → chose plain words: \"Update the plan <name> with these notes…\""; memory #260 |
| P18 | Trust quoted text over spot labels | step | kept: how to read a note | 40.3.0 |
| P19 | Answer question notes without edits or log entries; offer suggested edits only when standalone | step | kept: what a question note gets | 40.3.0 |
| P20 | Apply change notes coherently, logging changes or declines; substantial rewrites follow CLI instructions; validate, create only requested artifacts, rebuild, print the link | step | kept: what a change note gets | 40.3.0 |
| P21 | Notes alone finish without building; with a build or publish choice, return to `/apply` or `/ship` and go on without another choice; a material blocker stops | incident (on record) | one line | memory #1416 (feedback, 2026-10-08): "it should also be able to select build, and build & publish as well" |
| P22 | Finish: group source and test authoring by surface; complete all implementation before automatic tests or remote checks; required checks in a final verification phase, not per-part `/save` tasks | incident (on record) | one line; the task layout's home, with a link to the why | `openspec/changes/archive/2026-10-04-reuse-checked-revisions/proposal.md` log: "chose complete implementation first, final tests and verification afterward" |
| P23 | Source review completes implementation boxes, not passing tests | step | kept: what a ticked box means; the home for L2 | 30.10.0 |
| P24 | A substantive deployed acceptance task names `/save` after implementation | step | kept: the task layout for deployed acceptance | 30.10.0 |
| P25 | "unavailable prerequisites remain blockers" | repeat | merged → `build-helper.md` step 2 (B7) | that step |
| P26 | "Explicit early requests retain their reach" | repeat | merged → `build-helper.md` step 2 (B8) | task 3.1 |
| P27 | Validate; confirm the page exists and every apply-required artifact is complete; standalone sums up above the link and ends with the next step; under `/apply` return the exact name | step | kept | — |
| P28 | "Print the plan's link however `/plan` was invoked" | repeat | merged → `asking-the-user.md#print-the-plans-link` (Q25: "When a reply makes or changes a plan or its checklist, print …") and `AGENTS.md`; this page keeps the link in its standalone sentence | Q25 holds the ask (2026-09-27, "whatever made it") |

## `.agents/skills/save/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| S1 | `/save` authorizes branch creation, record upkeep, spec reconciliation, commit, push, PR updates, CI fixes; ask for anything else | step | kept | — |
| S2 | Never force push, bypass hooks, amend merged commits, or merge | guard | kept as is | force push, merge |
| S3 | `/ship` owns archive/merge; the loop owns delivery; no local check is ever the gate | repeat | merged → `the-change-loop.md#the-gate`; one line and the link here | the gate section |
| S4 | `/save [note]`: a Status value sets Status; other notes seed the Decision log | step | kept | — |
| S5 | Cold-resume context belongs in pushed files with repo-relative paths | step | kept: where cold-resume context goes | 2026-07-25 `codex-first` |
| S6 | Keep every credential handled this session out of tracked files, changes, facts, messages, PR text, and reports; values stay in working memory and the ignored live file; record only names and sources | guard | kept as is | credential in a tracked file |
| S7 | The route table; load each matching procedure before its actions; conditions combine | step | kept byte-exact | — |
| S8 | Check preconditions, then fetch `main` before comparing; errors stop; the four commands | script | kept as the commands | `change-candidates.sh` |
| S9 | Keep `BRANCH`, `NAME`, `CHANGE_ROOT` separate | step | kept: names the commands read | 25.17.0 |
| S10 | Rungs `explicit`, `session`, `changed-active`, `changed-archive`, `recorded-branch`; never `sole-active` | repeat | merged → `checkpoint-evidence.md#selection-rungs`; here the outcome (save the change this work touched, never a plan merely because it is the only one open) and the link | design.md |
| S11 | Resolve ambiguity before staging | no cause | dropped: the rungs page covers it: "Several → ask, with them as the options; never fall through" | searched "wrong change saved", "staged the wrong": none; 19.0.0 only |
| S12 | Never duplicate a change for its branch name | step | kept: kept with S9: a duplicate change is hard to undo | 25.17.0 |
| S13 | A save changing repo files takes the normal route, except the validated record-only procedure; nothing learned, decided, or changed → report and stop | step | kept | — |
| S14 | Keep the feature branch; on default or detached HEAD, `git checkout -b "$SLUG"`; slug sources; short SHA on collision; create required plan artifacts before checkpointing | step | kept | — |
| S15 | "Never rename `NAME` to match" | repeat | merged → S12's line in section 1 ("never rename or duplicate a change to match its branch") | in-file repeat |
| S16 | Proposal header, plan sections, tasks: kept current, edited in place | step | kept | — |
| S17 | Decision log: append one dated entry; never rewrite, reorder, or delete earlier ones | guard | kept as is, with its reason: it is the history a cold reader inherits | a deletion of the record; the loop's "living handoff" |
| S18 | Session facts through the memory write gate with `"session": "current"` and `"source": "save"`; a spooled result does not block the save | step | kept | 17.0.0 |
| S19 | For an active change, reconcile its deltas | step | kept | — |
| S20 | Read artifact and task progress from the CLI, "never guessed paths or schema" | repeat | merged → `plan/references/openspec-cli.md` ("never write under a guessed … path"; "never assume artifact names"); the link stays | CLI contract |
| S21 | Archived handoff: keep exact `CHANGE_ROOT`; infer `NAME` from the dated folder only if absent; retain Branch; append an archive-checkpoint entry; stage archive, removals, implementation; `--mode archive` | step | kept | — |
| S22 | Never rebuild the plan or recreate an active folder; archive already reconciled deltas | step | kept: no goal on the page covers it | 30.10.0 |
| S23 | Stage intended implementation, handoff, and removals, never `git add .`; check for unrelated staged work | step | kept: no goal on the page covers it | 2026-07-25 `codex-first` |
| S24 | A plan-only save commits its artifacts | step | kept | — |
| S25 | Write, outside the repo, a one-line repo-style commit message ending `Co-Authored-By: Claude`, and the PR summary | step | kept | 26.14.0 |
| S26 | The `checkpoint.mjs` command; `--scan-keys` names every credential handled this session; a match stops the save | script | kept as the command and how to read it | `checkpoint.mjs` (31.3.0) |
| S26b | "a match prints paths, never values, and stops the save until removed and restaged" | script | dropped: `checkpoint.mjs` prints the paths and its `NEXT:` line says to remove, restage, and rerun | `checkpoint.mjs` ("NEXT: a handled credential is in the paths above. Remove it from each, restage, and rerun") |
| S27 | No change → omit `--change-root` and `--mode`; use the longest wait and wait again, silently; follow its `NEXT:` line | script | kept | `checkpoint.mjs` |
| S28 | Report outcome and one link in plain words; the fields inside a verb or on request; return `SAVE_HEAD`, `RECEIPT`, `SAVE_GATE_RESULT`; always print the last inside a verb | step | kept | 25.13.0 |
| S29 | Direct invocation ends with next steps; failed or unverified gates offer repairs | step | kept | — |
| S30 | "Authorized chains return unasked" | repeat | merged → `asking-the-user.md#form-never-whether-to-ask` (Q21: an authorized handoff goes ahead unasked) | that section |

## `.agents/skills/save/references/checkpoint-evidence.md` (selection rungs)

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| R1 | Each verb walks its own list of rungs in order; the first with exactly one candidate selects it | step | kept; this section now also says which rungs each verb walks, moved from the five verb pages (A3, S10, H9, C3, V4) | design.md |
| R2 | Several → ask, with them as the options; never fall through | step | kept: the behavior at several candidates; the covering goal for A6 and S11 | 25.17.0; #89 |
| R3 | The six rung definitions | step | kept; `sole-active` and `changed-archive` each gain a line saying which verbs use them | `change-candidates.sh` prints the `active`, `archive`, `recorded` candidates |
| R4 | A branch name alone never selects a change; a proposal with no Branch line needs an earlier rung; keep the change name separate from the branch name | step | kept: defines how a branch selects; the home for C12 | 19.0.0 |

## `.agents/skills/ship/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| H1 | Invoking `/ship` authorizes every step without a prompt: archive, checkpoint, walk, merge, remote-branch deletion, sync, the pull-in | step | kept | — |
| H2 | It never authorizes archiving unchecked tasks; Step 2 finishes them | guard | kept as is | a merge of unfinished work |
| H3 | Confirm anything else (a force push, `--no-verify`, `git reset --hard`, `checkout .`) | guard | kept as is | force push, deletion |
| H4 | The loop owns the record, the pull-in, and the gate; PR review owns cleanliness; `main` means the default branch | step | kept | — |
| H5 | The `prepare` and `finish` commands; commands end with `NEXT:` | script | kept, with "do what it says" | `ship.mjs` |
| H6 | Scheduled records: record-only delivery before code preflight; the flags; ordinary ship leaves published records alone | script | kept | `ship.mjs`, `schedule-records.md` |
| H7 | Attached review notes → review-note handling on the existing change; continue the authorized publish without another choice | incident (on record) | one line and the link | memory #1416 (feedback, 2026-10-08), as A7 |
| H8 | "missing plan or blocker stops" (review notes) | repeat | merged → `plan/SKILL.md#review-notes` | as A8 |
| H9 | Check preconditions, then run `prepare`; uncommitted changes on the default branch go on in the same tree | script | kept | `ship.mjs prepare` |
| H10 | `main`'s check run *cut off* → restart it, then rerun | script | dropped: `ship.mjs prepare` prints the restart command in its `NEXT:` line | `ship.mjs` ("NEXT: …check run was cut off, not failed. … Rerun this command"); 37.2.5 |
| H11 | The pull-in: invoke `apply`, saying it runs inside `/ship`; it returns with no preview upload or `/save` | step | kept: the call `/apply` reads | 12.4.0 |
| H12 | `/ship <intent>` → pass the intent verbatim | step | kept: a routing case | 8.4.0 |
| H13 | No argument → invoke `/apply` bare when its resolve order lands before `sole-active`, or the session states clear intent | step | kept: a routing case | 14.1.0 (#81) |
| H14 | The cold stop: landing on `sole-active` or nothing → say there is nothing to continue, then stop | guard | kept as is, with its reason: a cold `/ship` never publishes the only open plan | a merge; 14.1.0 (#81), #89 |
| H15 | A feature branch with work runs the ordinary runbook, intent or not; `/ship` resolves nothing itself | step | kept: a routing case | 12.4.0 |
| H16 | `/plan` pauses, tasks stay pending, or a task-driven `/save` fails → report and stop before Step 2: no verb merges to stop | guard | kept as is, with the link to the loop | a merge; 24.0.3 |
| H17 | "A one-go run has one checkpoint: Step 3's" | repeat | merged → Step 3 of the same file (H27: invoke `save` exactly once) | in-file repeat |
| H18 | No-repo work finishes in `/apply`: say so and stop, with no git change | step | kept | 26.4.0 |
| H19 | `CHANGE_NAME` is separate from `BRANCH` | step | kept as it read: the step's command uses the name (restored after the second read) | the code block above it; R4 holds the reason |
| H20 | Pass `--change` for an `explicit` or `session` change; without it `prepare` takes `changed-active`, then `recorded-branch` | repeat | merged → `checkpoint-evidence.md#selection-rungs` (R1); here the flag, one line on the outcome, and the link | `ship.mjs prepare` picks |
| H21 | `sole-active` never authorizes a cold merge | repeat | merged → H14 in the same file and R1 | in-file repeat |
| H22 | None selects → `/save`'s route table on the branch diff; `--change` or `--no-change` | script | kept (flags) | `ship.mjs prepare` |
| H23 | Several active change folders → ask: move the others off the branch, or ship all on purpose | guard | kept as is | a merge carrying other work |
| H24 | Unchecked tasks → invoke `apply` inside `/ship`, then rerun; still pending → report and stop | guard | kept as is | a merge of unfinished work |
| H25 | `prepare` numbers the `## Next` entry, merging `main` in first when behind; reruns the local checks, so allow 15 minutes; `NEXT:` carries any repair | script | kept: how to read and wait on it | `ship.mjs prepare`, `number-release.mjs` |
| H26 | A file it cannot merge → resolve as the union of intent, `git add`, rerun; any other failure → report and stop before `/save` | script | dropped: `ship.mjs prepare` says both in its `NEXT:` line | `ship.mjs` ("NEXT: resolve each file above as the union of intent (a merge, never a rebase), git add them, and rerun"; "NEXT: report this message and stop before /save") |
| H27 | Invoke `save` exactly once as ordinary `/save` and follow it verbatim; proceed only on `SUCCESS` or `NONE`; never repeat, bypass, or reinterpret the gate | guard | kept as is | a merge past the gate |
| H28 | Invoke `verify` once with Step 3's exact receipt, never again for a better verdict | step | kept: the step and its reason | 31.3.0 |
| H28b | "It reuses the gate without another save; the walk itself runs fresh" | repeat | merged → `verify/SKILL.md` (V1: fresh scenarios on the exact saved revision; V6: SAVED → reuse its receipt) | those lines |
| H29 | No `verify` skill → say so and go on; never install it | step | kept: the fallback with no `verify` skill | 19.0.0 |
| H30 | Any verdict but `FAILURE` → report and merge; `FAILURE` → stop and ask two options; say what they would see not working | guard | kept as is | a merge of a failed walk needs the person |
| H31 | If the walk advanced `HEAD`, merge that commit only when its `/save` result is `SUCCESS` or `NONE` | guard | kept as is | a merge past the gate |
| H32 | Run `finish` once; allow 12 minutes; a skipped sync or secrets error is one report line; not merged → report and stop unless `NEXT:` gives a recovery | script | kept | `ship.mjs finish` |
| H33 | Merge, not rebase, unless asked | guard | kept as is | a rebase of a pushed branch needs a force push; 31.3.0 |
| H34 | Never check out, switch, stash, reset, or force a branch to make the sync succeed, or delete a local branch | guard | kept as is | deletion, force; 12.6.0 (#76) |
| H35 | Live look: `ok`/`unknown` → `REASON` as one report line; `failed` → say what is not working, invoke `apply` once with `REASON` and `URL`; no retry or revert | incident (on record) | one line each, kept as it read | `openspec/changes/archive/2026-10-04-staging-playground/proposal.md` log: "Asked whether to take a quick look that the live app loaded after publishing → chose yes, look only" |
| H36 | Report: outcome first, the live link, the plan's link, **Checks loosened**; the rest only when asked | step | kept | 25.13.0, 25.6.0 |
| H37 | Close with the next step, whose options next work owns | step | kept | — |
| H38 | "after a stop, the ways to clear the blocker" | repeat | merged → `asking-the-user.md#end-every-reply-with-the-next-step` ("Blocked task: the supported ways to clear it") | that list |

## `.agents/skills/continue/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| C1 | Selected schedule: route its record before code or checkout | step | kept, with the link | — |
| C2 | "preserve its store and pending question" | repeat | merged → `save/references/schedule-records.md` | as A2 |
| C3 | A handle selects by the rungs: a change name is `explicit`; a PR uses `changed-active`, then `recorded-branch`, on its head branch | repeat | merged → `checkpoint-evidence.md#selection-rungs`; here the outcome and the link | design.md |
| C4 | The change is the plan and the source of truth; its memory facts hold the session context; check preconditions; this skill owns checkout; `gh` resolves only GitHub | step | kept | — |
| C4b | "kept current by `/save`: `proposal.md` holds the intent, `tasks.md` the checklist" | repeat | merged → `the-change-loop.md#where-the-plan-and-record-live`, linked from the line | that section and the page's first paragraph |
| C5 | Parse the input: handle, instruction | step | kept | — |
| C6 | No handle → list changes, schedules, and open threads; offer both, recommending what the branch or latest checkpoint points at; don't guess | step | kept: the menu with no handle | 2026-07-25 |
| C7 | A non-code thread → no branch or change; `memory.mjs show`; recap; hand to `/apply` | step | kept | 26.4.0 |
| C8 | Change name → its proposal's `**Branch:**` value is `BRANCH`; the commands; facts keyed by the change name; no facts is normal | script | kept as the commands | 26.14.0 |
| C9 | No folder in a fresh checkout → fetch and search remote branch trees without checking them out; one match supplies the proposal and branch; several need a choice | script | kept as the commands | — |
| C10 | A proposal with no Branch line never selects a branch by name: stay here for an unsaved plan; ask when it is saved elsewhere | step | kept: a routing case | 19.0.0; spec `openspec-workflow` "Continue finds the branch from the change" |
| C11 | PR → the branch is its `headRefName`; `change-candidates.sh --ref --branch`; give each candidate's status and progress when asking | script | kept as the commands | `change-candidates.sh` |
| C12 | "never infer its name from the PR branch" | repeat | merged → `checkpoint-evidence.md#selection-rungs` (R4: keep the change name separate from the branch name) | that section |
| C13 | A bare number matching both a PR and a list index → ask which | step | kept: a routing case | 25.17.0 |
| C14 | Other unpublished work here → don't switch; ask: new workspace, `/save` first, or recap and stop | guard | kept as is | switching would mix or lose unsaved work |
| C15 | Nothing else here → check out; a Branch line naming a missing branch → never create it; ask | step | kept: a routing case | 25.17.0 |
| C16 | Checkout fails because another worktree has the branch → say where, recap, stop; never force it | guard | kept as is | a forced checkout |
| C17 | Never saved → stay on the current branch; `/save` will cut it | step | kept | — |
| C18 | Recap: the change, the journey, the session context, state (the PR as *the change on GitHub*) | step | kept | — |
| C18b | "as a markdown link — only the link … unless asked" | repeat | merged → `asking-the-user.md#write-in-plain-words` (Q11: one link, called *the change on GitHub*; the rest only when asked), linked from the line | that section |
| C19 | Drift check: counts only; never reload the PR diff or review threads unless asked; the commands | script | kept as the commands and one line | 2026-07-25 |
| C20 | Fold it into one line; say it as progress unless asked for counts | incident (on record) | one line | `openspec/changes/archive/2026-09-27-plain-words-for-everyone/proposal.md` log: plain words for everyone, detail only when asked |
| C21 | Not checked out → build and edit nothing, even with an instruction | guard | kept as is | edits on the wrong branch; 26.4.0 (#162) |
| C22 | An explicit instruction → do that; otherwise invoke `/apply` | step | kept | — |
| C23 | `/continue` resumes and implements; it drafts no specs | no cause | dropped: step 4 ("invoke the `/apply` skill to work the tasks") and the skill's description ("Resume saved work … for /apply") cover it; the wiki keeps `/apply` vs `/continue` | searched "drafts no specs", "continue drafted": none; reworded in 24.0.3 from an older line with no cause |

## `.agents/skills/verify/SKILL.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| V1 | Check fresh scenarios on the exact saved revision; gates nothing | step | kept | — |
| V2 | Authorized: needed `/save`, browser installation, Access heal, staging preparation, § a's writes; other permissions join the handoff | step | kept | 30.6.0 |
| V3 | The `scout-check` and `preflight` commands | script | kept | `verify-staging.sh` |
| V4 | Scout rungs: `explicit` (including `/ship`'s archive), `session`, `changed-active`, `recorded-branch`, `changed-archive` | repeat | merged → `checkpoint-evidence.md#selection-rungs`; here the outcome and the link | design.md |
| V5 | Asks name candidates' scenarios; READY → match by § a; nothing reachable → NONE, name exclusions and stop | step | kept | 12.0.0 |
| V6 | Bind with `saved-revision.mjs --checkpoint`; NEEDS_SAVE → `/save`; SAVED → reuse its receipt or read the existing gate | script | kept as the command and how to read it | `saved-revision.mjs` |
| V7 | UNKNOWN → unverified, never save speculatively; no record edits or settled-check reruns | incident (on record) | one line with the reason: a save made to find out starts another round of checks | `openspec/changes/archive/2026-10-04-reuse-checked-revisions/proposal.md` Why: "repeating those checks after separate parts multiplied the wait, and repairs added more runs" |
| V8 | Prepare independently; `preflight` (allow 12 minutes); `--no-browser`; `SEEDED=no` beside `TURN`; `--no-preview --no-browser` for CI-only | script | kept | `verify-staging.sh preflight` |
| V9 | Blocks pause dependents | step | kept: the home for W9 | 30.6.0 |
| V10 | Never guess URLs | step | kept: the rule and its reason (the wiki names the hazard) | wiki `staging-walkthrough.md` ("still answer `200`") |
| V11 | Recheck head before posting; changes require fresh evidence | step | kept: a step before posting | 30.6.0 |
| V12 | Walk and grade by §§ b–f; finish independent safe checks before repairs; inside `/ship`, add kept checks | step | kept: the home for W10 and W18 | 30.6.0; wiki "Safe checks finish before you are asked to help" |
| V13 | FAILURE → judge scope; in scope → collect failures, fix once, `/save`, `preflight`, repeat affected checks at most twice; retain independent evidence only with unchanged dependencies | step | kept: the repair loop and its only bound | 12.0.0 |
| V14 | Simulate and report by § f; one report covers surfaces, retries, heals, fixes, installs, scope, limits; next step; inside `/ship` return the verdict | step | kept | 29.16.0 |
| V15 | Heal once per invocation; retry dependents only | step | kept: the heal's only bound | 12.0.0 |
| V16 | Access challenge: mint a repo-named service token; widen groups if needed; confirm the machine policy accepts it | step | kept | 12.0.0 |
| V17 | Preserve human permissions; store the pair in the primary worktree `.env` only; name the mint; never print or commit credentials | guard | kept as is | credential in a tracked file |
| V18 | Privacy changes need human login/revocation checks; machine access proves no email login | step | kept: what machine access can and cannot show | 30.6.0 |
| V19 | No token or a surviving block → unverified; name the gaps | step | kept | — |
| V20 | Plain checks: skip scout, its address, the `mktemp` folder; same safeguards and handoff; past pictures; show evidence; post only if asked; `cleanup` | step | kept | wiki "A plain check posts nothing unless you ask" |
| V21 | Verdict table and precedence | step | kept byte-exact | — |
| V22 | `agent-browser`/Chrome only for browser journeys; new probe runtimes ask first; bundled collector authorized; no repo dependencies | step | kept: what may be installed | 30.6.0 |
| V23 | Saved-source previews or validated CI captures; no local repo execution or invented tooling; read-only recipes; written expectations judge | step | kept: the home for W21 | 30.6.0; wiki "What it is not" |
| V24 | Keep journeys and evidence outside the repo, bar `/ship`'s kept checks; `cleanup` on every exit | step | kept: where evidence lives and when it is cleaned | 12.0.0 |
| V25 | Never merge or archive: `/ship` owns that | guard | kept as is | a merge |

## `.agents/skills/verify/references/walkthrough.md` §§ a, c, e, f, g

§§ b and d are out of scope and byte-identical. The long why for every row here is in `wiki/development/staging-walkthrough.md#why-a-walk-runs-the-way-it-does`, which this page's first line links.

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| W1 | § a: select delta scenarios and capabilities touched by the branch diff; `WHEN`/`THEN` authoritative | step | kept | 12.0.0 |
| W2 | § a: inspect confirmed callers and data contracts; add narrowly relevant consumer scenarios; name the relationship and expectation; exclude speculation; report missing expectations | step | kept: what the scout selects | 30.6.0 `verify-more-surfaces` |
| W3 | § a: consumer checks grant no repair scope | no cause | dropped: § e covers it: "A failure is **in scope** only when … the contradicted `THEN` is one of *this change's own* scenarios" | `archive/2026-10-04-verify-more-surfaces/proposal.md` logs it as an assumption ("without authorizing unrelated repairs"), not a failure or an ask; 30.6.0 only |
| W4 | § a: the four routes, strongest first | step | kept | 30.6.0 |
| W5 | § a: CI capture: read project recipes; validate sources, identity, integrity; no recipe preserves ordinary probes; drift blocks its check, without editing recipes | step | kept: how a CI capture is read | 30.6.0 |
| W6 | § a: never execute downloads or repo code locally | guard | kept as is | running a downloaded file can leak or destroy; 30.6.0 |
| W7 | § a: the ledger's fields | step | kept | 30.6.0 |
| W8 | § a: prepare surfaces independently: no preview blocks deployed checks alone; no route → unverified; stage runnable checks | step | kept: how surfaces are prepared | 30.6.0 |
| W9 | § a: "blocked/failed prerequisites pause dependents only" | repeat | merged → `verify/SKILL.md` step 2 (V9: "A blocked or failed prerequisite pauses only its dependents") | that step |
| W10 | § a: "Finish independent safe checks" | repeat | merged → `verify/SKILL.md` step 3 (V12) | that step |
| W11 | § a: `PLAYGROUND=yes` → write freely, no prompt, ownership, or cleanup; otherwise staging-only bindings and owned disposable records, or defer | script | kept: how to read `preflight`'s line | `verify-staging.sh preflight`; 30.8.0 |
| W12 | § a: production data, paid resources, or access changes beyond the authorized heal need permission | guard | kept as is | payment, deletion |
| W13 | § a: outside services: trigger only on an `own` key; `shared` or unknown → never trigger; name the service | guard | kept as is, with its reason: a staging email could reach a real customer | sent message, payment; wiki |
| W14 | § a: missing seed records; scheduled work by manual trigger | step | kept | 29.16.0 |
| W15 | § c: the `run` command | script | kept | `verify-staging.sh run` |
| W16 | § c: "After source/test authoring and the final gate" | repeat | merged → `build-helper.md` step 2 and `verify/SKILL.md` step 2 (bind to the saved revision) | those steps |
| W17 | § c: stage independent journeys together; grade prerequisites before dependent stages; move completed inputs out before retries (every staged mutation replays); driver order; failed cleanup retains owned record IDs and defers dependent mutations | step | kept: how a run is staged, reasons kept | 29.16.0 |
| W18 | § e: "Finish independent checks" | repeat | merged → `verify/SKILL.md` step 3 (V12) | that step |
| W18b | § c: "finish independent checks" (after a failed cleanup) | repeat | merged → `verify/SKILL.md` step 3 (V12) | that step |
| W19 | § c: `REDACTED=<n>`: above 0 report it; `unknown` → inspect before posting | script | kept: how to read the line | 29.12.0 |
| W20 | § e: `PLAYGROUND=yes` → clean up nothing: `preflight` rebuilds staging before each re-walk | repeat | merged → § a (W11) of the same file; § e keeps the pointer | in-file repeat |
| W21 | § f: "No local repo execution or invented tooling" | repeat | merged → `verify/SKILL.md` Hard rules (V23) | that list |
| W22 | § e: retain retry evidence; otherwise clean up owned test data; preserve shared data | step | kept: what is cleaned after a failure | 30.8.0 |
| W23 | § e: in scope only when the `THEN` is this change's own and the fix lives in files the branch touches; a kept check needs only the second; `replay --only <id>` | step | kept | 12.0.0, 33.1.0 |
| W24 | § e: retain a focused check when CI can cheaply reproduce the defect; failure on the earlier source, pass on the repaired head; impractical harness → name the limit | step | kept: what a repair keeps | 30.6.0 |
| W25 | § e: no new infrastructure, weaker checks, or unrelated fixes | step | kept: spec `staging-walkthrough` promises it ("without requiring new test infrastructure or weakening the delivery gate"); unsure, so kept | 30.6.0 |
| W26 | § e: usually out of scope: app `401` with a valid token; previous-page screenshot | incident (on record) | one line | `openspec/changes/archive/2026-08-09-walk-stack-agnostic/proposal.md` log: "Found a real defect … a screenshot taken before a navigation paints captures the previous page" |
| W27 | § f: one `comment.md` covers every surface and retry; its fields; label practice or simulated evidence; show pass, fail, partial, unverified | step | kept | 29.16.0 |
| W28 | § f: text stands without images; `Pictures (log in to open):` links | step | kept: the comment's format, with the wiki's reason | 29.13.0 (#249) |
| W29 | § f: apply the verdict precedence; UNKNOWN/TIMEOUT lead **Not verified.**, naming completed checks, blocks, and remedies | step | kept | — |
| W29b | § f: "inherently unobservable claims stay partly shown (§ d)" | repeat | merged → § d of the same file ("Partly shown … verdict unchanged"), untouched | in-file repeat |
| W29c | § f: "Name heals or missing credentials" | repeat | merged → `verify/SKILL.md` step 5 (V14: one report covers heals, fixes, installs) and "When a block stops the walk" (V19: name credentials and repair gaps) | those lines |
| W30 | § f: attempt safe simulations before handoff; label simulated evidence; simulated delivery proves no real delivery; no safe simulation → name the limit | incident (on record) | one line | `openspec/changes/archive/2026-10-03-verify-autonomous-staging/proposal.md` log: "Asked: review note on Change #3 → added safe best-effort simulations before the handoff … Simulated evidence must name its limits" |
| W31 | § f: one handoff after independent checks; each remaining check names reason, action, expected observation, dependents; offer help or skips | step | kept: the one handoff and its fields | 29.16.0 |
| W32 | § f: skips stay skipped and unverified, grant no permission or pass, erase no failure; ask again only if reopened | incident (on record) | one line | `openspec/changes/archive/2026-10-03-verify-autonomous-staging/proposal.md` log, same ask: "options to skip selected or all remaining checks … skipped checks remain unverified" |
| W33 | § f: "Blocked reachable checks prevent SUCCESS" | repeat | merged → `verify/SKILL.md#verdicts` (SUCCESS: "no contradiction or blocked reachable check") | that table |
| W34 | § f: key links or password links for credentials; waiting grants no permission; resume pending checks; repeat completed checks only on changed conditions; retain the ledger before cleanup | step | kept: how help arrives and what resumes | 30.6.0 |
| W35 | § f: the publish, post, cleanup commands; how to read `publish`'s lines | script | kept | `verify-staging.sh publish` |
| W36 | § f: never cite missing URLs or cleaned local paths | incident (on record) | one line | memory #788 (thread, 2026-10-03: "walk screenshots are lost with no WALK_MEDIA_BUCKET") |
| W37 | § f: "other evidence is inline text" | no cause | dropped: § f's first paragraph covers it: the comment holds "raw observations/readbacks", and "Text stands without images" | 12.0.0 only |
| W37b | § f: "no video" | step | kept: restored after the second read of this pass. Nothing else on the verify pages rules a recording out, the browser guide offers one, and `openspec/specs/staging-walkthrough/spec.md` ("The walk leaves the repo as it found it") says "never a video" | searched "video": no failure or ask (memory #25 is a note on what GitHub renders); the only statement of the behavior |
| W38 | § g: inside `/ship` only, before § f's post; the `J` calls | script | kept | `verify-journeys.mjs` |
| W39 | § g: replay results `same`, `changed`, `skipped`, `not-run`; `changed` → walk fresh once, three per walk | script | kept: how to read the result | `verify-journeys.mjs`; 33.1.0 |
| W40 | § g: keep each passed journey; `expect` rows hold shown claims only | script | kept | `verify-journeys.mjs keep` |
| W41 | § g: never keep one using a private link, an outside service, or a manual job trigger | guard | kept as is, with a link to its reason | sent message; wiki `kept-checks.md#what-is-never-kept` |
| W42 | § g: prove, install; name each left out; a changed tree → `/save` once; that commit needs no re-walk | script | kept | `verify-journeys.mjs` |

## `wiki/development/the-change-loop.md`

The page keeps every heading and its why. Only its repeats of a skill's how move.

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| L1 | "Pictures unavailable → say why and keep the choice." (intro) | repeat | merged → `apply/SKILL.md#finish-with-a-preview` (A29), already linked in the same sentence | that section |
| L2 | `/plan` step: "build the complete implementation before automatic tests or remote checks. Source-review completion never claims passing tests; delivery runs required verification at the end." | repeat | merged → `plan/SKILL.md#finish` (P22, P23); the step links the build-order section | that section |
| L3 | `/apply never saves to stop`: "Prepare all source and tests first, then run the local pre-check once; tick implementation boxes on source review and report the pre-check as local. Move existing intermediate test gates to the final phase without new approval or lost acceptance obligations, and log the timing change." | repeat | merged → `build-helper.md` steps 2–4 (B4, B6, B9, B12); the section keeps the why and links the brief and `/plan` | design.md |
| L4 | "Explicit early requests retain their reach." | repeat | merged → `build-helper.md` step 2 (B8) | task 3.1 |
| L5 | `/apply` never saves to stop or between parts; routine final checks belong to `/save` or `/ship` | step | kept: the section's own rule | 24.0.3 |
| L6 | Substantive deployed acceptance needs evidence after implementation; only observed acceptance completes its task; a later archive can require another checked revision | step | kept: what counts as observed acceptance | 30.10.0 |
| L6b | "An unavailable prerequisite stays a blocker" | repeat | merged → `build-helper.md` step 2 (B7) | that step |
| L7 | Final required checks, fresh preview evidence, and the single live look remain; after failures batch repairs; every pushed source revision still takes all required CI jobs | incident (on record) | one line | `openspec/changes/archive/2026-10-04-reuse-checked-revisions/proposal.md` log, the same ask: "affected rechecks only after a real failure, preserving final required checks and preview" |
| L8 | (new) the why of build order: checking part by part multiplied a long build's wait, and repairs added more runs | incident (on record) | added as the section's reason | `archive/2026-10-04-reuse-checked-revisions/proposal.md` ("repeating those checks after separate parts multiplied the wait, and repairs added more runs") |
| L9 | Everything else on the page (the loop, just ask, the offer, workspaces, the steps, the gate, loosened checks, the handoff, records) | step | kept, untouched | — |

## `AGENTS.md`

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| G1 | A person just asks to build or change code; you run the verbs (the list) | step | kept as the orienting line, with the link | — |
| G2 | "With no verb, ask the finished-plan question at the plan's review link and 'publish it?' after `/apply`'s preview from this host." | repeat | merged → `the-change-loop.md#just-ask`; the line says only "Asked with no verb, stop at the plan and at the preview" | that section, steps 1–2 |
| G3 | "A typed verb keeps its own reach; one missing its precondition runs the verb before it." | repeat | merged → `the-change-loop.md#just-ask` ("A verb the person types keeps its own reach") and the page's intro ("A verb whose precondition is missing invokes the verb before it") | those paragraphs |
| G4 | "An invoked verb also serves work that changes no repo file, with a to-do and a confirm per outward action" | guard | kept as is for the confirm; the to-do is at `the-change-loop.md#verbs-for-any-work`, linked from the line | sent message, payment, deletion |
| G5 | Print the plan's link whenever you make or change a plan | step | kept as the orienting line, with the link | — |
| G6 | "*Click here to see the plan:* on its own line above the closing question, even if the build goes on." | repeat | merged → `asking-the-user.md#print-the-plans-link` (Q25, Q28, Q29) | that section |
| G7 | "That question also offers *Review the plan*; only that reply adds a line under it saying to type `/apply` to build it" | repeat | merged → `asking-the-user.md#print-the-plans-link` (Q30, Q31) | that section |
| G8 | Every other bullet | step | kept, untouched | out of this change's scope |

## Other wiki pages

| # | Rule today | Sort | After | Evidence |
|---|---|---|---|---|
| X1 | `wiki/development/staging-walkthrough.md`, "Why a walk runs the way it does": "Finish the implementation before automatic verification. Write tests with source; source-complete work is not a passing test result. Explicit early requests still work." | repeat | merged → `the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task` (the why) and `build-helper.md` (the how); the bullet becomes one linking line, and still says a walk you ask for runs at any point | task 3.1 |

## Not changed, and why

- `walkthrough.md` §§ b and d: out of scope by the proposal; measured with a paid practice run before any edit.
- `checkpoint-evidence.md` above "Selection rungs": out of scope; it describes what `change-candidates.sh` prints.
- The verdict table, every code block, and every command line: scripts and callers read them.
- `verify/SKILL.md` and `walkthrough.md` keep their short one-line rules. Nearly all are steps of the walk, whose long why the wiki page holds; the second pass dropped two (W3, and W37's "other evidence is inline text"). `/verify` is the one skill with a practice site, and no practice run was made, so nothing else there was cut by reading alone.
- The exception for a check the person asks for early stays in the helper brief alone (A16, P26, L4, X1): design.md names the brief as its home, and task 3.1 holds the phrase to that one page. The parent passes such a request on as the person's answer.
- The first second reader found 28 points. Twenty-three were restored or reworded; the Decision log names each. Not restored: the allowance in A27 that a phone view can be the second picture (it only served the count that went), and the new word "sub-helper" in B21 (the plan asked for that line).

## Totals

345 rows: the first sort's 342, plus three split in the second pass.

| After | Rows |
|---|---|
| kept as is (guard) | 27 |
| one line, with a failure or an ask on record (two of them added) | 38 |
| kept (a step, or a script's command and how to read it) | 205 |
| merged to one home (repeat) | 56 |
| dropped (16 with no cause, 3 a script already says) | 19 |

Dropped in the first pass: A15, A27, B20, S26b, H10, H26. Dropped in the second: A6, A30, A39, Q2b, Q14, Q15, E10, E25, E26b, S11, C23, W3, W37. Restored by the second pass's reader: E7, W37b, and the link on A18.
