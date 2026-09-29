# Spec Delta

## MODIFIED Requirements

### Requirement: /close keeps the session's transcript
Before closing, when the store has a transcript bucket, `/close` SHALL upload the session's full transcript, with secrets redacted as capture does, so it is kept even if no later session captures it. A session an earlier version recorded as private SHALL NOT be uploaded; no word in a message SHALL keep a session from being uploaded. A store without a bucket, or an unreachable one, SHALL skip the upload without blocking the close and SHALL say so.

#### Scenario: A normal close
- **WHEN** the person runs `/close` in a repo whose memory store has a bucket
- **THEN** the session's redacted transcript is in the bucket before the workspace closes, and `source` on the session's facts shows it

#### Scenario: A private session
- **WHEN** an earlier version recorded the session as private and the person runs `/close`
- **THEN** nothing is uploaded and the close goes on
