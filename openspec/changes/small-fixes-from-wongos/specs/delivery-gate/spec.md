## MODIFIED Requirements

### Requirement: The preview link is the real preview for this commit

Preview discovery SHALL report only a preview URL tied to the head commit, SHALL NOT report a bare provider apex such as `workers.dev` or `vercel.app`, and SHALL NOT construct a URL from a naming convention. When nothing qualifies, it SHALL report no preview. A preview CI deploys for a pull request SHALL be recorded on that pull request's head commit, so discovery finds it.

#### Scenario: A comment links the provider logo first

- **WHEN** a comment naming the head commit links `https://workers.dev` and then `https://feature-app.example.workers.dev`
- **THEN** discovery reports `https://feature-app.example.workers.dev`

#### Scenario: Only an earlier commit's preview exists

- **WHEN** every preview comment names an earlier commit and no other source has a URL
- **THEN** discovery reports no preview

#### Scenario: A pull request from a fork

- **WHEN** CI deploys the preview of a pull request opened from a fork
- **THEN** the preview's deployment names the pull request's head commit, and discovery for that commit reports its URL
