# Spec Delta

## ADDED Requirements

### Requirement: A landing page preview can only reach the staging site

A branch's landing page SHALL be installed, tested and built with no Cloudflare token. Its preview SHALL be deployed by the default branch's copy of the workflow's steps and the site's deploy settings, only to `wongstack-site-staging` with no routes. A branch's edits to the site's deploy settings SHALL apply when published, never in a preview. Only a push to the default branch SHALL publish wongstack.com.

#### Scenario: A branch points staging at the live site

- **WHEN** a branch sets the site's staging name to `wongstack-site` or `wongstack`, or drops staging's empty routes
- **THEN** its preview still deploys only to `wongstack-site-staging` with no routes

#### Scenario: A branch's site script reads the token

- **WHEN** a branch's site `package.json` adds a script that prints `CLOUDFLARE_API_TOKEN`
- **THEN** the script finds no token during install, test or build
