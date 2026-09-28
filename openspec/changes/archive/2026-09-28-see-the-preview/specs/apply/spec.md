## MODIFIED Requirements

### Requirement: A finished change ends with a host preview

When every task is done, `/apply` SHALL upload a preview of the app from the agent host under the change's name and ask whether to publish, with changing it more or saving as the other choices, and *See the preview* when a preview was uploaded. It SHALL NOT invoke `/save` or take any git, pull-request, or CI action on completion. When the app is untouched or the upload cannot run, it SHALL say so in one line and still ask.

#### Scenario: The last task completes

- **WHEN** `/apply` finishes the final task of a change that touched the app
- **THEN** it reports the preview link and asks whether to publish, offering *See the preview*, with nothing saved

#### Scenario: No credential

- **WHEN** the repo has no Cloudflare credential
- **THEN** `/apply` says in one line that no preview was uploaded and why, and still asks whether to publish
