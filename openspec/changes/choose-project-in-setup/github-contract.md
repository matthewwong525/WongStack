# GitHub repository contract

Withdrawn scope record, 2026-10-04. The user chose app/API access only and manual repository grants/authentication. No automatic repository adapter, registration, protection inspection or token issuance from the contract below ships. It records the superseded design and is not a current integration or acceptance requirement. Existing personal GitHub workflows remain unchanged.

## Reviewed permissions and endpoints

| Operation | Endpoint / transport | Narrow repository permission |
|---|---|---|
| Clone/fetch, branch push | HTTPS Git, private credential helper | Contents read/write |
| PR list/detail/create/update | `GET/POST /repos/{owner}/{repo}/pulls`, `GET/PATCH .../pulls/{number}` | Pull requests write |
| Review inspection | `GET .../pulls/{number}/reviews` | Pull requests read, covered by write |
| Existing PR-comment preview fallback | `GET .../issues/{number}/comments` | Pull requests read, covered by write |
| Check inspection | `GET .../commits/{ref}/check-runs`, `/check-suites` | Checks read |
| Workflow/check execution inspection | `GET .../actions/runs`, `.../actions/runs/{id}/jobs` | Actions read |
| Status-preview fallback | `GET .../commits/{ref}/statuses`, `/status` | Commit statuses read |
| Preview deployment/readback | `GET .../deployments?sha={sha}`, `.../deployments/{id}/statuses` | Deployments read |
| Branch protection inspection | `GET .../branches/{branch}/protection` | Administration read |
| Applicable rule inspection | `GET .../rules/branches/{branch}` | Contents read |
| Repository and installation readback | `GET /repos/{owner}/{repo}`, `/installation/repositories` | Metadata read |
| Token creation/renewal | `POST /app/installations/{id}/access_tokens` | Owner App JWT; explicit one-element `repository_ids` and permission subset |
| Token revocation | `DELETE /installation/token` | The distinct installation token being revoked |

Read endpoints are documented in [pull requests](https://docs.github.com/en/rest/pulls/pulls), [reviews](https://docs.github.com/en/rest/pulls/reviews), [check runs](https://docs.github.com/en/rest/checks/runs), [workflow runs](https://docs.github.com/en/rest/actions/workflow-runs), [statuses](https://docs.github.com/en/rest/commits/statuses), [deployments](https://docs.github.com/en/rest/deployments/deployments) and [deployment statuses](https://docs.github.com/en/rest/deployments/statuses). The existing [preview helper](../../../.agents/skills/save/scripts/preview-url.sh) uses deployments, statuses, checks and comments in that order. The employee adapter must use reviewed REST calls rather than assuming personal `gh` GraphQL commands accept the same permissions. Unsupported comment writes, labels, assignees, workflow edits, merge and deployment writes stay unavailable.

The App manifest's reviewed permission set is `contents:write`, `pull_requests:write`, `checks:read`, `actions:read`, `statuses:read`, `deployments:read`, `administration:read`, owner-only `secrets:read` and `environments:read`, plus implicit metadata read. Secrets read inspects only names/metadata; no API returns secret values. Employee tokens omit all three inspection rights. [PR comment reads](https://docs.github.com/en/rest/issues/comments#list-issue-comments) accept Pull requests read, so no additional Issues grant is needed. Keep administration read for owner-side protection inspection; employee tokens exclude it. No administration/workflows/secrets/deployments write or bypass grant is permitted. Recheck each concrete adapter endpoint before finalizing the manifest.

[Installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation) supports Git access and attributes requests to the App. [Token creation](https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app) supports explicit repository IDs and permissions; omitting these would inherit broader installation grants. [Revocation](https://docs.github.com/en/rest/apps/installations#revoke-an-installation-access-token) revokes the distinct token. Renewal requires fresh local membership checks; private sealed receipts track each machine, human requester and bounded expiry.

## Publication boundary

Contents/Pull requests rights are neither branch scoped nor a promise that merge is forbidden. Read the actual [branch protection](https://docs.github.com/en/rest/branches/branch-protection) and [applicable rules](https://docs.github.com/en/rest/repos/rules), including inherited rules and bypass actors. Ordinary required checks/reviews alone may still permit the App to merge after approval. The owner must have a provider-enforced update/publication restriction that excludes this App, with no bypass path and no alternate deployment ref.

Inspect deployment triggers and environment policy independently. [Environment readback](https://docs.github.com/en/rest/deployments/environments) and protected-branch behavior are provider-plan dependent. This source's [deployment workflow](../../../.github/workflows/deploy.yml) routes default-branch pushes to production, but its deployment secrets are repository-level. A branch editor able to rewrite publishing scripts can reuse those secrets from a changed branch workflow. A harmless `/ship` refusal cannot establish this boundary. Until owner-controlled secrets/environment protections and reviewed scripts prevent every editor-triggered production deployment, editing remains blocked. Do not automatically move secrets or modify protections.

Missing inspection rights, organization approval, unsupported restrictions, unknown rules/bypass actors, workflow-file push refusal, or an unverified deployment trigger produce blocked/pending status. Do not expand privileges to make a refused operation work. GitHub App approval, actual clone/branch/PR/check operations, renewal, revocation and publishing denial still need the authorized controlled installation test.

## Delivered inspection boundary

Owner-only inspection additionally uses `GET /app`, `GET /users/{ownerGithubLogin}`, repository collaborator permission readback, repository and inherited organization Actions-secret listings, environment detail/branch policies, workflow listings and the reviewed default-branch workflow contents. The App owner must match the recorded repository owner; organization identity is separate from the independently pinned human environment reviewer. Registration chooses that account/organization's GitHub manifest destination, sets both `redirect_url` and `setup_url`, and disables webhook delivery. Consumed callbacks redirect to clean locations with no-referrer policy. Pending organization approval resumes the sealed App through a fresh installation attempt.

The concrete supported fixture is organization-owned, keeps WongStack's read-only test workflow and has independently protected owner-approved preview/production jobs. The verifier compares exact environment branch policies and workflow blob pins, requires owner-only reviewers/no bypass/self-review, rejects unreviewed rules or dynamic/reusable/matrix/unsafe jobs, and refuses repository/inherited organization secrets accessible outside approved environments. It does not mutate live protections or move secrets. The current shared-token/dynamic-environment deployment workflow is an explicit rejected fixture. Missing inspection rights or other unverified publication paths leave editing blocked and remain live-acceptance work.

Primary permission references: [repository secret metadata](https://docs.github.com/en/rest/actions/secrets#list-repository-secrets), [inherited organization secrets](https://docs.github.com/en/rest/actions/secrets#list-repository-organization-secrets), [environment readback and branch policies](https://docs.github.com/en/rest/deployments/environments), [collaborator permission](https://docs.github.com/en/rest/collaborators/collaborators#get-repository-permissions-for-a-user), [manifest fields](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest).
