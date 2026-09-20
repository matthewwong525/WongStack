## Context

See `proposal.md` for the problem and selected scope. Six generated OpenSpec skill files contain 9,194 whitespace-delimited words in this checkout. WongStack's verbs load those files and then override parts of their workflow. Setup, dependency updates, rules, and the payload guide also maintain generation and visibility instructions. The installed CLI supports `init --tools none`, `status --json`, `instructions <artifact|apply|archive> --json`, `validate`, and `archive`.

The current review kit is 821 lines. Its CSS and runtime are shared code; change authors replace only its example visuals. A separate 80-line save helper copies proposal sections into the page. The kit already defines the four visual kinds, anchors, annotations, and mobile behavior. Reuse those contracts.

## Goals / Non-Goals

**Goals:** Reduce the instruction set read on a workflow path; keep one owner per procedure; generate repeated review content; preserve the standalone review experience and the CLI's schema-aware artifact handling.

**Non-goals:** See the proposal's scope boundary. In particular, this change creates neither a new workflow engine nor a new review data language. It preserves the current delivery and authorization behavior. It changes authoring and assembly, not the viewer's screens, so this design does not add a `## UX` section.

## Decisions

### 1. Short verbs use one CLI contract

Add `.agents/skills/plan/references/openspec-cli.md`, linked using the payload's `.claude/` spelling. It owns only shared mechanics: resolve the planning root, keep an explicitly selected store on supported commands, read status paths and schema dependencies, obtain artifact instructions, and validate. Each verb owns its decisions and links to the relevant section. Do not copy the generated runbooks into this reference.

| Verb | Responsibility after the change |
|---|---|
| explore | Read relevant files and CLI context; clarify intent; write nothing. |
| plan | Use `new change`, `status`, and `instructions`; complete the schema's required dependency set; generate the required review; validate; stop for standalone review. |
| apply | Resolve the selected change, plan when needed, read `instructions apply`, implement pending tasks, and preserve the existing completion handoff. |
| save | Reconcile the plan and delta specs, refresh the review, preserve the session note, and perform the existing checkpoint. |
| continue | Load the selected work and note; reconcile pasted review feedback using the CLI's existing artifact paths, refresh the page, then resume implementation. |
| ship | Require completed tasks and artifacts, validate and archive through the CLI, and preserve the existing checkpoint and merge gate. |

CLI paths and dependency edges remain authoritative. A present tasks file alone does not prove that its required artifacts exist. `skip_specs` and conditional instructions retain their current meanings. Preserve custom schemas and explicitly selected stores; do not assume that every project has only the default four artifact IDs.

There is no standalone CLI `sync` subcommand in the installed version. Save must still compare delta requirements with the corresponding main specs, apply only the declared changes, and validate the result. Keep that concise semantic procedure in save's own reference; do not pretend an unavailable command exists. Archive uses the CLI's validated archive operation. If save already synced the deltas, archive can skip that second spec mutation only after confirming equality. Retain incomplete-task and unresolved-gate protections.

**Alternative rejected:** Replace OpenSpec with a custom Markdown engine. That would create new schema, validation, migration, and archive code to maintain. Loading the generated skills with shorter overrides also leaves two workflow owners.

### 2. Stop generation at its source and migrate deliberately

Fresh setup uses `openspec init --tools none`; it prepares the planning home without generated agent skills. Dependency updates check the CLI contract instead of running `openspec update` as a routine regeneration step. Setup, sync, payload docs, and rules must agree on this lifecycle.

Remove the six known generated skill directories, `.agents/skills/.openspec-target`, and `wong-sync/scripts/hide-openspec-skills.sh` from the source as implementation tasks. For targets, match known generated content from the installed version, allowing the old visibility-key patch. Do not use a wildcard deletion based only on the name. Preserve modified or unrecognized content, report it, and record the migration decision before treating the target as fully migrated. An independently installed OpenSpec integration is the target's own component, not WongStack's to delete. Preserve symlink layouts and record local skill names.

Keep existing `openspec/config.yaml`, schemas, changes, main specs, archives, and notes. Merge only the relevant config-rule changes. Remove stale regeneration instructions so future updates do not reinstall the retired layer. No global OpenSpec profile changes are needed.

**Alternative rejected:** Keep a hidden generated layer for compatibility forever. It retains the context and update burden. Compatibility is instead a bounded migration of known files and preserved user customizations.

