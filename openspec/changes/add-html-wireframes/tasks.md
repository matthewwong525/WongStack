## 1. The wireframe kit

- [x] 1.1 Create `.claude/skills/plan/references/wireframe-kit.html` from `wireframe-sample.html`: keep the reviewer chrome, the CSS primitives, and the routing script verbatim; keep one generic example screen (a list with search) with `default`, `empty`, `loading`, and `error` states; drop the other screens, per design.md — Decisions.
- [x] 1.2 Add a comment block at the top of the kit with the fill rules: one `<section class="screen">` per screen with `id`, `data-title`, and `data-states`; one `.primary` per screen carrying `data-go` to the next screen; state blocks as `.state.state-<name>`; callouts numbered per screen with a matching notes entry; no new CSS, colours, fonts, scripts, or network loads.
- [x] 1.3 Open the kit with `agent-browser` from a `file://` path with no server, switch through the four states and follow the `data-go` click, and confirm every state renders.
- [x] 1.4 Delete the untracked `wireframe-sample.html` from the worktree root.

## 2. The plan skill

- [x] 2.1 In `.claude/skills/plan/SKILL.md`, UX stage step 1: the design subagent also reads the kit, writes `openspec/changes/<name>/wireframe.html` by filling it with every screen and state in the flow (the one file it writes), and returns the `## UX` text whose `### Wireframes` subsection is a link to the file plus a list of `#/<screen>/<state>` anchors instead of ASCII sketches.
- [x] 2.2 Step 2: the critic subagent reads the wireframe file as well as the section text, and its two questions gain the checks a fixed kit makes mechanical: more than one `.primary` on a screen, a named state with no section, and any style or colour added to the kit.
- [x] 2.3 Step 3: the revision round rewrites the wireframe file as well as the text; the main thread confirms the file exists before appending the section.
- [x] 2.4 Step 4: change the task example to a `wireframe.html#/<screen>/<state>` anchor.
- [x] 2.5 Re-read the edited stage for coherence: the stage's opening paragraph names the file, UI-less changes still skip the whole stage, and the description in the skill frontmatter mentions the wireframe.

## 3. The UX principles page and the config rules

- [x] 3.1 In `wiki/ux-principles.md`, rewrite the `### Wireframes` subsection of the `## UX` template: link `wireframe.html`, list screens and states by anchor, require empty, loading, and error states where the design names them, and say the file is filled from the plan skill's kit at low fidelity.
- [x] 3.2 Add one sentence to the page's opening paragraph that names the wireframe file beside the `## UX` section, so a reader who lands here learns both exist.
- [x] 3.3 In `openspec/config.yaml`, change the `design` rule's "ASCII wireframes including empty/error states" to the wireframe file linked from `### Wireframes`, and change the `tasks` rule's example to a `wireframe.html#/<screen>/<state>` anchor.

## 4. The PR body

- [x] 4.1 In `.claude/skills/save/references/git-gate.md`, add a `## Wireframe` section to the body template after `## Tasks`: one link to `openspec/changes/<name>/wireframe.html` on the branch and a line saying to open the file locally, with the same "omit this whole section if the file is absent" note the `## Preview` section uses; the archived-handoff paragraph notes the path moves to the archive.

## 5. Release ritual

- [x] 5.1 Bump `VERSION` to `12.7.0`.
- [x] 5.2 Add the newest-first `CHANGELOG.md` entry for 12.7.0: what the UX stage now produces, where the file lives, that it opens from disk, and that UI-less repos see no change.
- [x] 5.3 Run `node scripts/check-payload-links.mjs` and confirm it reports no dead links.
