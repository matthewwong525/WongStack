# Verification

## Setup instruction review

These are walkthroughs of the edited instructions, not executed agent setups. No installation was run in this source checkout or against a real GitHub fork or Cloudflare account.

| Case | Instruction path and outcome |
| --- | --- |
| No custom source | Fresh target selects `matthewwong525/WongStack`; its resolved default branch supplies the raw setup guide, linked prerequisites, `.nvmrc`, checkout, payload, version, and commit. |
| Explicit fork | A hypothetical `business/custom-stack` with default branch `studio`, Node major 24, and a different starter page supplies all those inputs. The raw root uses `studio`, tools read that root's `.nvmrc`, and setup passes the selected repository and source checkout into the install intent. The fresh record names the fork. |
| Unavailable fork | Failure resolving the repository, reading required source content, or retrieving its checkout stops setup. Neither setup nor the shared retrieval reference permits substitution of the original repository or use of a stale cache as latest. |
| Cache contains another repository | Retrieval checks the remote first and uses a separate fresh checkout, preserving the occupied cache's remote and files. |
| Cache contains local edits or cannot fast-forward | Retrieval uses a separate clean checkout without reset or discarded work. |
| Target is already installed | Folder selection routes to sync; the recorded repository wins over the new setup request. |

Every later setup reference resolves within the selected source checkout. The guide's copyable request names one repository in both its install request and raw runbook URL; it explains replacing the owner/repository and default branch, and starting outside the source checkout.

## Executed checks

- `node --test scripts/tests/wong-sync-preflight.test.mjs scripts/tests/server-install.test.mjs`: 54 passed, none skipped. The new fixture reads a fork URL from an installed project's record, maps its transport to a temporary local Git source, retrieves it, and runs preflight. The comparison sees the fork's latest version and commit, classifies the project-specific workflow as locally adapted, and leaves the target and recorded source intact. This exercises fixture retrieval and comparison; it does not prove an agent follows the setup prose.
- Existing server-install coverage checks the whole manifest payload, including the new wiki page, actual checkout version/commit/source, fresh memory and hosting against fake services, and the origin URL normalization for forks.
- `node scripts/check-payload-links.mjs`: passed for installed and source-only links, including heading anchors and real folder paths.
- `node .github/scripts/wiki-links.mjs`: passed; 35 wiki pages linked and below the word limit. The new guide ships through the existing `wiki/stack/` directory entry; its source-only references use GitHub URLs.
- `node scripts/measure-context.mjs --check`: passed; start-up load remains 2,197 words against the 2,200 ceiling. Added instructions were offset by shortening the edited setup and tool guidance; no budget or baseline changed.
- `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `openspec validate customize-wongstack --strict`: passed.
- `node .agents/skills/plan/scripts/build-review.mjs openspec/changes/customize-wongstack --require-current`: review page current, unchanged because the proposal did not change.
- `VERSION` remains `29.7.0`. The pending minor entry says existing installs retain their recorded source and require no action.

## Shortened instruction rules

| Shortened text | Where the rule remains |
| --- | --- |
| Setup overview and source bootstrap | Folder selection, selected-source paragraph, latest-source reference, and setup's closing workflow paragraph. |
| Token paragraph | Selected source's credentials page owns the filled link and fallback; setup still checks for a token before writing, stops without it, and defers taking its value. |
| GitHub and plan initialization | Setup retains Step 1 of the provisioning runbook, `openspec init --tools none`, source config rules, and commits only after installation. The runbook owns sign-in before Cloudflare calls. |
| Full payload and folder list in the install intent | Setup retains every inventory category and links the manifest; its folder instructions below the intent still name the real folder, links, required hubs, and ignore rules. The manifest owns fresh record and memory/config separation. |
| Privacy, owner email, and Paseo in the intent | The shortened intent still separates login email from authorship, enables privacy automatically, handles the no-card open finish, and adds Paseo presets with nonblocking failure. |
| Workflow ownership and tool preconditions | Setup still assigns questions, planning, installation, and first deploy to their verbs and links the ask convention; tools still requires every pre-clone check before target writes. |
| Cache safety and refresh trust boundary | Latest-source retains remote checking, clean fast-forward, separate checkout on conflicts, source/target separation, failure stops, and its unchanged helper trust boundary and timings. |

## Live path

Saving and publishing were not requested. A real selected-fork install, first hosted deployment, and subsequent live sync remain **unverified**. No CI or selected-fork hosting result is claimed from the instruction review or fake-service fixtures.

## Host preview

The parent completed `/apply`'s preview step after the helper returned. The shared app-change check conservatively required a preview because a test file changed. `cf-preview.sh --alias customize-wongstack` packaged the existing app for staging and uploaded a preview version; no production deployment occurred. A readable HTML rendering of the guide was then placed only in ignored `app/dist/client/` output and uploaded under the same alias, without changing the app's source or adding a permanent product page.

Preview: https://customize-wongstack-wongstack-staging.matthewwong525.workers.dev/customizing-wongstack

A request with the saved machine credentials confirmed HTTP 200, the guide title, its fork-install example, and the unpublished-preview label. Cloudflare normalizes the `.html` address to the extensionless path with HTTP 307. This confirms the guide artifact is served; it does not verify a person's login or a real fork installation.

The changed preflight test also passed lint using the installed app's same-version `oxlint`. `git diff --check` passed, and the loosened-check detector reported no loosened checks.
