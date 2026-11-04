## MODIFIED Requirements

### Requirement: One rule decides fix or ask

When an agent meets a problem while building, saving or checking a change, it SHALL fix the problem alone when the plan already settles what is right, and SHALL bring it to the person when fixing it needs a decision the plan does not make. A problem SHALL be brought to the person when the fix goes outside the plan (a change people see that the plan doesn't name, added scope, a new dependency, or unrelated code), would weaken a check, can't be undone or touches keys, logins, access, data loss or money, still fails after two fixes, or is a finding the builder disputes after one exchange. Inside `/ship`, the rule for asking during a publish SHALL decide instead which of these the person sees. `/apply`, `/save` and `/verify` SHALL follow this one rule from one owning page.

#### Scenario: A failing test in the change's own files

- **WHEN** a check fails and the fix lies in files the change already touches, inside the plan
- **THEN** the agent fixes it and lists the fix in its report, without asking

#### Scenario: A fix would loosen a check

- **WHEN** the only fix an agent finds for a failure is to switch a check off or weaken it
- **THEN** the agent asks the person, with its recommended answer, before making that edit

## ADDED Requirements

### Requirement: Ship takes a safe recommended answer instead of asking

Inside `/ship` and every step it runs, a question whose recommended answer stays inside the work and can be undone SHALL be answered with that recommendation, with no stop. Each such choice SHALL be logged in the change's Decision log as assumed, with its reason, and the ship report SHALL list every one under *Choices I made*, one plain line each. `/ship` SHALL still stop and ask when the recommended answer uses a key, signs in or changes access; spends money; sends, posts, or changes a business record or real data; deletes something outside the change; accepts terms; or weakens a check; and when something still fails after two fixes or no answer is clearly best. The same steps typed on their own SHALL keep asking.

#### Scenario: A design question mid-publish

- **WHEN** the build inside `/ship` asks where a removed screen's controls should go, recommending new commands that the change adds
- **THEN** `/ship` takes the recommendation, logs it as assumed, goes on to publish, and lists it under *Choices I made*

#### Scenario: A real sign-in is needed

- **WHEN** a live check inside `/ship` needs to sign in with the person's saved login
- **THEN** `/ship` stops and asks, even though signing in is the recommended answer

#### Scenario: A plain build

- **WHEN** the person types `/apply` and its build meets the same design question
- **THEN** `/apply` asks the person, as before
