## ADDED Requirements

### Requirement: Only a deploy app names the preview in a comment

Preview discovery SHALL take an address from a pull request comment only when a GitHub App (a bot account) wrote the comment, and SHALL take only an `https` address from any source: a deployment, a commit status, a check run, or a comment. A comment from a person SHALL never become the preview, however new it is.

#### Scenario: A stranger's hidden comment

- **WHEN** the head commit has no deployment, status, or check-run preview, a deploy bot's comment names it with `https://feature-app.example.workers.dev`, and a newer comment from a person names it with `https://deploy-preview.attacker.example/`
- **THEN** discovery reports `https://feature-app.example.workers.dev`

#### Scenario: A plain http address

- **WHEN** the only preview-like address for the head commit is `http://preview.localhost:18080/`
- **THEN** discovery reports no preview
