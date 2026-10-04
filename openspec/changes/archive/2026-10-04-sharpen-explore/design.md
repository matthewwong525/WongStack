# Design

## Context

See [the proposal](proposal.md) for the problem and scope. The current skill already provides memory lookup, overlap detection, small question groups, a materiality test, and bounded planning handoff. The changes belong in `.agents/skills/explore/SKILL.md`; the shared asking reference owns formatting and tool choice.

Research read on 2026-10-04:

- Matt Pocock's [grill-me entry point](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md) delegates to [grilling](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md). The current implementation groups decisions whose prerequisites are settled, recomputes after answers, and distinguishes facts from human decisions. Older descriptions of one-question-at-a-time interviewing do not describe the current implementation.
- Poteto's [how](https://github.com/poteto/how/blob/main/skills/how/SKILL.md) traces real flows before critique. The [pstack investigation playbook](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/investigation.md) keeps research read-only and returns judgment supported by evidence.
- Pstack's [design-space principle](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-exhaust-the-design-space/SKILL.md) compares structurally different approaches when constraints do not dictate one. Its [lead judgment](https://github.com/cursor/plugins/blob/main/pstack/skills/interrogate/references/lead-judgment.md) checks actual paths and dismisses speculative or cosmetic concerns.
- Pstack's [evaluation playbook](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md) separates ordinary task prompts from scoring criteria and verifies behavior from transcripts.

These are references for independently written guidance, not dependencies or workflows invoked by WongStack. Do not copy upstream prompt text. If implementation instead copies or directly adapts licensed text, review that source's license and carry its required attribution with the shipped skill per [adding a skill](../../../../wiki/maintaining/adding-a-skill.md).

## Goals / Non-Goals

Keep one owner for exploration mechanics. Preserve the existing linked headings, memory commands, overlap check, question format, and distinction between standalone and bounded mode. Add no mandatory tool, model, delegation, prototype, or second approval to those modes.

The work is original skill prose with a bounded behavioral check, not an application feature or a general evaluation framework. Deterministic code is appropriate for existing link and size checks; it cannot resolve the open-ended meaning of a product decision, so no new planning script is warranted.

## Decisions

### Ground only the relevant flow

Extend the skill with concise investigation guidance: state the intended outcome; read relevant owning docs and implementation; trace the path from trigger to result and note constraints. For non-code requests, examine the equivalent process and authoritative sources instead. Look up facts before asking, and use only safe read-only observation already authorized by the task.

If an empirical question needs a write, prototype, unavailable tool, or prohibited local build, state the evidence gap and what later check would resolve it. Do not present an inference as an observation. Do not run every source or subsystem for a simple request. This keeps poteto's grounding discipline compatible with explore's no-write promise.

### Track material decisions and their prerequisites

Keep a lightweight in-conversation view of settled decisions, open material choices, and the answers or facts each needs. Ask two or three related ready choices, or one when only one is ready, within the host's capacity. A pending fact blocks only choices that need it; independent ready questions and investigation can continue within the host's available tools. This does not require background helpers or pretend a sequential host can run two things at once.

Recompute after each answer or new fact. If it changes an earlier premise, explain what changed and invalidate the dependent assumptions or choices. Reopen only those affected decisions; keep unrelated answers. For example, a correction from shared expenses to private expenses invalidates a shared approval queue and team-wide notifications, but does not invalidate the answer about how duplicate receipts are handled.

The design tree is a thinking aid, not a new stored artifact or an obligation to interview every possible branch. Naming, placement, inexpensive wording, settled choices, and constraints that already dictate the answer stay out of the interview. The existing 80/20 test controls both modes.

### Compare and challenge proportionately

For a genuinely ambiguous consequential approach, compare two meaningfully different options in chat with outcomes, costs, evidence, and a recommendation. Use a compact drawing or table when useful. A mechanical or fully specified request need not invent alternatives.

Before handoff, check the recommended approach's weakest consequential assumption and a plausible failure path against the actual context. Correct the recommendation if evidence contradicts it; surface a remaining human choice only when material. Do not reopen an explicitly settled preference for a cosmetic alternative. Evidence that makes a settled premise impossible is a new constraint, which must be explained rather than silently ignored.

The final summary supplies the chosen outcome and approach, reasons a serious alternative was rejected, supported minor assumptions, and unresolved evidence limits. Bounded mode reuses this summary and investigates only a new gap; it does not rerun a finished exploration or add another confirmation.