### 3. Assemble HTML from a shared shell and visual fragments

Keep `plan/references/review-kit.html` as the single template and runtime owner. Move examples and the short authoring vocabulary into a reference loaded only by the visual author. Each new change has `review-visuals.html`, containing only visual sections and their callouts, states, marks, and navigation attributes. The proposal remains the sole authored source for Why and What Changes. Do not add a second JSON description of those facts.

Add `plan/scripts/build-review.mjs <change-root>`. It reads the kit, proposal, and fragment; fills explicit template slots; and writes `review.html` only when the bytes differ. The output bundles all required CSS and JavaScript. It needs no network, server, or adjacent files when a reviewer opens it. A generated header identifies the source fragment and format version. The old sync entry point becomes a small compatibility adapter to this implementation, not a second text parser.

Preserve existing IDs, route syntax, change-name storage keys, copied-feedback format, and template behavior. Escape embedded Markdown so literal `</script>` text cannot terminate the proposal container. Validate inputs before replacing output and use an atomic write. Invalid or incomplete inputs must leave the previous review intact and return a diagnostic.

The stored fragment is authoring input and the full HTML is its portable output. That duplication is intentional. Do not load or edit generated runtime text during ordinary visual authoring. A template change takes effect when a current-format change is next built; old archived pages remain frozen and portable.

**Alternative rejected:** Load one external runtime from all review pages. That would make an archived page depend on another path or a server. A new JSON UI schema would require its own renderer and restrict the existing HTML primitives.

### 4. Code checks structure; visual critique checks meaning

Put shared deterministic review checks beside the builder. Use the browser's HTML parser and DOM for structural checks, with a pure check function that accepts a document and returns named diagnostics. The existing machine-level browser tool runs it during planning; CI can use the meta-repo's existing jsdom dependency for structural fixtures. Do not write another HTML parser or add target application dependencies.

Check duplicate visual IDs, unresolved bullet/state/mark targets, state/mark collisions, missing screen-state blocks, invalid navigation targets, unreferenced visuals/marks, primary-action counts per screen state, injected styles/scripts/event handlers, and nonlocal automatic resource loads. Apply the existing kind-specific state semantics: screen states have separate blocks; flow states use the kit's today/after lanes. Reject fragment changes to template-owned code. The builder performs source-boundary and template-integrity checks; the DOM check covers rendered structure. A normal text link is not an automatic network load.

Check prohibited author styles and event handlers against source or an inert DOM before the viewer runtime executes. The kit itself adds inline styles for flow opacity and toolbar sizing; those legitimate runtime effects must not fail an author-input check.

Run browser inspection for empty rendered frames and responsive overflow. A structural pass cannot prove that a visual conveys the proposal or that a loading state is useful. Keep the design author and one critic/revision round for those judgments; remove the repeated mechanical checklist from their prose instructions and point at the checker result.

New plans must have a generated page and pass applicable structural checks before being reported ready. A checkpoint may still preserve incomplete work under the existing save policy; report a stale or invalid review as such instead of calling it current. This adds no new merge gate. A missing browser is an explicit unverified rendered check, not a claimed pass; source checks and generation still run.

### 5. One refresh path, including older pages

Plan builds after the proposal anchors and visual fragment are ready. Save uses the same builder to refresh a current-format page. Continue handles review notes by updating the existing relevant artifacts and fragment, appending the decision, rebuilding the page, and then resuming work. Reviewers never need to edit the generated file.

For a pre-change page with proposal markers but no fragment, the shared implementation performs the existing proposal-only splice and preserves the page's visuals and runtime. A page without supported markers, or an older change without a page, is reported and left untouched. Do not silently convert an old page or invent visuals. New-format changes with missing inputs are errors, not legacy skips. Archive moves the page and its authoring fragment with the change; it does not rebuild historical pages.

### 6. Keep the change smaller than the code it replaces

The payload JSON remains the file inventory; prose explains rules without repeating the list. Update only the owner pages for this workflow and remove stale claims about generated skills, absent tests, and the review requirement. Keep skill descriptions at the existing 600-character limit. The shared CLI reference contains no release history or duplicate workflow decision tables.

Before and after implementation, count whitespace-delimited words across the same authored core skills and their linked workflow references, including the retired generated layer and new references. Report both the always-discovered descriptions and the full instruction inventory; do not call either a measured runtime token saving. The acceptance check is a net reduction and zero normal generated-skill handoffs. HTML/CSS/JavaScript and archived copies are reported separately, not counted as prose savings.

