<!-- openspec-archive v1 2026-08-06-authorize-token-widen -->
<!-- file proposal.md utf8 5111 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 5389 -->
## Context

The stack pack's whole credential story rests on one move: the user grants two permission groups, and the token grants itself the rest on demand. The mechanics are documented in detail — [the widen protocol](../../../.claude/skills/wong-cloudflare/references/permission-groups.md) owns the call sequence, [the credentials page](../../../wiki/stack/cloudflare-credentials.md) owns the token name and the account-root trade-off, [`/wong-cloudflare` Step 2](../../../.claude/skills/wong-cloudflare/SKILL.md) states the outcome.

What none of them state is that the agent is *allowed* to do it. An agent reading "issue `PUT /user/tokens/{id}` to change the permissions on the user's Cloudflare credential" applies the ordinary caution rule — outward-facing, hard to reverse, touches an account it doesn't own — and asks first. Users report having to grant permission on every run. Nothing is broken; the payload is silent on a fact only the payload can supply.

The change is prose-shaped: state the authorization once, restate it as behaviour at each point of use, and leave every adjacent guardrail intact.

## Goals / Non-Goals

**Goals:**
- An agent that reaches the widen — inside `/wong-cloudflare` or following the protocol reference cold — proceeds without asking, and reports what it granted.
- One owning statement, linked from elsewhere, per the single-source rule.
- The authorization is legible to a *user* too: someone reading the credentials page learns that pasting the token is the grant.

**Non-Goals:**
- Loosening anything else. Billable creates/deletes still ask; a failed widen still stops; narrowing back is still offered.
- Any surface outside the stack pack. No `CLAUDE.md` block edit — the block ships to repos that declined the pack and must stay stack-agnostic.
- Any `.claude/settings.json` permission entry. The reported friction is the agent asking in prose; a Bash allowlist solves a different problem and would need its own evidence.
- Changing the widen protocol, the granted groups, or the two-checkbox screen.

## Decisions

**The credentials page owns the statement; every other surface links.** It already owns the token variable's name and the "this token is effectively account-root" trade-off. Authorization and its cost belong on one page, read together — a permission grant stated somewhere the security consequence isn't would be the worse split. Alternative considered: put it in `permission-groups.md`, which is where the widen actually happens. Rejected because that reference is agent-facing only; a *user* deciding whether this is acceptable will never open it.

**Restate it as behaviour, not as a link, at each point of use.** An agent doesn't reliably follow a link before acting. Each of Step 2, the Boundaries block, and the protocol's rules gets an imperative sentence — *widen without asking; report what you granted* — with the link carrying the rationale. This is restating a *rule*, not duplicating a *definition*; the single-source rule targets the latter.

**The Boundaries block gets the counterpart, not just an addition.** `Ask before creating or deleting anything billable` is the nearest rule, and an agent generalizes it to "ask before anything account-touching." Naming the exception right there is what stops the generalization: the widen is free and reversible, and it is out of that rule's scope.

**The failure map gets a row for the agent stopping to ask.** The map is the "something went sideways, look here" surface. A stalled run *is* a failure mode of this design — cause: the agent didn't know it was authorized; fix: the standing authorization on the credentials page. It also makes the symptom searchable for the next person who hits it.

**`.env.example` gets one comment line, and that makes this a behavioural change.** The fragment is where an agent hunting the credential lands first. Per `CLAUDE.md`, a fragment is code: this alone requires the `VERSION` bump and changelog entry, which the change carries anyway. The line stays short and points at the credentials page rather than restating the rule — the file is a template, not a place for prose.

**Semver: minor.** It changes what a provisioned run does (one fewer prompt) without changing any interface or removing anything. A patch would under-describe a behavioural change to the provisioning path.

## Risks / Trade-offs

- **Writing down "widen without asking" makes an account-root escalation feel routine.** → The statement lives on the page that already says, in bold, that this token is effectively account-root, and it names what the grant *doesn't* cover. The authorization is scoped to the widen, never to provisioning.
- **An agent generalizes the exception to "don't ask about anything Cloudflare."** → The spec has a scenario for it, and each restatement pairs the permission with the limit in the same sentence rather than in a separate paragraph.
- **The friction was actually a Bash permission prompt on `curl`, not prose.** → The user confirmed it's the agent asking in prose. If a prompt shows up later, an allowlist entry is a separate, small change.
- **Six surfaces saying the same thing drift.** → Only the credentials page carries the reasoning; the others carry one imperative sentence and a link, which is cheap to keep true. `scripts/check-payload-links.mjs` catches the link half.

<!-- end design.md -->
<!-- file tasks.md utf8 2464 -->
## 1. The owning statement (wiki)

- [x] 1.1 In `wiki/stack/cloudflare-credentials.md`, add a named subsection under "How two checkboxes become enough" stating the standing authorization: providing a token with these two permission groups *is* the permission to widen it; an agent widens and reports rather than asking; the grant covers the widen only — billable creates/deletes still ask, a failed widen still stops, narrowing back is still offered.
- [x] 1.2 Place it so it reads with "The security trade-off, stated plainly" and `### Narrowing back` — the grant, its cost, and its reversal in one pass. Mark the subsection as the owner of the statement, the way the page already marks its ownership of the token variable's name.

