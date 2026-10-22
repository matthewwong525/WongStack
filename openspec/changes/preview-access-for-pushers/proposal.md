# Proposal

**Status:** in-progress
**Branch:** preview-github-behavior
**Open questions:** none

## Why

When you give someone push rights to the project on GitHub, they still can't open a preview. The preview's sign-in only lets in people you added in Access, so a preview link in their own pull request shows them a refusal. This showed up in ClaymooApp. Someone who can push already decides what code runs on a preview, so letting them sign in to see it adds very little risk.

## What Changes

- **Anyone who can push on GitHub can sign in to previews.** Every 15 minutes the live app reads who can push to the project on GitHub and adds their email to the previews' sign-in list. It doesn't add them to the live app's list. Take away someone's push rights on GitHub and they lose preview sign-in within 15 minutes, and any preview sign-in they had ends.
  ```mermaid
  flowchart TD
    gh["GitHub: who can push"] -->|every 15 min| email{email known?}
    email -->|no| ask["Access asks you"]
    email -->|yes| prev["previews sign-in"]
    ask --> prev
    people["people in Access"] --> prev
    people --> live["live app sign-in"]
  ```
- **The app finds their email by itself when it can.** It uses the email on their GitHub profile, or the one on their own commits in the project. When neither exists, Access lists them under People and asks you to type their email once.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><h3>Can push on GitHub</h3><span class="tag">3</span></div>
    <p class="muted">They can open previews, not the live app.</p>
    <div class="sep"></div>
    <div class="row gap"><span class="grow">@kimlee</span><span class="muted">kim@example.com</span><span class="tag-outline">Can open previews</span></div>
    <div class="row gap"><span class="grow">@samdev</span><span class="muted">sam@example.com</span><span class="tag-outline">Can open previews</span></div>
    <div class="row gap"><span class="grow">@jo-builds</span><span class="danger">Needs an email</span></div>
    <div class="row gap"><input class="grow" placeholder="Jo's email"><button class="btn-primary">Save</button></div>
  </div>
  ```
- **On a preview, they can open every app.** Today a preview refuses everyone it doesn't know, so even a teammate who gets past the sign-in sees nothing. Now anyone the preview's sign-in lets in, and who isn't on the preview's practice list, gets every app on it. They still can't manage Access there. Previews hold only made-up people and test keys.
- **A project with no GitHub key, or one kept in Cloudflare, works as it does today.** The section says what's missing instead.

Non-goals: no GitHub login on the sign-in page. Cloudflare can't check push rights on a repository, so emails stay the way in. Being able to push still gives no access to the live app. ClaymooApp's own sign-in code gets a matching change separately.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cloudflare-provisioning`: the previews application admits the live app's people plus the project's GitHub pushers, instead of exactly the same people.
- `employee-onboarding`: a new requirement for pushers' preview sign-in and the Access section that shows them; a preview gives every app to a signed-in person outside its practice list.

## Impact

- Worker: `app/worker/employee-access/login-management.ts` (separate desired lists per application, a previews-only session revocation), a new `app/worker/employee-access/pushers.ts` (GitHub read and email lookup), `app/worker/employee-access/github.ts` (one user-profile call), `app/worker/employee-access/policy.ts` (staging outsiders get every app), `app/worker/index.ts` (a `scheduled` handler).
- Config: a cron trigger on production in `app/wrangler.jsonc`, with `env.staging.triggers.crons: []`.
- Data: a new D1 migration in `schema/migrations/` for the pushers table.
- Screens: Access People view (`app/src/apps/access/People.tsx` and a new section component).
- GitHub: uses the key the live app already holds (`WONG_CODE_READ` or `WONG_CODE_WRITE`); listing collaborators needs only Metadata read, which every fine-grained token has.
- Docs: `wiki/stack/employee-access.md`, `wiki/stack/cloudflare-access.md`, `wiki/stack/access-screens.md`; a `minor` CHANGELOG entry.

## Decision log

- **2026-10-22** — Asked whether people who can push should get preview access automatically → chose to plan automatic preview access.
- **2026-10-22** — Asked where to build it first → chose WongStack; ClaymooApp follows separately.
- **2026-10-22** — Asked how to find a pusher's email → chose to find it from their GitHub profile or commits, else ask the owner once.
- **2026-10-22** — Asked what a pusher can open on a preview → chose every app, with no Access management.
- **2026-10-22** — Asked how fast GitHub changes reach the sign-in → chose every 15 minutes.
- **2026-10-22** — Assumed: pushers get preview sign-in only, never the live app, because the reason for the change is that their code already runs on previews, not on the live app.
- **2026-10-22** — Assumed: an email the owner types wins over one the app found, because the owner knows which address the person reads.
- **2026-10-22** — Assumed: a failed read from GitHub changes nobody's sign-in, because a GitHub outage must not lock teammates out.
- **2026-10-22** — Assumed: a project kept in Cloudflare gets nothing new, because it has no GitHub pushers; people who save there already hold Project code and are on both lists.
- **2026-10-22** — Assumed: no GitHub login method on previews, because Cloudflare's GitHub rules match an organization or team, not a repository's collaborators.
- **2026-10-22** — Assumed: the live-app checks (the cron in the Triggers tab, a throwaway collaborator added and removed) run after publishing, not as build tasks, because `/ship` can't archive a change with a task that needs it already live.
- **2026-10-22** — Asked what happens to pushers' preview sign-in when the GitHub key goes away or the project leaves GitHub → chose to keep them until the key is back.
- **2026-10-22** — Assumed: each refresh reads the previews list once and rewrites it when it lacks the saved pushers, because setup's `access` step rewrites that list to the owner and live people, which would lock pushers out while Access says they can open previews.
- **2026-10-22** — Saved for its checks inside `/ship`: built, reviewed by a second agent (two bugs fixed: pushers put back after setup rewrites the previews list, a contradictory staging line), local checks passing apart from a known slow `Welcome.test.tsx` under full-suite load, left for CI.
