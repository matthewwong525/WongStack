---
slug: widen-save-prose-fast-path
started: 2026-07-30
updated: 2026-07-30
consolidated:
---

# Widening `/save`'s fast path to prose

## What the user asked for

Verbatim intent: `/save` should push "not only notes into main" but also "stuff that is like not
related to code, so like markdown files or text files." The only case that should still open a PR is
"when there's like code changes that ties into like Cloudflare and stuff, like the config files or
or like code."

So the user's mental model is **behavior vs. prose**, and they named the boundary by the thing they
actually care about: a change that could affect the deployed Cloudflare app needs review; a
paragraph does not. "Markdown or text files" was their *proxy* for prose, not a request for an
extension check — worth remembering, because the implementation deliberately does not use it.

## Why extension-based routing was rejected

The user said "markdown files"; the change routes on path prefix instead. In most repos `*.md` would
be a fine proxy for prose. In WongStack it inverts, because the product *is* markdown:

- `.claude/skills/**/*.md` is the shipped payload — editing it is a release (bump VERSION + CHANGELOG).
- `openspec/**` is the specs.
- `AGENTS.md`/`CLAUDE.md` is the doctrine.

An `*.md` rule would push a skill rewrite, a spec edit, and a version bump straight to `main`
unreviewed — the exact thing the gate exists to stop. This trap isn't WongStack-specific: any repo
that documents in markdown next to its code has it.

Also rejected: a **denylist** ("everything except `.claude/`, `openspec/`, `app/`, config"). It fails
open — a payload surface added next year silently joins the fast path. The allowlist fails closed.

Also rejected: a **judgment escape hatch** (path scope decides, but `/save` may escalate a
prose-only diff to a PR when it reads as consequential). It turns "never push to the default branch,
except <enumerable list>" from a hard rule into a soft one, and makes routing unpredictable across
runs on the same kind of change.

## Unresolved: the user's answer contradicted itself

The AskUserQuestion on scope was multi-select. The user picked **both** "wiki/\*\*" (widen) and
"Only notes/ — keep as is" (don't widen). Read as **notes/ stays + wiki/ added, nothing else**,
because the original request was explicitly to widen, so "don't widen at all" would contradict the
whole ask. Flagged to the user twice; **not confirmed**. If they meant the opposite, this change is
wrong in kind, not in degree — it should be scrapped rather than trimmed.

They did *not* pick loose top-level prose (`README.md`, `CHANGELOG.md`, root scratch files) or
`openspec/changes/**`. Both stayed out.

## The trade-off that was accepted, not dodged

`wiki/` is canonical and curated — which is precisely why the pre-existing docs gave it a PR. Four
separate files justified the notes carve-out *by contrasting it with wiki edits*. Accepted anyway
because: `/dream` is deliberate and human-invoked, its diff is reviewed in-session before `/save`
runs, and a wiki page can't break a build or deploy. A wrong sentence is caught by the next
gardening pass (contradictions resolve newest-wins by design).

Consequence: those four justifications needed *replacing*, not deleting. The replacement reason is
"the gate stops unreviewed **behavior**; neither surface carries behavior."

## Durable repo fact discovered: the symlink layout

Not specific to this change, and it will bite any future edit:

- `CLAUDE.md` → symlink to `AGENTS.md`. The Edit tool **refuses to write through symlinks**
  ("Refusing to write through symlink... Resolve the symlink and pass the real target path").
- Every `.claude/skills/<name>/SKILL.md` → symlink to `.agents/skills/<name>/SKILL.md`.

`grep -r` does **not** follow symlinked paths, so a repo-wide grep reports hits under `.agents/` and
silently misses `.claude/`. Any audit that counts sites by grepping `.claude/skills/` will
under-count. Edit the `.agents/` targets; read either.

## Open threads

- The scope answer above is still unconfirmed.
- `openspec/specs/{delivery-gate,session-notes}/spec.md` carry the old text until `/save`'s Step 4d
  spec sync folds the deltas in — deliberate, not an oversight.
- Nothing here changes `/ship`, `/apply`, `/continue`, or the CI-when-present rule.
