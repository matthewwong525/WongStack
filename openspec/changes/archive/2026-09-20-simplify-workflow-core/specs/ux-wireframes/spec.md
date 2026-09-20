## MODIFIED Requirements

### Requirement: The wireframe is filled from a fixed kit

The plan skill SHALL ship one review kit that owns the reviewer chrome, routing, panel and landing, four visual kinds and their primitives, callouts, notes, mark highlights, and annotation layer. The design subagent SHALL author only the change-specific visual input with its marks and SHALL NOT restyle the kit, add runtime dependencies, or raise its fidelity. Shared tooling SHALL assemble the kit, visual input, and current proposal into a standalone page. The kit and assembly tooling SHALL reach every repo that installs the plan skill. A critic SHALL still judge the rendered visuals against their proposal and design after the mechanical checks, with one revision round.

#### Scenario: Two changes look alike

- **WHEN** two changes produce review files from the kit
- **THEN** both have the same chrome, panel, primitives, pin and callout styles and differ only in their change-specific content

#### Scenario: The kit installs with the skill

- **WHEN** a target installs or updates the plan skill
- **THEN** the shared kit, assembly tooling, and relevant authoring instructions arrive together

#### Scenario: A visual author prepares a change

- **WHEN** the author adds a new flow or screen visual
- **THEN** it writes the change-specific input and does not copy or edit the viewer runtime
- **AND** shared tooling produces the required standalone page

### Requirement: The proposal text is resynced by `/save`

The generated page SHALL contain the proposal's current Why and What Changes and SHALL render paragraphs, lists, bold, inline code, and links. Plan and save SHALL use one shared refresh implementation. Current-format pages SHALL be assembled from their inputs. Legacy pages with `proposal:start` and `proposal:end` markers SHALL receive the existing proposal-only refresh; legacy pages without supported markers and older changes without a page SHALL be reported and left untouched. A new-format missing input SHALL be reported as an error, not a legacy skip. New plans SHALL always include a page.

#### Scenario: The proposal changes after the file was written

- **WHEN** What Changes is edited during implementation and save runs
- **THEN** the page displays the proposal's current Why and What Changes

#### Scenario: No file or no markers

- **WHEN** save runs for an older change without a page or supported proposal markers
- **THEN** the legacy page is not rewritten and the checkpoint reports the limitation and proceeds

#### Scenario: A current-format refresh fails

- **WHEN** the new page's required visual input is missing
- **THEN** refresh preserves the last output and reports the failure
- **AND** the checkpoint does not claim the review is current

### Requirement: The copied block is a `/continue` instruction

When continue receives an instruction beginning with `Review notes from review.html`, it SHALL reconcile those notes into the affected existing artifacts using CLI-provided paths before implementation. It SHALL record which notes changed what or why a note was declined. It SHALL refresh the review through the shared assembly path and SHALL not depend on a generated update skill.

#### Scenario: A review block is pasted

- **WHEN** a reviewer runs continue for a change with a copied review block
- **THEN** the affected proposal, design, specs, tasks, and visual input are reconciled before implementation resumes
- **AND** the Decision log records the disposition and the review displays the accepted changes

### Requirement: The revised kit applies to newly created pages

The focused layout, local controls, connected workflow cards, and draft-note behavior SHALL live in the shared kit used for newly assembled review pages. The builder SHALL combine that kit with the current proposal and change-specific visual fragment. Generated pages SHALL remain self-contained without an external runtime. Refreshing a selected current-format change MAY rebuild its embedded viewer from the shared kit; marked older pages SHALL receive proposal-only refresh, and archived pages SHALL NOT be bulk regenerated.

#### Scenario: A new review is generated

- **WHEN** a future plan builds a review from the shared kit and its visual fragment
- **THEN** the page provides full selected-item text, responsive layout, annotation-safe navigation, and drafts without an external runtime load

#### Scenario: An older page is refreshed

