# Spec Delta

## MODIFIED Requirements

### Requirement: Current app grants govern business access everywhere

Current employee grants SHALL govern app lists, direct app visits, associated described and bare API routes, and assistant discovery/calls. Server authorization SHALL apply before business work, preserve stricter existing action and record checks, and deny unavailable or unmapped policy. Client state, existing login, cached descriptions and repository access SHALL grant no extra permission. The installation's verification service token SHALL keep every built app on previews and the live app, as before permissions started. On a preview it SHALL be able to open and save the employer's Access screens against the practice list; on the live app it SHALL never manage people. Acknowledged grant removal SHALL deny subsequent requests; work already admitted SHALL not be claimed undone.

#### Scenario: An employee calls a hidden app API

- **WHEN** an employee assigned Orders but not Payroll calls Payroll directly with a valid session
- **THEN** the server denies Payroll before business work while Orders remains available

#### Scenario: The verification machine checks a preview

- **WHEN** the verification service token opens an app page or calls its API on a preview after permissions have started
- **THEN** the request is allowed, and it can open the employer's Access screens and save a change to the practice list

#### Scenario: An assigned app is removed during a session

- **WHEN** app deselection is acknowledged and the employee sends their next request with the same valid session
- **THEN** that app's request is denied without needing logout or changing other app grants

#### Scenario: The verification machine tries to manage people on the live app

- **WHEN** the verification service token sends a people-management request to the live app
- **THEN** it is denied and nobody's access changes

## ADDED Requirements

### Requirement: Access never loses an unsaved change silently

Access SHALL tell the employer plainly whether a save finished, where they land after it. When the employer leaves a person's, role's, app's or key's page with changes not yet saved, Access SHALL ask before the changes are dropped, and SHALL keep them when the employer chooses to stay.

#### Scenario: The employer leaves with unsaved changes

- **WHEN** the employer changes a level on a person's page and opens another view without saving
- **THEN** Access asks whether to leave, and staying keeps the change on the page