Before an interactive handoff, check that every known material choice has an answer supported by the conversation or evidence. An unanswered product choice remains open even if the summary would sound complete; do not hide it as an assumption or evidence gap. Minor details can use supported defaults. A missing empirical observation stays an evidence limit only when it does not prevent selecting a coherent approach; otherwise name the blocker or prerequisite investigation rather than guessing the fact. Preserve the existing explicitly assumed-default fallback when nobody can answer, and preserve authorization already granted for defaults. This completion check adds no separate sign-off or demand to discover every hypothetical branch.

### Keep the shipped guidance compact

Integrate these rules into the current skill, trimming repetition instead of adding a large checklist or copying the shared question convention. Keep the linked section names intact. The wiki's exploration summary can link to the skill rather than restating its procedures.

At planning time the instruction inventory was 26,196 words / 189,867 bytes against ceilings of 27,084 words / 190,845 bytes; byte headroom is only 978. Run the existing context check after edits. Trim this change's wording to fit without raising baselines or cutting unrelated work.

### Compare three ordinary requests before claiming a gain

Use three paired read-only sessions with the same host/model, project facts, organic prompts, and scripted user answers. Capture the baseline skill before editing and give the other sessions the candidate. Keep fixture folders and candidate prompts neutral; sessions must not see this design, the scoring expectations, the other variant, or a request to report compliance. Let tool transcripts and actual questions supply evidence.

| Request | Project context supplied | What the comparison checks |
| --- | --- | --- |
| Rename Notes to Team notes; keep the address, permissions, and stored notes | A small notes page with those behaviors visible in source | No new scope interview, invented alternatives, or writes; bounded planning reuses the settled answer |
| Let staff submit expenses and owners approve them; receipts can be sent twice | Existing owner/member roles; current shared notes; no approval model; one notification capability cannot yet be verified | Identify material choices, continue independent questions despite the missing fact, and revise only affected decisions after a later privacy correction |
| Speed up the team notes page by caching notes in the browser | Source showing team-scoped responses, account switching, and a logout path; no timing measurements | Read the actual flow, notice retention across account changes, challenge persistent caching, compare another approach, and label speed claims unmeasured |

Prepare the same scripted product answers for both variants before either session starts. In the expenses case, first settle shared visibility and duplicate handling, then send the same ordinary correction: "Actually, expenses must be private to the submitter and owners. Keep the duplicate rule we agreed." Verify the final recommendation revises the queue and notification audience without repeating duplicate handling. Keep one fact about notification delivery unavailable while independent visibility and duplicate choices are ready, and verify that only the dependent delivery choice waits. Withhold an answer to one remaining material preference for a turn; a premature complete summary or an assumed product answer counts as a miss. Then supply the fixed answer so both sessions can finish. These are additional turns in the existing pair, not new sessions.

For each session, record missed material choices, premature dependent questions, unnecessary or repeated questions, evidence-backed recommendations, unsupported factual claims, stale dependent decisions, premature completion, and writes attempted. Store transcripts or bounded excerpts and the comparison in this change's `exploration-comparison.md`. Keep scratch fixtures outside the payload in the repository's ignored scratch area; no committed harness or generated fixture app.

Limit the comparison to six sessions, one per request per variant. Use the already installed agent CLI in read-only sessions without hooks that write project files, and do not broaden to model tournaments. Record the host, model, date, and cost when available. Before running, define a useful gain as at least one fewer missed material choice or unsupported claim, with no extra unnecessary questions and no new boundary violation. One pair per case gives directional evidence, not a reliable effect-size estimate. If both variants already succeed, say no demonstrated gain. If isolated sessions cannot run, document the limitation; static validation does not prove better conversations. Simplify or remove additions that worsen the comparison.

## Risks / Trade-offs

- More guidance could produce more questions or longer responses. The settled request is a control, the existing materiality rule remains, and the comparison counts unnecessary questions.
- An adversarial pass could inflate hypothetical risks. Require a plausible path grounded in the relevant process and dismiss cosmetic concerns.
- Stronger fact-finding could become unapproved experimentation. Explicitly retain no writes, no prototypes, and no local builds during exploration.
- Skill Markdown checks cannot establish model behavior. Report the small replay's actual results and limitations separately from link, size, and schema validation.

## Migration Plan

Add `## Next (minor)` to `CHANGELOG.md` during implementation with an Updating note saying no action is needed. Leave `VERSION` for `/ship`. The ordinary payload update delivers the new skill; there is no data or configuration migration. If the guidance causes regressions, revert its wording through the normal change loop. Generate [review.html](review.html) with the existing builder after proposal edits.

