# Standing authorization for the Cloudflare token self-widen

**Status:** ready-to-ship
**Open questions:** none

## Why

The self-widen is the design — a two-checkbox token that grants itself what it needs — but in practice every run stalls: the agent reads "change the permissions on the user's account credential" as an outward-facing, hard-to-reverse act and asks first. The user then has to say "yes, you're allowed to do that", every time. Nothing in the payload states the authorization, so the agent is behaving correctly on the information it has. The fix is to put the standing permission in writing, where an agent about to widen will read it.

## What Changes

- **`wiki/stack/cloudflare-credentials.md` owns the standing authorization.** A named subsection states it plainly: pasting the token *is* the grant, the two permission groups exist for no other purpose, widening is expected and reversible (`### Narrowing back`, already on the page), and an agent should widen and report rather than ask. It sits with the security trade-off already stated on that page, so the authorization and its cost are read together.
- **`/wong-cloudflare` restates the rule as behaviour and links.** Step 2 opens with "do this without asking; say what you did afterward." The Boundaries block's `Ask before creating or deleting anything billable` gains its counterpart — widening is not billable and is not in scope for that rule.
- **The two references carry it where the agent actually is.** `references/permission-groups.md` states it in The rules (an agent following the protocol cold, outside the skill, sees it there); `references/failure-map.md` adds the row for "the agent stopped to ask" — cause: it didn't know it was authorized, fix: the credentials page.
- **The `.env.example` fragment gains one comment line** next to `CLOUDFLARE_API_TOKEN` — the file an agent reads when it goes hunting for the credential. A fragment edit is behavioural, and it is covered by this change's `VERSION` bump.
- **Payload edit = release**: `VERSION` bump, newest-first `CHANGELOG.md` entry, `node scripts/check-payload-links.mjs` green.

**Non-goals:** no change to the `CLAUDE.md` `WONG-STACK` block (it lands in repos that declined the pack, which must stay stack-agnostic); no `.claude/settings.json` permission-allowlist entry (the friction reported is the agent asking in prose, not a Bash prompt on `curl`); no change to the widen protocol itself, and no weakening of the stop-on-failure or narrow-back-afterward rules.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cloudflare-provisioning`: the self-widen requirement gains the standing authorization — the payload SHALL state that the widen is pre-authorized by the act of providing the token, and the skill SHALL perform it without asking, reporting what it granted.

## Impact

- `wiki/stack/cloudflare-credentials.md` (owner of the statement)
- `.claude/skills/wong-cloudflare/SKILL.md` (Boundaries, Step 2)
- `.claude/skills/wong-cloudflare/references/permission-groups.md`, `references/failure-map.md`
- `.claude/skills/wong-sync/references/stack-pack-fragments.md` (the `.env.example` fragment)
- `VERSION`, `CHANGELOG.md`

All stack-pack-gated surfaces plus the two release files; a repo without the pack sees nothing new.

## Decision log

- **2026-08-06** — Planned and implemented in one session. The diagnosis is that the payload never stated the authorization, so an agent applied its ordinary caution rule to a `PUT` on the user's credential and asked — correct behaviour on the information available. Two placement questions were put to the user: (1) where the statement lives — answered *stack-pack surfaces only, plus the `.env.example` fragment comment*, ruling out a `CLAUDE.md` `WONG-STACK` block line because that block ships to repos which declined the pack and must stay stack-agnostic; (2) whether the friction included a Bash permission prompt on the `curl` `PUT` — answered *no, just the agent asking in prose*, so no `.claude/settings.json` allowlist entry was added (it would solve a different problem without evidence). `wiki/stack/cloudflare-credentials.md` owns the statement (new `### The widen is pre-authorized`, placed before `### Narrowing back` and above the account-root trade-off so grant → reversal → cost read in one pass); the skill, the widen protocol, and the failure map restate it as a one-sentence rule and link back — restating a *rule* rather than duplicating a *definition*, which is what the single-source rule targets. The Boundaries counterpart sits directly beside "ask before creating or deleting anything billable" because that is the rule an agent generalizes from. Every restatement pairs the permission with its limits in the same breath, and a spec scenario locks that in. Released as 9.3.0 (minor — behavioural: a run now proceeds through the widen without prompting, and a fragment changed); `node scripts/check-payload-links.mjs` reports no dead links. The branch was renamed from `cloudflare-scope-permissions` to match the change name.
