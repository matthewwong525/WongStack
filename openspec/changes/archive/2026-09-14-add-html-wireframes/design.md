## Context

See [proposal.md](proposal.md) — Why. The UX stage already exists in `.claude/skills/plan/SKILL.md`: a design subagent returns the `## UX` section text, a critic subagent reviews it, one revision round, then the section is appended to `design.md` and tasks cite its subsections. This change swaps the medium of one subsection, `### Wireframes`, from ASCII to a file, and leaves the stage's shape alone.

Constraints that decide the design:

- **GitHub renders `.html` as source.** There is no in-forge preview of the file. A reviewer opens it from a clone, a worktree browser, or a tool that renders local files. So the file must work from disk with no server and no network.
- **The change folder archives as a whole.** `openspec-archive-change` moves `openspec/changes/<name>/` to the archive, so a file placed there is preserved for free. OpenSpec tracks only its declared artifacts and ignores the extra file.
- **The manifest copies a skill as a directory.** `payload-files.json` lists `plan` by name, so anything under `plan/references/` ships with it. The link checker only follows Markdown links, so an `.html` file needs a Markdown link from `SKILL.md` to be reachable and nothing else.
- **A working sample exists.** `wireframe-sample.html` at the worktree root was opened in a real browser, clicked through, and screenshotted in the explore session. It is untracked and becomes the kit.

## Goals / Non-Goals

**Goals:**

- One file, one convention, the same look for every change. The kit owns the look; the model owns the screens.
- The stage's four steps keep their numbering and their subagent roles. Only what the subagents read and return changes.
- Nothing new to install, in this repo or a target.

**Non-Goals:**

- Rendering the file anywhere but the reviewer's machine. Hosting on a preview deploy or a media bucket is a separate change with its own infrastructure question.
- A wireframe for this change. The change edits skill prose and a template; it has no screen.

## Decisions

**A single self-contained file, not a folder of screens.** One file holds every screen as a hidden `<section>` and shows one at a time. Alternatives: one HTML file per screen (a reviewer loses the click-through and the state switch), or a folder with shared CSS (breaks the drag-anywhere property and needs relative paths to survive the archive move). One file survives copy, archive, and email.

**Hash routing, `#/<screen>/<state>`.** The fragment is the address of a screen in a state, so a task or a PR comment can cite `wireframe.html#/list/empty` and a reader lands there. It works from `file://` because nothing is fetched. Alternative: query strings, which some local viewers strip.

**Inline CSS and a few lines of JS; no dependency.** The explore session reviewed wired-elements, Wireframe-CSS, and the wireframer-skill. All are sound and all load from a CDN or a package. A planning record that archives for years must not depend on a host staying up, so nothing is borrowed but ideas. The kit's JS does three things: build the screen and state switchers from the sections' `data-` attributes, route on the hash, and follow `data-go` clicks. Anything more is fidelity creep.

**Grey-box by construction.** The kit defines one ink colour, one line colour, and two greys. The primitives are a top bar, `.btn` with a single `.primary` variant, `.input`, a table, a dashed empty box, a skeleton row for loading, and a crossed image placeholder. The design subagent is told it may only compose these. This makes the ux-principles rules mechanical: two `.primary` buttons visible in one state is a violation the critic can name.

**Callouts and a notes block per screen.** A red numbered dot on the element and a matching numbered line below the frame, with the one-line brief above the list. This keeps the why beside the picture, so the file stands alone for a stakeholder who never opens `design.md`. The full brief, flow, hierarchy, and components still live in `design.md` as text: the critic needs them as text, and a task cites them by subsection.

**The kit is the sample, trimmed.** `wireframe-sample.html` already has the chrome, the routing, the primitives, and three screens. The kit keeps the chrome and primitives verbatim and drops the sample's product screens. It keeps **two** example screens rather than one: a list carrying all four states as the pattern to copy, and a deliberately thin second screen as the `data-go` click target. One screen cannot demonstrate navigation, and a dangling `data-go` silently falls back to the first screen, so the kit would teach the flow wiring by description only. The example screen stays generic (a list with a search box) so no target repo reads it as a product decision. A reference comment at the top of the kit states the fill rules: add a `<section class="screen">` per screen, declare `data-states`, at most one `.primary` visible per state, `data-go` on the primary action, callouts numbered per screen.

**The PR body section is conditional on the file.** `git-gate.md`'s template gains a `## Wireframe` section with one link to the file on the branch, in the same "omit if absent" shape as `## Preview`. The link is the forge's blob URL, which shows the source; the section text says to open the file locally. Alternative: no PR body change at all, which leaves a reviewer to discover the file in the diff. One link is cheap and the body is regenerated anyway.

**Config rules change wording only.** The `design` rule in `openspec/config.yaml` keeps its trigger and its list of subsections; "ASCII wireframes" becomes "a `wireframe.html` filled from the plan skill's kit, linked from the `### Wireframes` subsection". The `tasks` rule's example becomes a `wireframe.html#/<screen>/<state>` anchor. No new rule; the shape holds any author, not just `/plan`.

## Risks / Trade-offs

- **A reviewer cannot click it inside GitHub.** → The PR body section says so and names the path. The file works from disk, so the cost is one download. Hosting is a follow-on change.
- **The model raises fidelity anyway.** → The kit's fill rules forbid new CSS, and the critic is told to flag any added style or colour. The grey palette makes drift visible.
- **The kit drifts between this repo and targets.** → It is one payload file under the skill; `/wong-sync` proposes updates like any other, and a target that edited it keeps its copy through the adapt step.
- **A large flow makes a large file.** → Each screen is a small section; a ten-screen flow is still well under 100 KB. If a flow is larger than that, the design is probably too big for one change.
- **Binary-free by design.** → No screenshots are committed, so the archive stays text and diffs stay readable.