## Fixed comparison protocol (prepared before runs)

Baseline captured in ignored `.scratch/exploration-dialogues/reference-a.md` before editing. Both variants receive only their skill, the same shared ask reference, ordinary prompts, `project.md`, and `Notes.tsx`, in separate neutral scratch folders. Memory/overlap checks are already complete in the supplied facts. The CLI exposes only Read, Glob, and Grep, disables hooks, skills, and MCP, and receives no variant labels, scoring criteria, design, or other transcript. Each multi-turn dialogue uses one process; the ordinary closing choice remains answerable through supplied chat turns.

Fixed turns:

- Notes: “Rename Notes to Team notes. Keep the address, permissions, and stored notes. Please explore it first.” Then: “Plan it. Before drafting, run the bounded exploration pass and return that handoff only.”
- Expenses: “Let staff submit expenses and owners approve them; receipts can be sent twice. Explore this. We need to decide who can see expenses, how to handle repeat receipts, and whether approved expenses can be changed.” Then shared visibility and flag-but-allow repeats, explicitly withholding approved-edit policy. Then: “Actually, expenses must be private to the submitter and owners. Keep the duplicate rule we agreed. I am still thinking about whether approved expenses can be changed; leave that choice open for now.” Finally forbid approved edits, require replacement submissions, use in-app status, and defer email until verified.
- Cache: “Explore speeding up the team notes page by caching notes in the browser. I want returning visits to feel quicker.” Then choose current-account/team memory, clearing on logout and switching, one-minute freshness, and explicitly unmeasured speed.

Sources show team-scoped fetches, account/team switching, logout clearing only the login token, and no timing measurements. No expenses model exists; owners/members are known. Notification delivery remains unavailable throughout. No sessions are told what issue to find.

Score actual transcripts: count missed stated material choices, questions needing the unavailable fact, unnecessary/repeated choices, unsupported factual claims, stale privacy-dependent decisions, premature completion during withheld editing policy, and attempted writes. Record evidence-backed recommendations separately. Notes should introduce no product choice and reuse settled scope; expenses should ask ready visibility/repeat choices, retain editing as open, revise queue/audience without repeating duplicates; cache should ground retention/freshness tradeoffs and mark speed unmeasured. A useful gain needs at least one fewer missed choice or unsupported claim, with no extra unnecessary questions or new boundary violation. All other outcomes are no demonstrated gain, regression, or unavailable evidence. One pair per case is directional only.

The expenses wording enumerates product decisions and explicitly requests keeping an unanswered choice open. This cues discovery and waiting, so that case tests response to stated decisions, not uncued discovery. This limitation was identified after the six-session runner had loaded the fixed turns; both variants retain identical turns and no extra sessions are added.

### Codex fallback protocol, fixed before fallback inference

The six Claude invocations stopped at the usage limit before inference; they are unavailable setup attempts. On instruction from the parent, check the installed Codex CLI as a fallback for all six actual dialogues, retaining one host/model within that comparison. Before any Codex run, shorten the expenses opening to the original ordinary request and remove “leave that choice open for now” from the privacy-correction reply; retain the natural statement “I have not decided about editing approved expenses yet.” Both variants receive identical revised turns. Do not claim discovery of approved-edit policy after the scripted answer supplies it; count that as a stated material preference. All criteria above remain fixed.

Mask the repo and previous transcripts with bubblewrap, expose only one read-only fixture at `/mnt`, and use a separate scratch CLI runtime per thread with existing host authentication. Disable hooks, plugins, apps, browser tools, and delegation; ignore user config/rules and project instructions. Outer read-only mounts enforce command isolation; disable the inner Codex namespace sandbox because nested namespace creation is unavailable, keeping approvals disabled. Source reads and rejection of fixture writes were verified with that outer sandbox before usable sessions. Each initial CLI thread is resumed for its subsequent scripted answers; resume calls are additional turns, not extra sessions. Record the effective model and any isolation or provider failure rather than guessing success.

## Implementation outcome

[The comparison record](exploration-comparison.md) separates six unavailable Claude setup requests, three Codex threads with failed nested source access, and six usable Codex dialogues on gpt-6.1-sol. Both variants handle the Notes control, unavailable delivery evidence, pending expenses preferences, and cache switching/freshness; no overall gain meets the fixed rule. Candidate omits the initial visibility ask and adds a payment-related replacement choice. The final failure-check sentence is simplified to exclude speculative/cheaply changed questions and reopening settled preferences; this final wording is not retested. Explicit queue/notification-audience revision is not demonstrated. No app or test framework was added.
