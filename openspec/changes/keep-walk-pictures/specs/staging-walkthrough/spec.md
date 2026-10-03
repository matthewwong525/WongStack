# Spec Delta

## MODIFIED Requirements

### Requirement: Evidence is posted on every verdict

Each `/verify` SHALL post one new pull-request comment, whatever its verdict, covering each journey's probe, steps, `THEN`, and verdict, where the probes ran, and each unverified scenario by name. A repeat SHALL add a comment, never edit one. Screenshots that were kept SHALL be linked from the comment, and when none were kept the comment SHALL say so and why. The comment SHALL NOT cite a local path the walk deletes.

#### Scenario: A walk that could not run

- **WHEN** a walk returns `UNKNOWN`
- **THEN** a comment says the change was not verified, and why

#### Scenario: Two walks

- **WHEN** `/verify` runs twice on one pull request
- **THEN** two comments exist, in order, and the first is unchanged

#### Scenario: A walk whose pictures were not kept

- **WHEN** a browser journey passes on a repo whose store has no bucket
- **THEN** the comment says the pictures were not kept and why, and names no local file

## ADDED Requirements

### Requirement: A walk's screenshots are kept privately

With a memory bucket and a login on the app, a walk SHALL keep its screenshots in the repo's private store with no expiry, and the comment SHALL carry one link per screenshot. A link SHALL open only for a caller the app's login accepts, and SHALL never show a transcript or any other object in the store. Only the walk's own machine credential SHALL add a screenshot, and a kept screenshot SHALL NOT be replaced. Keeping screenshots SHALL need no setting and no setup step beyond the memory bucket and the login.

#### Scenario: A reviewer opens a picture

- **WHEN** a person logged in to the app opens a screenshot's link from the comment
- **THEN** the picture shows

#### Scenario: A caller with no login

- **WHEN** a request with no accepted login asks for a kept screenshot, or for a transcript's path through the picture address
- **THEN** nothing from the store is returned

### Requirement: A walk says when its pictures were not kept

When a walk's screenshots cannot be kept privately, `/verify` SHALL say so in the chat and in the comment, with the reason in plain words: no bucket on the store, no login on the app, the production site not yet serving pictures, or no machine credential. It SHALL NOT keep them anywhere a person with no login can reach, and the missing pictures SHALL NOT change the verdict.

#### Scenario: No payment method on the Cloudflare account

- **WHEN** a walk passes on a repo whose Cloudflare account has no R2
- **THEN** the verdict is unchanged, and the chat and the comment say the pictures were not kept because the account has no storage

#### Scenario: Storage but an open site

- **WHEN** a walk passes on a repo with a bucket whose app has no login yet
- **THEN** no screenshot is stored, and the report says pictures are kept once the site has a login

### Requirement: A past walk's pictures can be shown in the chat

When a person asks for the pictures of a past walk on a pull request, `/verify` SHALL show that walk's kept screenshots in the chat, each with a line saying what it shows, and SHALL leave nothing on the machine afterwards. When that walk kept none, it SHALL say so.

#### Scenario: Pictures from last week's walk

- **WHEN** a person asks for the pictures from the walk on a pull request merged last week
- **THEN** each kept screenshot from that walk's comment appears in the chat, and the working tree is unchanged

### Requirement: A public media bucket keeps working

An install that sets `WALK_MEDIA_BUCKET` and `WALK_MEDIA_BASE_URL` SHALL keep publishing screenshots to that bucket and showing them inline in the comment, under those names.

#### Scenario: An install with a public bucket updates

- **WHEN** a repo with both `WALK_MEDIA_` variables set takes this update and runs a walk
- **THEN** its comment shows the screenshots inline from the public bucket, as before
