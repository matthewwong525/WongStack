# Docs Audit Playbook

The **`docs` variant's** specialization of [audit-playbook.md](audit-playbook.md). When
`/improve docs` runs, this *replaces* that playbook's generic *Docs* category (§8) with a full
pass over a `docs/` **progressive-disclosure wiki**. Everything else in the skill is unchanged —
the same Recon → Audit → Vet → Plan workflow, the same [plan template](plan-template.md), the
same `plans/` handoff and finding format.

What to look for, per lens. Each subagent (or direct audit pass) gets the relevant section plus
the **Finding format** at the bottom. The standard every finding is measured against is the
repo's own [`wiki-style.md`](../../../../docs/wiki-style.md) — read it first; these lenses are
how you find where the wiki has drifted from it.

A finding is only a finding with **evidence**. "The docs feel disorganized" is not a finding;
"`docs/guides/setup.md:40` links `#count-raw-materials` but the heading's slug is
`#count-raw-materials--monday`, so it 404s" is.

This audit is **read-only and pure-judgment — there is no script.** You resolve links and compute
anchor slugs by reading. The anchor rule (from wiki-style.md): the slug is the heading text
**lowercased, spaces → hyphens, punctuation dropped**; an em-dash with its surrounding spaces
collapses to a double hyphen (`## Count raw materials — Monday` → `#count-raw-materials--monday`).
Reproduce it by hand when you check an anchor; flag anchors you're unsure about as MED confidence
rather than guessing.

---

## 1. Structural integrity (highest trust — provable by reading)

Broken navigation is the highest-value, lowest-risk lens: deterministic, and every hit costs a
reader a dead end.

- **Broken relative links** — a `[text](path.md)` whose target file doesn't exist, or exists with
  different casing (404s on case-sensitive hosts like GitHub Pages / Linux CI). Resolve each link
  against the linking file's directory; a folder link resolves to its `README.md`.
- **Dead `#anchors`** — a `[text](page.md#heading)` whose slug matches no heading in the target.
  Compute the slug by the rule above; the usual cause is a heading renamed or that lost a suffix.
  The fix regenerates the anchor from the live heading.
- **Orphan pages** — a page unreachable by following links from `docs/README.md` (nothing links to
  it, not even its hub).
- **Hub-coverage gaps** — a folder `README.md` that doesn't link one of its own child pages or
  child-folder hubs (a hub must link every child).
- **Dead-ends** — a page with no outgoing relative links (no up/down/sideways navigation).

Do **not** flag **illustrative / seed example links** — the seed list in `docs/README.md`
(`development/README.md`, …) and the `[label](path.md)` samples inside `wiki-style.md` point at
non-existent files on purpose. By-design, not a finding.

## 2. Openers & titles (every page stands alone)

A reader lands mid-tree from search; the first prose line is the snippet.