## Risks / Trade-offs

- CLI behavior changes → use actual status and instruction output, retain validation, and add CI contract fixtures for creation, dependency handling, resume, and archive.
- A custom target skill resembles generated content → remove only identified unmodified generated files; preserve and name everything else.
- A new fragment becomes another place to edit proposal facts → fragments hold visuals only; the builder reads the proposal directly.
- DOM checks appear stronger than they are → distinguish structural results from rendered review and semantic critique.
- Archive refresh changes old evidence → never bulk rebuild archives; refresh only the selected active handoff or its just-archived checkpoint.
- Sharing code increases install coupling → ship the plan directory as one unit and test fresh and upgraded target shapes, including legacy sync entry points.

## Migration Plan

1. Add the shared CLI contract, review builder, checks, and legacy adapter with fixture coverage in CI.
2. Change the verbs to direct CLI use and the common review refresh path. Preserve standalone plan stopping, apply completion, feedback handling, and save/ship outcomes.
3. Update setup, sync, dependency maintenance, config, rules, and owner docs. Remove the known source generated layer and its patch machinery. Include target migration tasks rather than changing target files during exploration.
4. Validate the change and payload links/config, exercise the new and legacy review paths, and record context counts through the normal CI checkpoint.
5. Release as version 16.0.0 from the merged 15.2.0 baseline, with explicit migration notes.

Rollback restores the prior released skill payload and update instructions. Keep all existing records. Newly generated `review.html` files remain standalone if their authoring tooling is rolled back; legacy workflows can still view them. No remote data or Cloudflare resource migration is involved.

## Implementation measurements

The source instruction inventory uses whitespace-delimited words, not runtime tokens. Before this change it contained 30,339 words: 14,788 in the eight core WongStack skill bodies, 9,194 in six generated OpenSpec skill bodies, and 6,357 in three linked workflow references. The same core skills and references, with the new shared CLI, review-author, and spec-sync references included, now contain 18,528 words: 13,547 in the eight core skills and 4,981 in six references. That is 11,811 fewer source words, or 39% less than the baseline. Always-discovered core descriptions fell from 661 to 412 words; the longest authored description is 580 characters. Generated HTML and the meta-only test fixture are outside this prose inventory.

The generated review passed the structural checker with no diagnostics. Browser inspection opened all six visuals and eight declared states at 390px phone and desktop widths with nonempty frames and no horizontal overflow. An annotation survived reload, Copy notes produced the `/continue simplify-workflow-core` block, and a copied page opened offline without adjacent proposal or visual input. These are rendered and interaction checks; whether the pictures explain the change remains a human review judgment. The CLI contract, migration, and review fixtures passed in Payload checks on PR #87 at commit `046bcbd`; the existing Test and Deploy workflows passed on that commit too. The final handoff edit still requires its own checkpoint gate.

## Integration with 15.2.0

PR #88 merged the focused review viewer before this change shipped. Its shared runtime owns full selected-item text, local state controls, connected workflow cards, draft persistence, and saved-only copy. The 16.0 builder keeps that runtime intact and fills it from `proposal.md` and `review-visuals.html`. The kit's rich examples move to `review-examples.html`; the app's browser fixtures use that fragment through the same builder rather than testing an example-filled shell. The selected active review is intentionally rebuilt with the new viewer for this combined change; historical archives stay byte-identical. Legacy marked pages still get proposal-only refresh.

The rebuilt page passed the structural checker and displayed all six visuals and eight states at desktop and 390px phone widths without page-level overflow. A draft survived item navigation and reload; saving it made Copy notes produce the established `/continue` block. A copy of the page opened from a directory with no adjacent inputs. The archived PR #88 review is byte-identical to `origin/main`. These checks do not replace human judgment about the pictures. The merged branch still needs its app, payload, and deployment CI gate.

## Review

The required review uses existing flow, diff, and tree primitives, with no viewer interface redesign:

- [Direct CLI workflow](review.html#/direct-cli/after/contract), with today and after states.
- [Generated-layer migration](review.html#/retire-layer/migration).
- [Review assembly](review.html#/review-assembly/after/builder), with today and after states.
- [Mechanical checks and visual critique](review.html#/review-checks/checks).
- [Shared refresh and legacy support](review.html#/shared-refresh/refresh).
- [Concise owners and release](review.html#/concise-owners/owners).
