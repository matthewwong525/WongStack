# Tasks

## 1. Setup and update guidance

- [x] 1.1 Update `.agents/skills/wong-setup/SKILL.md`, its tool reference, and the shared latest-source reference to carry an explicitly requested repository through bootstrap URLs, prerequisite lookup, retrieval, and setup; verify walkthroughs for default source, custom fork, unavailable fork, and an occupied or edited cache, recording the outcome without installing into this source repo.
- [x] 1.2 Clarify the payload manifest's install-record guidance so fresh projects record the actual source repository, version, and commit and later sync follows it; verify a fork-recorded installed-project fixture retrieves that fork and keeps a local adaptation, using relevant existing server-install and sync-preflight checks and adding fixture coverage only for a missing behavioral case.
- [x] 1.3 Keep added skill instructions within the context budget by trimming duplication in the edited references; verify `node scripts/measure-context.mjs --check` passes.

## 2. Customization guide and discovery

- [x] 2.1 Write `wiki/stack/customizing-wongstack.md` covering source fork versus installed project, customizable payload and server defaults, the copyable easy-setup request, fresh hosting and memory, and the two levels of updates; verify its examples match the source-selection behavior and link existing procedures instead of duplicating install steps.
- [x] 2.2 Link the guide from `README.md`, `wiki/stack/README.md`, `wiki/stack/getting-started.md`, and `server/README.md`; verify discovery from both the source README and an installed stack hub, and verify source-only links use GitHub URLs in shipped pages.
- [x] 2.3 Run `node scripts/check-payload-links.mjs` and the shipped wiki link checker using its documented invocation; verify the new page is included through the existing `wiki/stack/` directory payload and all links and headings resolve.

## 3. Release and integration

- [x] 3.1 Add `## Next (minor) — Make WongStack your own` to `CHANGELOG.md` with a plain updating note; verify `VERSION` stays unchanged and existing installs require no source switch.
- [x] 3.2 Run the OpenSpec config check, retired-name check, strict change validation, and rebuild `review.html`; verify the artifacts remain coherent and every changed skill's context budget passes, without a local app build.
- [x] 3.3 If the work continues through `/save`, verify its required checks pass and record any real selected-fork install/deployment evidence; if that live path is not exercised, name it as unverified instead of marking it checked from prose review alone.