## 2. The provisioning skill

- [x] 2.1 `SKILL.md` Boundaries: give `Ask before creating or deleting anything billable` its counterpart — the token widen is free and reversible and is out of that rule's scope; widen without asking, link to the credentials subsection from 1.1.
- [x] 2.2 `SKILL.md` Step 2 — the token widens itself: open with the imperative (do it without asking, say afterward which permissions were granted), keeping the existing stop-on-failure paragraph unchanged.

## 3. The references

- [x] 3.1 `references/permission-groups.md` — add the authorization to **The rules** as its own bullet, so an agent following the protocol outside the skill sees it. One sentence plus the link; the reasoning stays on the wiki page.
- [x] 3.2 `references/failure-map.md` — add a row for the run that stalled because the agent asked for permission to change the token's scope: cause "the standing authorization wasn't read", fix the credentials subsection.

## 4. The fragment

- [x] 4.1 `.claude/skills/wong-sync/references/stack-pack-fragments.md` — add one comment line above `CLOUDFLARE_API_TOKEN` in the `.env.example` fragment noting the token is expected to widen its own permissions, pointing at the credentials page. Keep it to one line; no restated rule in a template.

## 5. Release

- [x] 5.1 Bump `VERSION` to the next minor (9.3.0) — behavioural: a provisioning run now proceeds through the widen without prompting, and a fragment changed.
- [x] 5.2 Add the newest-first `CHANGELOG.md` entry for 9.3.0 describing the standing authorization and what it does not cover.
- [x] 5.3 Run `node scripts/check-payload-links.mjs` and resolve any dead link (conditional links are reported, not failures).

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 3783 -->
## MODIFIED Requirements

### Requirement: The token widens its own permissions rather than requiring a pre-granted set


The documented credential SHALL be a single user-scoped Cloudflare API token carrying only `API Tokens Write` (user scope) and `Account API Tokens Write` (account scope), with the user's account included in its resources. The skill SHALL obtain any further permission it needs by reading its own token id from `/user/tokens/verify`, reading its current policy document from `/user/tokens/{id}`, resolving permission-group ids **by name** from `/user/tokens/permission_groups`, and issuing `PUT /user/tokens/{id}` with a widened policy set. Because the `PUT` replaces policies wholesale, the widened set SHALL include the original two permission groups. The skill SHALL verify the widen took effect before proceeding, and SHALL offer to narrow the token back afterward.

The widen SHALL be **pre-authorized by the act of providing the token**: the payload SHALL state, on the page that owns the credential, that supplying a token carrying these two permission groups *is* the permission to widen it, and every payload surface that instructs an agent to widen SHALL direct it to proceed without asking and to report afterward which permissions it granted. Confirmation SHALL NOT be sought for the widen itself. This authorization SHALL NOT extend to any other rule: creating or deleting billable resources still requires asking, a failed or unverified widen still stops the run, and narrowing back is still offered rather than assumed.

#### Scenario: A two-permission token becomes sufficient

- **WHEN** the skill runs with a token holding only the two API-token permission groups
- **THEN** it widens itself to include the permissions the requested work needs
- **AND** it confirms by re-probing the target surfaces before provisioning anything

#### Scenario: The widen proceeds without asking

- **WHEN** an agent following the payload reaches the point of widening a token the user has provided
- **THEN** it performs the widen without asking the user for permission to change the token's scope
- **AND** it reports afterward which permissions it granted

#### Scenario: The authorization is stated where an agent will read it

- **WHEN** an agent reads any payload surface that instructs it to widen — the provisioning skill, the widen-protocol reference, or the credentials page
- **THEN** that surface states the standing authorization or links to the page that owns it
- **AND** the credentials page states it alongside the account-root trade-off, so the grant and its cost are read together

#### Scenario: The authorization does not widen any other rule

- **WHEN** the same run reaches a step that creates or deletes a billable resource
- **THEN** it still asks first
- **AND** a `PUT` that fails or does not verify still stops the run before anything is provisioned

#### Scenario: The ability to widen again is preserved

- **WHEN** the skill builds the widened policy set
- **THEN** the set still contains `API Tokens Write` and `Account API Tokens Write`
- **AND** a later run can widen the same token again

#### Scenario: Permission-group ids are resolved by name at runtime

- **WHEN** the skill needs a permission group
- **THEN** it looks the id up by name from the live permission-groups endpoint rather than relying on a hardcoded id
- **AND** where two groups share a name, it selects by scope (`com.cloudflare.api.account`) rather than by position

#### Scenario: Self-escalation is refused

- **WHEN** the `PUT` fails or the post-widen verification shows the permissions did not take effect
- **THEN** the skill stops before provisioning
- **AND** it reports which surfaces are unavailable and lists the permissions to grant manually

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-06

~~~
<!-- end .openspec.yaml -->
