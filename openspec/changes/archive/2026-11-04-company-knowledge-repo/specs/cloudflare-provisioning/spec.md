# Spec Delta

## ADDED Requirements

### Requirement: Setup makes the knowledge repository on both routes

Setup SHALL create the install's knowledge repository in the chosen Cloudflare account on the GitHub route and the Cloudflare route alike, record it as committed nonsecret configuration, and connect the live app to it so no key is made or pasted. Staging SHALL get no connection that can write to it. On the GitHub route, the user token SHALL widen itself to create the repository and read the plan, and SHALL NOT gain the check runner's permissions. Running the step again SHALL change nothing that is already right, and SHALL never empty or replace a repository that holds pages.

#### Scenario: A GitHub install

- **WHEN** setup provisions a new GitHub-route install on a paid account
- **THEN** a knowledge repository exists in that account, the live app is connected to it, staging is not, and no key was asked for

#### Scenario: Setup runs again

- **WHEN** setup's Cloudflare step runs again on an install whose knowledge repository holds pages
- **THEN** the repository and its pages are unchanged