- **WHEN** save refreshes a marked page that has no visual fragment
- **THEN** it updates only the proposal block and preserves that page's embedded controls and styles

#### Scenario: Archived pages remain historical

- **WHEN** the shared kit changes
- **THEN** archived pages are not rebuilt merely because the kit changed

## ADDED Requirements

### Requirement: Review assembly is deterministic and preserves authored input

Assembly SHALL read the shared template, current proposal sections, and authored visual input. The proposal text SHALL have no separately maintained copy. Repeated assembly of identical inputs SHALL produce identical output without rewriting it. Invalid inputs SHALL report a useful error and preserve the previous output. Embedded content SHALL be escaped so proposal text cannot introduce executable markup.

#### Scenario: The inputs do not change

- **WHEN** the same review is assembled twice
- **THEN** the second invocation makes no byte or modification-time change

#### Scenario: The proposal contains markup delimiters

- **WHEN** a proposal includes literal script-closing text or HTML-like examples
- **THEN** the page displays the intended text without executing it or breaking the document

#### Scenario: A current-format input is missing

- **WHEN** a current-format change lacks its required visual input or has invalid template boundaries
- **THEN** assembly returns an error identifying the input and does not overwrite its existing review

### Requirement: Mechanical defects have deterministic diagnostics

Review checks SHALL identify duplicate visual IDs, unresolved anchors, missing declared screen states, state/mark collisions, invalid navigation targets, unreferenced visuals or marks, excess primary actions per screen state, unauthorized template changes, and prohibited resource loads or executable visual input. Checks SHALL respect the existing visual-kind semantics, including flow lanes for today/after states. Diagnostics SHALL identify the affected visual or source. A structural pass SHALL NOT be reported as proof of semantic or visual correctness.

#### Scenario: An anchor does not exist

- **WHEN** a proposal bullet names a missing visual, state, or mark
- **THEN** the check reports that bullet's target as invalid

#### Scenario: A shared header creates two primary actions

- **WHEN** a screen has a primary action outside its state blocks and another inside its empty state
- **THEN** the check reports two primary actions for the empty state

#### Scenario: Visual input changes shared behavior

- **WHEN** a fragment adds a script, an event handler, a style override, or a remote automatically loaded resource
- **THEN** the check rejects that input with a named diagnostic

#### Scenario: The unchanged viewer applies its own inline styles

- **WHEN** the shared runtime sets flow opacity or toolbar sizing after loading valid visual input
- **THEN** author-input checks do not reject those runtime-generated styles
- **AND** styles introduced by the visual author are still rejected before execution

#### Scenario: A valid structure still shows the wrong change

- **WHEN** the structural checks pass but a visual does not explain its proposal bullet
- **THEN** the critic can still reject the visual and require the single revision round

### Requirement: Review generation preserves portable history

The generated review SHALL remain the primary human review surface, showing the proposal and visual explanations without needing adjacent source files. It SHALL preserve the existing interaction and annotation identity when a page is refreshed. Migration SHALL NOT bulk regenerate archived pages. A structural or source-only check SHALL NOT be reported as a completed rendered review.

#### Scenario: A reviewer opens only the HTML file

- **WHEN** a reviewer opens a generated page without its proposal, template, or visual-input file beside it
- **THEN** the explanation, visuals, navigation, and annotation controls remain available

#### Scenario: A proposal-only refresh preserves annotations

- **WHEN** a current-format review is refreshed after a proposal text edit
- **THEN** stable visual identifiers and annotation storage identity remain unchanged

#### Scenario: Existing archives are migrated

- **WHEN** the WongStack integration is migrated
- **THEN** existing archived review pages remain byte-identical and readable without the new authoring tooling

#### Scenario: No browser is available for rendered inspection

- **WHEN** source checks complete but rendered browser inspection cannot run
- **THEN** the report names the rendered checks as unverified rather than claiming that every state was inspected
