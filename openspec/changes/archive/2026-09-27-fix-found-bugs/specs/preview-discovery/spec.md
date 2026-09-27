## MODIFIED Requirements

### Requirement: Preview discovery never reports a bare provider apex

Preview discovery SHALL try, in order, GitHub Deployments for the head commit, commit statuses, check runs, and pull-request comments, and SHALL print the first preview URL it finds. The pull-request-comment method SHALL read only comments that name the head commit, by its full or its seven-character short SHA, and SHALL take the newest such comment first, so a preview from an earlier commit is never reported. For the three methods that match free text, it SHALL reject any candidate whose host is exactly a known provider apex, such as `workers.dev` or `vercel.app`. It SHALL only reject candidates. It SHALL NOT construct or repair a URL. When no candidate remains, it SHALL print nothing.

#### Scenario: A bot comment links the provider logo before the preview

- **WHEN** a pull-request comment that names the head commit links `https://workers.dev` in its header and `https://feature-app.example.workers.dev` in its table
- **THEN** discovery prints `https://feature-app.example.workers.dev`

#### Scenario: Only the apex is present

- **WHEN** the only preview-looking URL in every source is `https://workers.dev`
- **THEN** discovery prints nothing

#### Scenario: A deployment URL is trusted

- **WHEN** a GitHub Deployment status for the head commit has an `environment_url`
- **THEN** discovery prints that URL before it reads any free-text source

#### Scenario: A bot posts one comment per deploy

- **WHEN** the pull request has a preview comment for an earlier commit and a newer one that names the head commit
- **THEN** discovery prints the newer comment's URL

#### Scenario: No comment names the head commit

- **WHEN** the only preview comments name earlier commits, and no other method finds a URL
- **THEN** discovery prints nothing
