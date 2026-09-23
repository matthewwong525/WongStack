## Purpose

Lets `/save`, `/verify`, and `/ship` find the preview URL for the current commit without per-repo configuration, and never report a provider's home page as a preview.

## ADDED Requirements

### Requirement: Preview discovery never reports a bare provider apex

Preview discovery SHALL try, in order, GitHub Deployments for the head commit, commit statuses, check runs, and pull-request comments, and SHALL print the first preview URL it finds. For the three methods that match free text, it SHALL reject any candidate whose host is exactly a known provider apex, such as `workers.dev` or `vercel.app`. It SHALL only reject candidates. It SHALL NOT construct or repair a URL. When no candidate remains, it SHALL print nothing.

#### Scenario: A bot comment links the provider logo before the preview

- **WHEN** a pull-request comment links `https://workers.dev` in its header and `https://feature-app.example.workers.dev` in its table
- **THEN** discovery prints `https://feature-app.example.workers.dev`

#### Scenario: Only the apex is present

- **WHEN** the only preview-looking URL in every source is `https://workers.dev`
- **THEN** discovery prints nothing

#### Scenario: A deployment URL is trusted

- **WHEN** a GitHub Deployment status for the head commit has an `environment_url`
- **THEN** discovery prints that URL before it reads any free-text source
