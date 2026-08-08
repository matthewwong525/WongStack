## Context

The generic `WONG-STACK` block in `AGENTS.md` is the shared doctrine that the installer copies into target repositories. `wiki/voice.md` already asks for short, direct prose, but the shared rules do not name a controlled-English standard.

## Goals / Non-Goals

**Goals:**

- Put one clear ASD-STE100 rule in the generic doctrine.
- State that compliance is best effort.
- Protect exact technical text from rewriting.

**Non-Goals:**

- Distribute or reproduce the ASD-STE100 specification.
- Add a linter or claim certified compliance.
- Rewrite existing repository prose as part of this change.

## Decisions

### Put the rule in the generic `AGENTS.md` block

The rule belongs in the `## Rules` list because it governs agent output across all WongStack repositories. The installer already treats this block as the shared doctrine. A wiki-only rule would not be visible soon enough.

Alternative: Add the rule only to `wiki/voice.md`. This would limit the rule to wiki prose and would require agents to find that page before the rule could apply.

### Define best effort and exact-text exceptions in the rule

The rule will name ASD-STE100, state that best effort is sufficient, and exempt code, commands, identifiers, quotations, and prescribed text. This makes the requirement useful when the standard is not locally available and prevents technical corruption.

Alternative: Use only the sentence “Always use ASD-STE100 Simplified Technical English.” This is shorter, but it can imply formal verification and can cause agents to rewrite text that must stay exact.

## Risks / Trade-offs

- **Risk: Agents have different knowledge of ASD-STE100.** → State that compliance is best effort; do not claim formal conformance.
- **Risk: The new rule conflicts with exact source text.** → Exempt text that must remain exact.
- **Risk: Existing prose does not meet the new rule.** → Apply the rule to new and edited prose; do not make this small change a repository-wide rewrite.