- **Weak opener** — the first prose line is a navigational breadcrumb ("Part of the … set", "This
  page covers …"), a caveat, or filler ("Overview.", "The following …") instead of a
  topic-defining sentence that says what the page *is*. Fix: rewrite from the page's own content;
  demote the breadcrumb to a later sentence.
- **Sequence-label headings** — `Step N` / `Stage N` / `Phase N` titles instead of topic titles.
  Ordering belongs to the parent hub's numbered list; the title is the thing itself (`Configure
  the store`, not `Step 2 — configure the store`).

## 3. One topic, one page

- **Duplicated procedure** — the same steps written in 2+ pages. Pick the owner, replace copies
  with a one-line summary + a link. **Preserve every caveat** on the owner — never flatten a "why
  we deliberately do X" note as "redundant".
- **Restating instead of linking** — a checklist/cadence page that spells out a procedure the
  how-page already owns; it should say *when* and link out for the *how*.
- **Generic vs specific** — a shared process copy-pasted into each specific leaf; write it once and
  keep the leaves thin (their quirks + a link up).

## 4. Linking & navigation

- **Missing up/down/sideways links** — a page that doesn't link **up** to its hub, or names a
  sibling/reference without linking it.
- **Unlinked known target** — a doc, app, dashboard, or tool named in prose that has a page or URL
  but isn't linked on first mention. (The bar is low: if it has a home, link it.)
- **Links inside a `mermaid` diagram** — maps stay visual-only; the clickable links belong in the
  numbered list beside the diagram.

## 5. Staleness & correctness (actively-wrong is worse than missing)

The highest-impact docs finding: a page a reader will *trust and follow* into failure. Verify
against the current repo before flagging — this lens has the most false positives.

- **Stale procedure** — setup/build/deploy steps, commands, or examples that no longer match the
  code or process.
- **Decision drift** — a documented decision (an ADR, a "why we do X" note) the code or process has
  since diverged from. Report the drift; don't assume the doc is right — flag that doc and code
  disagree so the team reconciles.
- **Renamed/moved references** — prose naming a file, command, flag, or route that no longer exists
  under that name.

## 6. Coverage & shape

- **Missing home** — a real, reusable process with no page that owns it. A plan here *creates* a
  page, but honor **invent nothing**: only document what's derivable from the repo; a genuine
  knowledge gap is an open question in the plan, not a guessed procedure.
- **Stub hub** — a section `README.md` that doesn't actually overview its section.
- **Wrong nesting** — a folder wrapping a single page (flatten it; moving changes the path, so the
  plan rewrites inbound links), or a flat folder sprawling with pages that want grouping. Don't
  manufacture depth.

---

## Finding format

Every docs finding, from every lens and every subagent, comes back in this shape:

```markdown
### [DOCS-NN] Short imperative title

- **Evidence**: `docs/path/page.md:123` — one sentence on what's there and which wiki-style rule
  it violates. (Repeat per location; 2–5 strongest, note "and ~N similar".)
- **Impact**: The reader cost. Concrete: "every reader following this link 404s", not "suboptimal".
- **Effort**: S (a few edits) / M (a page or a cluster) / L (a restructure across pages) — for the
  doc change itself.
- **Risk**: What the edit could break — usually inbound links on a move/rename; LOW/MED/HIGH + one
  line.
- **Confidence**: HIGH (read it, certain) / MED (strong signal, verify) / LOW (smell, investigate).
  LOW gets an "investigate" plan, not a "fix" plan.
- **Fix sketch**: 1–3 sentences — enough to judge effort. Not the plan.
```

## Prioritization rubric

Order by **leverage = impact ÷ effort, discounted by confidence and risk**. Tiebreakers:

1. **Structural integrity floats up** — broken links/anchors/orphans are deterministic, safe, and
   every one is a live dead end. Batch them first.
2. **Actively-wrong (staleness) floats above cosmetic** — a doc that leads a reader into failure
   outranks a weak opener.
3. Prefer fixes with a clean verification story (the link resolves; the anchor matches).
4. "Not worth doing" is a valid verdict — record it with one line so it isn't re-audited.

---

## Planning & applying docs fixes

Docs plans use the same [plan template](plan-template.md) and `plans/` index as every other plan —
or, when the repo plans with OpenSpec, the same change folders as every other plan (see
[openspec-plans.md](openspec-plans.md)) — with three docs-specific adaptations (the general
template is written for code — override these):

- **Category is `docs`.** The plan's "Current state" inlines the exact page(s), the current text
  excerpt, the **wiki-style rule** it satisfies, and the exact link targets/anchors to use (so the
  executor links without guessing).
- **The verification gate isn't a build.** Docs have no `pnpm typecheck` / test suite. Replace the
  template's command table and done-criteria with docs checks: the target file exists
  (`test -f docs/<path>`), the `#anchor` matches a real heading slug, the opener is a topic-defining
  sentence, and re-running `/improve docs` no longer reports the finding.
- **Invent nothing.** A fix that would need a fact the repo doesn't contain (a procedure, a
  default, a decision) is a **STOP condition / open question** in the plan, never a guess.

**Applying a docs plan — the WongStack way (no `execute`).** Unlike code plans, docs plans are
*not* dispatched to an executor subagent. A human (or a fresh Claude session) picks up the plan —
in OpenSpec mode, **`/continue <slug>`** loads the change and implements it; otherwise open the
plan file, run its drift check, and make exactly the edits it names in `docs/**` — confirms the
done criteria, then **`/save`** (sync specs + push + preview) → **`/ship`** (merge once the gate
passes — CI when present, else PR review — then archive the change). `--issues` and `reconcile`
work as in [closing-the-loop.md](closing-the-loop.md), adapted per
[openspec-plans.md](openspec-plans.md) in OpenSpec mode.
