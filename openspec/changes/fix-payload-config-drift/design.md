## Context

Three shipped facts contradict the code. All three were hit by adopting agents rather than found by review, and all three are one-line edits — the design work is in stopping them recurring, because two of the three have recurred already.

The token variable's history is the instructive one:

| release | state |
|---|---|
| 7.x | `cloudflare-credentials.md` said `CLOUDFLARE_USER_TOKEN`; `.env.example` shipped `CLOUDFLARE_API_TOKEN`. CHANGELOG logged it as "known drift, not fixed here" |
| 8.6 | fragment and docs reconciled on `CLOUDFLARE_API_TOKEN`; the `stack-pack` spec made it normative |
| 9.0.0 (`d3446fb`) | `.env.example` renamed **back** to `CLOUDFLARE_USER_TOKEN`, as a commit titled `docs(env)` |

So the name is currently wrong, against a spec that says it SHALL be right, having been fixed once. The mechanism that failed is that the name lives in seven files and the template is one of them — editing a template reads as documentation, gets reviewed as documentation, and ships without anyone consulting the spec that governs it.

## Goals / Non-Goals

**Goals:**
- The shipped template names the variable the code reads.
- A target repo cannot commit the account-root credential it is about to be handed.
- The payload stops describing a command surface `openspec init` no longer creates.
- Each of the three has a mechanism that makes recurrence visible, not just a corrected value.

**Non-Goals:**
- Changing the variable's name to anything other than `CLOUDFLARE_API_TOKEN` — wrangler reads it, so it is not a free choice.
- Auditing every payload template for the same class of defect; the rule lands here and `/improve docs` can sweep later.
- The CI failures, the missing wiki pages, and the Access runbook — separate changes.

## Decisions

### The variable gets an owner, not just a correction

Correcting `.env.example` alone restores today's behaviour and leaves the mechanism intact — the same edit could land again next release with the same review outcome. The payload already has the tool for this: *"Each fact in the payload SHALL have exactly one file that states it. Every other surface SHALL link to the owner rather than restate it."* The token variable is a fact stated in seven files and owned by none.

`wiki/stack/cloudflare-credentials.md` is the natural owner — it already explains what the token is, how to create it, and where it goes. The template and the fragment point at it.

The second half is classification: renaming a value the code reads is a **behavioural** change requiring a version bump and a changelog entry, not prose. That is what makes the next such edit visible in review, since it can no longer ride in as a docs commit.

*Alternative considered:* a CI check asserting the template and the scripts agree. Better in principle, rejected for now — this repo's payload is prose with no test suite, and adding a lint harness for one variable is disproportionate. The one-owner rule plus the classification is the cheap version; a check can follow if it recurs a fourth time.

### `.env*` uses the same shape as `.dev.vars*`

Not a new pattern — the wildcard-plus-negation is already specified and already reasoned through for `.dev.vars`, and the reasoning transfers exactly: a per-environment variant holds real values, and the committed example must survive the wildcard. Using the identical shape means one explanation covers both, which is also what the single-source rule wants.

Worth stating plainly in the changelog: WongStack's own `.gitignore` has covered `.env*` since `a213aa6`, so this repo was never exposed. The **fragment** is what travels to targets, and it was never widened. That asymmetry is why the defect survived — the maintainers' own repo is not the artifact under test.

### The `opsx` claim is corrected, not restored

The payload could try to make the commands exist again by copying them. Rejected: the manifest deliberately excludes generated files so they always match the installed CLI, and that reasoning is still right. What is wrong is only the description. So the manifest says what the CLI now produces, and the `WONG-STACK` block stops offering `/opsx:*` as something a fresh repo has — the `openspec-*` skills are the entry point, and they are what actually lands.

## Risks / Trade-offs

- **A repo that already filled in `.env` from the broken template has a token under a dead name** → the changelog entry must say so explicitly and name the one-line fix; nothing can detect it for them, since a missing token reads as "not provisioned yet" rather than as an error.
- **Widening `.gitignore` in a repo that already committed a `.env`** → gitignore does not untrack an already-committed file. Where the fragment is applied to such a repo, the applier should say so rather than leave a false sense of coverage.
- **Naming an owner adds an indirection** for a reader who just wants the variable name → mitigated by the single-line-summary allowance the rule already carries: a surface may name the value in one sentence and link, it just may not become a second definition.
- **Classifying template edits as behavioural adds release friction** → intended. That friction is the mechanism.

## Migration Plan

`.env.example` and the fragments are payload files, so new adopters get the corrected forms by copy-if-absent. Existing repos own their copies and receive nothing automatically — the `.gitignore` and `.env.example` changes surface through `/wong-sync`'s adapt step as proposals.

`VERSION` takes a minor bump: the `.gitignore` fragment widening changes what a provisioning run does to a target repo, and the changelog needs to carry the "check your `.env` variable name" notice prominently enough that an affected repo acts on it.

## Open Questions

None blocking. One to settle during implementation: whether `cloudflare-credentials.md` or `wiki/development/secrets.md` is the better owner for the variable name — the former explains this specific token, the latter owns the `.env` convention generally. Pick one and link the other.
