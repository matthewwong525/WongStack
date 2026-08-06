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
